# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — list organisation members (`get_organization_members`)

**Goal:** an Employer Admin lists the tenant's members with their roles and access-review state — the
first Employer Admin **collection** read, opening the membership-management surface.

**Source identifiers:**

- OpenAPI `get_organization_members` (tag Employer Admin; FR-EA-02; audit=false; `cursor`/`limit`
  query params; `staffBearer`).
- SQL `iam.memberships` (user↔tenant), `iam.membership_roles` (role assignments), `iam.roles`
  (`code`/`scope`), `iam.users` (`display_name`/`email`/`status`) — confirm which carry
  `tenant_isolation` RLS and how access-review state is represented.

**Steps:**

1. Confirm the join shape (memberships → users + aggregated role codes) and the keyset order
   (likely `(created_at, id)` on `iam.memberships`). Record an ASM for the concrete
   `OrganizationMemberDto` + how "access-review state" maps to schema columns.
2. `@cpf/org`: `parseOrganizationMemberQuery` + `listOrganizationMembers` (deny-by-default `read` on
   a new `organization_member` resource type or reuse `organization`), keyset-paginated.
3. Tests: unit (authz/validation/paging) + live-pg (only same-tenant members returned; roles
   aggregated). Add any new `GRANT`s to `vitest.globalsetup.ts`.
4. `apps/api` `handleGetOrganizationMembers` + tests; update ledgers; commit.

> **Note:** the `/organization` root pair is DONE — `get_organization` (read) and
> `patch_organization` (first Employer Admin **audited** write over the writable subset
> `displayName`/`defaultTimezone`/`branding`/`settings`, `organization.update` chained in-tx, ASM-14).
> `tenant.organizations` carries **no** RLS → service-layer `WHERE id = <caller tenant>` scoping.

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
  `internal`/`restricted`), UUID-validated path, 404 for missing/non-owned (ASM-12).
- **Organisation read (Employer Admin)** — new `@cpf/org` package; `get_organization` over
  `tenant.organizations` (no RLS → service-layer `WHERE id = <caller tenant>`), deny-by-default on
  the `employer_admin` role, concrete `OrganizationDto` (ASM-13).
- **Organisation settings update** — `patch_organization`, the first Employer Admin **audited** write
  over the writable subset (`displayName`/`defaultTimezone`/`branding`/`settings`; immutable keys
  rejected), `organization.update` chained in-tx (ASM-14). 272/272 green.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
