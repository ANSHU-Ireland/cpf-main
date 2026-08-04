import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured, ensureBaselineApplied } from '@cpf/db';
import { PgTeamRepository } from './team-repository.js';
import { listTeams, createTeam } from './teams.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';

const dbAvailable = isDatabaseConfigured();

const ORG_T = '00000000-0000-0000-0000-000000000700';
const OTHER_ORG_T = '00000000-0000-0000-0000-000000000701';
const DEPT_T = '00000000-0000-0000-0000-000000000710';
const USER_T = '00000000-0000-0000-0000-000000000720';

describe.skipIf(!dbAvailable)('teams against live Postgres', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);

    await pool.query(
      `INSERT INTO tenant.organizations
         (id, slug, legal_name, display_name, status, data_region, default_timezone,
          branding, settings)
       VALUES ($1, 'org-t', 'Org T Ltd', 'Org T', 'active', 'EU', 'Europe/Dublin',
               '{}'::jsonb, '{}'::jsonb),
              ($2, 'other-t', 'Other T Ltd', 'Other T', 'active', 'EU', 'Europe/Dublin',
               '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [ORG_T, OTHER_ORG_T],
    );

    await pool.query(
      `INSERT INTO tenant.departments (id, tenant_id, name, code)
         VALUES ($1, $2, 'Engineering', 'ENG')
       ON CONFLICT (id) DO NOTHING`,
      [DEPT_T, ORG_T],
    );

    await pool.query(
      `INSERT INTO iam.users (id, email, display_name, user_type, status)
         VALUES ($1, 'team-admin@org-t.example', 'Tara', 'employer_user', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [USER_T],
    );

    // Clean stale teams for our test tenants
    await pool.query(`DELETE FROM tenant.teams WHERE tenant_id IN ($1, $2)`, [ORG_T, OTHER_ORG_T]);

    // Seed a team in the other tenant to verify RLS isolation
    await pool.query(
      `INSERT INTO tenant.teams (tenant_id, name)
         VALUES ($1, 'Other Team')`,
      [OTHER_ORG_T],
    );
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('creates a team and lists it (audited)', async () => {
    const repository = new PgTeamRepository(pool, { role: 'cpf_app' });
    const actor = { userId: USER_T, tenantId: ORG_T, roles: [EMPLOYER_ADMIN_ROLE] };

    const createResult = await createTeam({ repository }, actor, {
      name: 'Frontend',
      departmentId: DEPT_T,
    });
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;
    expect(createResult.team.name).toBe('Frontend');
    expect(createResult.team.departmentId).toBe(DEPT_T);

    const listResult = await listTeams({ repository }, actor, { limit: 25, cursor: null });
    expect(listResult.ok).toBe(true);
    if (!listResult.ok) return;
    expect(listResult.page.items.some((t) => t.name === 'Frontend')).toBe(true);
    expect(listResult.page.items.every((t) => t.name !== 'Other Team')).toBe(true);

    const audit = await pool.query<{ event_hash: string }>(
      `SELECT event_hash
         FROM audit.events
        WHERE tenant_id = $1 AND action = 'team.create'
        ORDER BY occurred_at DESC, id DESC
        LIMIT 1`,
      [ORG_T],
    );
    expect(audit.rows[0]?.event_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns 409 on duplicate name within the same department', async () => {
    const repository = new PgTeamRepository(pool, { role: 'cpf_app' });
    const actor = { userId: USER_T, tenantId: ORG_T, roles: [EMPLOYER_ADMIN_ROLE] };

    const result = await createTeam({ repository }, actor, {
      name: 'Frontend',
      departmentId: DEPT_T,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
    }
  });

  it('allows the same team name in a different department (null)', async () => {
    const repository = new PgTeamRepository(pool, { role: 'cpf_app' });
    const actor = { userId: USER_T, tenantId: ORG_T, roles: [EMPLOYER_ADMIN_ROLE] };

    const result = await createTeam({ repository }, actor, {
      name: 'Frontend',
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.team.departmentId).toBeNull();
    }
  });
});
