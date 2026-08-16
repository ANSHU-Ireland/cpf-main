# Completion baseline — 2026-08-16

Branch: `agent/complete-remaining-scope`

## Verified repository evidence

- `pnpm verify`: pass.
- Formatting and lint: pass without warnings.
- TypeScript: pass across 16 workspace projects with typecheck scripts.
- Vitest: 145 files and 1,519 tests pass locally; 52 PostgreSQL-gated tests skip without
  `DATABASE_URL` and are included in the expanded PostgreSQL CI job.
- Canonical interface inventory: 125/125 routes derived from the tracked handoff SVGs.
- OpenAPI dispatcher classification: 244/244 baseline operation IDs, including the repaired
  `post_candidates_merge_preview` omission.

## New controlled-runtime evidence

- Outbox processor claims with a lease, publishes with the event ID as the idempotency key,
  retries with bounded exponential backoff, hashes errors and dead-letters at a configured bound.
- The additive outbox migration adds lease ownership and error-hash columns without mutating the
  v2.0 baseline.
- The AI gateway is disabled by default and enforces tenant/attempt scope, approved purpose and
  versions, token/cost/timeout budgets, sensitive-input rejection, the shared AI-output invariant,
  provider failure-safe behavior and content-free hash ledger records.
- The companion policy requires a verified signature, supported version, explicit disclosure and
  attempt binding; telemetry is event-first and field allow-listed, and loss of telemetry produces
  context rather than a score or verdict.

## Explicit boundaries

This evidence does not represent production readiness. Most Next API routes still use the
synthetic process-local seam; individual OpenAPI operations need semantic integration evidence;
production event transports, a real approved AI provider, PostgreSQL AI evidence binding, a signed
desktop package, cloud deployment, restore/failover exercises and external legal/assessment
approvals remain open.
