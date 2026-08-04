# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — organisation teams (`get_organization_teams` + `post_organization_teams`)

**Goal:** an Employer Admin lists and creates teams within the tenant — extending the same FR-EA-03
requirement surface (departments + teams), same architectural pattern (keyset list + audited create,
deny-by-default, tenant RLS, 409 on duplicate name).

**Source identifiers:**

- OpenAPI `get_organization_teams` / `post_organization_teams` (tag Employer Admin; FR-EA-03;
  `get` audit=false, `post` audit=true; `staffBearer`).
- SQL `tenant.teams` (tenant_isolation + v2 RLS; `tenant_id, name UNIQUE`; has `department_id` FK).

**Steps:**

1. Record ASM-17 (concrete `TeamDto` shape, create semantics including optional `department_id` FK).
2. `@cpf/org`: `team-types.ts`, `team-repository.ts`, `teams.ts` (parse + list + create use-cases,
   deny-by-default read/write on `team` resource).
3. `apps/api`: `teams.handler.ts` + barrel export + `vitest.globalsetup.ts` GRANT.
4. Tests: unit (parse, authz) + handler + live-pg (RLS isolation, audit event, 409 duplicate).
5. Gate (format → typecheck → lint → vitest). Update docs. Commit.

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
  rejected), `organization.update` chained in-tx (ASM-14).
- **Organisation members list** — `get_organization_members` keyset-paginated over RLS-scoped
  `iam.memberships` + `iam.users` + aggregated role codes, deny-by-default on `employer_admin`
  (`read`, `organization_member`), concrete `MemberDto`/`MemberPageDto` (ASM-15). 286/286 green.
- **Organisation departments** — `get_organization_departments` keyset-paginated + audited
  `post_organization_departments` over `tenant.departments` (both RLS policies), deny-by-default on
  `employer_admin` (read/write, `department`), concrete `DepartmentDto`/`DepartmentPageDto`, 409 on
  duplicate name, `department.create` audit event (ASM-16). 309/309 green.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
