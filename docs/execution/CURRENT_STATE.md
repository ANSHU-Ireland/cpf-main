# Current State — durable checkpoint

_Last updated: 2026-08-21 · branch `codex/continuation-baseline`_

## Release judgement

**NOT READY.** CPF has a large runnable product surface, persistent reference journeys and broad
domain/API coverage. It is not yet an end-to-end, persisted, externally approved implementation of
the full build contract.

## Verified facts

- The verified source package contains 362 requirements (336 Must), 244 OpenAPI operations, 125
  interface SVGs, 1,543 dictionary rows and a 139 physical / 138 logical PostgreSQL baseline. The
  current additive schema contains 142 physical / 141 logical tables.
- The complete configured PostgreSQL checkpoint passes 174 test files / 1,622 tests with zero
  skips or failures. This includes all 10 focused live tests added for the current adapter batch.
- The production web build generates 97 static pages after five governance routes were given
  explicit Suspense boundaries for their search-parameter state.
- The executable route inventory derives 125/125 canonical routes directly from tracked SVGs. It
  no longer depends on an ignored generated `coverage/` file.
- The concrete-dispatch classifier matches all 244 baseline operation IDs. The test exposed and
  fixed the omitted `post_candidates_merge_preview` operation.
- Authentication operations now route to their own contract handlers. Provider-dependent commands
  fail closed until a real identity/MFA provider is configured.
- A leased outbox processor implements event-ID idempotency, bounded retry, hashed failure details
  and dead-letter behavior with an additive PostgreSQL migration.
- Governed AI and companion policy packages enforce the core scope, version, budget, output,
  signature, disclosure and telemetry invariants under unit tests.

## 2026-08-21 verification and persistence checkpoint

- The production web build passes and generates all 97 pages.
- Contract regeneration passes for all 244 operations with
  `pnpm --filter @cpf/contracts run contracts:check`.
- `pnpm verify` passes with formatting, lint and all 16 typed workspace projects green. Without a
  configured database, 148 files / 1,559 tests pass and 26 database-gated files / 63 tests skip.
- The complete configured PostgreSQL suite passes 174 files / 1,622 tests with no skips or failures.
  Additive least-privilege grants were required for attempt submission and campaign-readiness
  dependencies; unsafe campaign activation remains fail-closed.
- Audit-export requests and platform maintenance windows now persist durable rows, append
  hash-chained audit evidence and enqueue outbox work atomically. Their 2 focused live tests pass.
- Governance submission envelopes, structured deployer instructions, conformity approvals,
  serious-incident updates and change decisions now use canonical PostgreSQL rows. Their 3 focused
  live tests pass and missing mutation targets return `null` rather than fabricated success.
- Platform-staff invitations now encrypt email, hash tokens and retain roles across resend.
  Platform role/status changes use tenant-checked security-definer functions rather than broad
  grants. Their 2 focused live tests pass.
- Privileged-access grants now use the canonical tenant, case, purpose, approver and time-bound
  fields while retaining the requested scope/reason as evidence. Its focused live test passes.
- Integration credential rotation and webhook creation now write encrypted secret material against
  canonical columns, audit successful mutations and enqueue rotation work. Their 2 focused live
  tests pass as part of the complete configured PostgreSQL suite.
- Schema facts reconcile the three additive durable tables introduced by this batch: audit export
  jobs, maintenance windows and governance submission envelopes. The current measured inventory is
  141 logical / 142 physical tables while preserving the baseline partition-count distinction.

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
