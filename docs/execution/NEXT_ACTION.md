# Next Action — exactly one executable slice

## Immediate next slice: `@cpf/contracts` from the OpenAPI baseline

**Goal:** derive typed request/response schemas from `cpf_openapi_baseline_v2.0.yaml` (244
operations) and wire a CI drift check, so all later API work is contract-first (RISK-04).

**Source identifiers:**

- OpenAPI: `docs/source-of-truth/originals/cpf_openapi_baseline_v2.0.yaml` (244 operationIds).
- TRD §architecture (types generated/validated from OpenAPI; prevent DTO drift).

**Steps:**

1. Add `packages/contracts` with a pinned OpenAPI→TS type generator (e.g. `openapi-typescript`).
2. Generate `src/generated/openapi.ts`; commit generated output; add `contracts:check` script
   that regenerates and `git diff --exit-code`s to fail CI on drift.
3. Add a smoke test asserting the generated type surface exports the 244 operation paths.
4. Update IMPLEMENTATION_LEDGER + CURRENT_STATE; commit.

## Then (Wave 0 tail → Wave 1 entry)

- `@cpf/policy` deny-by-default RBAC/ABAC skeleton + tenant-context type + negative tests.
- `@cpf/db` migration runner over the SQL baseline + CONFLICT-001 partition regression test
  (gated on Postgres availability, EXT-01).
- Then Wave 1: design tokens → `@cpf/ui` primitives → account/identity vertical.

## Standing rules for the loop

- One vertical slice at a time (UI + API + domain + persistence + audit + tests + docs).
- No requirement marked done without linked passing evidence.
- Never weaken tests or force counts to match docs. Record conflicts, continue unaffected work.
