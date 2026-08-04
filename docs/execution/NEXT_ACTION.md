# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — user-visible security events (`get_me_security_events`)

**Goal:** complete the account self-service read surface with the security-events feed
(`get_me_security_events`, FR-ACC-18, `x-audit-event: false`), reading the caller's own
`iam.account_security_events` through the self RLS policy, keyset-paginated like sessions.

**Source identifiers:**

- OpenAPI `get_me_security_events` (SecurityEventPage, cursor/limit paging).
- SQL `iam.account_security_events` (per-user self RLS).
- Invariants §9 (server-verified identity).

**Steps:**

1. `@cpf/account`: security-event read use-case + projection (reuse keyset paging helpers).
2. Tests: unit (authz/paging) + live-pg (own events only via RLS).
3. `apps/api` handler + tests; update ledgers; commit.

## Completed this loop

- **`patch_me` first audited write** — `@cpf/audit` hash-chain + `updateMe` + `handlePatchMe`.
- **Account session vertical** — `get_me_sessions` (keyset paging) + audited
  `delete_me_sessions_sessionId`, layered over the `user_session_self` RLS policy. 120/120 green.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
