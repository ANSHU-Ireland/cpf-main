# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — first audited write (`patch_me`)

**Goal:** the first mutation vertical that writes an audit event. Update the caller's own profile
fields via `patch_me`, authorized deny-by-default, persisted through the tenant RLS context, and
recorded as a hash-chained `audit.events` row (this operation is `x-audit-event: true`).

**Source identifiers:**

- OpenAPI `patch_me` (request body, 200 `UserProfile`, Problem responses).
- SQL `audit.events` (append-only, `previous_hash`/`event_hash` chain); `iam.user_profiles` self RLS.
- Invariants §9 (server-verified identity), audit-integrity invariant.

**Steps:**

1. `@cpf/account`: `updateMe` use-case (validate patch → authorize → update → append audit event).
2. An `AuditWriter` that computes `event_hash` over the previous hash (tamper-evident chain).
3. Tests: unit (authz/validation) + live-pg (update visible only in-tenant; audit row written+chained).
4. `apps/api` `patch_me` handler; update ledgers; commit.

## Then (Wave 1 continuation)

- Account/identity vertical (sign-in, tenant selection) wired UI + API + policy + audit + tests.
- Layer each new endpoint over the validated policy/RLS defence-in-depth.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
