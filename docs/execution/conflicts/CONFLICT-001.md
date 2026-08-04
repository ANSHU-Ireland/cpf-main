# CONFLICT-001 — Table count: 138 logical vs 139 coverage rows

- **Status:** RESOLVED (documented; no source mutation)
- **Authority level touched:** 6 (PostgreSQL DDL) vs 7 (Penpot schema coverage) vs 4 (TRD)
- **Affected artifacts:** `cpf_postgresql_schema_v2.0.sql`, `cpf-penpot-handoff/coverage/schema_coverage.csv`, data dictionary, TRD.

## Discrepancy

The data dictionary and TRD describe **138 logical tables**. The Penpot schema-coverage set
contains **139 rows** because `audit.events_default` appears as an extra entry.

## Evidence (from the immutable SQL baseline)

```sql
-- cpf_postgresql_schema_v2.0.sql:1145
CREATE TABLE audit.events ( ... ) PARTITION BY RANGE (occurred_at);
-- cpf_postgresql_schema_v2.0.sql:1152
CREATE TABLE audit.events_default PARTITION OF audit.events DEFAULT;
```

`audit.events_default` is a **physical DEFAULT partition** of the `audit.events` logical
table. It is not a separate logical entity.

## Resolution

- **Logical table count = 138** (authoritative for domain/data-model reasoning).
- **Physical relation count includes the 139th** partition and any future range partitions.
- No count is force-edited to match documentation. Coverage tooling should treat partitions
  as physical children of their parent logical table.

## Regression guard (pending)

A DB integration test will assert `audit.events` is `PARTITION BY RANGE (occurred_at)` with a
`DEFAULT` partition present, and that logical-entity enumeration excludes partition children.
Tracked in IMPLEMENTATION_LEDGER under Wave 0 / db package.
