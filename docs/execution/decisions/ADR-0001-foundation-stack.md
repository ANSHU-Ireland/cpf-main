# ADR-0001 — Foundation stack and repository topology

- **Status:** Accepted (2026-08-04)
- **Context:** Greenfield CPF build. Contract §8 suggests a pinned, strongly-typed TypeScript
  monorepo. Node 24.11.1, npm 11.6.2, pnpm 10.22.0 verified present; Docker absent (EXT-01).
  A parent git repo exists at `C:/Users/adikr/Desktop` with 0 commits and unrelated personal
  files — unsafe to commit into.

## Decision

- **Repository:** dedicated git repo initialized at `CPF-Dev/` (nested; parent untouched).
- **Package manager:** pnpm workspaces (`pnpm-workspace.yaml`).
- **Language:** TypeScript, `strict` + `noUncheckedIndexedAccess`, ES modules, `NodeNext`.
- **Test runner:** Vitest (unit/component/integration) — Playwright added later for e2e.
- **Lint/format:** ESLint (typed) + Prettier.
- **Topology (created incrementally, not as empty stubs):**
  `apps/web`, `apps/worker`, `apps/companion`;
  `packages/{domain,application,contracts,db,policy,ui,ai-gateway,observability,testkit}`;
  `infra/{local,vercel,aws}`.
- **First real module:** `@cpf/domain` carrying the non-negotiable safety invariants
  (§3) with 100%-branch-covered tests, before any framework code.

## Consequences

- Framework/vendor independence in `domain`/`application`; UI/controllers never touch the DB.
- DB integration/RLS tests are authored but conditionally skipped until Postgres is reachable
  (EXT-01), so the suite stays green without weakening assertions.
- Packages are added when a slice needs them, avoiding a forest of empty scaffolding.
