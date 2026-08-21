# Release Gates

Status is evidence-based as of 2026-08-21. `NOT RUN` is not a pass.

| Gate                              | Current state | Evidence / gap                                                                                                                                                                                                                                 |
| --------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1 Source fidelity & traceability | PARTIAL       | Source hashes/counts pass; live implementation traceability for 362 requirements is incomplete.                                                                                                                                                |
| G2 Business invariants            | PARTIAL       | Core AI/human-authority tests exist; full journey and cross-surface negative coverage is incomplete.                                                                                                                                           |
| G3 Contract & database            | PARTIAL       | Contract regeneration passes for 244 operations; the complete live-PostgreSQL run passes 174 files / 1,622 tests with zero skips. Per-operation semantic evidence remains incomplete.                                                          |
| G4 Security & privacy             | PARTIAL       | Deny-by-default policy and selected RLS tests exist; real web authentication, object/field controls, uploads, retention, and security matrix remain incomplete.                                                                                |
| G5 UX fidelity & states           | PARTIAL       | All 125 canonical routes exist; shared/account, RUN-02 and REV-08 evidence has no open P0/P1/P2 finding. Most SVG routes and interaction states still lack route-specific fidelity evidence.                                                   |
| G6 Accessibility                  | PARTIAL       | Shared controls and repaired flows have semantic/browser checks; complete keyboard, screen-reader, zoom and high-contrast evidence does not.                                                                                                   |
| G7 Code quality                   | PARTIAL       | Formatting, lint, all 16 workspace typechecks, 1,559 non-database tests, the 1,622-test configured PostgreSQL run and the 97-page production build pass at this checkpoint. Remaining partial status reflects unclosed product/evidence scope. |
| G8 Observability & operations     | PARTIAL       | Audit primitives plus leased outbox retry/dead-letter processing exist; transports, structured telemetry, alerting and runbooks remain incomplete.                                                                                             |
| G9 Performance & resilience       | PARTIAL       | Bounded queue retry and provider timeout/failure-safe behavior have unit evidence; load, restore, failover and full failure-injection evidence remain absent.                                                                                  |
| G10 Evidence & documentation      | PARTIAL       | Shared UI source/implementation screenshots and passing design QA exist; the 362-requirement live ledger and later release evidence remain incomplete.                                                                                         |

## Release judgement

**NOT READY** — neither protected-preview readiness nor pilot/production readiness is claimed.
