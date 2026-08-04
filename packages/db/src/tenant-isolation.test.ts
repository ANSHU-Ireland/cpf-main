import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured } from './client.js';
import { ensureBaselineApplied } from './apply-baseline.js';
import { withTenant } from './tenant-context.js';

const dbAvailable = isDatabaseConfigured();

// Fixed synthetic UUIDs so seeding is idempotent.
const ORG_A = '00000000-0000-0000-0000-00000000000a';
const ORG_B = '00000000-0000-0000-0000-00000000000b';
const DEPT_A = '00000000-0000-0000-0000-0000000000a1';
const DEPT_B = '00000000-0000-0000-0000-0000000000b1';

describe.skipIf(!dbAvailable)('Tenant isolation via row-level security', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);

    // Least-privilege, non-superuser role so FORCE RLS is actually enforced.
    await pool.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cpf_app') THEN
           CREATE ROLE cpf_app NOSUPERUSER;
         END IF;
       END $$;`,
    );
    await pool.query('GRANT USAGE ON SCHEMA tenant, iam TO cpf_app');
    await pool.query('GRANT SELECT ON tenant.departments TO cpf_app');

    await pool.query(
      `INSERT INTO tenant.organizations (id, slug, legal_name, display_name, status)
         VALUES ($1, 'org-a', 'Org A Ltd', 'Org A', 'active'),
                ($2, 'org-b', 'Org B Ltd', 'Org B', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [ORG_A, ORG_B],
    );
    await pool.query(
      `INSERT INTO tenant.departments (id, tenant_id, name)
         VALUES ($1, $2, 'Dept A'), ($3, $4, 'Dept B')
       ON CONFLICT (id) DO NOTHING`,
      [DEPT_A, ORG_A, DEPT_B, ORG_B],
    );
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('superuser (no role) sees both tenants — data exists', async () => {
    const res = await pool.query('SELECT id FROM tenant.departments WHERE id IN ($1, $2)', [
      DEPT_A,
      DEPT_B,
    ]);
    expect(res.rowCount).toBe(2);
  });

  it('tenant A context sees only tenant A rows', async () => {
    const rows = await withTenant(pool, { tenantId: ORG_A, role: 'cpf_app' }, async (client) => {
      const r = await client.query<{ id: string; tenant_id: string }>(
        'SELECT id, tenant_id FROM tenant.departments',
      );
      return r.rows;
    });
    expect(rows.every((r) => r.tenant_id === ORG_A)).toBe(true);
    expect(rows.some((r) => r.id === DEPT_A)).toBe(true);
    expect(rows.some((r) => r.id === DEPT_B)).toBe(false);
  });

  it('tenant B context sees only tenant B rows', async () => {
    const rows = await withTenant(pool, { tenantId: ORG_B, role: 'cpf_app' }, async (client) => {
      const r = await client.query<{ id: string }>('SELECT id FROM tenant.departments');
      return r.rows;
    });
    expect(rows.some((r) => r.id === DEPT_B)).toBe(true);
    expect(rows.some((r) => r.id === DEPT_A)).toBe(false);
  });

  it('denies by default when no tenant is set (empty app.tenant_id)', async () => {
    const rows = await withTenant(pool, { tenantId: '', role: 'cpf_app' }, async (client) => {
      const r = await client.query('SELECT id FROM tenant.departments');
      return r.rows;
    });
    expect(rows.length).toBe(0);
  });
});
