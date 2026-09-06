# Current State — durable checkpoint

_Last updated: 2026-09-06 · branch `codex/enterprise-uat-completion`_

## Latest demo checkpoint — 2026-09-06

The owner requested an understandable, coherent evaluation workflow. A new Start here page,
role-linked six-step guide, Approver/Auditor sign-in choices, shared guide navigation and access-error
recovery are published through `741e40b`. See `DEMO_WORKFLOW_ENTRY_2026-09-06.md` for scoped
verification. This does not close the 26 unfinished mutations or five no-op actions previously
identified, nor establish complete end-to-end UAT or Penpot fidelity across all screens.

See `DEMO_CHECKPOINT_2026-09-06.md`: recovered audit-page improvements were pushed as `c059b4e`.
Employer decision/approval and QMS are connected to canonical data in the subsequent saved slices. Hosting remains
deferred by the owner; AWS account/domain fields are intentionally empty in the deployment guide.
The whole product is not yet ready for hosting or complete screen-by-screen UAT sign-off.

## Latest publication checkpoint — 2026-09-05

The governance-document and audit persistence work from the August session is included in this
checkpoint. Audit collections now persist separately from outbox messages, record custody and
audit/outbox events, and link tenant-scoped requirement records. The web audit routes use these
API operations. Unknown requirements return not found.

The seed now includes 120 evidence collections, 360 traceability rows and 360 evidence items,
in addition to the earlier inventory below. The traceability rows represent **12 requirement keys
repeated across 30 tenants**, not 360 verified product requirements. All seed evidence is synthetic;
blocked requirements remain visible, and purpose-scoped audit access is still incomplete.

See `GITHUB_CHECKPOINT_2026-09-05.md` for current verification and readiness estimates. Counts and
UAT results in the dated sections below are historical checkpoints, not full-product sign-off.

## Release judgement

**NOT READY.** CPF has a large runnable product surface, persistent reference journeys and broad
domain/API coverage. It is not yet an end-to-end, persisted, externally approved implementation of
the full build contract.

## Verified facts

- The verified source package contains 362 requirements (336 Must), 244 OpenAPI operations, 125
  interface SVGs, 1,543 dictionary rows and a 139 physical / 138 logical PostgreSQL baseline. The
  current additive schema contains 144 physical / 143 logical tables.
- The complete configured PostgreSQL checkpoint passes 178 test files / 1,657 tests with zero
  skips or failures. This includes canonical governance-document, tenant-negative, audit/outbox and
  least-privilege evidence.
- The production web build generates 98 pages after the Governance overview was added and five governance routes were given
  explicit Suspense boundaries for their search-parameter state.
- The executable route inventory derives 125/125 canonical routes directly from tracked SVGs. It
  no longer depends on an ignored generated `coverage/` file.
- The concrete-dispatch classifier matches all 244 baseline operation IDs. The test exposed and
  fixed the omitted `post_candidates_merge_preview` operation.
- Password authentication is PostgreSQL-backed with bcrypt verifiers, hashed expiring session
  tokens, lockout counters, forced first-login reset and session revocation after password change.
  Provider-dependent recovery, email verification and MFA commands still fail closed.
- A leased outbox processor implements event-ID idempotency, bounded retry, hashed failure details
  and dead-letter behavior with an additive PostgreSQL migration.
- Governed AI and companion policy packages enforce the core scope, version, budget, output,
  signature, disclosure and telemetry invariants under unit tests.

## 2026-08-21 AWS-shaped UAT and identity checkpoint

- The deterministic UAT seed creates exactly 30 organizations, 120 campaigns, 360 applications and
  390 canonical governance documents, with nine usable role personas for Northstar and exactly 242
  reset-required tenant credentials. Reseeding preserves passwords users have already changed.
- Database-backed role smoke testing passes 34 reads/actions across Candidate, Reviewer, Employer,
  Platform Admin, Governance, Operations and Support; a separate auth smoke validates nine personas
  and wrong-password rejection.
- Browser UAT verifies first-login reset, readable security activity, employer and platform
  dashboards, campaign navigation, permission denial and a phone-sized navigation drawer without
  horizontal overflow.
- AWS CloudFormation now covers ECR, two-AZ networking, private Fargate services, Multi-AZ encrypted
  RDS, Secrets Manager, KMS/S3, WAF, EventBridge, CloudWatch and rollback controls. Both templates
  pass `cfn-lint` 1.55.1. HTTPS parameters are all-or-none, production requires HTTPS, and the
  deployment command validates both templates before mutation and runs the complete UAT journey
  suite after a seeded rollout. The stack is authored but not applied because this task has no AWS
  account authority.
- `docs/deployment/AWS_UAT_RUNBOOK.md` and `docs/deployment/GO_LIVE_CHECKLIST.md` define the exact
  deployment, credential, acceptance and production-boundary process.

## 2026-08-21 verification and persistence checkpoint

- The production web build passes and generates all 98 pages.
- Contract regeneration passes for all 244 operations with
  `pnpm --filter @cpf/contracts run contracts:check`.
- `pnpm verify` passes with formatting, lint and all 16 typed workspace projects green. Without a
  configured database, 148 files / 1,559 tests pass and 26 database-gated files / 63 tests skip.
