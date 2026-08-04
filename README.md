# CPF

EU-focused, multi-tenant, AI-assisted hiring-assessment platform. Built contract-first from
the verified v2.0 source-of-truth package (see `docs/source-of-truth/`).

> **Status:** Wave 0 foundation. **NOT READY** for demo/pilot/production. No compliance claim
> is made. See `docs/execution/RELEASE_GATES.md`.

## Non-negotiable safety invariants

AI never produces a candidate score, rank, band, integrity verdict, recommendation or hiring
decision. Aggregates derive **only** from human-entered rubric values under a versioned
formula. Enforced in code and tests under `packages/domain/src/invariants/`.

## Layout

```
apps/        web, worker, companion (added per wave)
packages/    domain, application, contracts, db, policy, ui, ai-gateway, observability, testkit
infra/       local, vercel, aws
docs/        source-of-truth (verified originals), execution (durable ledgers), architecture...
```

## Develop

Prerequisites: Node ≥ 22 (verified 24.11.1), pnpm 10.22.0. Docker is **not** yet available on
this machine — DB integration tests are gated until a Postgres is reachable (see
`docs/execution/EXTERNAL_ACTIONS_REQUIRED.md`, EXT-01).

```powershell
pnpm install
pnpm run verify   # format + lint + typecheck + tests
```

## Where to continue

Read, in order: this file, `docs/source-of-truth/SOURCE_MANIFEST.md`,
`docs/execution/CURRENT_STATE.md`, `docs/execution/NEXT_ACTION.md`.
