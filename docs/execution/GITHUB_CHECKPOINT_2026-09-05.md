# CPF GitHub publication checkpoint — 5 September 2026

## Included work

- Thirteen governance-document families now persist into their canonical tables with tenant-scoped
  command evidence, validation, audit events and transactional outbox records.
- Audit collections, items, custody events and requirement mappings have additive PostgreSQL
  tables with forced tenant RLS and restricted application grants. The audit screens use real
  API reads and creation. Auditor sign-in selects the audit workspace.
- Seed evidence labels identify synthetic examples, and traceability preserves blocked status
  and coverage. Seed records do not constitute release approval.
- The earlier committed work includes the Penpot token/compiler repair, selected persisted role
  journeys, password/session authentication and AWS infrastructure/runbooks.

## Dummy-data inventory

The deterministic seed was run twice successfully in the August session: 30 tenants, 242 tenant
users/credentials, 120 campaigns, 359 UAT-prefixed candidate records, 360 applications, 390
governance documents, 120 evidence collections, 360 traceability rows and 360 evidence items.
The traceability rows represent 12 unique keys repeated across 30 tenants. This inventory does
not prove coverage of every field, screen or lifecycle state. Password changes survive reseeding;
credential manifests are ignored local artifacts.

## Verification

The prior governance checkpoint passed 178 test files / 1,657 tests against PostgreSQL, plus
formatting, lint, workspace typechecks, contract regeneration and the 98-page web build. The
subsequent audit build also completed successfully according to its saved log. August live probes
verified nine sign-in personas, nine governance lists, four Northstar audit collections and twelve
requirement reads. An isolated collection mutation reloaded correctly and produced exactly one
collection, custody event, audit event and outbox event.

On 5 September, `pnpm verify` passed formatting, lint, workspace typechecks and **1,597 tests in
151 files**. Another 73 tests in 29 database-dependent files were explicitly skipped because
this local run had no configured database. GitHub CI runs database integration, fresh seeding,
production build and role journeys against its own PostgreSQL service; see the checks attached
to the published commit for their result. The seed label update preserves deterministic item IDs
when upgrading an existing UAT database.

## Remaining work and rough estimate

For a complete hosted demonstration with realistic dummy data across every interface, roughly
**30–45% remains**. For the full enterprise production programme through CPF-15, roughly
**45–60% remains**. These are planning ranges based on the handover and sampled implementation,
not measured feature percentages. Hosting the existing narrower demo requires less work.

The main gaps are persistent candidate corrections/human review/merge reversal and other
documented API/read-model gaps; Penpot fidelity and all UI states across 125 interfaces;
operation-specific verification of 244 APIs; seed coverage across all visible fields and linked
records; scoped audit access; and actual AWS UAT deployment with HTTPS and acceptance tests.
Production additionally requires identity/MFA/recovery, integration/AI runtime completion, a
signed companion, security/accessibility/resilience testing and external release approvals.

Five programme stages are closed in the ledger; nine are in progress and CPF-14 is not started.
The stages differ in size and should not be converted to a literal completion percentage. Use an
AWS **UAT** environment for synthetic data: the existing release controls prohibit production seeding.
