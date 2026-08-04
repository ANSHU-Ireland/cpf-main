# Next Action — exactly one executable slice

## Immediate next slice: `@cpf/policy` + tenant-context RLS negative test

**Goal:** deny-by-default RBAC/ABAC skeleton with a verified server-side tenant context, and a
cross-tenant RLS negative test proving isolation on `runtime.sessions` (Contract §12, invariant §9).

**Source identifiers:**

- SQL: `iam.current_tenant_id()` (reads `app.tenant_id` GUC), RLS policies `v2_tenant_isolation`.
- Invariants §9 (tenant identity from verified server context, deny-by-default), §10 (segregation).

**Steps:**

1. `@cpf/db`: add `withTenant(pool, tenantId, fn)` setting `app.tenant_id`/`app.user_id` via
   `set_config(...)` on a dedicated connection, plus a non-superuser app role so RLS is enforced.
2. Add a cross-tenant negative test: seed two tenants, assert tenant A cannot read tenant B rows.
3. `@cpf/policy`: pure deny-by-default `can(actor, action, resource)` predicate + unit tests
   (100% branch on the policy module, like the domain invariants).
4. Update ledgers; commit.

## Then (Wave 0 tail → Wave 1 entry)

- `@cpf/policy` deny-by-default RBAC/ABAC skeleton + tenant-context type + negative tests,
  layered over the DB RLS defence-in-depth already validated in `@cpf/db`.
- Extend `@cpf/db` with a tenant-context helper (`set_config('app.tenant_id', …)`) and a
  cross-tenant RLS negative test proving isolation on `runtime.sessions`.
- Then Wave 1: design tokens → `@cpf/ui` primitives → account/identity vertical.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
