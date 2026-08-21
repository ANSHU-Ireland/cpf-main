# AWS UAT deployment runbook

Date: 2026-08-21

## Current deployment status

The AWS deployment package is authored and passes YAML parsing plus `cfn-lint` semantic validation.
It has **not** been applied to an AWS account from this workstation: AWS CLI, Docker and AWS account
credentials are not available here. Do not describe the service as hosted until the stack command
below completes and the post-deployment checks pass.

The UAT stack creates an immutable ECR repository, a two-AZ VPC, an internet-facing ALB, private
Fargate application/worker tasks, isolated Multi-AZ RDS PostgreSQL, KMS-encrypted S3 and Secrets
Manager resources, WAF, VPC flow logs, CloudWatch logs/alarms/dashboard, EventBridge and deployment
rollback controls. The initial service count is zero while migrations and the UAT seed run.

## Prerequisites

- PowerShell 7, Git, Docker Desktop with Linux containers, and AWS CLI v2.
- An AWS role that can create CloudFormation, IAM, VPC, ECS, ECR, RDS, KMS, S3, WAF, Route 53,
  CloudWatch, SNS, EventBridge, Secrets Manager and Application Auto Scaling resources.
- An ACM certificate in the deployment Region and a Route 53 hosted zone for HTTPS.
- A reviewed AWS budget. The two NAT gateways and Multi-AZ RDS instance incur continuous charges.
- A clean, reviewed Git commit. The deployment uses a unique immutable image tag, never `latest`.

## Pre-deployment gate

From the repository root:

```powershell
corepack enable
pnpm install --frozen-lockfile
pnpm verify
node infra/aws/validate-templates.mjs
cfn-lint infra/aws/bootstrap.yaml infra/aws/application.yaml
pnpm --filter @cpf/web build
```

Authenticate and verify the intended account before creating resources:

```powershell
aws sso login --profile <approved-profile>
$env:AWS_PROFILE = '<approved-profile>'
aws sts get-caller-identity --region eu-west-1
```

## Create the UAT stack and 30 tenants

```powershell
pwsh ./infra/aws/deploy.ps1 `
  -EnvironmentName uat `
  -Region eu-west-1 `
  -DesiredCount 2 `
  -SeedUat `
  -CertificateArn '<acm-certificate-arn>' `
  -DomainName 'uat.example.com' `
  -HostedZoneId '<route53-hosted-zone-id>' `
  -AlertEmail 'uat-operations@example.com'
```

The script records every command and its output under `logs/aws-deploy/`, builds and pushes an
immutable image, runs the release migration, applies the 30-tenant seed, then waits for both ECS
services to become stable. Confirm the SNS email subscription after deployment.

## UAT credentials

All UAT identities and records are fabricated. New UAT users have `reset_required=true` and use:

```text
Temporary password: CPF-UAT-ChangeMe-2026!
```

The one-click role accounts are:

| Workspace      | Email                                  |
| -------------- | -------------------------------------- |
| Candidate      | `candidate.one@northstar.invalid`      |
| Reviewer       | `reviewer@northstar.invalid`           |
| Employer       | `admin@northstar.invalid`              |
| Approver       | `approver@northstar.invalid`           |
| Governance     | `governance@tenant-01.cpf-uat.invalid` |
| Operations     | `operations@tenant-01.cpf-uat.invalid` |
| Support        | `support@tenant-01.cpf-uat.invalid`    |
| Auditor        | `auditor@tenant-01.cpf-uat.invalid`    |
| Platform admin | `platform.admin@cpf-uat.invalid`       |

Tenants 02–30 use the pattern `<persona>@tenant-NN.cpf-uat.invalid`, where persona is `admin`,
`reviewer`, `approver`, `governance`, `support`, `operations`, `auditor` or `candidate`.

The local seed also creates a gitignored credential manifest at
`artifacts/uat-credentials/cpf-uat-credentials.csv`. Never commit, email or copy that file into a
production system. Passwords changed through the Security screen are preserved on reseed and every
active session is revoked after a successful password change.

## Post-deployment acceptance

1. Confirm the CloudFormation stack status is `CREATE_COMPLETE` or `UPDATE_COMPLETE`.
2. Open the `ApplicationUrl` output over HTTPS and sign in with each one-click role.
3. Run the same automated journeys against the deployed URL:

   ```powershell
   $env:CPF_UAT_WEB_URL = 'https://uat.example.com'
   node scripts/demo-smoke.mjs
   ```

4. Verify `/health` and `/readyz`, ALB target health, ECS service stability, worker logs, RDS metrics,
   WAF metrics, VPC flow logs, CloudWatch dashboard and alarm delivery.
5. Confirm exactly 30 organizations, 120 seeded campaigns and 360 seeded applications.
6. Exercise wrong-password rejection, first-login reset, cross-role 403 behavior, desktop navigation
   and the phone-sized navigation drawer.
7. Record UAT sign-off against the exact Git commit and ECR image digest.

## Rollback and recovery

- ECS deployment circuit breakers roll back a failed service revision automatically.
- To roll back application code, redeploy the last approved immutable image tag.
- Do not delete or replace RDS to roll back schema changes. Use a reviewed forward migration or a
  tested snapshot restore into a new stack.
- Database and log resources use retain/snapshot policies. Deletion protection is enabled by
  default; disabling it requires an explicit, reviewed stack update.
- Treat the UAT stack as disposable only after evidence and required audit logs have been retained.

## Production boundary

UAT compatibility projections are enabled only when `APP_ENV=uat`. Production rejects demo mode and
the deploy script rejects `-SeedUat`. Follow `GO_LIVE_CHECKLIST.md`; real identity/MFA, legal and
content-validation approvals remain mandatory external gates.
