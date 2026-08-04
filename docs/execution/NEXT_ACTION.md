# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — organisation settings update (`patch_organization`)

**Goal:** an Employer Admin updates the permitted subset of their own tenant's organisation settings —
the first **audited** Employer Admin write, paired with the just-shipped read.

**Source identifiers:**

- OpenAPI `patch_organization` (tag Employer Admin; FR-EA-01; audit=**true**; `IdempotencyKey`; body
  `GenericCommand`; `x-required-roles: [Employer Admin]`).
- SQL `tenant.organizations` — **no RLS** (it is only in the `trg_updated_at` trigger array, not
  either RLS array, and has no `tenant_id`); same service-layer `WHERE id = <caller tenant>` scoping
  as the read. `display_name`/`default_timezone`/`branding`/`settings` are candidate mutable fields.

**Steps:**

1. Decide the permitted mutable field set (e.g. `displayName`, `defaultTimezone`, `branding`,
   `settings`) — never `slug`/`status`/`legal_name` from this surface. Record an ASM for the writable
   projection.
2. `@cpf/org`: `parseOrganizationUpdate` (reject unknown/immutable keys, bounded strings, jsonb
   guards) + audited `updateOrganization` use-case (deny-by-default write; chains an
   `organization.update` event in the same `withTenant` tx; `x-audit-event: true`).
3. Tests: unit (authz/validation/immutable-field rejection) + live-pg (own-org update writes a
   chained event). Add `GRANT UPDATE ON tenant.organizations`.
4. `apps/api` `handlePatchOrganization` + tests; update ledgers; commit.

> **Note:** the `get_organization` read is DONE this loop — new `@cpf/org` package,
> `PgOrganizationRepository` (own-org read, no RLS → `WHERE id = <caller tenant>`),
> `handleGetOrganization`, `GRANT SELECT ON tenant.organizations`, ASM-13 (role code `employer_admin`
>
> - concrete `OrganizationDto`). Correction vs the prior plan: `tenant.organizations` carries **no**
>   RLS (verified in DDL), so isolation is service-layer only.

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
  `internal`/`restricted`), UUID-validated path, 404 for missing/non-owned (ASM-12).
- **Organisation read (Employer Admin)** — new `@cpf/org` package; `get_organization` over
  `tenant.organizations` (no RLS → service-layer `WHERE id = <caller tenant>`), deny-by-default on
  the `employer_admin` role, concrete `OrganizationDto` (ASM-13). 259/259 green.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
