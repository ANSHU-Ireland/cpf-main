import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured } from './client.js';
import { ensureBaselineApplied } from './apply-baseline.js';
import { APP_SCHEMAS } from './index.js';

const dbAvailable = isDatabaseConfigured();
const schemaList = APP_SCHEMAS.map((s) => `'${s}'`).join(',');

// Gated on DATABASE_URL (EXT-01): skipped, not failed, when no database is configured.
describe.skipIf(!dbAvailable)('PostgreSQL v2.0 baseline schema facts', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('reconciles 138 logical vs 139 physical tables (CONFLICT-001)', async () => {
    const logical = await pool.query<{ n: number }>(
      `select count(*)::int as n
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname in (${schemaList})
          and ((c.relkind = 'r' and not c.relispartition) or c.relkind = 'p')`,
    );
    const physical = await pool.query<{ n: number }>(
      `select count(*)::int as n
         from information_schema.tables
        where table_schema in (${schemaList}) and table_type = 'BASE TABLE'`,
    );
    expect(logical.rows[0]?.n).toBe(138);
    expect(physical.rows[0]?.n).toBe(139);
  });

  it('models audit.events as range-partitioned with a DEFAULT partition', async () => {
    const parent = await pool.query<{ relkind: string }>(
      `select c.relkind
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'audit' and c.relname = 'events'`,
    );
    expect(parent.rows[0]?.relkind).toBe('p');

    const def = await pool.query<{ bound: string | null }>(
      `select pg_get_expr(c.relpartbound, c.oid) as bound
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'audit' and c.relname = 'events_default'`,
    );
    expect(def.rows[0]?.bound).toMatch(/DEFAULT/i);
  });

  it('enforces row-level security on a tenant-scoped runtime table', async () => {
    const rls = await pool.query<{ relrowsecurity: boolean }>(
      `select c.relrowsecurity
         from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'runtime' and c.relname = 'sessions'`,
    );
    expect(rls.rows[0]?.relrowsecurity).toBe(true);
  });

  it('applies leased outbox worker columns additively', async () => {
    const columns = await pool.query<{ column_name: string }>(
      `select column_name
         from information_schema.columns
        where table_schema = 'audit'
          and table_name = 'outbox_events'
          and column_name in ('locked_at', 'locked_by', 'last_error_hash')
        order by column_name`,
    );
    expect(columns.rows.map((row) => row.column_name)).toEqual([
      'last_error_hash',
      'locked_at',
      'locked_by',
    ]);
  });
});
