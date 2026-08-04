# Current State — durable checkpoint

_Last updated: 2026-08-04 · Wave 0 (Source & repository integrity)_

## Where we are

Wave 0 foundation established and **green**. Read this file, then `NEXT_ACTION.md`, before
resuming. Do not re-plan the whole project or redo completed work.

## Done (with evidence)

- **Source fidelity:** all 6 v2.0 sources + Penpot handoff verified by SHA-256 (byte match to
  contract). Counts confirmed: 362 reqs, 1,543 dict rows, 244 operations, 125 screens, 139
  physical / 138 logical tables. Originals copied to `docs/source-of-truth/originals/`.
  Evidence: `docs/source-of-truth/SOURCE_MANIFEST.md`, `docs/execution/evidence/wave0-baseline.md`.
- **Repo topology:** dedicated git repo at `CPF-Dev/` (parent Desktop `.git` left untouched).
  ADR-0001, ASM-01.
- **Durable execution docs:** manifest, hierarchy, ledgers (implementation, assumption, risk,
  defect), release gates, external actions, CONFLICT-001 (138 vs 139 resolved).
- **Monorepo + tooling:** pnpm workspaces, strict TS, ESLint (flat, typed), Prettier, Vitest,
  coverage with 100%-branch gate on invariant modules. CI workflow `.github/workflows/ci.yml`.
- **First safety module `@cpf/domain`:** `ai-output-guard` (forbidden AI outputs) and
  `rubric-aggregate` (human-only deterministic aggregation). 28 tests, 100% branch coverage.

## Last green baseline (verified this session)

`pnpm run format` ✅ · `pnpm run lint` ✅ · `pnpm run typecheck` ✅ · `vitest run` ✅ (28/28).

## Active blockers (see EXTERNAL_ACTIONS_REQUIRED.md)

- **EXT-01 Docker absent** — blocks live Postgres/RLS integration tests. Highest-value unblock.
- EXT-02..07 — Vercel, AWS, AI keys, signing, legal/DPO, validated assessment content (later waves).

## Release judgement

**NOT READY** — foundation only. No demo/pilot/production or compliance claim is made.
