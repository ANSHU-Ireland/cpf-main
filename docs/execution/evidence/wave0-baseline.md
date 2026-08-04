# Evidence — Wave 0 baseline

_Recorded: 2026-08-04_

## Source hash verification (PowerShell `Get-FileHash -Algorithm SHA256`)

| File                                   | Bytes   | SHA-256 (prefix) | Expected    | Result |
| -------------------------------------- | ------- | ---------------- | ----------- | ------ |
| CPF_Product_Requirements_Pack_v2.0.md  | 123,967 | `e10ca347f7bc`   | `e10ca347…` | PASS   |
| CPF_Developer_Handover_TRD_v2.0.md     | 19,740  | `e7c3b5bb56bb`   | `e7c3b5bb…` | PASS   |
| cpf_requirements_traceability_v2.0.csv | 336,302 | `b368148412d5`   | `b3681484…` | PASS   |
| cpf_schema_data_dictionary_v2.0.csv    | 803,066 | `1d5d6cd82c18`   | `1d5d6cd8…` | PASS   |
| cpf_openapi_baseline_v2.0.yaml         | 406,430 | `a517c93a3bfc`   | `a517c93a…` | PASS   |
| cpf_postgresql_schema_v2.0.sql         | 94,771  | `c51eaa398cb1`   | `c51eaa39…` | PASS   |

## Record counts

- Requirements CSV data rows: **362** (expected 362) — PASS.
- Data-dictionary CSV data rows: **1,543** (expected 1,543) — PASS.
- OpenAPI `operationId` count: **244** (expected 244) — PASS.
- Penpot `source-manifest.json`: screens 125, ops 244, reqs 362, tables 139, dictionary 1,543 — PASS.

## Table-count reconciliation (CONFLICT-001)

`cpf_postgresql_schema_v2.0.sql:1152` → `CREATE TABLE audit.events_default PARTITION OF
audit.events DEFAULT;` confirms 139 is a physical DEFAULT partition; logical count = 138.

## Toolchain

- Node v24.11.1, npm 11.6.2, pnpm 10.22.0 — present.
- Docker — **absent** (`docker` not recognized). Logged as EXT-01.
- Git root before: `C:/Users/adikr/Desktop` (0 commits, personal files). After `git init` in
  project: `C:/Users/adikr/Desktop/CPF-Dev`.

## Quality gate (this session)

| Gate                  | Command                                       | Result                                                              |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| Format                | `pnpm run format`                             | PASS (all files Prettier-clean)                                     |
| Lint                  | `pnpm run lint` (eslint flat, typed)          | PASS (0 problems)                                                   |
| Typecheck             | `pnpm run typecheck` (`tsc --noEmit`, strict) | PASS                                                                |
| Unit tests            | `pnpm exec vitest run`                        | PASS — 28/28                                                        |
| Coverage (invariants) | `vitest run --coverage`                       | `packages/domain/src/invariants/**` = 100% stmts/branch/funcs/lines |
