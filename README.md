# CPF

EU-focused, multi-tenant, AI-assisted hiring-assessment platform. Built contract-first from
the verified v2.0 source-of-truth package (see `docs/source-of-truth/`).

> **Status:** Active implementation with persistent reference slices. **NOT READY** for
> pilot/production. No compliance claim is made. See `docs/execution/RELEASE_GATES.md`.

## Non-negotiable safety invariants

AI never produces a candidate score, rank, band, integrity verdict, recommendation or hiring
decision. Aggregates derive **only** from human-entered rubric values under a versioned
formula. Enforced in code and tests under `packages/domain/src/invariants/`.

## Layout

```
apps/        web, API/server and leased outbox worker
packages/    domain, account/org, contracts, db, policy, UI, governed AI gateway, companion policy
infra/       local, vercel, aws
docs/        source-of-truth (verified originals), execution (durable ledgers), architecture...
```

## Develop

Prerequisites: Node ≥ 22, pnpm 10.22.0. Unit verification works without external services.
Repository integration tests run when `DATABASE_URL` is set and in the PostgreSQL-backed CI job.

```sh
pnpm install
pnpm run verify   # format + lint + typecheck + tests
```

## Where to continue

Read, in order: this file, `docs/source-of-truth/SOURCE_MANIFEST.md`,
`docs/execution/CURRENT_STATE.md`, `docs/execution/NEXT_ACTION.md`.
