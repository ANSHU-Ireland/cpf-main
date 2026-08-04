# Current State — durable checkpoint

_Last updated: 2026-08-04 · Wave 0 (Source & repository integrity)_

## Where we are

Wave 0 foundation established and **green**. Read this file, then `NEXT_ACTION.md`, before
resuming. Do not re-plan the whole project or redo completed work.

## Done (with evidence)

- **Source fidelity:** all 6 v2.0 sources + Penpot handoff verified by SHA-256 (byte match to
  contract). Counts confirmed: 362 reqs, 1,543 dict rows, 244 operations, 125 screens, 139
  physical / 138 logical tables. Originals copied to `docs/source-of-truth/originals/`.
  Evidence: `docs/source-of-truth/SOURCE_MANIFEST.md`, `docs/execution/evidence/wave0-baseline.md`.
- **Repo topology:** dedicated git repo at `CPF-Dev/` (parent Desktop `.git` left untouched).
  ADR-0001, ASM-01.
- **Durable execution docs:** manifest, hierarchy, ledgers (implementation, assumption, risk,
  defect), release gates, external actions, CONFLICT-001 (138 vs 139 resolved).
- **Monorepo + tooling:** pnpm workspaces, strict TS, ESLint (flat, typed), Prettier, Vitest,
  coverage with 100%-branch gate on invariant modules. CI workflow `.github/workflows/ci.yml`.
- **First safety module `@cpf/domain`:** `ai-output-guard` (forbidden AI outputs) and
  `rubric-aggregate` (human-only deterministic aggregation). 28 tests, 100% branch coverage.
- **Database foundation `@cpf/db` (EXT-01 resolved):** connected to local PostgreSQL 18.4,
  `cpf_dev` created, v2.0 baseline applies cleanly. `ensureBaselineApplied` + schema-facts
  integration test (CONFLICT-001 138/139, `audit.events` partition, RLS on `runtime.sessions`).
  3 tests green against live Postgres; `describe.skipIf` keeps CI green without a DB. CI gained a
  `postgres:16` service job. Evidence: `docs/execution/evidence/wave0-db.md`.
- **Contract types `@cpf/contracts`:** `openapi-typescript` generates `src/generated/openapi.ts`
  from the baseline; a generated runtime `operation-manifest.ts` lists all **244** operations
  (operationId/method/path). 3 tests assert count/uniqueness/shape. CI `contracts:check` gate
  regenerates and `git diff --exit-code`s to prevent DTO drift (RISK-04).
- **Tenant isolation proven `@cpf/db` + `@cpf/policy`:** `withTenant()` opens a transaction, sets
  a non-superuser `SET LOCAL ROLE cpf_app` and `app.tenant_id`/`app.user_id` GUCs so RLS is
  enforced (invariant §9). A cross-tenant negative test seeds two orgs/departments and proves
  tenant A cannot read tenant B rows, and empty tenant → deny-by-default (0 rows). `@cpf/policy`
  adds a pure deny-by-default `can(actor, action, resource, permissions)` predicate (cross-tenant
  denied unless platform staff **and** explicitly permitted). 4 RLS + 7 policy tests; policy at
  100% branch coverage. Contract §12.
- **Design tokens `@cpf/tokens` (Wave 1 start):** verified Penpot `design-tokens.json` transcribed
  into a typed const module (16 colors, font family/body, radii, 4px space unit, 44px WCAG target).
  A parity test reads the source JSON and asserts every value matches, so token drift fails CI.
- **UI primitives `@cpf/ui` (Wave 1):** accessible `Button`, `Input`, `Field` themed from
  `@cpf/tokens` — real button semantics + default `type="button"`, `aria-invalid` inputs, and a
  render-prop `Field` that always wires label/hint/error via `aria-describedby` (no orphan labels),
  44px WCAG target size. 12 jsdom + Testing-Library a11y tests (roles, accessible name/description,
  alert on error). Vitest runs `packages/ui/**` under jsdom; everything else stays on node.
- **Account vertical `@cpf/account` (`get_me`, FR-ACC-04/12):** first server-side vertical. `getMe`
  authorizes deny-by-default via `@cpf/policy` (`self_profile` read for authenticated callers), then
  `PgAccountRepository` reads the caller's own `iam.users` row + current-tenant `iam.memberships`
  role context **through the `withTenant` RLS context** as a non-superuser `cpf_app` role. 4 unit
  tests (authz allow/deny, 404, null-tenant) + 2 live-Postgres tests proving a different-tenant
  actor sees no membership (RLS). No audit event — `get_me` is `x-audit-event: false` in the spec.
- **`get_me` HTTP boundary + profile UI:** `@cpf/http` provides reusable RFC 9457 problem+json and
  `X-Correlation-ID` helpers; `apps/api` `handleGetMe` maps the use-case result to 200 `UserProfile`
  / 403 / 404 problem+json (correlation id echoed in header and body). `apps/web` `AccountProfileView`
  renders the profile as an accessible labelled region (roles list, no-membership fallback), tested
  under jsdom. `UserProfile` projection recorded as ASM-06.

## Last green baseline (verified this session)

`pnpm run format` ✅ · `pnpm run lint` ✅ · `pnpm run typecheck` ✅ · `vitest run` ✅ (**80/80**:
67 prior + 5 http + 4 api handler + 4 web view).

## Active blockers (see EXTERNAL_ACTIONS_REQUIRED.md)

- ~~EXT-01 Docker/Postgres~~ **RESOLVED** — local Postgres connected; `DATABASE_URL` in `.env`.
- EXT-02..07 — Vercel, AWS, AI keys, signing, legal/DPO, validated assessment content (later waves).

## Release judgement

**NOT READY** — foundation only. No demo/pilot/production or compliance claim is made.
