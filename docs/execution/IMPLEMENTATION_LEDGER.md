# Implementation Ledger

Bidirectional map: requirement IDs ⇄ screen IDs ⇄ OpenAPI operations ⇄ tables ⇄ code ⇄ tests ⇄ evidence.

Legend: ⬜ not started · 🟡 in progress · ✅ done with linked evidence · ⛔ blocked (see EXTERNAL_ACTIONS_REQUIRED).

## Wave 0 — Source & repository integrity

| Item                                        | Requirement/Source                      | Code                                                                                    | Tests                           | Evidence                                | Status |
| ------------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------- | ------ |
| Source hash verification (6 files)          | Contract §4                             | —                                                                                       | terminal Get-FileHash           | SOURCE_MANIFEST.md                      | ✅     |
| Penpot handoff counts verified              | Contract §4                             | —                                                                                       | source-manifest.json read       | SOURCE_MANIFEST.md                      | ✅     |
| Scoped git repo                             | Contract §2                             | `.gitignore`                                                                            | `git rev-parse`                 | ASM-01                                  | ✅     |
| Durable execution docs                      | Contract §6                             | `docs/execution/*`                                                                      | —                               | this tree                               | ✅     |
| CONFLICT-001 (138 vs 139)                   | Contract §5                             | —                                                                                       | `packages/db` schema-facts      | conflicts/CONFLICT-001.md; live DB test | ✅     |
| Monorepo skeleton + tooling                 | Contract §8                             | `package.json`, `pnpm-workspace.yaml`, `tsconfig*`                                      | `pnpm -r typecheck`             | evidence/wave0-baseline.md              | ✅     |
| `@cpf/domain` invariants module             | Invariants §3                           | `packages/domain`                                                                       | Vitest (28, 100% branch)        | evidence/wave0-baseline.md              | ✅     |
| `@cpf/db` baseline apply + facts            | Contract §8; CONFLICT-001               | `packages/db`                                                                           | Vitest (3, live Postgres)       | evidence/wave0-db.md                    | ✅     |
| `@cpf/contracts` types + manifest           | TRD §arch; Contract §8                  | `packages/contracts` (generated)                                                        | Vitest (3, 244 ops)             | ci.yml drift gate                       | ✅     |
| Tenant-context (`withTenant`) + RLS proof   | Invariants §9; Contract §12             | `packages/db/src/tenant-context.ts`                                                     | Vitest (4, live cross-tenant)   | evidence/wave0-db.md                    | ✅     |
| `@cpf/policy` deny-by-default `can()`       | Contract §12; Invariants §9             | `packages/policy`                                                                       | Vitest (7, 100% branch)         | this ledger                             | ✅     |
| `@cpf/tokens` from Penpot handoff           | Wave 1; design-tokens.json              | `packages/tokens`                                                                       | Vitest (4, source parity)       | design-tokens.json                      | ✅     |
| `@cpf/ui` accessible primitives             | Wave 1; WCAG 2.2 AA                     | `packages/ui` (Button/Input/Field)                                                      | Vitest (12, jsdom a11y)         | developer-handoff.md                    | ✅     |
| `get_me` account vertical (server)          | FR-ACC-04, FR-ACC-12                    | `packages/account`                                                                      | Vitest (6: 4 unit + 2 live RLS) | this ledger                             | ✅     |     | `@cpf/http` problem+json / correlation | RFC 9457; OpenAPI errors | `packages/http`            | Vitest (5) | ProblemDetails schema | ✅  |
| `get_me` HTTP boundary                      | OpenAPI `get_me`; ASM-06                | `apps/api`                                                                              | Vitest (4, 200/403/404)         | this ledger                             | ✅     |
| Account profile view (UI)                   | FR-ACC-04; WCAG 2.2 AA                  | `apps/web`                                                                              | Vitest (4, jsdom a11y)          | this ledger                             | ✅     |     | CI foundation (+ postgres service)     | Contract §17             | `.github/workflows/ci.yml` | CI run     | ci.yml                | ✅  |
| `@cpf/audit` hash-chained writer            | Invariants (audit); §audit              | `packages/audit`                                                                        | Vitest (4, determinism+chain)   | this ledger                             | ✅     |
| `patch_me` first audited write              | FR-ACC-04; `x-audit-event`              | `packages/account` (`updateMe`, `validate`)                                             | Vitest (12: 7+3 unit + 2 live)  | this ledger                             | ✅     |
| `patch_me` HTTP boundary                    | OpenAPI `patch_me`                      | `apps/api` (`handlePatchMe`)                                                            | Vitest (5, 200/422/403/404)     | this ledger                             | ✅     |
| Account sessions (list + audited revoke)    | FR-ACC-08; `x-audit-event`              | `packages/account` (`listSessions`, `revokeSession`)                                    | Vitest (13: 10 unit + 3 live)   | this ledger                             | ✅     |
| Sessions HTTP boundary                      | OpenAPI `*_me_sessions*`                | `apps/api` (`handleGetMeSessions`, `handleDeleteMeSession`)                             | Vitest (6, 200/422/403/404)     | this ledger                             | ✅     |
| Security-events feed (non-RLS scope)        | FR-ACC-18; ASM-07                       | `packages/account` (`listSecurityEvents`, `cursor`)                                     | Vitest (8: 6 unit + 2 live)     | this ledger; ASM-07                     | ✅     |
| Security-events HTTP boundary               | OpenAPI `get_me_security_events`        | `apps/api` (`handleGetMeSecurityEvents`)                                                | Vitest (3, 200/422/403)         | this ledger                             | ✅     |
| Notification preferences (audited upsert)   | FR-ACC-14; `x-audit-event`              | `packages/account` (`listNotificationPreferences`, `updateNotificationPreferences`)     | Vitest (14: 12 unit + 2 live)   | this ledger                             | ✅     |
| Notification-prefs HTTP boundary            | OpenAPI `*_me_notification_preferences` | `apps/api` (`handleGetMeNotificationPreferences`, `handlePutMeNotificationPreferences`) | Vitest (6, 200/422/403)         | this ledger                             | ✅     |
| Integration role provisioning (globalSetup) | Contract §17 (test integrity)           | `vitest.globalsetup.ts`, `vitest.config.ts`                                             | Vitest (all integ suites green) | this ledger                             | ✅     |

## Later waves

Waves 1–12 are enumerated in NEXT_ACTION.md and tracked as they begin. No requirement row is
marked complete without linked passing evidence.
