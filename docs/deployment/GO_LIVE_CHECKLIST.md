# Go-live checklist

CPF is not production-ready merely because the UAT stack is healthy. Every item below must be
evidenced against the exact release image and production stack.

## Release and data gates

- [ ] Release commit is reviewed, protected and tagged; CI, container build and CloudFormation lint
      are green.
- [ ] Production is deployed without `-SeedUat`; `CPF_DEMO_MODE=false` is confirmed in the task
      definition.
- [ ] `node packages/db/scripts/audit-credentials.mjs --live-gate` passes with zero reset-required
      credentials, `.invalid` identities and UAT memberships.
- [ ] No UAT credential manifest or synthetic tenant data exists in production storage, logs,
      secrets, backups or exports.
- [ ] Database migration, backward-compatibility and rollback/forward-fix plans are approved.

## Identity and security gates

- [ ] The approved enterprise identity provider, email verification, account recovery, MFA and
      step-up authentication are implemented and independently tested. Current provider-dependent
      routes intentionally fail closed.
- [ ] Production secrets are generated in AWS Secrets Manager, access is least-privilege and rotation
      is tested.
- [ ] WAF, HTTPS-only DNS, secure cookies, security headers, rate limits and alert delivery are
      verified from outside the VPC.
- [ ] SAST, dependency/container scanning, DAST and penetration-test findings are resolved or
      formally accepted.
- [ ] Cross-tenant negative tests and privileged-access audit evidence pass in production-like UAT.

## Reliability and operations gates

- [ ] Backup restore, point-in-time recovery and RDS failover drills meet approved RPO/RTO targets.
- [ ] ECS rollback, worker retry/dead-letter handling and EventBridge replay are tested.
- [ ] Load, soak and concurrency tests meet agreed service-level objectives.
- [ ] CloudWatch dashboards, runbooks, on-call ownership and severity-based alert routing are live.
- [ ] Cost alarms, retention periods and capacity limits are approved.

## Product, accessibility and governance gates

- [ ] Every Must requirement has executable traceability evidence and an owner-approved disposition.
- [ ] Supported browser/device journeys pass UAT, including keyboard-only, screen-reader and 200%
      zoom checks.
- [ ] Assessment content is validated for its intended use and the controlled pilot population.
- [ ] DPIA/FRIA, privacy notices, retention schedules, human-oversight process and legal/DPO decisions
      are approved.
- [ ] AI provider/model evidence, monitoring and incident controls are approved; no fake provider is
      enabled in production.
- [ ] Signed desktop companion and governed update channel are complete if included in release scope.

## Production deployment

Only after every gate above is approved:

```powershell
pwsh ./infra/aws/deploy.ps1 `
  -EnvironmentName production `
  -Region eu-west-1 `
  -DesiredCount 2 `
  -CertificateArn '<production-acm-certificate-arn>' `
  -DomainName 'app.example.com' `
  -HostedZoneId '<production-route53-hosted-zone-id>' `
  -AlertEmail 'production-operations@example.com'
```

Record the stack outputs, image digest, migration task ARN, CI run, restore-test evidence, UAT
approval and final release decision. Do not use the `-SeedUat` switch in production; the deployment
script rejects it.
