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
- **Tamper-evident audit `@cpf/audit`:** deterministic `computeEventHash(previousHash, event)`
  (SHA-256 over canonical, key-order-independent serialization) and a `PgAuditWriter` that appends
  to `audit.events` on the caller's transaction client, chaining `event_hash` from the tenant's
  most recent event. 4 unit tests (determinism, key-order independence, field sensitivity, chain).
- **First audited write `patch_me` (FR-ACC-04, `x-audit-event: true`):** `@cpf/account` gains a
  concrete `ProfileUpdate` DTO + `parseProfileUpdate` boundary validation (unknown-property
  rejection, enum checks, non-empty patch → 422), a `write self_profile` grant, and `updateMe`
  (deny-by-default authorize → whitelisted-column upsert of `iam.user_profiles` **and** a chained
  `audit.events` append in one `withTenant` transaction). `apps/api` `handlePatchMe` returns 422
  problem+json on invalid bodies, else maps to 200/403/404. Tests: 7 validate + 3 updateMe unit +
  5 patch handler + 2 live-Postgres (profile persisted + audit row written with 64-hex
  `event_hash`, `previous_hash` chained across successive writes).
- **Account session vertical (`get_me_sessions`, `delete_me_sessions_sessionId`; FR-ACC-08):**
  `@cpf/account` gains a `SessionDto`/`SessionPageDto` projection (never exposes
  `refresh_token_hash`), `PgSessionRepository` reading/revoking the caller's own
  `iam.user_sessions` rows through the `user_session_self` RLS policy, keyset pagination
  (`(created_at, id)` cursor, opaque base64url token), a `listSessions` read use-case, and an
  **audited** `revokeSession` write (`x-audit-event: true`) that chains a `session.revoke` event in
  the same transaction. `apps/api` `handleGetMeSessions` (422 on bad paging, else 200 `SessionPage`)
  and `handleDeleteMeSession` (200 `{revoked:true}` / 403 / 404). Tests: 10 unit + 6 handler + 3
  live-Postgres (own sessions only via RLS, audited revoke writes a 64-hex `event_hash`, another
  user's session cannot be revoked → 404).
- **Security-events feed (`get_me_security_events`; FR-ACC-18, ASM-07):** `@cpf/account` reads the
  caller's own `iam.account_security_events` newest-first, keyset-paginated via generic
  `encodeCursor`/`decodeCursor` helpers. This table has **no RLS** (ASM-07), so scoping is enforced
  by an explicit `WHERE user_id = $1` predicate on every query; the `SecurityEventDto` projection
  omits `ip_hash`/`user_agent_hash`. `apps/api` `handleGetMeSecurityEvents` (422 on bad paging,
  else 200 `SecurityEventPage`). Tests: 6 unit + 3 handler + 2 live-Postgres (own events only,
  newest-first, keyset paging walks pages).
- **Notification preferences (`get_me_notification_preferences` + audited
  `put_me_notification_preferences`; FR-ACC-14):** `@cpf/account` reads/updates the caller's own
  `iam.notification_preferences` through the `notification_preference_self` RLS policy.
  `parsePreferenceUpdate` rejects unknown props (top-level + per-item), validates channel/digest
  enums and non-empty categories, dedupes `channel::category`, and caps at 200 items → 422.
  `applyPreferenceUpdate` upserts each setting (`ON CONFLICT (user_id,channel,category)`) with a
  **mandatory guard** — a `mandatory` row can never be disabled by the user (server forces
  `enabled=true`) — then chains a `notification_preferences.update` `audit.events` row in the same
  `withTenant` transaction (`x-audit-event: true`). `apps/api` `handleGetMeNotificationPreferences`
  (422 on bad paging, else 200 `NotificationPreferencePage`) and
  `handlePutMeNotificationPreferences` (422 on bad body, else 200 page / 403). Tests: 12 unit + 6
  handler + 2 live-Postgres (RLS hides other users, audited upsert writes a 64-hex `event_hash`,
  mandatory preference stays enabled despite a disable request).
- **Integration-test provisioning centralised:** the `cpf_app` role + all table/schema grants are
  now created once in a Vitest `globalSetup` (`vitest.globalsetup.ts`) instead of per-file
  `beforeAll` DDL. This removes a concurrent `CREATE ROLE`/`GRANT` catalog race
  ("tuple concurrently updated") that could flake parallel integration suites; each test keeps only
  its data seeding.
- **General preferences (`get_me_preferences` + audited `put_me_preferences`; FR-ACC-12/13):**
  `@cpf/account` reads/replaces the caller's locale + accessibility subset of `iam.user_profiles`
  through the `user_profile_self` RLS policy. `parsePreferencesUpdate` enforces PUT full-replace
  semantics (all fields required), bounds locale/timezone/dateFormat, checks theme/density enums,
  and validates `accessibility` as a bounded object of boolean flags (≤50 keys) — rejecting unknown
  props and non-boolean values → 422. `replacePreferences` upserts the columns
  (`ON CONFLICT (user_id)`) writing `accessibility_preferences` as jsonb, then chains a
  `preferences.update` `audit.events` row in the same `withTenant` transaction
  (`x-audit-event: true`); reads filter legacy non-boolean jsonb entries. `apps/api`
  `handleGetMePreferences` (200 `UserPreferences` / 403 / 404) and `handlePutMePreferences`
  (422 on bad body, else 200 stored view / 403). `UserPreferences` was a `GenericRecord` placeholder
  → concrete `UserPreferencesDto` projection recorded as ASM-08. Tests: 12 unit + 6 handler + 2
  live-Postgres (RLS-scoped read filters non-boolean accessibility, audited replace writes a 64-hex
  `event_hash` and persists the new values).

- **Onboarding checklist (`get_me_onboarding` + audited `put_me_onboarding_stepCode`; FR-ACC-15):**
  `@cpf/account` reads/updates the caller's own `iam.onboarding_progress` rows. The table has NO
  row-level security (like `account_security_events`; ASM-10), so every query is scoped by an
  explicit `user_id = $1` predicate. `get_me_onboarding` keyset-paginates over `(updated_at, id)`
  reusing the generic cursor helpers → concrete `OnboardingStepDto` inside `OnboardingPage`.
  `put_me_onboarding_stepCode` is **update-only**: it targets one existing step keyed by
  `(user_id, roleCode, stepCode, materialVersion)` (the body supplies the required `roleCode` +
  optional `materialVersion`; the path supplies `stepCode`), sets the user-settable status
  (`in_progress`/`completed`/`dismissed`; `completed` stamps `completed_at`), and chains an
  `onboarding.step.update` `audit.events` row in the same `withTenant` transaction
  (`x-audit-event: true`); a missing row yields 404 (no row is invented). `apps/api`
  `handleGetMeOnboarding` (200 `OnboardingPage` / 403 / 422) and `handlePutMeOnboardingStep`
  (422 on bad input, else 200 step / 403 / 404). Baseline `OnboardingPage` items / `put` body /
  response were `GenericRecord`/`GenericCommand` placeholders → concrete DTOs recorded as ASM-10.
  Tests: 16 unit + 7 handler + 3 live-Postgres (user-scoped list, audited completion writes a
  64-hex `event_hash` and stamps `completed_at`, 404 when no step matches).

- **Support cases (`get_me_support_cases` + audited `post_me_support_cases`; FR-ACC-16/FR-SUP-01):**
  `@cpf/account` lists/creates the caller's own `support.cases`. The table carries
  `v2_tenant_isolation` RLS (tenant scope); requester ownership is additionally enforced by an
  explicit `requester_user_id = $1` predicate on reads. `get_me_support_cases` keyset-paginates over
  `(created_at, id)` → concrete `SupportCaseDto` inside `SupportCasePage`. `parseSupportCaseCreate`
  requires `{category, severity, subject, description, purpose}` (severity enum, bounded strings,
  unknown props → 422); `createCase` inserts with server-set `requester_user_id`/`tenant_id`, a
  generated unique `case_reference` (`SC-<uuid>`), initial `status='open'`, then chains a
  `support_case.create` `audit.events` row in the same `withTenant` transaction
  (`x-audit-event: true`). `apps/api` `handleGetMeSupportCases` (200 `SupportCasePage` / 403 / 422)
  and `handlePostMeSupportCase` (422 on bad body, else 200 case / 403). Baseline `SupportCase`/
  `SupportCasePage` items / `SupportCaseCreate` were `GenericRecord`/`GenericCommand` placeholders →
  concrete DTOs recorded as ASM-11 (this slice covers the two collection ops; case detail + messages
  are a follow-up). Tests: 13 unit + 6 handler + 2 live-Postgres (audited create writes a 64-hex
  `event_hash` with `requester_user_id`/`tenant_id` set; list returns only the caller's own case and
  never another requester's in the same tenant).

- **Support case detail + messages (`get_me_support_cases_caseId` + audited
  `post_me_support_cases_caseId_messages`; FR-ACC-16/FR-SUP-02):** `@cpf/account` reads a case's
  thread and appends requester messages over `support.case_messages` (also `v2_tenant_isolation`
  RLS). ASM-12 restricts the `/me` surface to the **requester** relationship (case accessed only when
  `requester_user_id`=caller; missing/non-owned → 404) and to `requester` **visibility only** —
  `internal`/`restricted` messages are never read or written here, and appended messages are forced to
  `visibility='requester'`, `author_user_id`=caller. `getCaseDetail` returns a concrete
  `SupportCaseDetailDto` (the case fields plus a keyset-paginated `messages` page over
  `(created_at, id)`); `addMessage` inserts a body-only message (attachments deferred → `[]`) and
  chains a `support_case.message.create` `audit.events` row in the same `withTenant` transaction
  (`x-audit-event: true`). The `{caseId}` segment is UUID-validated (422) before touching a `uuid`
  column. `apps/api` `handleGetMeSupportCase` (200 detail / 422 / 403 / 404) and
  `handlePostMeSupportCaseMessage` (200 message / 422 / 403 / 404). Tests: 15 unit + 10 handler +
  3 live-Postgres (thread returns only `requester`-visible messages, never the seeded `internal`
  one; audited add writes a 64-hex `event_hash` with `visibility='requester'`; a case owned by
  another requester in the same tenant yields 404).

- **Organisation read (`get_organization`; FR-EA-01) — first Employer Admin surface (`@cpf/org`):**
  a new `@cpf/org` package reads the caller's own `tenant.organizations` row. The table carries **no
  RLS** (it is only in the `updated_at` trigger array, not either RLS array, and has no `tenant_id`),
  so scoping is service-layer: `WHERE id = <caller tenant>`, with no `{id}` path param and thus no
  cross-tenant vector. Access is deny-by-default and gated on the `employer_admin` role (ASM-13);
  `getOrganization` returns a concrete `OrganizationDto`
  (id/slug/legalName/displayName/status/dataRegion/defaultTimezone/branding/settings/timestamps),
  projecting `branding`/`settings` jsonb as objects. The declared `cursor`/`limit` params are
  bounds-validated (422) but inert (no child collection). `apps/api` `handleGetOrganization`
  (200 / 422 / 403 / 404). Tests: 7 unit + 4 handler + 2 live-Postgres (Employer Admin reads their
  own org with jsonb settings projected; a caller without the role is denied 403).

- **Organisation settings update (`patch_organization`; FR-EA-01) — first Employer Admin audited
  write:** `updateOrganization` applies a partial update over the writable subset only
  (`displayName`/`defaultTimezone`/`branding`/`settings`); identity/lifecycle fields
  (`slug`/`status`/`legalName`/timestamps) are never mutable and unknown/immutable keys are rejected
  (422), with at least one field required. Same no-RLS service-layer scoping as the read
  (`WHERE id = <caller tenant>`), deny-by-default on the `employer_admin` `write` grant, and the
  `organization.update` audit event is hash-chained in the **same transaction** as the `UPDATE`
  (`x-audit-event: true`). `IdempotencyKey` is accepted but not yet deduplicated (no idempotency
  store; ASM-14). `apps/api` `handlePatchOrganization` (200 / 422 / 403 / 404). Tests: 8 unit +
  4 handler + 1 live-Postgres (an Employer Admin update writes a 64-hex `event_hash` and persists the
  new values).

- **Organisation members list (`get_organization_members`; FR-EA-02) — first Employer Admin
  collection read:** `listMembers` keyset-paginates `iam.memberships` (both `tenant_isolation` and
  `v2_tenant_isolation` RLS on `tenant_id`), joined with `iam.users` for display fields and role
  codes aggregated from `iam.membership_roles` → `iam.roles`. Deny-by-default on the `employer_admin`
  role (`read`,`organization_member`). Audit is disabled (`x-audit-event: false`). The 200 body uses
  a concrete `MemberDto` (id/userId/email/displayName/status/roles/departmentId/teamId/startsAt/
  endsAt/createdAt/updatedAt) inside a `MemberPageDto` (items/nextCursor/total), with keyset
  cursor + limit. `apps/api` `handleGetOrganizationMembers` (200 / 422 / 403). Tests: 8 unit +
  4 handler + 2 live-Postgres (lists only caller-tenant members with roles aggregated; never
  surfaces members from another tenant via RLS).

## Last green baseline (verified this session)

`pnpm run format` ✅ · `pnpm run lint` ✅ · `pnpm run typecheck` ✅ · `vitest run` ✅ (**286/286**:
272 prior + 8 member unit + 4 handler + 2 live-pg).

## Active blockers (see EXTERNAL_ACTIONS_REQUIRED.md)

- ~~EXT-01 Docker/Postgres~~ **RESOLVED** — local Postgres connected; `DATABASE_URL` in `.env`.
- EXT-02..07 — Vercel, AWS, AI keys, signing, legal/DPO, validated assessment content (later waves).

## Release judgement

**NOT READY** — foundation only. No demo/pilot/production or compliance claim is made.
