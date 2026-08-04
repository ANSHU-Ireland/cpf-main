# Release Gates

Per-iteration gates (Contract §15). Record `PASS` / `FAIL` / `N/A` with evidence.
`NOT RUN` is never a pass.

| Gate                                | Description                                                                            | Current state       |
| ----------------------------------- | -------------------------------------------------------------------------------------- | ------------------- |
| G1 Source fidelity & traceability   | IDs exist; ledger links code⇄tests; deviations have records.                           | Active              |
| G2 Business invariants              | State machines, human-only score/decision, immutability, idempotency, concurrency.     | Active              |
| G3 Contract & database              | OpenAPI lint; types match; migrations apply; RLS/cross-tenant negative tests.          | Pending pg (EXT-01) |
| G4 Security & privacy               | AuthN/Z, object/field/tenant isolation, input/output validation, redaction, retention. | Active              |
| G5 UX fidelity & state completeness | Screen purpose/actor/authority + all applicable states.                                | Not started         |
| G6 Accessibility                    | Automated + manual; WCAG 2.2 AA.                                                       | Not started         |
| G7 Code quality                     | Format, lint, strict types, tests, no swallowed errors/secrets/dead code.              | Active              |
| G8 Observability & operations       | Structured logs, audit/outbox events, correlation IDs, safe-disable.                   | Active              |
| G9 Performance & resilience         | Bounded/paginated queries, budgets, failure/cancellation paths.                        | Not started         |
| G10 Evidence & documentation        | Commands/results/artifacts recorded; docs updated.                                     | Active              |

## Release judgement (current)

**NOT READY** — Wave 0 foundation in progress. No demo/pilot/production claim is made.

Allowed terminal judgements: `READY FOR PROTECTED SYNTHETIC DEMO`,
`READY FOR CONTROLLED PILOT SUBJECT TO LISTED SIGN-OFFS`, `NOT READY`,
`LEGAL INTERPRETATION REQUIRED`, `CONFORMITY ASSESSMENT REQUIRED`.
