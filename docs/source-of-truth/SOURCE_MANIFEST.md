# CPF Source Manifest

Generated: 2026-08-04 · Verification method: SHA-256 (full byte match) · Status: **ALL SOURCES VERIFIED**

All six authoritative inputs plus the Penpot handoff were located in the workspace root,
verified against the expected hashes in the build contract, and copied byte-for-byte into
`docs/source-of-truth/originals/`. The top-level working copies remain the immutable v2.0
baseline; derived corrections belong only in `docs/source-of-truth/proposals/`.

| Source                          | Detected path                            | Bytes   | SHA-256                         | Expected match | Parsed records         | Status   |
| ------------------------------- | ---------------------------------------- | ------- | ------------------------------- | -------------- | ---------------------- | -------- |
| Product Requirements Pack v2.0  | `CPF_Product_Requirements_Pack_v2.0.md`  | 123,967 | `e10ca347…dcabd0`               | ✅             | n/a                    | VERIFIED |
| Developer Handover TRD v2.0     | `CPF_Developer_Handover_TRD_v2.0.md`     | 19,740  | `e7c3b5bb…673962`               | ✅             | n/a                    | VERIFIED |
| Requirements traceability v2.0  | `cpf_requirements_traceability_v2.0.csv` | 336,302 | `b3681484…c2ffc7`               | ✅             | 362 requirements       | VERIFIED |
| Schema / data dictionary v2.0   | `cpf_schema_data_dictionary_v2.0.csv`    | 803,066 | `1d5d6cd8…56dcd7`               | ✅             | 1,543 field rows       | VERIFIED |
| OpenAPI baseline v2.0           | `cpf_openapi_baseline_v2.0.yaml`         | 406,430 | `a517c93a…6101e0`               | ✅             | 244 operationIds       | VERIFIED |
| PostgreSQL schema baseline v2.0 | `cpf_postgresql_schema_v2.0.sql`         | 94,771  | `c51eaa39…b6599d`               | ✅             | see CONFLICT-001       | VERIFIED |
| Penpot developer handoff        | `cpf-penpot-handoff/`                    | dir     | internal `source-manifest.json` | ✅             | 125 screens / coverage | VERIFIED |

## Penpot handoff internal counts (from `cpf-penpot-handoff/source-manifest.json`)

| Signal          | Count |
| --------------- | ----- |
| Screens         | 125   |
| API operations  | 244   |
| Requirements    | 362   |
| Tables          | 139   |
| Dictionary rows | 1,543 |

Design direction: **Option 2 — Guided review** (warm humane enterprise utility).

## Notes

- Filenames in the Penpot `source-manifest.json` carry `(2)` copy suffixes; matching was
  done by hash, not filename, per the contract. All hashes matched.
- Table count reconciliation (138 logical vs 139 coverage rows) is tracked in
  `docs/execution/conflicts/CONFLICT-001.md`.
- No hash mismatches were found. No source is missing. Contract-dependent backend work is
  therefore **unblocked** with respect to source availability.
