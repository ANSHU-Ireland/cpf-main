# Evidence — Wave 0 database foundation (EXT-01 resolved)

_Recorded: 2026-08-04_

## Environment

- Local **PostgreSQL 18.4** (`postgresql-x64-18`, Running), psql at
  `C:\Program Files\PostgreSQL\18\bin`.
- Database `cpf_dev` created (idempotent).
- `DATABASE_URL` stored only in gitignored `.env` (never committed). `.env.example` tracked.

## Baseline application

- Applied `docs/source-of-truth/originals/cpf_postgresql_schema_v2.0.sql` with
  `psql -v ON_ERROR_STOP=1` → **exit 0**. NOTICEs were idempotent `DROP POLICY IF EXISTS`.
- `information_schema` BASE TABLE count in app schemas = **139**.

## CONFLICT-001 empirical reconciliation

| Metric                                                         | Value                      | Source                  |
| -------------------------------------------------------------- | -------------------------- | ----------------------- |
| Logical tables (`relkind='r' & not partition` + `relkind='p'`) | 138                        | pg_class                |
| Physical BASE TABLE rows                                       | 139                        | information_schema      |
| Partitioned parents                                            | 1 (`audit.events`)         | pg_class relkind='p'    |
| Partition children (tables)                                    | 1 (`audit.events_default`) | pg_class relispartition |

`audit.events_default` DEFAULT partition = the 139th physical row; logical count is 138. Matches CONFLICT-001.

## Automated regression (`packages/db/src/schema-facts.test.ts`, live Postgres)

| Test                                                    | Result |
| ------------------------------------------------------- | ------ |
| Reconciles 138 logical vs 139 physical tables           | PASS   |
| `audit.events` range-partitioned with DEFAULT partition | PASS   |
| RLS enabled on `runtime.sessions`                       | PASS   |

## Full gate (this session)

`typecheck` ✅ · `lint` ✅ · `vitest run` ✅ — **31/31** (28 domain + 3 db). CI gains a
`postgres:16` service job (`db-integration`).
