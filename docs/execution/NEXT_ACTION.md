# Next Action — exactly one executable slice

## Finish audit access scope and browser acceptance

**Checkpoint:** canonical collection creation, custody events, requirement lookup, tenant RLS,
web API adapters and synthetic seed examples are implemented. Creation/reload and transaction
side effects passed isolated live probes in August. Scope-specific authorization, complete
traceability evidence and browser acceptance remain open.

**Goal:** finish the audit slice without treating synthetic fixtures as release approval.

1. Add approved, purpose-scoped and time-bound collection access. Tenant RLS alone is insufficient
   to close FR-AUD-01 or FR-AUD-05.
2. Complete collection pagination and display its scope clearly. The current list is capped at 100.
3. Verify creation from an empty workspace, error handling, custody visibility, blocked requirement
   status and reload persistence in browser UAT.
4. Enforce tenant RLS and least-privilege grants; write hash-chained audit and transactional outbox
   evidence for every accepted mutation.
5. Add live PostgreSQL tests for persistence, repository recreation, membership counts, known and
   unknown requirements, audit/outbox evidence and cross-tenant denial.
6. Record fresh `pnpm verify`, live PostgreSQL, production-build and contract-check results for the
   published commit. Keep demonstration rows separate from the 362-requirement release ledger.

After this slice, continue with candidate profile-correction/explanation/human-review persistence,
then candidate merge preview/reversal. Each still has either an invented column mapping or an
audit-only/fabricated success path.

**Completion condition:** audit evidence collections and requirement traceability use verified
tenant-scoped persistence, return no invented success or coverage, and all repository gates finish
with zero unexplained skips or failures.
