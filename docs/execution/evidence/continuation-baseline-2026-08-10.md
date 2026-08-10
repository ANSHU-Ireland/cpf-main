# Continuation baseline evidence — 2026-08-10

Branch: `codex/continuation-baseline`

Checkpoint preserving verified `apps/web` expansion: `0db818e`

## Commands and results

- `pnpm verify`
  - formatting: pass
  - lint: 0 errors, 14 warnings
  - TypeScript: pass across 13 runnable workspace projects
  - Vitest: 155 files passed, 1,526 tests passed
  - live PostgreSQL integration suites: pass
- `pnpm --filter @cpf/web build`
  - Next.js 14.2.35 production compilation: pass
  - type validation: pass
  - static generation: 97/97 pages

## Inventory checks

- 136 Next.js page files.
- 125/125 exact canonical screen-route matches.
- Executable route inventory: 126/126 assertions pass (inventory count plus all screen routes).
- AUTH-04, ACC-04, ACC-05, and DS-01 are implemented as functional surfaces.
- 202 exported `apps/api` handler functions.
- 22 PostgreSQL repository classes.
- 153 automated test files.

## Visual inspection

AUTH-04, ACC-04, ACC-05, and DS-01 were compared with their verified SVG sources at a normalized
1280 × 720 viewport. Primary interactions pass, browser console errors are empty, Public Sans is the
computed first family, and `design-qa.md` records `final result: passed`.

Earlier REV-08 and RUN-02 comparisons still show material information-architecture, workspace,
control, and state differences. The release judgement therefore remains `NOT READY`; those critical
journeys are the next visual translation slice.
