# Release Gates

Status is evidence-based as of 2026-08-16. `NOT RUN` is not a pass.

| Gate                              | Current state | Evidence / gap                                                                                                                                                  |
| --------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1 Source fidelity & traceability | PARTIAL       | Source hashes/counts pass; live implementation traceability for 362 requirements is incomplete.                                                                 |
| G2 Business invariants            | PARTIAL       | Core AI/human-authority tests exist; full journey and cross-surface negative coverage is incomplete.                                                            |
| G3 Contract & database            | PARTIAL       | 244/244 dispatcher classification and additive outbox migration tests exist; per-operation semantics and broad live persistence remain incomplete.              |
| G4 Security & privacy             | PARTIAL       | Deny-by-default policy and selected RLS tests exist; real web authentication, object/field controls, uploads, retention, and security matrix remain incomplete. |
| G5 UX fidelity & states           | PARTIAL       | All 125 canonical routes exist and the shared/account repair passed visual QA; most SVGs still lack fidelity evidence and RUN-02/REV-08 materially differ.      |
| G6 Accessibility                  | PARTIAL       | Shared controls and repaired flows have semantic/browser checks; complete keyboard, screen-reader, zoom and high-contrast evidence does not.                    |
| G7 Code quality                   | PASS          | `pnpm verify` passes with clean format/lint/typecheck and 1,519 passing tests; 52 DB-gated tests are exercised by the expanded CI database job.                 |
| G8 Observability & operations     | PARTIAL       | Audit primitives plus leased outbox retry/dead-letter processing exist; transports, structured telemetry, alerting and runbooks remain incomplete.              |
| G9 Performance & resilience       | PARTIAL       | Bounded queue retry and provider timeout/failure-safe behavior have unit evidence; load, restore, failover and full failure-injection evidence remain absent.   |
| G10 Evidence & documentation      | PARTIAL       | Shared UI source/implementation screenshots and passing design QA exist; the 362-requirement live ledger and later release evidence remain incomplete.          |

## Release judgement

**NOT READY** — neither protected-preview readiness nor pilot/production readiness is claimed.
