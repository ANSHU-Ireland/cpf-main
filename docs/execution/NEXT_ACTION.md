# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — support cases (`get_me_support_cases` / `post_me_support_cases`)

**Goal:** the caller lists and opens their own support cases — a paginated read plus an audited
create over `support.cases`, deny-by-default and user-scoped.

**Source identifiers:**

- OpenAPI `get_me_support_cases` / `post_me_support_cases` (paths under `/me/support-cases`); confirm
  request/response schemas + audit flags + Idempotency-Key.
- SQL `support.cases` (confirm columns, user linkage, and RLS in the baseline; record an assumption
  if the projection is a `GenericCommand`/`GenericRecord` placeholder).

**Steps:**

1. Confirm the backing table + RLS/user-scoping and the operations' audit flags; record ASM if a
   schema is a placeholder.
2. `@cpf/account` (or a new package): list + audited create use-cases (deny-by-default via
   `PgAuditWriter`).
3. Tests: unit (authz/validation) + live-pg (own cases only; create writes a chained event).
4. `apps/api` handlers + tests; add any new-table grant to `vitest.globalsetup.ts`; update ledgers;
   commit.

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
  ASM-10); update-only of an existing step (404 if absent), user-settable statuses only. 197/197 green.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
