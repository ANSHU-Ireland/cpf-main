import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import { createPool, getDatabaseUrl } from '@cpf/db';
import { PgDecisionRepository } from './decision-repository.js';
import { DecisionConflictError } from './decisions.js';
import type { Actor } from './types.js';

const enabled = getDatabaseUrl() !== undefined;
const TENANT_ID = '88888888-0000-4000-8000-00000000d001';
const OTHER_TENANT_ID = '88888888-0000-4000-8000-00000000d002';
const DRAFTER_ID = '88888888-0000-4000-8000-00000000d010';
const APPROVER_ID = '88888888-0000-4000-8000-00000000d011';
const CAMPAIGN_ID = '88888888-0000-4000-8000-00000000d100';
const CANDIDATE_ID = '88888888-0000-4000-8000-00000000d110';
const APPLICATION_ID = '88888888-0000-4000-8000-00000000d120';

const drafter: Actor = {
  tenantId: TENANT_ID,
  userId: DRAFTER_ID,
  roles: ['employer_admin'],
};
const approver: Actor = {
  tenantId: TENANT_ID,
  userId: APPROVER_ID,
  roles: ['employer_admin', 'employer_admin_approver'],
};

describe.skipIf(!enabled)('PgDecisionRepository', () => {
  let pool: Pool;
  let repository: PgDecisionRepository;
  let decisionId = '';

  beforeAll(async () => {
    pool = createPool();
    repository = new PgDecisionRepository(pool, { role: 'cpf_app' });
    await pool.query(
      `INSERT INTO tenant.organizations
         (id, slug, legal_name, display_name, status, data_region, default_timezone)
       VALUES ($1, 'decision-integration', 'Decision Integration Ltd', 'Decision Integration',
               'active', 'EU', 'Europe/Dublin')
       ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID],
    );
    await pool.query(
      `INSERT INTO iam.users (id, email, display_name, user_type, status)
       VALUES
         ($1, 'drafter@decision.integration.invalid', 'Integration Drafter', 'employer_user', 'active'),
         ($2, 'approver@decision.integration.invalid', 'Integration Approver', 'employer_user', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [DRAFTER_ID, APPROVER_ID],
    );
    await pool.query(
      `INSERT INTO hiring.campaigns
         (id, tenant_id, owner_user_id, code, title, role_name, seniority, status)
       VALUES ($1, $2, $3, 'DECISION-INT', 'Decision integration campaign',
               'Operations Lead', 'senior', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [CAMPAIGN_ID, TENANT_ID, DRAFTER_ID],
    );
    await pool.query(
      `INSERT INTO hiring.candidates (id, tenant_id, external_reference, status)
       VALUES ($1, $2, 'DECISION-INTEGRATION-CANDIDATE', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [CANDIDATE_ID, TENANT_ID],
    );
    await pool.query(
      `INSERT INTO hiring.applications
         (id, tenant_id, campaign_id, candidate_id, status, source, source_reference)
       VALUES ($1, $2, $3, $4, 'reviewed', 'integration_test', 'DECISION-INT-001')
       ON CONFLICT (id) DO UPDATE SET status = 'reviewed'`,
      [APPLICATION_ID, TENANT_ID, CAMPAIGN_ID, CANDIDATE_ID],
    );
  });

  afterAll(async () => {
    if (!enabled || pool === undefined) return;
    const ids = await pool.query<{ id: string }>(
      'SELECT id FROM review.progression_decisions WHERE tenant_id = $1',
      [TENANT_ID],
    );
    const decisionIds = ids.rows.map((row) => row.id);
    await pool.query('DELETE FROM integration.outbound_messages WHERE tenant_id = $1', [TENANT_ID]);
    await pool.query('DELETE FROM audit.outbox_events WHERE tenant_id = $1', [TENANT_ID]);
    await pool.query('DELETE FROM audit.events WHERE tenant_id = $1', [TENANT_ID]);
    if (decisionIds.length > 0) {
      await pool.query(
        'DELETE FROM hiring.decision_approvals WHERE decision_id = ANY($1::uuid[])',
        [decisionIds],
      );
    }
    await pool.query('DELETE FROM review.progression_decisions WHERE tenant_id = $1', [TENANT_ID]);
    await pool.query('DELETE FROM hiring.applications WHERE id = $1', [APPLICATION_ID]);
    await pool.query('DELETE FROM hiring.candidates WHERE id = $1', [CANDIDATE_ID]);
    await pool.query('DELETE FROM hiring.campaigns WHERE id = $1', [CAMPAIGN_ID]);
    await pool.query('DELETE FROM iam.users WHERE id = ANY($1::uuid[])', [
      [DRAFTER_ID, APPROVER_ID],
    ]);
    await pool.query('DELETE FROM tenant.organizations WHERE id = $1', [TENANT_ID]);
    await pool.end();
  });

  it('persists an auditable, tenant-isolated draft → approval → issue lifecycle', async () => {
    const created = await repository.createDecision(
      drafter,
      APPLICATION_ID,
      {
        decision: 'progress',
        rationale: 'The human evidence supports progression to the next stage.',
        evidenceLinks: ['scorecard:integration'],
        secondApprovalRequired: true,
      },
      'decision-create-integration',
    );
    expect(created?.status).toBe('draft');
    expect(created?.secondApprovedBy).toBeNull();
    decisionId = created?.id ?? '';

    const retry = await repository.createDecision(
      drafter,
      APPLICATION_ID,
      {
        decision: 'progress',
        rationale: 'The human evidence supports progression to the next stage.',
        evidenceLinks: ['scorecard:integration'],
        secondApprovalRequired: true,
      },
      'decision-create-integration',
    );
    expect(retry?.id).toBe(decisionId);

    await expect(
      repository.recordApproval(
        drafter,
        decisionId,
        { status: 'approved', rationale: null },
        'decision-self-approval',
      ),
    ).rejects.toBeInstanceOf(DecisionConflictError);

    const approved = await repository.recordApproval(
      approver,
      decisionId,
      { status: 'approved', rationale: 'Independent approval completed.' },
      'decision-approval-integration',
    );
    expect(approved?.status).toBe('pending_approval');
    expect(approved?.secondApprovedBy).toBe(APPROVER_ID);

    const issued = await repository.issueDecision(
      approver,
      decisionId,
      'decision-issue-integration',
    );
    expect(issued?.status).toBe('issued');
    expect(issued?.issuedAt).not.toBeNull();

    const issueRetry = await repository.issueDecision(
      approver,
      decisionId,
      'decision-issue-integration',
    );
    expect(issueRetry?.id).toBe(decisionId);

    const context = await repository.getDecisionContext(drafter, APPLICATION_ID);
    expect(context?.candidateRef).toBe('DECISION-INTEGRATION-CANDIDATE');
    expect(context?.decision?.status).toBe('issued');
    expect(context?.approval?.status).toBe('approved');

    const otherTenant = await repository.getDecision(
      { ...drafter, tenantId: OTHER_TENANT_ID },
      decisionId,
    );
    expect(otherTenant).toBeNull();

    const application = await pool.query<{ status: string }>(
      'SELECT status FROM hiring.applications WHERE id = $1',
      [APPLICATION_ID],
    );
    expect(application.rows[0]?.status).toBe('progressed');

    const auditCount = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM audit.events
        WHERE tenant_id = $1 AND resource_id = $2`,
      [TENANT_ID, decisionId],
    );
    const outboxCount = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM audit.outbox_events
        WHERE tenant_id = $1 AND aggregate_id = $2`,
      [TENANT_ID, decisionId],
    );
    const noticeCount = await pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM integration.outbound_messages
        WHERE tenant_id = $1 AND application_id = $2`,
      [TENANT_ID, APPLICATION_ID],
    );
    expect(auditCount.rows[0]?.count).toBe('3');
    expect(outboxCount.rows[0]?.count).toBe('3');
    expect(noticeCount.rows[0]?.count).toBe('1');
  });
});
