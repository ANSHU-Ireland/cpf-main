[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('uat', 'production')]
  [string]$EnvironmentName,

  [string]$Region = 'eu-west-1',
  [string]$ProjectName = 'cpf',
  [ValidateRange(2, 20)]
  [int]$DesiredCount = 2,
  [string]$CertificateArn = '',
  [string]$DomainName = '',
  [string]$HostedZoneId = '',
  [string]$AlertEmail = '',
  [switch]$SeedUat,
  [string]$ImageTag = ''
)

$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$logsPath = Join-Path $repoRoot 'logs\aws-deploy'
New-Item -ItemType Directory -Force -Path $logsPath | Out-Null
$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$transcriptPath = Join-Path $logsPath "$timestamp-$EnvironmentName.log"
Start-Transcript -Path $transcriptPath | Out-Null

function Invoke-Native {
  param(
    [Parameter(Mandatory = $true)][string]$File,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )
  Write-Host ("RUN {0} {1}" -f $File, ($Arguments -join ' '))
  & $File @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$File exited with code $LASTEXITCODE"
  }
}

function Get-StackOutput {
  param([string]$StackName, [string]$OutputKey)
  $value = & aws cloudformation describe-stacks --region $Region --stack-name $StackName `
    --query "Stacks[0].Outputs[?OutputKey=='$OutputKey'].OutputValue | [0]" --output text
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($value) -or $value -eq 'None') {
    throw "Missing CloudFormation output $OutputKey from $StackName"
  }
  return $value.Trim()
}

function Invoke-EcsTask {
  param(
    [string]$Cluster,
    [string]$TaskDefinition,
    [string]$Subnets,
    [string]$SecurityGroup,
    [string[]]$Command
  )
  $network = "awsvpcConfiguration={subnets=[$Subnets],securityGroups=[$SecurityGroup],assignPublicIp=DISABLED}"
  $runArgs = @(
    'ecs', 'run-task', '--region', $Region, '--cluster', $Cluster,
    '--task-definition', $TaskDefinition, '--launch-type', 'FARGATE',
    '--network-configuration', $network, '--count', '1'
  )
  if ($Command.Count -gt 0) {
    $override = @{ containerOverrides = @(@{ name = 'migration'; command = $Command }) } |
      ConvertTo-Json -Depth 6 -Compress
    $runArgs += @('--overrides', $override)
  }
  $taskArn = & aws @runArgs --query 'tasks[0].taskArn' --output text
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($taskArn) -or $taskArn -eq 'None') {
    throw 'ECS did not return a task ARN.'
  }
  Write-Host "Waiting for task $taskArn"
  Invoke-Native -File 'aws' -Arguments @(
    'ecs', 'wait', 'tasks-stopped', '--region', $Region, '--cluster', $Cluster,
    '--tasks', $taskArn
  )
  $exitCode = & aws ecs describe-tasks --region $Region --cluster $Cluster --tasks $taskArn `
    --query 'tasks[0].containers[?name==`migration`].exitCode | [0]' --output text
  if ($LASTEXITCODE -ne 0 -or $exitCode -ne '0') {
    $reason = & aws ecs describe-tasks --region $Region --cluster $Cluster --tasks $taskArn `
      --query 'tasks[0].stoppedReason' --output text
    throw "ECS task failed with exit code $exitCode. $reason"
  }
}

try {
  if (
    $EnvironmentName -eq 'production' -and
    ([string]::IsNullOrWhiteSpace($CertificateArn) -or
      [string]::IsNullOrWhiteSpace($DomainName) -or
      [string]::IsNullOrWhiteSpace($HostedZoneId))
  ) {
    throw 'CertificateArn, DomainName and HostedZoneId are required for production.'
  }
  if ($EnvironmentName -eq 'production' -and $SeedUat) {
    throw 'Synthetic UAT seed data is prohibited in production.'
  }
  $httpsValues = @($CertificateArn, $DomainName, $HostedZoneId) |
    Where-Object { -not [string]::IsNullOrWhiteSpace($_) }
  if ($httpsValues.Count -ne 0 -and $httpsValues.Count -ne 3) {
    throw 'CertificateArn, DomainName and HostedZoneId must be supplied together or all omitted.'
  }
  foreach ($command in @('aws', 'docker', 'git', 'node')) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
      throw "$command is required and was not found on PATH."
    }
  }

  Push-Location $repoRoot
  try {
    Invoke-Native -File 'aws' -Arguments @('sts', 'get-caller-identity', '--region', $Region)
    Invoke-Native -File 'aws' -Arguments @(
      'cloudformation', 'validate-template', '--region', $Region,
      '--template-body', "file://$(Join-Path $PSScriptRoot 'bootstrap.yaml')"
    )
    Invoke-Native -File 'aws' -Arguments @(
      'cloudformation', 'validate-template', '--region', $Region,
      '--template-body', "file://$(Join-Path $PSScriptRoot 'application.yaml')"
    )

    $bootstrapStack = "$ProjectName-bootstrap"
    Invoke-Native -File 'aws' -Arguments @(
      'cloudformation', 'deploy', '--region', $Region, '--stack-name', $bootstrapStack,
      '--template-file', (Join-Path $PSScriptRoot 'bootstrap.yaml'),
      '--parameter-overrides', "ProjectName=$ProjectName", '--no-fail-on-empty-changeset'
    )
    $repositoryUri = Get-StackOutput -StackName $bootstrapStack -OutputKey 'RepositoryUri'
    $registry = $repositoryUri.Split('/')[0]

    if ([string]::IsNullOrWhiteSpace($ImageTag)) {
      $commit = (& git rev-parse --short=12 HEAD).Trim()
      if ($LASTEXITCODE -ne 0) { throw 'Unable to determine the Git commit.' }
      $ImageTag = "$commit-$timestamp"
    }
    if ($ImageTag -eq 'latest') { throw 'Immutable release tags are required; latest is prohibited.' }
    $imageUri = "$repositoryUri`:$ImageTag"

    Write-Host "RUN aws ecr get-login-password | docker login $registry"
    aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $registry
    if ($LASTEXITCODE -ne 0) { throw 'ECR login failed.' }
    Invoke-Native -File 'docker' -Arguments @('build', '--pull', '--tag', $imageUri, '.')
    Invoke-Native -File 'docker' -Arguments @('push', $imageUri)

    $applicationStack = "$ProjectName-$EnvironmentName"
    $commonParameters = @(
      "ProjectName=$ProjectName", "EnvironmentName=$EnvironmentName", "ImageUri=$imageUri",
      "CertificateArn=$CertificateArn", "DomainName=$DomainName", "HostedZoneId=$HostedZoneId",
      "AlertEmail=$AlertEmail", 'DatabaseDeletionProtection=true'
    )
    $initialDeployArguments = @(
      'cloudformation', 'deploy', '--region', $Region, '--stack-name', $applicationStack,
      '--template-file', (Join-Path $PSScriptRoot 'application.yaml'),
      '--capabilities', 'CAPABILITY_NAMED_IAM', '--parameter-overrides'
    ) + $commonParameters + @('DesiredCount=0', 'WorkerDesiredCount=0', '--no-fail-on-empty-changeset')
    Invoke-Native -File 'aws' -Arguments $initialDeployArguments

    $cluster = Get-StackOutput -StackName $applicationStack -OutputKey 'ClusterName'
    $taskDefinition = Get-StackOutput -StackName $applicationStack -OutputKey 'MigrationTaskDefinitionArn'
    $subnets = Get-StackOutput -StackName $applicationStack -OutputKey 'ApplicationSubnetIds'
    $securityGroup = Get-StackOutput -StackName $applicationStack -OutputKey 'ApplicationSecurityGroupId'

    Invoke-EcsTask -Cluster $cluster -TaskDefinition $taskDefinition -Subnets $subnets `
      -SecurityGroup $securityGroup -Command @()
    if ($SeedUat) {
      Invoke-EcsTask -Cluster $cluster -TaskDefinition $taskDefinition -Subnets $subnets `
        -SecurityGroup $securityGroup -Command @('node', 'packages/db/scripts/seed-uat.mjs')
    }
    if ($EnvironmentName -eq 'production') {
      Invoke-EcsTask -Cluster $cluster -TaskDefinition $taskDefinition -Subnets $subnets `
        -SecurityGroup $securityGroup `
        -Command @('node', 'packages/db/scripts/audit-credentials.mjs', '--live-gate')
    }

    $workerDesiredCount = if ($EnvironmentName -eq 'production') { 2 } else { 1 }
    $serviceDeployArguments = @(
      'cloudformation', 'deploy', '--region', $Region, '--stack-name', $applicationStack,
      '--template-file', (Join-Path $PSScriptRoot 'application.yaml'),
      '--capabilities', 'CAPABILITY_NAMED_IAM', '--parameter-overrides'
    ) + $commonParameters + @(
      "DesiredCount=$DesiredCount", "WorkerDesiredCount=$workerDesiredCount",
      '--no-fail-on-empty-changeset'
    )
    Invoke-Native -File 'aws' -Arguments $serviceDeployArguments

    $service = Get-StackOutput -StackName $applicationStack -OutputKey 'ServiceName'
    $workerService = Get-StackOutput -StackName $applicationStack -OutputKey 'WorkerServiceName'
    Invoke-Native -File 'aws' -Arguments @(
      'ecs', 'wait', 'services-stable', '--region', $Region, '--cluster', $cluster,
      '--services', $service, $workerService
    )
    $applicationUrl = Get-StackOutput -StackName $applicationStack -OutputKey 'ApplicationUrl'
    if ($SeedUat) {
      $previousUatUrl = $env:CPF_UAT_WEB_URL
      try {
        $env:CPF_UAT_WEB_URL = $applicationUrl
        $uatPassed = $false
        for ($attempt = 1; $attempt -le 30; $attempt++) {
          Write-Host "UAT acceptance attempt $attempt of 30 against $applicationUrl"
          & node scripts/demo-smoke.mjs
          if ($LASTEXITCODE -eq 0) {
            $uatPassed = $true
            break
          }
          if ($attempt -lt 30) { Start-Sleep -Seconds 10 }
        }
        if (-not $uatPassed) {
          throw 'The deployed database-backed UAT journeys did not pass.'
        }
      }
      finally {
        if ($null -eq $previousUatUrl) {
          Remove-Item Env:CPF_UAT_WEB_URL -ErrorAction SilentlyContinue
        }
        else {
          $env:CPF_UAT_WEB_URL = $previousUatUrl
        }
      }
    }
    Write-Host "CPF deployment is stable: $applicationUrl"
    Write-Host "Deployment log: $transcriptPath"
  }
  finally {
    Pop-Location
  }
}
finally {
  Stop-Transcript | Out-Null
}
