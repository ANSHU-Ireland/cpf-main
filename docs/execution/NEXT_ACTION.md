# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — support case detail + messages (`get_me_support_cases_caseId` / `post_me_support_cases_caseId_messages`)

**Goal:** the requester reads one of their own cases with its message thread and posts a message —
a paginated authorised read plus an audited create over `support.case_messages`.

**Source identifiers:**

- OpenAPI `get_me_support_cases_caseId` (audit=false; "Requester or assigned support") /
  `post_me_support_cases_caseId_messages` (audit=true; body `SupportMessageCreate`).
- SQL `support.case_messages` (`case_id` FK, `author_user_id`, `visibility` CHECK, `body`,
  `attachments` jsonb) — carries `v2_tenant_isolation`; enforce requester ownership of the parent
  case explicitly.

**Steps:**

1. Confirm access rule (requester-owned case) + audit flags; the caller may only see `requester`-
   visibility messages (never `internal`/`restricted`). Record ASM if projections are placeholders.
2. `@cpf/account`: read-case-with-messages + audited add-message use-cases (deny-by-default).
3. Tests: unit (authz/validation/visibility filter) + live-pg (own case only; message create writes
   a chained event; foreign case → 404).
4. `apps/api` handlers + tests; add `support.case_messages` grant to `vitest.globalsetup.ts`; update
   ledgers; commit.

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
  concrete `SupportCaseDto` (ASM-11). 218/218 green.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
