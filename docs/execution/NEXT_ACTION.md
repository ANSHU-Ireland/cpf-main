# Next Action — exactly one executable slice

## Verify the continuation checkpoint

**Goal:** turn the saved `agent/complete-remaining-scope` checkpoint into a fully measured local
baseline before adding another feature.

1. Treat the passing `pnpm verify` result (148 files / 1,559 tests passing; 21 files / 53 tests
   skipped without `DATABASE_URL`) as the checkpoint baseline.
2. Run the production web build and contract check.
3. Run the PostgreSQL-backed repository/RLS suites with the configured local database.
4. Fix only evidence-backed regressions from those gates.
5. Record exact results in `CURRENT_STATE.md` and continue with the ordered worklist in
   `NEXT_SESSION_PLAN_2026-08-16.md`.

**Completion condition:** formatting, lint, typecheck, unit tests, production build, contract check
and database-backed tests have current evidence, with every skip or blocker explicitly accounted
for.
