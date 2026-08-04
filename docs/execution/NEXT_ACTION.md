# Next Action — exactly one executable slice

## Immediate next slice: Wave 1 — `get_me` HTTP boundary + UI profile view

**Goal:** expose the completed `@cpf/account` `getMe` use-case over an HTTP handler validated against
the `@cpf/contracts` `get_me` operation (problem+json errors, correlation id), and render the
returned profile with `@cpf/ui` primitives.

**Source identifiers:**

- OpenAPI `get_me` (200 `UserProfile`, Problem responses, `X-Correlation-ID` header).
- `@cpf/account` `getMe` (already tested end-to-end against live RLS).

**Steps:**

1. Add an app/server package with a `get_me` handler: map `GetMeResult` → 200 / 403 / 404 Problem.
2. Handler test: authorized 200 shape, 404 problem, 403 problem; assert correlation id echoed.
3. UI: a profile view composed from `@cpf/ui` (name, email, tenant roles), with an a11y test.
4. Update ledgers; commit. Then the first audited write vertical (e.g. `patch_me`).

## Then (Wave 1 continuation)

- Account/identity vertical (sign-in, tenant selection) wired UI + API + policy + audit + tests.
- Layer each new endpoint over the validated policy/RLS defence-in-depth.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
