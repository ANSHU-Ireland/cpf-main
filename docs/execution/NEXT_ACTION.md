# Next Action — exactly one executable slice

## Immediate resume — 2026-09-06 demo checkpoint

Latest owner instruction: implement against Penpot and schema, and save before usage exhaustion.
Read `AUTH_SOURCE_RECONCILIATION_2026-09-06.md` first. Password-change workspace continuation was
pushed as `14ec8ac`; 31 targeted tests passed. Source AUTH-01/ACC-03 contain generic placeholder
fields/rows, so actual data/behaviour must follow the API and schema. `design-qa.md` is explicitly
blocked for the current auth slice; do not carry forward an old visual pass. Complete matching
viewport/state verification and the real ACC-03 session list/confirmation, then the journey below.

Owner priority changed after the checkpoint below: the demo workflow was unclear and the owner
wants a coherent product evaluation, not a screen catalogue. Read
`DEMO_WORKFLOW_ENTRY_2026-09-06.md` first. The guide, missing role choices and denied-access
recovery are published as `86610ac`, `1aa1239` and `741e40b`.

**Next executable slice:** follow one linked Northstar application from campaign/invitation
through candidate attempt and reviewer submission into the existing decision flow. Find and fix
the first blocking handoff; record exact IDs and browser results. Do not reset the already-issued
example ending 217 or run integration tests against the live demo database. Preserve MFA and
password-change requirements; ask the owner when a new password must be entered. The guide is
orientation, not completion of the product backlog. Save each tested slice immediately.

### Earlier implementation queue (still open)

Read `DEMO_CHECKPOINT_2026-09-06.md` first. Corrected production CSS, QMS visual verification and
the browser draft → distinct approval → issuance → reload journey have passed. Implement the
operations/support no-op actions next; the scoped backlog and usability follow-ups are recorded.
The 1,709-test live suite already passed; do not repeat the entire codebase assessment. After
browser verification, continue the remaining governance forms and operations/support no-op
actions in `DEMO_SCREEN_COVERAGE_2026-09-05.md`. AWS hosting is deferred with blank settings in
the runbook. Commit and push each bounded slice immediately.

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
