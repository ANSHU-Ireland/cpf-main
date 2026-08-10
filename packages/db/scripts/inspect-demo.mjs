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
const campaignId = '11111111-0000-4000-8000-000000000208';

const pool = new Pool({ connectionString });
try {
  const [response, flag, criterion, campaign, sessions, audit, outbox] = await Promise.all([
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
      `SELECT code, title, role_name, status, updated_at
         FROM hiring.campaigns
        WHERE tenant_id = $1 AND id = $2`,
      [tenantId, campaignId],
    ),
    pool.query(
      `SELECT app_user.display_name, role.code AS role, membership_role.scope_type,
              membership_role.scope_id, session.expires_at, session.revoked_at
         FROM iam.user_sessions AS session
         JOIN iam.users AS app_user ON app_user.id = session.user_id
         JOIN iam.memberships AS membership ON membership.user_id = session.user_id
         JOIN iam.membership_roles AS membership_role
           ON membership_role.membership_id = membership.id
         JOIN iam.roles AS role ON role.id = membership_role.role_id
        WHERE membership.tenant_id = $1
        ORDER BY role.code`,
      [tenantId],
    ),
    pool.query(
      `SELECT action, resource_type, resource_id, outcome, occurred_at
         FROM audit.events
        WHERE tenant_id = $1 AND resource_id = ANY($2::uuid[])
        ORDER BY occurred_at DESC
        LIMIT 6`,
      [tenantId, [attemptId, scorecardId, campaignId]],
    ),
    pool.query(
      `SELECT aggregate_type, aggregate_id, event_type, status, created_at
         FROM audit.outbox_events
        WHERE tenant_id = $1 AND aggregate_id = ANY($2::uuid[])
        ORDER BY created_at DESC
        LIMIT 6`,
      [tenantId, [attemptId, scorecardId, campaignId]],
    ),
  ]);

  process.stdout.write(
    `${JSON.stringify(
      {
        response: response.rows[0] ?? null,
        flag: flag.rows[0] ?? null,
        criterion: criterion.rows[0] ?? null,
        campaign: campaign.rows[0] ?? null,
        sessions: sessions.rows,
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
