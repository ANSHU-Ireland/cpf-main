import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured, ensureBaselineApplied } from '@cpf/db';
import { PgOrganizationRepository } from './organization-repository.js';
import { getOrganization } from './organization.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';

const dbAvailable = isDatabaseConfigured();

const ORG_M = '00000000-0000-0000-0000-000000000300';
const OTHER_ORG = '00000000-0000-0000-0000-000000000301';
const ADMIN = '00000000-0000-0000-0000-00000000001f';

describe.skipIf(!dbAvailable)('get_organization against live Postgres (own-org read)', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);

    await pool.query(
      `INSERT INTO tenant.organizations
         (id, slug, legal_name, display_name, status, data_region, default_timezone,
          branding, settings)
       VALUES ($1, 'org-m', 'Org M Ltd', 'Org M', 'active', 'EU', 'Europe/Dublin',
               '{"logoUrl":"m.png"}'::jsonb, '{"seatLimit":50}'::jsonb),
              ($2, 'other-org', 'Other Org Ltd', 'Other Org', 'active', 'EU', 'Europe/Dublin',
               '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [ORG_M, OTHER_ORG],
    );
    await pool.query(
      `INSERT INTO iam.users (id, email, display_name, user_type, status)
         VALUES ($1, 'admin@org-m.example', 'Mia', 'employer_user', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [ADMIN],
    );
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('reads only the caller-own organisation (projecting jsonb settings)', async () => {
    const repository = new PgOrganizationRepository(pool, { role: 'cpf_app' });
    const result = await getOrganization(
      { repository },
      { userId: ADMIN, tenantId: ORG_M, roles: [EMPLOYER_ADMIN_ROLE] },
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.organization.id).toBe(ORG_M);
      expect(result.organization.slug).toBe('org-m');
      expect(result.organization.settings).toEqual({ seatLimit: 50 });
      expect(result.organization.branding).toEqual({ logoUrl: 'm.png' });
    }
  });

  it('never returns another tenant when the caller is scoped to their own org', async () => {
    const repository = new PgOrganizationRepository(pool, { role: 'cpf_app' });
    const result = await getOrganization(
      { repository },
      { userId: ADMIN, tenantId: ORG_M, roles: [EMPLOYER_ADMIN_ROLE] },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.organization.id).not.toBe(OTHER_ORG);
    }
  });
});
