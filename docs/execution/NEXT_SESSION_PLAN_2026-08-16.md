# Next-session continuation plan

_Checkpoint saved: 2026-08-16 · branch `agent/complete-remaining-scope`_

## Checkpoint facts

- All four package typechecks pass: `@cpf/org`, `@cpf/api`, `@cpf/server` and `@cpf/web`.
- No file under `apps/web/app` imports `synthetic.server.ts` or `persistence.server.ts`.
- Candidate, reviewer, employer and substantial admin journeys now use the authenticated platform
  API or an explicit RFC 9457-style `501` boundary where the approved public contract cannot serve
  the screen safely.
- Candidate portal persistence, reviewer persistence, campaign activation preflight, reviewer
  evidence acknowledgement, scorecard submission, account BFFs and core organization/admin
  repositories were advanced in this checkpoint.
- The PostgreSQL audit found and repaired several adapters that compiled against invented columns,
  including plans, feature flags, audit reads, outbox jobs, support cases, AI models, assessment
  versions, plugins and prompt versions.
- `pnpm verify` passes after the final checkpoint batch: formatting, lint and workspace typechecks
  are green; 148 test files pass with 1,559 tests, while 21 database-gated files / 53 tests skip
  without `DATABASE_URL`. The production build and live PostgreSQL integration were not rerun.
  This branch is a continuation checkpoint, not a release-ready claim.

## First executable slice

Complete the remaining checkpoint gates and fix only evidence-backed failures:

```bash
pnpm --filter @cpf/web build
pnpm contracts:check
```

Then run the database-backed suites with the local PostgreSQL URL already described in the repo
runbooks. Record exact passed/skipped counts in `CURRENT_STATE.md`.

## Remaining repository-local work, in order

1. **Finish the PostgreSQL adapter audit.** Compare every query in
   `packages/org/src/pg-extended-repositories.ts` with `cpf_postgresql_schema_v2.0.sql`. Highest
   priority known gaps are platform staff/invitations and membership-role mutation, maintenance
   windows, privileged access grants, governance documents/submissions, audit exports, webhooks and
   integration secret rotation. No adapter may return a successful fabricated record.
2. **Close or formally specify the remaining public API gaps.** The UI now fails closed for
   incomplete governance, operations, privileged-access, administrative support-detail and audit
   workflows. For each gap, follow `SOURCE_HIERARCHY.md`: ADR/threat/privacy review where required,
   OpenAPI delta, migration, handler, repository, tenant-negative tests and traceability update.
   Do not silently reintroduce process-local state.
3. **Add focused regression evidence.** Add handler and repository tests for campaign activation
   preflight, AI-model evaluation-before-activation, assessment-version validation gates, tenant
   status transitions, outbox retry/cancel, plugin/prompt canonical mappings and BFF problem
   propagation.
4. **Exercise complete persisted journeys.** Run browser tests for candidate scheduling/notices,
   reviewer assignment-to-scorecard submission, employer campaign activation and platform-admin
   tenant/plan/flag/job/support flows. Cover ready, empty, validation, denied, expired-session and
   cross-tenant states.
5. **Remove dead compatibility code only after proof.** Once `rg` confirms no imports and tests no
   longer depend on them, delete the obsolete synthetic/persistence stores and update any fixtures
   that still use them directly.
6. **Complete release evidence.** Rerun production build, contract classifier, PostgreSQL/RLS tests,
   accessibility checks and requirement traceability. Update `CURRENT_STATE.md`,
   `FULL_COMPLETION_LEDGER.md` and `RELEASE_GATES.md` with evidence only—never progress estimates.
7. **Final PR pass.** Review the full diff for accidental scope, secrets and generated files;
   split/follow up if necessary; then move the PR from draft only when all repository-local gates are
   green and the remaining blockers are exclusively external.

## External-only blockers (do not simulate)

These remain tracked in `EXTERNAL_ACTIONS_REQUIRED.md`: Vercel project authority, AWS/IaC apply
authority, approved AI-provider keys and vendor evidence, desktop signing/notarisation, legal/DPO
DPIA/FRIA determinations, and validated assessment content. Protected object storage and malware
scanning are also required before artifact-backed governance and upload flows can be enabled.

## Stop conditions

- Never mark the product production-ready while a release gate lacks evidence.
- Never create legal, assessment-validation, vendor, signing or authority evidence on behalf of an
  approver.
- Never make EMP-11, EMP-15, GOV-09 or OPS-02 public by inventing a route; follow the documented
  contract-delta process.
- Prefer a visible `501 application/problem+json` boundary over a successful non-persistent record.
