import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createPool, ensureBaselineApplied, isDatabaseConfigured } from '@cpf/db';
import { PgCampaignRepository } from './campaign-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';

const dbAvailable = isDatabaseConfigured();
const ORG_ID = '11111111-0000-4000-8000-000000000001';
const OTHER_ORG_ID = '11111111-0000-4000-8000-000000000002';
const ACTOR_ID = '11111111-0000-4000-8000-000000000010';
const TEST_CODE = 'CPF-CAMPAIGN-REPOSITORY-TEST';

const seedPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/seeds/northstar-demo.sql',
);

describe.skipIf(!dbAvailable)('PgCampaignRepository against live Postgres', () => {
  let pool: Pool;
  const actor = { userId: ACTOR_ID, tenantId: ORG_ID, roles: [EMPLOYER_ADMIN_ROLE] };

  beforeAll(async () => {
    pool = createPool();
    await ensureBaselineApplied(pool);
    await pool.query(await readFile(seedPath, 'utf8'));
    await pool.query(
      `INSERT INTO tenant.organizations
         (id, slug, legal_name, display_name, status, data_region, default_timezone,
          branding, settings)
       VALUES ($1, 'campaign-repository-other', 'Other Campaign Ltd', 'Other Campaign', 'active',
               'EU', 'Europe/Dublin', '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [OTHER_ORG_ID],
    );
  }, 120_000);

  afterEach(async () => {
    const campaigns = await pool.query<{ id: string }>(
      `SELECT id FROM hiring.campaigns WHERE code = $1`,
      [TEST_CODE],
    );
    for (const campaign of campaigns.rows) {
      await pool.query(`DELETE FROM audit.outbox_events WHERE aggregate_id = $1`, [campaign.id]);
      await pool.query(`DELETE FROM audit.events WHERE resource_id = $1`, [campaign.id]);
    }
    await pool.query(`DELETE FROM hiring.campaigns WHERE code = $1`, [TEST_CODE]);
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('persists lifecycle changes with atomic audit and outbox evidence', async () => {
    const repository = new PgCampaignRepository(pool, { role: 'cpf_app' });
    const created = await repository.createCampaign(actor, {
      code: TEST_CODE,
      title: 'Campaign repository test',
      roleName: 'Operations Manager',
      seniority: 'senior',
    });
    expect(created.status).toBe('draft');

    const activated = await new PgCampaignRepository(pool, {
      role: 'cpf_app',
    }).transitionStatus(actor, created.id, 'active', ['draft']);
    expect(typeof activated === 'string' ? activated : activated.status).toBe('active');

    const evidence = await pool.query<{ audits: number; outbox_events: number }>(
      `SELECT
         (SELECT count(*)::int FROM audit.events
           WHERE tenant_id = $1 AND resource_id = $2) AS audits,
         (SELECT count(*)::int FROM audit.outbox_events
           WHERE tenant_id = $1 AND aggregate_id = $2) AS outbox_events`,
      [ORG_ID, created.id],
    );
    expect(evidence.rows[0]?.audits).toBeGreaterThanOrEqual(2);
    expect(evidence.rows[0]?.outbox_events).toBeGreaterThanOrEqual(2);
  });

  it('enforces tenant isolation for campaign reads', async () => {
    const created = await new PgCampaignRepository(pool, { role: 'cpf_app' }).createCampaign(
      actor,
      {
        code: TEST_CODE,
        title: 'Tenant isolation campaign',
        roleName: 'Operations Manager',
        seniority: 'senior',
      },
    );
    const otherTenant = await new PgCampaignRepository(pool, { role: 'cpf_app' }).getCampaign(
      { userId: ACTOR_ID, tenantId: OTHER_ORG_ID, roles: [EMPLOYER_ADMIN_ROLE] },
      created.id,
    );
    expect(otherTenant).toBeNull();
  });
});
