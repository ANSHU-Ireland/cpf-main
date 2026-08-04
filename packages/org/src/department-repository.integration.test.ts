import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured, ensureBaselineApplied } from '@cpf/db';
import { PgDepartmentRepository } from './department-repository.js';
import { listDepartments, createDepartment } from './departments.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';

const dbAvailable = isDatabaseConfigured();

const ORG_P = '00000000-0000-0000-0000-000000000600';
const OTHER_ORG_P = '00000000-0000-0000-0000-000000000601';
const USER_D = '00000000-0000-0000-0000-000000000620';

describe.skipIf(!dbAvailable)('departments against live Postgres', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);

    await pool.query(
      `INSERT INTO tenant.organizations
         (id, slug, legal_name, display_name, status, data_region, default_timezone,
          branding, settings)
       VALUES ($1, 'org-p', 'Org P Ltd', 'Org P', 'active', 'EU', 'Europe/Dublin',
               '{}'::jsonb, '{}'::jsonb),
              ($2, 'other-p', 'Other P Ltd', 'Other P', 'active', 'EU', 'Europe/Dublin',
               '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [ORG_P, OTHER_ORG_P],
    );

    await pool.query(
      `INSERT INTO iam.users (id, email, display_name, user_type, status)
         VALUES ($1, 'dept-admin@org-p.example', 'Dana', 'employer_user', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [USER_D],
    );

    // Clean stale departments for our test tenants
    await pool.query(`DELETE FROM tenant.departments WHERE tenant_id IN ($1, $2)`, [
      ORG_P,
      OTHER_ORG_P,
    ]);

    // Seed a department in the other tenant to verify RLS isolation
    await pool.query(
      `INSERT INTO tenant.departments (tenant_id, name, code)
         VALUES ($1, 'Other Dept', 'OTH')`,
      [OTHER_ORG_P],
    );
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('creates a department and lists it (audited)', async () => {
    const repository = new PgDepartmentRepository(pool, { role: 'cpf_app' });
    const actor = { userId: USER_D, tenantId: ORG_P, roles: [EMPLOYER_ADMIN_ROLE] };

    const createResult = await createDepartment({ repository }, actor, {
      name: 'Engineering',
      code: 'ENG',
    });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;
    expect(createResult.department.name).toBe('Engineering');
    expect(createResult.department.code).toBe('ENG');

    const listResult = await listDepartments({ repository }, actor, { limit: 25, cursor: null });
    expect(listResult.ok).toBe(true);
    if (!listResult.ok) return;
    expect(listResult.page.items.some((d) => d.name === 'Engineering')).toBe(true);
    expect(listResult.page.items.every((d) => d.name !== 'Other Dept')).toBe(true);

    const audit = await pool.query<{ event_hash: string }>(
      `SELECT event_hash
         FROM audit.events
        WHERE tenant_id = $1 AND action = 'department.create'
        ORDER BY occurred_at DESC, id DESC
        LIMIT 1`,
      [ORG_P],
    );
    expect(audit.rows[0]?.event_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns 409 on duplicate name within the same tenant', async () => {
    const repository = new PgDepartmentRepository(pool, { role: 'cpf_app' });
    const actor = { userId: USER_D, tenantId: ORG_P, roles: [EMPLOYER_ADMIN_ROLE] };

    const result = await createDepartment({ repository }, actor, {
      name: 'Engineering',
      code: 'ENG2',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
    }
  });
});
