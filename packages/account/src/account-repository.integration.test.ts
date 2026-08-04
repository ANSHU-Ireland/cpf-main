import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured } from '@cpf/db';
import { ensureBaselineApplied } from '@cpf/db';
import { PgAccountRepository } from './repository.js';
import { getMe } from './get-me.js';

const dbAvailable = isDatabaseConfigured();

const ORG_C = '00000000-0000-0000-0000-00000000000c';
const ORG_D = '00000000-0000-0000-0000-00000000000d';
const USER1 = '00000000-0000-0000-0000-000000000011';
const ROLE1 = '00000000-0000-0000-0000-000000000021';
const MEMBERSHIP1 = '00000000-0000-0000-0000-000000000031';

describe.skipIf(!dbAvailable)('PgAccountRepository / getMe against live Postgres RLS', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);

    await pool.query(
      `DO $$ BEGIN
         IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'cpf_app') THEN
           CREATE ROLE cpf_app NOSUPERUSER;
         END IF;
       END $$;`,
    );
    await pool.query('GRANT USAGE ON SCHEMA iam TO cpf_app');
    await pool.query(
      'GRANT SELECT ON iam.users, iam.memberships, iam.membership_roles, iam.roles TO cpf_app',
    );

    await pool.query(
      `INSERT INTO tenant.organizations (id, slug, legal_name, display_name, status)
         VALUES ($1, 'org-c', 'Org C Ltd', 'Org C', 'active'),
                ($2, 'org-d', 'Org D Ltd', 'Org D', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [ORG_C, ORG_D],
    );
    await pool.query(
      `INSERT INTO iam.users (id, email, display_name, user_type, status)
         VALUES ($1, 'ada@org-c.example', 'Ada Lovelace', 'employer_user', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [USER1],
    );
    await pool.query(
      `INSERT INTO iam.roles (id, code, name, scope)
         VALUES ($1, 'employer_admin', 'Employer Admin', 'tenant')
       ON CONFLICT (id) DO NOTHING`,
      [ROLE1],
    );
    await pool.query(
      `INSERT INTO iam.memberships (id, tenant_id, user_id, status)
         VALUES ($1, $2, $3, 'active')
       ON CONFLICT (id) DO NOTHING`,
      [MEMBERSHIP1, ORG_C, USER1],
    );
    await pool.query(
      `INSERT INTO iam.membership_roles (membership_id, role_id, scope_type, scope_id)
         VALUES ($1, $2, 'tenant', $3)
       ON CONFLICT DO NOTHING`,
      [MEMBERSHIP1, ROLE1, ORG_C],
    );
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('returns the profile with tenant role context in the correct tenant', async () => {
    const repository = new PgAccountRepository(pool, { role: 'cpf_app' });
    const result = await getMe({ repository }, { userId: USER1, tenantId: ORG_C, roles: [] });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.profile.userId).toBe(USER1);
      expect(result.profile.email).toBe('ada@org-c.example');
      expect(result.profile.tenant?.tenantId).toBe(ORG_C);
      expect(result.profile.tenant?.roles).toContain('employer_admin');
    }
  });

  it('hides the membership when the caller acts in a different tenant (RLS)', async () => {
    const repository = new PgAccountRepository(pool, { role: 'cpf_app' });
    const result = await getMe({ repository }, { userId: USER1, tenantId: ORG_D, roles: [] });

    expect(result.ok).toBe(true);
    if (result.ok) {
      // The user row is global, but no ORG_D membership is visible.
      expect(result.profile.tenant).toBeNull();
    }
  });
});
