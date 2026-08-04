# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — notification preferences (`get`/`patch` `/me/notification-preferences`)

**Goal:** the next account self-service surface — read and update the caller's notification
preferences over `iam.notification_preferences` (self RLS), the update being an audited write.

**Source identifiers:**

- OpenAPI notification-preference operations (read + update).
- SQL `iam.notification_preferences` (self RLS `notification_preference_self`).
- Invariants §9 (server-verified identity); audit-integrity invariant for the update.

**Steps:**

1. `@cpf/account`: preference read + audited update use-cases (reuse `PgAuditWriter`).
2. Tests: unit (authz/validation) + live-pg (own prefs only via RLS; update writes a chained event).
3. `apps/api` handlers + tests; update ledgers; commit.

## Completed this loop

- **`patch_me` first audited write** — `@cpf/audit` hash-chain + `updateMe` + `handlePatchMe`.
- **Account session vertical** — `get_me_sessions` keyset paging + audited `delete_me_sessions_sessionId`.
- **Security-events feed** — `get_me_security_events` over a non-RLS table with explicit `user_id`
  scoping (ASM-07), reusing generic keyset-cursor helpers. 131/131 green.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
