import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createPool, ensureBaselineApplied, isDatabaseConfigured } from '@cpf/db';
import { PgAttemptRepository } from './attempt-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';

const dbAvailable = isDatabaseConfigured();
const ORG_ID = '11111111-0000-4000-8000-000000000001';
const OTHER_ORG_ID = '11111111-0000-4000-8000-000000000002';
const ACTOR_ID = '11111111-0000-4000-8000-000000000010';
const ATTEMPT_ID = '11111111-0000-4000-8000-000000000300';
const ITEM_ID = '11111111-0000-4000-8000-000000000135';

const seedPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/seeds/northstar-demo.sql',
);

describe.skipIf(!dbAvailable)('PgAttemptRepository against live Postgres', () => {
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
       VALUES ($1, 'northstar-demo-other', 'Other Demo Ltd', 'Other Demo', 'active',
               'EU', 'Europe/Dublin', '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [OTHER_ORG_ID],
    );
  }, 120_000);

  beforeEach(async () => {
    await pool.query(
      `UPDATE runtime.attempts
          SET status = 'in_progress', submitted_at = NULL, row_version = 3, updated_at = now()
        WHERE id = $1`,
      [ATTEMPT_ID],
    );
  });

  afterAll(async () => {
    await pool?.end();
  });

  it('persists response autosaves with atomic audit and outbox evidence', async () => {
    const repository = new PgAttemptRepository(pool, { role: 'cpf_app' });
    const value = 'Persisted response from a recreated service instance.';
    const saved = await repository.saveResponse(actor, ATTEMPT_ID, ITEM_ID, { value });

    expect(saved?.value).toBe(value);

    const persisted = await pool.query<{
      value: string;
      autosaves: number;
      audits: number;
      outbox_events: number;
    }>(
      `SELECT
         r.response_json->>'value' AS value,
         (SELECT count(*)::int FROM runtime.autosaves a
           WHERE a.attempt_id = r.attempt_id AND a.response_id = r.id) AS autosaves,
         (SELECT count(*)::int FROM audit.events e
           WHERE e.tenant_id = $1 AND e.action = 'attempt.response.save'
             AND e.resource_id = $2) AS audits,
         (SELECT count(*)::int FROM audit.outbox_events o
           WHERE o.tenant_id = $1 AND o.aggregate_id = $2
             AND o.event_type = 'attempt.response.saved') AS outbox_events
       FROM runtime.responses r
      WHERE r.tenant_id = $1 AND r.attempt_id = $2 AND r.assessment_item_id = $3`,
      [ORG_ID, ATTEMPT_ID, ITEM_ID],
    );
    expect(persisted.rows[0]?.value).toBe(value);
    expect(persisted.rows[0]?.autosaves).toBeGreaterThan(0);
    expect(persisted.rows[0]?.audits).toBeGreaterThan(0);
    expect(persisted.rows[0]?.outbox_events).toBeGreaterThan(0);

    const recreatedRepository = new PgAttemptRepository(pool, { role: 'cpf_app' });
    const flag = await recreatedRepository.flagItem(actor, ATTEMPT_ID, ITEM_ID, { flagged: true });
    expect(flag).toEqual({ attemptId: ATTEMPT_ID, itemId: ITEM_ID, flagged: true });
  });

  it('enforces tenant isolation for mutation targets', async () => {
    const repository = new PgAttemptRepository(pool, { role: 'cpf_app' });
    const result = await repository.saveResponse(
      { userId: ACTOR_ID, tenantId: OTHER_ORG_ID, roles: [EMPLOYER_ADMIN_ROLE] },
      ATTEMPT_ID,
      ITEM_ID,
      { value: 'must not cross tenant boundary' },
    );
    expect(result).toBeNull();
  });

  it('persists lifecycle transitions across repository instances', async () => {
    await pool.query(`UPDATE runtime.attempts SET status = 'ready' WHERE id = $1`, [ATTEMPT_ID]);
    const started = await new PgAttemptRepository(pool, { role: 'cpf_app' }).startAttempt(
      actor,
      ATTEMPT_ID,
    );
    expect(started?.status).toBe('in_progress');

    const submitted = await new PgAttemptRepository(pool, { role: 'cpf_app' }).submitAttempt(
      actor,
      ATTEMPT_ID,
    );
    expect(submitted?.status).toBe('submitted');
    expect(submitted?.submittedAt).not.toBeNull();
  });
});
