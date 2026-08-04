import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Pool } from 'pg';
import { createPool, isDatabaseConfigured, ensureBaselineApplied } from '@cpf/db';
import { PgAccountRepository } from './repository.js';
import { updateMe } from './update-me.js';

const dbAvailable = isDatabaseConfigured();

const ORG_E = '00000000-0000-0000-0000-00000000000e';
const USER2 = '00000000-0000-0000-0000-000000000012';

describe.skipIf(!dbAvailable)('updateMe against live Postgres (audited write + RLS)', () => {
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
    await pool.query('GRANT USAGE ON SCHEMA iam, audit TO cpf_app');
    await pool.query(
      'GRANT SELECT ON iam.users, iam.memberships, iam.membership_roles, iam.roles TO cpf_app',
    );
    await pool.query('GRANT SELECT, INSERT, UPDATE ON iam.user_profiles TO cpf_app');
    await pool.query('GRANT SELECT, INSERT ON audit.events TO cpf_app');

    await pool.query(
      `INSERT INTO tenant.organizations (id, slug, legal_name, display_name, status)
         VALUES ($1, 'org-e', 'Org E Ltd', 'Org E', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [ORG_E],
    );
    await pool.query(
      `INSERT INTO iam.users (id, email, display_name, user_type, status)
         VALUES ($1, 'grace@org-e.example', 'Grace Hopper', 'employer_user', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [USER2],
    );
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('persists the profile update and writes a chained audit event in one transaction', async () => {
    const repository = new PgAccountRepository(pool, { role: 'cpf_app' });
    const actor = { userId: USER2, tenantId: ORG_E, roles: [] };

    const result = await updateMe({ repository }, actor, {
      theme: 'dark',
      density: 'compact',
      reducedMotion: true,
    });

    expect(result.ok).toBe(true);

    const profileRow = await pool.query<{
      theme: string;
      density: string;
      reduced_motion: boolean;
    }>('SELECT theme, density, reduced_motion FROM iam.user_profiles WHERE user_id = $1', [USER2]);
    expect(profileRow.rows[0]).toMatchObject({
      theme: 'dark',
      density: 'compact',
      reduced_motion: true,
    });

    const auditRow = await pool.query<{
      action: string;
      resource_id: string;
      event_hash: string;
      outcome: string;
    }>(
      `SELECT action, resource_id, event_hash, outcome
         FROM audit.events
        WHERE tenant_id = $1 AND resource_id = $2 AND action = 'profile.update'
        ORDER BY occurred_at DESC, id DESC
        LIMIT 1`,
      [ORG_E, USER2],
    );
    const audit = auditRow.rows[0];
    expect(audit).toBeDefined();
    expect(audit?.outcome).toBe('success');
    expect(audit?.event_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('chains previous_hash across successive audited writes for the tenant', async () => {
    const repository = new PgAccountRepository(pool, { role: 'cpf_app' });
    const actor = { userId: USER2, tenantId: ORG_E, roles: [] };

    await updateMe({ repository }, actor, { theme: 'light' });

    const rows = await pool.query<{ event_hash: string; previous_hash: string | null }>(
      `SELECT event_hash, previous_hash
         FROM audit.events
        WHERE tenant_id = $1
        ORDER BY occurred_at DESC, id DESC
        LIMIT 2`,
      [ORG_E],
    );
    expect(rows.rows.length).toBe(2);
    // Newest event's previous_hash links to the prior event's hash.
    expect(rows.rows[0]?.previous_hash).toBe(rows.rows[1]?.event_hash);
  });
});
