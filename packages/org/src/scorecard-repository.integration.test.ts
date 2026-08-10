import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createPool, ensureBaselineApplied, isDatabaseConfigured } from '@cpf/db';
import { PgScorecardRepository } from './scorecard-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';

const dbAvailable = isDatabaseConfigured();
const ORG_ID = '11111111-0000-4000-8000-000000000001';
const OTHER_ORG_ID = '11111111-0000-4000-8000-000000000002';
const ACTOR_ID = '11111111-0000-4000-8000-000000000011';
const ASSIGNMENT_ID = '11111111-0000-4000-8000-000000000321';
const SCORECARD_ID = '11111111-0000-4000-8000-000000000322';
const CRITERION_ID = '11111111-0000-4000-8000-000000000113';

const seedPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../db/seeds/northstar-demo.sql',
);

describe.skipIf(!dbAvailable)('PgScorecardRepository against live Postgres', () => {
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
       VALUES ($1, 'northstar-scorecard-other', 'Scorecard Other Ltd', 'Scorecard Other',
               'active', 'EU', 'Europe/Dublin', '{}'::jsonb, '{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [OTHER_ORG_ID],
    );
  }, 120_000);

  afterAll(async () => {
    await pool?.end();
  });

  it('survives repository recreation and emits audit plus outbox evidence', async () => {
    const summary = 'The independent review is complete and all evidence links are verified.';
    const updated = await new PgScorecardRepository(pool, { role: 'cpf_app' }).updateScorecard(
      actor,
      ASSIGNMENT_ID,
      { summary, overallConfidence: 0.91 },
    );
    expect(updated?.summary).toBe(summary);
    expect(updated?.overallConfidence).toBe(0.91);

    const reloaded = await new PgScorecardRepository(pool, { role: 'cpf_app' }).getScorecard(
      actor,
      ASSIGNMENT_ID,
    );
    expect(reloaded?.summary).toBe(summary);

    const evidence = await pool.query<{ audits: number; outbox_events: number }>(
      `SELECT
         (SELECT count(*)::int FROM audit.events e
           WHERE e.tenant_id = $1 AND e.action = 'scorecard.update'
             AND e.resource_id = $2) AS audits,
         (SELECT count(*)::int FROM audit.outbox_events o
           WHERE o.tenant_id = $1 AND o.aggregate_id = $2
             AND o.event_type = 'scorecard.updated') AS outbox_events`,
      [ORG_ID, SCORECARD_ID],
    );
    expect(evidence.rows[0]?.audits).toBeGreaterThan(0);
    expect(evidence.rows[0]?.outbox_events).toBeGreaterThan(0);
  });

  it('persists an evidence-linked human criterion without an AI score', async () => {
    const repository = new PgScorecardRepository(pool, { role: 'cpf_app' });
    const updated = await repository.updateScorecard(actor, ASSIGNMENT_ID, {
      criterion: {
        criterionId: CRITERION_ID,
        humanScore: 4,
        confidence: 0.88,
        insufficientEvidence: false,
        evidenceLinks: [
          {
            responseId: '11111111-0000-4000-8000-000000000350',
            locator: 'paragraph 2',
          },
        ],
        reviewerComment: 'The response chooses a proportionate reversible first step.',
      },
    });
    const criterion = updated?.criteria?.find((item) => item.criterionId === CRITERION_ID);
    expect(criterion?.humanScore).toBe(4);
    expect(criterion?.reviewerComment).toContain('reversible first step');

    const stored = await pool.query<{ ai_observation_id: string | null }>(
      `SELECT ai_observation_id
         FROM review.criterion_scores
        WHERE tenant_id = $1 AND scorecard_id = $2 AND criterion_id = $3`,
      [ORG_ID, SCORECARD_ID, CRITERION_ID],
    );
    expect(stored.rows[0]?.ai_observation_id).toBeNull();
  });

  it('cannot read or update a scorecard through another tenant context', async () => {
    const repository = new PgScorecardRepository(pool, { role: 'cpf_app' });
    const otherActor = {
      userId: ACTOR_ID,
      tenantId: OTHER_ORG_ID,
      roles: [EMPLOYER_ADMIN_ROLE],
    };
    expect(await repository.getScorecard(otherActor, ASSIGNMENT_ID)).toBeNull();
    expect(
      await repository.updateScorecard(otherActor, ASSIGNMENT_ID, { summary: 'forbidden' }),
    ).toBeNull();
  });
});
