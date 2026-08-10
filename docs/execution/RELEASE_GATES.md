# Release Gates

Status is evidence-based as of 2026-08-10. `NOT RUN` is not a pass.

| Gate                              | Current state      | Evidence / gap                                                                                                                                                  |
| --------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1 Source fidelity & traceability | PARTIAL            | Source hashes/counts pass; live implementation traceability for 362 requirements is incomplete.                                                                 |
| G2 Business invariants            | PARTIAL            | Core AI/human-authority tests exist; full journey and cross-surface negative coverage is incomplete.                                                            |
| G3 Contract & database            | PARTIAL            | 244-operation manifest and baseline/RLS tests pass; real server wiring, ordered deltas, and broad persistence remain incomplete.                                |
| G4 Security & privacy             | PARTIAL            | Deny-by-default policy and selected RLS tests exist; real web authentication, object/field controls, uploads, retention, and security matrix remain incomplete. |
| G5 UX fidelity & states           | PARTIAL            | All 125 canonical routes exist and the shared/account repair passed visual QA; most SVGs still lack fidelity evidence and RUN-02/REV-08 materially differ.      |
| G6 Accessibility                  | PARTIAL            | Shared controls and repaired flows have semantic/browser checks; complete keyboard, screen-reader, zoom and high-contrast evidence does not.                    |
| G7 Code quality                   | PASS WITH WARNINGS | Format/typecheck/build pass; 1,526 tests pass; lint has 14 non-blocking warnings.                                                                               |
| G8 Observability & operations     | PARTIAL            | Audit primitives and demo operations UI exist; workers/outbox processing, structured telemetry, alerting, and runbooks remain incomplete.                       |
| G9 Performance & resilience       | NOT RUN            | No complete load, bundle-budget, queue replay, provider outage, restore, or failure-injection evidence.                                                         |
| G10 Evidence & documentation      | PARTIAL            | Shared UI source/implementation screenshots and passing design QA exist; the 362-requirement live ledger and later release evidence remain incomplete.          |

## Release judgement

**NOT READY** — neither protected-preview readiness nor pilot/production readiness is claimed.
