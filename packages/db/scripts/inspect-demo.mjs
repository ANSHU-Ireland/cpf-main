import pg from 'pg';
import process from 'node:process';

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;
if (connectionString === undefined || connectionString.length === 0) {
  throw new Error('DATABASE_URL is required to inspect the Northstar demo.');
}

const tenantId = '11111111-0000-4000-8000-000000000001';
const attemptId = '11111111-0000-4000-8000-000000000300';
const taskId = '11111111-0000-4000-8000-000000000134';
const scorecardId = '11111111-0000-4000-8000-000000000322';
const criterionId = '11111111-0000-4000-8000-000000000111';

const pool = new Pool({ connectionString });
try {
  const [response, flag, criterion, audit, outbox] = await Promise.all([
    pool.query(
      `SELECT response_json, state, row_version, updated_at
         FROM runtime.responses
        WHERE tenant_id = $1 AND attempt_id = $2 AND assessment_item_id = $3`,
      [tenantId, attemptId, taskId],
    ),
    pool.query(
      `SELECT flagged, updated_at
         FROM runtime.item_flags
        WHERE tenant_id = $1 AND attempt_id = $2 AND assessment_item_id = $3`,
      [tenantId, attemptId, taskId],
    ),
    pool.query(
      `SELECT human_score, confidence, insufficient_evidence, evidence_links,
              reviewer_comment, ai_observation_id, updated_at
         FROM review.criterion_scores
        WHERE tenant_id = $1 AND scorecard_id = $2 AND criterion_id = $3`,
      [tenantId, scorecardId, criterionId],
    ),
    pool.query(
      `SELECT action, resource_type, resource_id, outcome, occurred_at
         FROM audit.events
        WHERE tenant_id = $1 AND resource_id = ANY($2::uuid[])
        ORDER BY occurred_at DESC
        LIMIT 6`,
      [tenantId, [attemptId, scorecardId]],
    ),
    pool.query(
      `SELECT aggregate_type, aggregate_id, event_type, status, created_at
         FROM audit.outbox_events
        WHERE tenant_id = $1 AND aggregate_id = ANY($2::uuid[])
        ORDER BY created_at DESC
        LIMIT 6`,
      [tenantId, [attemptId, scorecardId]],
    ),
  ]);

  process.stdout.write(
    `${JSON.stringify(
      {
        response: response.rows[0] ?? null,
        flag: flag.rows[0] ?? null,
        criterion: criterion.rows[0] ?? null,
        audit: audit.rows,
        outbox: outbox.rows,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await pool.end();
}
