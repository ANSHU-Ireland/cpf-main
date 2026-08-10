# Current State — durable checkpoint

_Last updated: 2026-08-10 · branch `codex/continuation-baseline` · baseline checkpoint `0db818e`_

## Release judgement

**NOT READY.** CPF is a substantial synthetic product demo plus a sizeable domain/API library. It
is not yet an end-to-end, persisted, authenticated implementation of the master build contract.

## Verified facts

- Source package: 362 requirements (336 Must), 244 OpenAPI operations, 125 interface SVGs, 1,543
  dictionary rows, and 139 physical / 138 logical PostgreSQL tables are present and hash-verified.
- Repository verification on 2026-08-10 after the shared UI repair:
  - `pnpm verify`: PASS.
  - Formatting: PASS.
  - Lint: PASS with 14 `no-console` warnings and no errors.
  - TypeScript: PASS across all workspace packages.
  - Vitest: 155 files / 1,526 tests PASS, including live PostgreSQL integration tests.
  - `pnpm --filter @cpf/web build`: PASS; 97 static pages generated.
- Web route inventory: 136 `page.tsx` files; the executable inventory test resolves all 125/125
  handoff routes canonically.
- Application/API inventory: 202 exported handler functions, 22 PostgreSQL repository classes, and
  153 test files.
- The latest uncommitted web expansion was preserved in checkpoint `0db818e`; execution documents
  and temporary extraction files were deliberately excluded.

## Important scope boundaries

### Web product

The Next.js product is runnable and covers most role surfaces, but its route handlers are backed by
`apps/web/app/lib/synthetic.server.ts`, a process-local in-memory demo store. It does not issue real
sessions, persist the critical journeys, or enforce tenant identity through verified server context.

### API and server

`apps/api` contains substantial typed handlers and domain use-cases. `apps/server`, however, exposes
the 244-operation manifest through a generic in-memory catch-all and is not wired to those handlers.
The browser product is also not wired to `apps/api`. Therefore “244/244” means contract/router
surface coverage, not 244 production-complete persisted vertical slices.

### Interface implementation

The shared UI contract repair is complete. AUTH-04, ACC-04, ACC-05, and DS-01 now have functional
canonical surfaces; the six semantic aliases now have canonical routes; and all 125 handoff routes
are guarded by an executable inventory test. Multi-word font families are quoted correctly and the
browser resolves Public Sans first.

AUTH-04, ACC-04, ACC-05, and DS-01 passed source/implementation visual comparison at 1280 × 720,
including primary interaction checks and a clean browser console. Evidence is recorded in
`design-qa.md` and `docs/execution/evidence/screenshots/`.

This does not mean all 125 SVGs have visual-fidelity evidence. Earlier representative comparisons
of REV-08 and RUN-02 still showed material layout and interaction differences and are the next
translation slice.

### Traceability

The authoritative requirements CSV still marks all 362 requirements as “Specified; evidence not yet
supplied”. The implementation ledger links only a small early subset and is not a live completion
ledger. Generated screen/API/schema coverage is design coverage, not implementation evidence.

## Major remaining workstreams

1. Translate the critical RUN-02 and REV-08 journeys with visual and accessibility evidence, then
   continue through the remaining interface inventory.
2. Wire authenticated web requests to real `apps/api` handlers and PostgreSQL repositories.
3. Replace critical synthetic workflows with persistent, tenant-isolated vertical slices.
4. Resolve EMP-11, EMP-15, GOV-09, and OPS-02 through additive contract proposals and tests.
5. Implement transactional outbox/workers, AI gateway, integrations, communications, and companion.
6. Complete security, privacy, accessibility, performance, resilience, backup/restore, and E2E gates.
7. Prepare and verify protected Vercel preview and AWS IaC/runbook artifacts.

## Active external blockers

See `EXTERNAL_ACTIONS_REQUIRED.md`. Local PostgreSQL is available. Vercel/AWS credentials, real AI
provider evidence, signing certificates, legal/DPO determinations, and validated assessment content
remain external blockers for their respective later release stages.
