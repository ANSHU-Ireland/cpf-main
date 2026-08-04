# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — invite a tenant member (`post_organization_member_invitations`)

**Goal:** an Employer Admin invites a new member to the tenant — the first Employer Admin **audited
collection write** on the membership surface, paired with the just-shipped member list.

**Source identifiers:**

- OpenAPI `post_organization_member_invitations` (tag Employer Admin; FR-EA-02; audit=**true**;
  `IdempotencyKey`; body `GenericCommand`; `staffBearer`).
- SQL `iam.memberships` (tenant_isolation + v2 RLS), `iam.users` (invited status), `iam.membership_roles`.

**Steps:**

1. Confirm the invitation shape (create a user + membership with `status='invited'`, assign initial
   roles). Record an ASM for the concrete `InvitationDto` and the create semantics.
2. `@cpf/org`: `parseInvitationCreate` (email, roles, department/team optional) + audited
   `inviteMember` use-case (deny-by-default write; chains an `organization_member.invite` event).
3. Tests: unit (authz/validation/duplicate rejection) + live-pg (invitation writes a chained event;
   invited member appears in the list). Add any new `GRANT`s.
4. `apps/api` `handlePostOrganizationMemberInvitation` + tests; update ledgers; commit.

> **Note:** the `/organization/members` read is DONE — `get_organization_members` keyset-paginated
> over RLS-scoped `iam.memberships` + `iam.users` + aggregated role codes, deny-by-default on
> `employer_admin` (read, organization_member), concrete `MemberDto` in `MemberPageDto` (ASM-15).

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
  rejected), `organization.update` chained in-tx (ASM-14).
- **Organisation members list** — `get_organization_members` keyset-paginated over RLS-scoped
  `iam.memberships` + `iam.users` + aggregated role codes, deny-by-default on `employer_admin`
  (`read`, `organization_member`), concrete `MemberDto`/`MemberPageDto` (ASM-15). 286/286 green.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
