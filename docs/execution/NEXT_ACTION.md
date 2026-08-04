# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — account session vertical (sign-in / current session)

**Goal:** extend the identity vertical beyond profile read/update toward authentication. The next
mutation-free-then-audited slice is the current-session view and session revocation, layered over
the proven policy + RLS + audit defence-in-depth.

**Source identifiers:**

- OpenAPI account/session operations (e.g. list/revoke `user_sessions`).
- SQL `iam.user_sessions` (per-user rows), `audit.events` (revocation is `x-audit-event: true`).
- Invariants §9 (server-verified identity), audit-integrity invariant.

**Steps:**

1. `@cpf/account`: session read use-case (list caller's own sessions via RLS context).
2. Session revoke as the next audited write, reusing `PgAuditWriter`.
3. Tests: unit (authz) + live-pg (own sessions only; revoke writes a chained audit row).
4. `apps/api` handler + `apps/web` view; update ledgers; commit.

## Completed this loop

- **`patch_me` first audited write** — `@cpf/audit` hash-chain + `@cpf/account` `updateMe` +
  `apps/api` `handlePatchMe`. 101/101 tests green (incl. live-Postgres audit proof).

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
