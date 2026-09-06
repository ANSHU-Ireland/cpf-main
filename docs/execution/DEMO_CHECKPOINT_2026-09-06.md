# Recoverable demo checkpoint — 2026-09-06

## Delivered in this checkpoint

- Audit evidence: collection creation remains available in an empty workspace; pending submissions
  cannot be duplicated; failures retain the entered values; success is announced; no-match search
  can be cleared; each collection has an accessible custody-history disclosure.
- Four interaction tests cover these behaviours. Focused lint, formatting and web typecheck passed.
- A bounded coverage report records 29 still-unimplemented mutation handlers and five no-op
  actions at baseline commit `479e572`. This is not a full 125-screen acceptance audit.
- AWS hosting is deferred by the owner. The deployment runbook contains intentionally empty
  account/profile/domain/certificate/zone/budget fields and the existing deployment procedure.

The interrupted session's backend work is already on GitHub at
`479e5725a14e036606f1f8f6ec5557d66a35d70f`; both CI runs for that checkpoint passed. The audit
screen improvements above were recovered from the local working tree and tested before saving.

## Second slice — decision and QMS workspaces

- Employer decision and approval adapters now use the signed-in caller and canonical records,
  not fixed demo actors. Draft, independent approval/return and authorized issuance are separate.
  Screens show the real signed-in name and role, and surface backend denial messages.
- The additive authenticated decision-context read is documented in `DECISION_CONTEXT_API_DELTA.md`.
  The generated 244-operation source baseline is unchanged; the runtime exposes 245 operations.
- Fixed the empty decision context losing its application ID to a nullable SQL column alias.
- QMS now reads the tenant's canonical documents and can create a validated draft with a supplied
  document reference and checksum. Incoming approval/owner/status overrides are ignored. Artifact
  upload and approval workflows are not implemented by this slice.
- QMS reads merge canonical metadata over sparse accepted payloads, including the seeded examples.
- 45 focused backend/route tests passed, including live decision and governance repository tests;
  15 QMS route/interaction tests passed. Web/API/server typechecks and focused lint passed.
- The first full live suite passed 1,708 tests and failed one autosave assertion because another
  test reseeded the shared record concurrently. Database-backed test files are now serialized;
  the complete rerun passed **185 test files / 1,709 tests, zero skips or failures**.

## Verification and immediate handover

- Decision/QMS implementation was pushed as `622326f`; audit recovery was pushed as `c059b4e`.
- Production build passed and generated 98 pages. Browser inspection confirmed tenant QMS details
  load, but caught missing utility styles after a build invoked from the monorepo root.
- PostCSS now resolves the Tailwind configuration explicitly; content globs are relative to their
  configuration file. `verify:web-styles` checks generated grid, border and responsive rules from
  the monorepo root and is included in `pnpm verify`. This regression check passes.
- The rebuilt production CSS now passes an emitted-artifact check, not only configuration checks.
  Browser QMS verification passed on 6 September: real tenant document loaded; input borders,
  spacing and two-column form visible. A cached stylesheet without utilities caused the initial
  failure. `@cpf/web build` now fails if required production CSS rules are absent.
- **Next: browser-test decision draft → distinct approver → admin issuance; then implement the
  operations/support no-op actions.** Do not claim those journeys passed. No operations code was
  changed during the styling investigation.
- Local demo database: `cpf_uat_final_20260821`, PostgreSQL port 55432; API port 3000; preview port 4300. Do not run integration tests against the demo database: use `cpf_uat_verify` separately.
- Full successful test log: `logs/2026-09-06_13-55-14-538-serialized-live-suite-sept06.log` in the
  parent workspace. Runtime logs are timestamped there too.
- Synthetic reviewed application `11111111-0000-4000-8000-000000000217` had no decision at the
  start of browser checks; it is suitable for the next demo decision journey.
- Browser sign-in sends reset-required UAT users to Security. No password was changed by the
  assistant. First-login navigation and an approver queue remain usability work, not signed off.
- At the final quota check, the five-hour window was 89% consumed; weekly was 14%. No usage reset
  was consumed by the assistant. Save/push is performed before waiting for the remaining checks.

## Release boundary (unchanged)

The product is not yet a complete hosted demo and has not been deployed to AWS. Synthetic
examples are not regulatory approval or enterprise UAT sign-off. Open functional gaps remain
listed in `DEMO_SCREEN_COVERAGE_2026-09-05.md` and `NEXT_ACTION.md`.

## Save policy for continued work

Commit and push each tested, bounded slice immediately; do not wait for all screens to be complete
or for a usage-limit warning. Update this checkpoint with delivered behaviour, exact test results,
and the next unfinished slice. Never consume a usage-reset credit without the owner's permission.
