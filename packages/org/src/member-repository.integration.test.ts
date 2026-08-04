import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured, ensureBaselineApplied } from '@cpf/db';
import { PgMemberRepository } from './member-repository.js';
import { listMembers } from './members.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';

const dbAvailable = isDatabaseConfigured();

const ORG_N = '00000000-0000-0000-0000-000000000400';
const OTHER_ORG_N = '00000000-0000-0000-0000-000000000401';
const USER_A = '00000000-0000-0000-0000-000000000520';
const USER_B = '00000000-0000-0000-0000-000000000521';
const USER_C = '00000000-0000-0000-0000-000000000522';
const MEM_A = '00000000-0000-0000-0000-000000000530';
const MEM_B = '00000000-0000-0000-0000-000000000531';
const MEM_C = '00000000-0000-0000-0000-000000000532';

describe.skipIf(!dbAvailable)('get_organization_members against live Postgres', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);

    // Seed two orgs
    await pool.query(
      `INSERT INTO tenant.organizations
         (id, slug, legal_name, display_name, status, data_region, default_timezone,
          branding, settings)
       VALUES ($1, 'org-n', 'Org N Ltd', 'Org N', 'active', 'EU', 'Europe/Dublin',
               '{}'::jsonb, '{}'::jsonb),
              ($2, 'other-n', 'Other N Ltd', 'Other N', 'active', 'EU', 'Europe/Dublin',
               '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [ORG_N, OTHER_ORG_N],
    );

    // Seed users
    await pool.query(
      `INSERT INTO iam.users (id, email, display_name, user_type, status)
         VALUES ($1, 'alice-mem@org-n.example', 'Alice', 'employer_user', 'active'),
                ($2, 'bob-mem@org-n.example', 'Bob', 'employer_user', 'active'),
                ($3, 'charlie-mem@other-n.example', 'Charlie', 'employer_user', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [USER_A, USER_B, USER_C],
    );

    // Clean stale memberships for our test tenants from prior UUID ranges
    await pool.query(
      `DELETE FROM iam.memberships
        WHERE tenant_id IN ($1, $2)
          AND id NOT IN ($3, $4, $5)`,
      [ORG_N, OTHER_ORG_N, MEM_A, MEM_B, MEM_C],
    );

    // Seed role (may already exist from other tests with a different id)
    await pool.query(
      `INSERT INTO iam.roles (id, code, name, scope)
         VALUES (gen_random_uuid(), 'employer_admin', 'Employer Admin', 'tenant')
       ON CONFLICT (code) DO NOTHING`,
    );
    const roleRes = await pool.query<{ id: string }>(
      `SELECT id FROM iam.roles WHERE code = 'employer_admin'`,
    );
    const roleId = roleRes.rows[0]!.id;

    // Seed memberships (ON CONFLICT covers both PK and the (tenant_id, user_id) unique)
    for (const [memId, tenantId, userId] of [
      [MEM_A, ORG_N, USER_A],
      [MEM_B, ORG_N, USER_B],
      [MEM_C, OTHER_ORG_N, USER_C],
    ] as const) {
      await pool.query(
        `INSERT INTO iam.memberships (id, tenant_id, user_id, status)
           VALUES ($1, $2, $3, 'active')
         ON CONFLICT (id) DO NOTHING`,
        [memId, tenantId, userId],
      );
    }

    // Seed role assignments for ORG_N members
    await pool.query(
      `INSERT INTO iam.membership_roles (membership_id, role_id, scope_type, scope_id)
         VALUES ($1, $2, 'tenant', $3)
       ON CONFLICT DO NOTHING`,
      [MEM_A, roleId, ORG_N],
    );
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('lists only the caller-tenant members with roles aggregated', async () => {
    const repository = new PgMemberRepository(pool, { role: 'cpf_app' });
    const result = await listMembers(
      { repository },
      { userId: USER_A, tenantId: ORG_N, roles: [EMPLOYER_ADMIN_ROLE] },
      { limit: 25, cursor: null },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.total).toBe(2);
      expect(result.page.items).toHaveLength(2);
      const ids = result.page.items.map((m) => m.userId);
      expect(ids).toContain(USER_A);
      expect(ids).toContain(USER_B);
      expect(ids).not.toContain(USER_C);

      const alice = result.page.items.find((m) => m.userId === USER_A);
      expect(alice?.roles).toContain('employer_admin');
    }
  });

  it('never surfaces members from another tenant (RLS-isolated)', async () => {
    const repository = new PgMemberRepository(pool, { role: 'cpf_app' });
    const result = await listMembers(
      { repository },
      { userId: USER_A, tenantId: ORG_N, roles: [EMPLOYER_ADMIN_ROLE] },
      { limit: 100, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      const userIds = result.page.items.map((m) => m.userId);
      expect(userIds).not.toContain(USER_C);
    }
  });
});
