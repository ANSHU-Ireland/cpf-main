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

  it('reconciles 142 logical vs 143 physical tables after auth hardening', async () => {
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
    expect(logical.rows[0]?.n).toBe(142);
    expect(physical.rows[0]?.n).toBe(143);
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

  it('grants the restricted application role access to repository tables', async () => {
    const privileges = await pool.query<{
      organization_read: boolean;
      assignments_read: boolean;
      candidate_write: boolean;
    }>(`
      select
        has_table_privilege('cpf_app', 'tenant.organizations', 'SELECT') as organization_read,
        has_table_privilege('cpf_app', 'review.reviewer_assignments', 'SELECT') as assignments_read,
        has_table_privilege('cpf_app', 'hiring.candidates', 'INSERT') as candidate_write
    `);

    expect(privileges.rows[0]).toEqual({
      organization_read: true,
      assignments_read: true,
      candidate_write: true,
    });
  });

  it('bootstraps bearer sessions through a scoped security-definer function', async () => {
    const facts = await pool.query<{
      security_definer: boolean;
      app_can_execute: boolean;
      public_can_execute: boolean;
    }>(`
      select procedure.prosecdef as security_definer,
             has_function_privilege('cpf_app', procedure.oid, 'EXECUTE') as app_can_execute,
             exists (
               select 1
                 from aclexplode(coalesce(procedure.proacl, acldefault('f', procedure.proowner))) as acl
                where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
             ) as public_can_execute
        from pg_proc as procedure
        join pg_namespace as namespace on namespace.oid = procedure.pronamespace
       where namespace.nspname = 'iam'
         and procedure.proname = 'resolve_bearer_session'
    `);

    expect(facts.rows).toEqual([
      {
        security_definer: true,
        app_can_execute: true,
        public_can_execute: false,
      },
    ]);
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

  it('links candidate records to IAM users without permitting duplicate tenant identities', async () => {
    const column = await pool.query<{ data_type: string; is_nullable: string }>(
      `select data_type, is_nullable
         from information_schema.columns
        where table_schema = 'hiring'
          and table_name = 'candidates'
          and column_name = 'user_id'`,
    );
    expect(column.rows).toEqual([{ data_type: 'uuid', is_nullable: 'YES' }]);

    const index = await pool.query<{ indexdef: string }>(
      `select indexdef
         from pg_indexes
        where schemaname = 'hiring'
          and tablename = 'candidates'
          and indexname = 'uq_candidates_tenant_user'`,
    );
    expect(index.rows[0]?.indexdef).toMatch(/UNIQUE.*\(tenant_id, user_id\).*user_id IS NOT NULL/i);
  });
});
