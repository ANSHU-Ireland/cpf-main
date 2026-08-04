# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — data export request (`post_me_data_export`)

**Goal:** the caller requests a personal-data export (GDPR Art. 20 portability) — an audited command
that enqueues an export request for the caller, deny-by-default and self-scoped.

**Source identifiers:**

- OpenAPI `post_me_data_export` (POST `/me/data-export`); confirm request/response schema + whether
  it is `x-audit-event: true` and carries an Idempotency-Key.
- SQL backing table for data-export requests (confirm table/columns + RLS in the baseline; record an
  assumption if the projection is a `GenericCommand`/`GenericRecord` placeholder).
- Invariants §9 (server-verified identity); audit-integrity invariant for the command.

**Steps:**

1. Confirm the backing table + RLS and the operation's audit flag in the source files; record ASM if
   the schema is a placeholder.
2. `@cpf/account`: request-creation use-case (deny-by-default, audited via `PgAuditWriter`).
3. Tests: unit (authz/validation) + live-pg (own request only via RLS; writes a chained event).
4. `apps/api` handler + tests; add any new-table grant to `vitest.globalsetup.ts`; update ledgers;
   commit.

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
  concrete `UserPreferencesDto` (ASM-08). 171/171 green.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
