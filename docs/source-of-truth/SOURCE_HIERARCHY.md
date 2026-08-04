# Source Authority & Conflict Hierarchy

When two sources conflict, the higher-numbered authority does **not** override the lower
number. A lower item never overrides a higher-level safety or authority rule.

1. **Non-negotiable invariants** in the build contract and explicit PRD/TRD prohibitions.
2. **Approved, versioned change records** created after the supplied v2.0 baseline
   (`docs/source-of-truth/proposals/` once approved; `docs/execution/decisions/` ADRs).
3. **PRD** business requirements + `cpf_requirements_traceability_v2.0.csv`
   (outcomes, priorities, verification, release gates).
4. **TRD** — architecture, trust boundaries, quality attributes, operational behaviour.
5. **OpenAPI** — HTTP paths, methods, schemas, roles, audit metadata, request/response.
6. **PostgreSQL DDL** — structural DB facts; the **data dictionary** governs field purpose,
   classification, retention/access intent, encryption/audit expectations.
7. **Penpot handoff** — journeys, visual/state behaviour, UI-to-contract mapping.
8. **Existing implementation**, when present.

## Conflict procedure

For every conflict create `docs/execution/conflicts/CONFLICT-<n>.md` that:

- quotes exact identifiers and affected screens/operations/tables;
- selects the safest reversible behaviour preserving higher-authority invariants;
- adds a failing or pending regression test demonstrating the conflict;
- lets unaffected work continue;
- never hides the discrepancy by editing generated counts.

## Known reconciliation items (tracked)

- **CONFLICT-001** — 138 logical tables (dictionary/TRD) vs 139 schema-coverage rows
  (`audit.events_default` partition entry).

## Known release-blocking UI/API gaps (from `ui_api_gaps.csv`, resolved additively)

- **EMP-11** — tenant-scoped candidate directory search/list contract.
- **EMP-15** — employer/campaign scheduling operations read model.
- **GOV-09** — versioned human-oversight-plan contract.
- **OPS-02** — governed security containment / kill-switch commands.

Each gap requires an ADR, threat/privacy note, OpenAPI delta, migration delta if needed,
contract tests, and traceability updates. The v2.0 originals are never mutated.
