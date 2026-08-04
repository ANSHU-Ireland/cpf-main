# Implementation Ledger

Bidirectional map: requirement IDs ⇄ screen IDs ⇄ OpenAPI operations ⇄ tables ⇄ code ⇄ tests ⇄ evidence.

Legend: ⬜ not started · 🟡 in progress · ✅ done with linked evidence · ⛔ blocked (see EXTERNAL_ACTIONS_REQUIRED).

## Wave 0 — Source & repository integrity

| Item                               | Requirement/Source        | Code                                               | Tests                      | Evidence                                | Status |
| ---------------------------------- | ------------------------- | -------------------------------------------------- | -------------------------- | --------------------------------------- | ------ |
| Source hash verification (6 files) | Contract §4               | —                                                  | terminal Get-FileHash      | SOURCE_MANIFEST.md                      | ✅     |
| Penpot handoff counts verified     | Contract §4               | —                                                  | source-manifest.json read  | SOURCE_MANIFEST.md                      | ✅     |
| Scoped git repo                    | Contract §2               | `.gitignore`                                       | `git rev-parse`            | ASM-01                                  | ✅     |
| Durable execution docs             | Contract §6               | `docs/execution/*`                                 | —                          | this tree                               | ✅     |
| CONFLICT-001 (138 vs 139)          | Contract §5               | —                                                  | `packages/db` schema-facts | conflicts/CONFLICT-001.md; live DB test | ✅     |
| Monorepo skeleton + tooling        | Contract §8               | `package.json`, `pnpm-workspace.yaml`, `tsconfig*` | `pnpm -r typecheck`        | evidence/wave0-baseline.md              | ✅     |
| `@cpf/domain` invariants module    | Invariants §3             | `packages/domain`                                  | Vitest (28, 100% branch)   | evidence/wave0-baseline.md              | ✅     |
| `@cpf/db` baseline apply + facts   | Contract §8; CONFLICT-001 | `packages/db`                                      | Vitest (3, live Postgres)  | evidence/wave0-db.md                    | ✅     |
| `@cpf/contracts` types + manifest  | TRD §arch; Contract §8    | `packages/contracts` (generated)                   | Vitest (3, 244 ops)        | ci.yml drift gate                       | ✅     |
| CI foundation (+ postgres service) | Contract §17              | `.github/workflows/ci.yml`                         | CI run                     | ci.yml                                  | ✅     |

## Later waves

Waves 1–12 are enumerated in NEXT_ACTION.md and tracked as they begin. No requirement row is
marked complete without linked passing evidence.