- The complete configured PostgreSQL suite passes 178 files / 1,657 tests with no skips or failures.
  Additive least-privilege grants were required for attempt submission and campaign-readiness
  dependencies; unsafe campaign activation remains fail-closed.
- Audit-export requests and platform maintenance windows now persist durable rows, append
  hash-chained audit evidence and enqueue outbox work atomically. Their 2 focused live tests pass.
- Governance submission envelopes, structured deployer instructions, conformity approvals,
  serious-incident updates and change decisions now use canonical PostgreSQL rows. Their 3 focused
  live tests pass and missing mutation targets return `null` rather than fabricated success.
- All 13 governance-document families now use verified canonical tables rather than invented generic
  columns or a quality-document fallback. Accepted GenericCommand evidence is additive, immutable,
  tenant-RLS protected and limited to SELECT/INSERT for `cpf_app`; live tests prove every family,
  audit/outbox evidence, explicit validation and cross-tenant denial. The dispatcher now maps plural
  operation IDs explicitly, and the UAT seed supplies one complete 13-record workspace per tenant.
- Platform-staff invitations now encrypt email, hash tokens and retain roles across resend.
  Platform role/status changes use tenant-checked security-definer functions rather than broad
  grants. Their 2 focused live tests pass.
- Privileged-access grants now use the canonical tenant, case, purpose, approver and time-bound
  fields while retaining the requested scope/reason as evidence. Its focused live test passes.
- Integration credential rotation and webhook creation now write encrypted secret material against
  canonical columns, audit successful mutations and enqueue rotation work. Their 2 focused live
  tests pass as part of the complete configured PostgreSQL suite.
- Schema facts reconcile the additive durable tables introduced by the persistence work. The current
  measured inventory is 143 logical / 144 physical tables while preserving the baseline
  partition-count distinction.

## 2026-08-21 functional-demo UAT checkpoint

- The missing Tailwind/PostCSS compiler is restored, so the existing Penpot-aligned utility classes
  now render across the complete web surface.
- All seven synthetic role workspaces open successfully. The browser UAT completed Candidate,
  Reviewer, Employer, Platform Admin, Governance, Operations and Support task journeys at 320,
  768 and 1440 px widths.
- The expanded functional smoke suite passes 34 authenticated reads and safe synthetic actions.
- Governance no longer opens a 404; Support case detail and Candidate assessment launch now work in
  demo mode; production contract gaps continue to fail closed.
- The detailed scope, evidence and external limitations are recorded in
  `UAT_DEMO_REPORT_2026-08-21.md`.

## 2026-08-16 continuation checkpoint

- `@cpf/org`, `@cpf/api`, `@cpf/server` and `@cpf/web` typechecks pass after the checkpoint batch.
- No route or page under `apps/web/app` imports `synthetic.server.ts` or
  `persistence.server.ts`. Contract-backed journeys use authenticated platform calls; incomplete
  screen/API/schema combinations now return an explicit `501 application/problem+json` response.
- `pnpm verify` passes at this checkpoint: formatting, lint and all workspace typechecks are green;
  148 test files / 1,559 tests pass and 21 database-gated files / 53 tests skip without
  `DATABASE_URL`. Production build, contract checks and live PostgreSQL integration remain for the
  next session.
- The ordered continuation and known local adapter gaps are recorded in
  `NEXT_SESSION_PLAN_2026-08-16.md`.

## Important scope boundaries

### Web product

The Next.js product covers most role surfaces and no longer imports its process-local synthetic or
persistence stores. Several screens now fail closed because their visual contract requires fields or
lifecycle operations absent from the approved public API or canonical persistence model. Completing
those vertical slices—with contract, migration, tenant-negative and browser evidence—remains a major
release blocker.

### API and persistence

All baseline operation IDs reach the concrete dispatcher, but classification is not proof that all
244 operations have correct, production-complete semantics. Some related operations intentionally
share compatibility projections. Each needs contract, tenant-isolation and live integration proof.

### Controlled runtimes

The worker, AI gateway and companion policy foundations exist. Production publishers/webhook
delivery, a PostgreSQL AI evidence adapter, an approved real model provider and a packaged signed
desktop application do not. Safe defaults remain disabled or fail closed.

### Traceability and release evidence

The authoritative requirements CSV still marks all 362 requirements as specified without supplied
implementation evidence. Evidence must be linked requirement by requirement; source/interface/API
coverage alone is not completion.

## Major remaining workstreams

1. Close explicit public-contract/read-model gaps and finish persistent, tenant-isolated vertical
   slices; no route under `apps/web/app` currently imports the obsolete process-local stores.
2. Add operation-specific semantic/integration evidence for the 244-operation dispatcher.
3. Complete identity-provider, MFA/step-up, upload/object-storage and field-level controls.
4. Add production event transports, webhook signing/replay defense and PostgreSQL AI ledger binding.
5. Build and sign the actual desktop companion and its governed update channel.
6. Complete route-state visual/accessibility evidence and the 362-requirement live ledger.
7. Run performance, restore/failover, security, privacy, accessibility and independent release gates.
8. Prepare/apply protected preview and pilot infrastructure only when credentials and authority exist.

## Active external blockers

See `EXTERNAL_ACTIONS_REQUIRED.md`. Vercel/AWS authority, approved AI-provider evidence, desktop
signing certificates, legal/DPO determinations and validated assessment content remain external
gates. They do not block repository-local engineering but do block the corresponding release claims.
