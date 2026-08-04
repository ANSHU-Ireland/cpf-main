# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — account/identity vertical (first end-to-end slice)

**Goal:** the first full vertical slice wiring UI + API + policy + persistence + audit + tests:
sign-in / current-user, rendered with `@cpf/ui` primitives, authorized by `@cpf/policy`, scoped by
the `withTenant` RLS context, against real `iam` tables.

**Source identifiers:**

- OpenAPI: auth/session + current-user operations in `@cpf/contracts` `OPERATIONS`.
- SQL: `iam.users`, `iam.memberships`, `runtime.sessions`; RLS `app.tenant_id` context.
- Invariants §9 (server-verified tenant identity, deny-by-default).

**Steps:**

1. Pick the concrete auth/session operationIds from the manifest; define request/response DTOs.
2. Server handler(s): authenticate → establish tenant context → `can()` authorize → query → audit.
3. UI: sign-in form from `@cpf/ui` `Field`/`Input`/`Button`; current-user display.
4. Tests across the slice (handler + policy + a11y) and an audit-event assertion. Update ledgers; commit.

## Then (Wave 1 continuation)

- Account/identity vertical (sign-in, tenant selection) wired UI + API + policy + audit + tests.
- Layer each new endpoint over the validated policy/RLS defence-in-depth.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
