# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — general preferences (`get_me_preferences` / `put_me_preferences`)

**Goal:** the next `/me` self-service surface — read and update the caller's general application
preferences, the update being an audited write, reusing the notification-preferences pattern.

**Source identifiers:**

- OpenAPI `get_me_preferences` (GET `/me/preferences`) + `put_me_preferences` (PUT `/me/preferences`).
- SQL preferences storage (confirm table/columns + RLS in `cpf_postgresql_schema_v2.0.sql`).
- Invariants §9 (server-verified identity); audit-integrity invariant for the update.

**Steps:**

1. Confirm the backing table + RLS for `/me/preferences` in the SQL baseline; record any assumption.
2. `@cpf/account`: preference read + audited update use-cases (reuse `PgAuditWriter`, deny-by-default).
3. Tests: unit (authz/validation) + live-pg (own prefs only via RLS; update writes a chained event).
4. `apps/api` handlers + tests; add role grants to `vitest.globalsetup.ts` if a new table is touched;
   update ledgers; commit.

## Completed this loop

- **`patch_me` first audited write** — `@cpf/audit` hash-chain + `updateMe` + `handlePatchMe`.
- **Account session vertical** — `get_me_sessions` keyset paging + audited `delete_me_sessions_sessionId`.
- **Security-events feed** — `get_me_security_events` over a non-RLS table with explicit `user_id`
  scoping (ASM-07), reusing generic keyset-cursor helpers.
- **Notification preferences** — `get_me_notification_preferences` + audited
  `put_me_notification_preferences` over `notification_preference_self` RLS with a mandatory guard.
- **Integration provisioning** — `cpf_app` role + grants moved to a single Vitest `globalSetup`,
  removing a concurrent-DDL catalog race. 151/151 green.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
