# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — read organisation settings (`get_organization`)

**Goal:** an Employer Admin reads their own tenant's organisation settings — the first
role-gated (not just `/me`-self) authorised read, opening the Employer Admin surface.

**Source identifiers:**

- OpenAPI `get_organization` (tag Employer Admin; FR-EA-01; audit=false; `x-required-roles:
  [Employer Admin]`; `cursor`/`limit` query params; `staffBearer` security).
- SQL `tenant.organizations` (tenant-scoped root; carries `tenant_isolation` RLS via
  `iam.current_tenant_id()`).

**Steps:**

1. Confirm the authorisation rule: **Employer Admin** role required (deny-by-default via `@cpf/policy`
   against a new `organization` resource type) — this is the first non-`self_*` grant. Confirm the
   200 projection; record an ASM for the concrete `OrganizationDto` (baseline is a `GenericRecord`
   placeholder) and for how `cursor`/`limit` apply to a single-org read.
2. `@cpf/account` (or a new `@cpf/org` module — decide and record): a deny-by-default
   `getOrganization` read over `tenant.organizations` (RLS-scoped; assumed `cpf_app` role).
3. Tests: unit (authz: Employer Admin allowed, other roles 403; projection) + live-pg (RLS returns
   only the caller's tenant org).
4. `apps/api` `handleGetOrganization` (200 / 403) + tests; add any new grant to
   `vitest.globalsetup.ts`; update ledgers; commit.

> **Deferred:** `post_me_data_export` (FR-ACC-19) and `post_me_deactivation` (FR-ACC-20) are blocked
> on the hiring candidate vertical + user→candidate identity resolution — see ASM-09. Revisit once
> `hiring.candidates` and identity verification exist.

## Completed this loop

- **`patch_me` first audited write** — `@cpf/audit` hash-chain + `updateMe` + `handlePatchMe`.
- **Account session vertical** — `get_me_sessions` keyset paging + audited `delete_me_sessions_sessionId`.
- **Security-events feed** — `get_me_security_events` over a non-RLS table with explicit `user_id`
  scoping (ASM-07), reusing generic keyset-cursor helpers.
- **Notification preferences** — `get_me_notification_preferences` + audited
  `put_me_notification_preferences` over `notification_preference_self` RLS with a mandatory guard.
- **Integration provisioning** — `cpf_app` role + grants moved to a single Vitest `globalSetup`,
  removing a concurrent-DDL catalog race.
- **General preferences** — `get_me_preferences` + audited `put_me_preferences` over the locale +
  accessibility subset of `iam.user_profiles` (`user_profile_self` RLS), bounded jsonb flags,
  concrete `UserPreferencesDto` (ASM-08).
- **Onboarding checklist** — `get_me_onboarding` keyset paging + audited
  `put_me_onboarding_stepCode` over `iam.onboarding_progress` (no RLS → explicit `user_id` scoping,
  ASM-10); update-only of an existing step (404 if absent), user-settable statuses only.
- **Support cases (collection)** — `get_me_support_cases` keyset paging + audited
  `post_me_support_cases` over `support.cases` (`v2_tenant_isolation` RLS + explicit
  `requester_user_id` scoping); server-set requester/tenant/`SC-<uuid>` reference/`open` status,
  concrete `SupportCaseDto` (ASM-11).
- **Support case detail + messages** — `get_me_support_cases_caseId` (case + keyset-paginated
  requester-visible thread) + audited `post_me_support_cases_caseId_messages` over
  `support.case_messages`; requester-only relationship, `requester` visibility only (never
  `internal`/`restricted`), UUID-validated path, 404 for missing/non-owned (ASM-12). 246/246 green.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
