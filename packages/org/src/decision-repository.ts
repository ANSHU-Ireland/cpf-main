import { createHash, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import {
  DecisionConflictError,
  type DecisionApprovalInput,
  type DecisionApprovalRecord,
  type DecisionContext,
  type DecisionCreate,
  type DecisionRecord,
  type DecisionRepository,
  type DecisionStatus,
  type DecisionType,
  type ApprovalStatus,
} from './decisions.js';

interface DecisionRow {
  readonly id: string;
  readonly application_id: string;
  readonly report_id: string | null;
  readonly decision: DecisionType;
  readonly reason: string;
  readonly evidence_links: unknown;
  readonly decided_by: string;
  readonly decided_by_name: string;
  readonly decided_at: Date | null;
  readonly issued_at: Date | null;
  readonly second_approval_required: boolean;
  readonly second_approved_by: string | null;
  readonly second_approved_by_name: string | null;
  readonly second_approved_at: Date | null;
  readonly status: DecisionStatus;
}

interface ApprovalRow {
  readonly id: string;
  readonly decision_id: string;
  readonly required_role: string;
  readonly status: ApprovalStatus;
  readonly requested_by: string;
  readonly decided_by: string | null;
  readonly decided_by_name: string | null;
  readonly rationale: string | null;
  readonly requested_at: Date;
  readonly decided_at: Date | null;
}

interface ApplicationContextRow extends DecisionRow {
  readonly candidate_ref: string;
  readonly campaign_name: string;
  readonly review_complete: boolean;
  readonly decision_present: boolean;
}

const DECISION_COLUMNS = `
  decision_row.id,
  decision_row.application_id,
  decision_row.report_id,
  decision_row.decision,
  decision_row.reason,
  decision_row.evidence_links,
  decision_row.decided_by,
  drafter.display_name AS decided_by_name,
  decision_row.decided_at,
  decision_row.issued_at,
  decision_row.second_approval_required,
  decision_row.second_approved_by,
  approver.display_name AS second_approved_by_name,
  decision_row.second_approved_at,
  decision_row.status`;

function evidenceLinks(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function toDecision(row: DecisionRow): DecisionRecord {
  return {
    id: row.id,
    applicationId: row.application_id,
    reportId: row.report_id,
    decision: row.decision,
    rationale: row.reason,
    evidenceLinks: evidenceLinks(row.evidence_links),
    decidedBy: row.decided_by,
    decidedByName: row.decided_by_name,
    decidedAt: row.decided_at?.toISOString() ?? null,
    issuedAt: row.issued_at?.toISOString() ?? null,
    secondApprovalRequired: row.second_approval_required,
    secondApprovedBy: row.second_approved_by,
    secondApprovedByName: row.second_approved_by_name,
    secondApprovedAt: row.second_approved_at?.toISOString() ?? null,
    status: row.status,
  };
}

function toApproval(row: ApprovalRow): DecisionApprovalRecord {
  return {
    id: row.id,
    decisionId: row.decision_id,
    requiredRole: row.required_role,
    status: row.status,
    requestedBy: row.requested_by,
    decidedBy: row.decided_by,
    decidedByName: row.decided_by_name,
    rationale: row.rationale,
    requestedAt: row.requested_at.toISOString(),
    decidedAt: row.decided_at?.toISOString() ?? null,
  };
}

async function selectDecision(
  client: PoolClient,
  tenantId: string,
  decisionId: string,
): Promise<DecisionRecord | null> {
  const result = await client.query<DecisionRow>(
    `SELECT ${DECISION_COLUMNS}
       FROM review.progression_decisions AS decision_row
       JOIN iam.users AS drafter ON drafter.id = decision_row.decided_by
       LEFT JOIN iam.users AS approver ON approver.id = decision_row.second_approved_by
      WHERE decision_row.tenant_id = $1 AND decision_row.id = $2`,
    [tenantId, decisionId],
  );
  const row = result.rows[0];
  return row === undefined ? null : toDecision(row);
}

async function appendOutbox(
  client: PoolClient,
  actor: Actor,
  decisionId: string,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `INSERT INTO audit.outbox_events
       (tenant_id, aggregate_type, aggregate_id, event_type, event_version, payload,
        data_classification, correlation_id, status)
     VALUES ($1, 'progression_decision', $2, $3, 1, $4::jsonb, 'confidential', $5, 'pending')`,
    [actor.tenantId, decisionId, eventType, JSON.stringify(payload), randomUUID()],
  );
}

async function appendAudit(
  client: PoolClient,
  actor: Actor,
  action: string,
  decisionId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await new PgAuditWriter(client).append({
    tenantId: actor.tenantId,
    actorType: 'user',
    actorId: actor.userId,
    action,
    resourceType: 'progression_decision',
    resourceId: decisionId,
    outcome: 'success',
    purpose: 'human progression decision',
    metadata,
  });
}

function sameDraft(record: DecisionRecord, input: DecisionCreate, actor: Actor): boolean {
  return (
    record.status === 'draft' &&
    record.decidedBy === actor.userId &&
    record.decision === input.decision &&
    record.rationale === input.rationale &&
    record.secondApprovalRequired === input.secondApprovalRequired &&
    JSON.stringify(record.evidenceLinks) === JSON.stringify(input.evidenceLinks)
  );
}

export class PgDecisionRepository implements DecisionRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: { role?: string } = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async getDecisionContext(actor: Actor, applicationId: string): Promise<DecisionContext | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const result = await client.query<ApplicationContextRow>(
        `SELECT application.id AS application_id,
                candidate.external_reference AS candidate_ref,
                campaign.title AS campaign_name,
                (application.status IN ('reviewed', 'progressed', 'not_progressed')) AS review_complete,
                (decision_row.id IS NOT NULL) AS decision_present,
                ${DECISION_COLUMNS}
           FROM hiring.applications AS application
           JOIN hiring.candidates AS candidate ON candidate.id = application.candidate_id
           JOIN hiring.campaigns AS campaign ON campaign.id = application.campaign_id
           LEFT JOIN LATERAL (
             SELECT selected.*
               FROM review.progression_decisions AS selected
              WHERE selected.tenant_id = application.tenant_id
                AND selected.application_id = application.id
                AND selected.status NOT IN ('superseded', 'withdrawn')
              ORDER BY selected.decided_at DESC NULLS LAST, selected.id DESC
              LIMIT 1
           ) AS decision_row ON true
           LEFT JOIN iam.users AS drafter ON drafter.id = decision_row.decided_by
           LEFT JOIN iam.users AS approver ON approver.id = decision_row.second_approved_by
          WHERE application.tenant_id = $1 AND application.id = $2`,
        [actor.tenantId, applicationId],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      const decision = row.decision_present ? toDecision(row) : null;
      let approval: DecisionApprovalRecord | null = null;
      if (decision !== null) {
        const approvalResult = await client.query<ApprovalRow>(
          `SELECT approval.id, approval.decision_id, approval.required_role, approval.status,
                  approval.requested_by, approval.decided_by,
                  approval_user.display_name AS decided_by_name,
                  approval.rationale, approval.requested_at, approval.decided_at
             FROM hiring.decision_approvals AS approval
             LEFT JOIN iam.users AS approval_user ON approval_user.id = approval.decided_by
            WHERE approval.tenant_id = $1 AND approval.decision_id = $2
            ORDER BY approval.requested_at DESC, approval.id DESC
            LIMIT 1`,
          [actor.tenantId, decision.id],
        );
        const approvalRow = approvalResult.rows[0];
        approval = approvalRow === undefined ? null : toApproval(approvalRow);
      }
      return {
        applicationId: row.application_id,
        candidateRef: row.candidate_ref,
        campaignName: row.campaign_name,
        reviewComplete: row.review_complete,
        decision,
        approval,
      };
    });
  }

  async getDecision(actor: Actor, decisionId: string): Promise<DecisionRecord | null> {
    return withTenant(this.#pool, this.#context(actor), (client) =>
      selectDecision(client, actor.tenantId, decisionId),
    );
  }

  async createDecision(
    actor: Actor,
    applicationId: string,
    input: DecisionCreate,
    _idempotencyKey: string,
  ): Promise<DecisionRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [applicationId]);
      const application = await client.query<{ status: string }>(
        `SELECT status FROM hiring.applications WHERE tenant_id = $1 AND id = $2 FOR UPDATE`,
        [actor.tenantId, applicationId],
      );
      const applicationRow = application.rows[0];
      if (applicationRow === undefined) return null;
      if (!['reviewed', 'progressed', 'not_progressed'].includes(applicationRow.status)) {
        throw new DecisionConflictError(
          'Review must be complete before a decision can be drafted.',
        );
      }

      const existingResult = await client.query<{ id: string }>(
        `SELECT id
           FROM review.progression_decisions
          WHERE tenant_id = $1 AND application_id = $2
            AND status NOT IN ('superseded', 'withdrawn')
          ORDER BY decided_at DESC NULLS LAST, id DESC
          LIMIT 1
          FOR UPDATE`,
        [actor.tenantId, applicationId],
      );
      const existingId = existingResult.rows[0]?.id;
      if (existingId !== undefined) {
        const existing = await selectDecision(client, actor.tenantId, existingId);
        if (existing === null) return null;
        if (sameDraft(existing, input, actor)) return existing;
        if (existing.status !== 'draft') {
          throw new DecisionConflictError('Only a draft or returned decision can be revised.');
        }
        await client.query(
          `UPDATE review.progression_decisions
              SET decision = $3,
                  reason = $4,
                  evidence_links = $5::jsonb,
                  decided_by = $6,
                  decided_at = now(),
                  issued_at = NULL,
                  second_approval_required = $7,
                  second_approved_by = NULL,
                  second_approved_at = NULL,
                  status = 'draft'
            WHERE tenant_id = $1 AND id = $2`,
          [
            actor.tenantId,
            existingId,
            input.decision,
            input.rationale,
            JSON.stringify(input.evidenceLinks),
            actor.userId,
            input.secondApprovalRequired,
          ],
        );
        await client.query(
          `INSERT INTO hiring.decision_approvals
             (tenant_id, decision_id, required_role, status, requested_by)
           VALUES ($1, $2, 'employer_admin_approver', 'pending', $3)
           ON CONFLICT (decision_id, required_role) DO UPDATE
             SET status = 'pending', requested_by = EXCLUDED.requested_by,
                 decided_by = NULL, rationale = NULL, requested_at = now(), decided_at = NULL`,
          [actor.tenantId, existingId, actor.userId],
        );
        await appendAudit(client, actor, 'decision.revise', existingId, {
          applicationId,
          decision: input.decision,
          evidenceLinkCount: input.evidenceLinks.length,
          secondApprovalRequired: input.secondApprovalRequired,
        });
        await appendOutbox(client, actor, existingId, 'decision.revised', {
          applicationId,
          decision: input.decision,
          secondApprovalRequired: input.secondApprovalRequired,
        });
        return selectDecision(client, actor.tenantId, existingId);
      }

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO review.progression_decisions
           (tenant_id, application_id, decision, reason, evidence_links, decided_by, decided_at,
            decision_origin, human_confirmed, second_approval_required, status)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, now(), 'human', true, $7, 'draft')
         RETURNING id`,
        [
          actor.tenantId,
          applicationId,
          input.decision,
          input.rationale,
          JSON.stringify(input.evidenceLinks),
          actor.userId,
          input.secondApprovalRequired,
        ],
      );
      const decisionId = inserted.rows[0]?.id;
      if (decisionId === undefined) throw new Error('decision insert returned no id');
      if (input.secondApprovalRequired) {
        await client.query(
          `INSERT INTO hiring.decision_approvals
             (tenant_id, decision_id, required_role, status, requested_by)
           VALUES ($1, $2, 'employer_admin_approver', 'pending', $3)`,
          [actor.tenantId, decisionId, actor.userId],
        );
      }
      await appendAudit(client, actor, 'decision.create_draft', decisionId, {
        applicationId,
        decision: input.decision,
        evidenceLinkCount: input.evidenceLinks.length,
        secondApprovalRequired: input.secondApprovalRequired,
      });
      await appendOutbox(client, actor, decisionId, 'decision.draft_created', {
        applicationId,
        decision: input.decision,
        secondApprovalRequired: input.secondApprovalRequired,
      });
      return selectDecision(client, actor.tenantId, decisionId);
    });
  }

  async recordApproval(
    actor: Actor,
    decisionId: string,
    input: DecisionApprovalInput,
    _idempotencyKey: string,
  ): Promise<DecisionRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const decisionResult = await client.query<{
        decided_by: string;
        status: DecisionStatus;
        second_approval_required: boolean;
        second_approved_by: string | null;
        application_id: string;
      }>(
        `SELECT decided_by, status, second_approval_required, second_approved_by, application_id
           FROM review.progression_decisions
          WHERE tenant_id = $1 AND id = $2
          FOR UPDATE`,
        [actor.tenantId, decisionId],
      );
      const decision = decisionResult.rows[0];
      if (decision === undefined) return null;
      if (decision.decided_by === actor.userId) {
        throw new DecisionConflictError('The decision drafter cannot approve their own decision.');
      }
      if (!decision.second_approval_required) {
        throw new DecisionConflictError('This decision does not require secondary approval.');
      }
      if (decision.status === 'issued') return selectDecision(client, actor.tenantId, decisionId);
      if (decision.status !== 'draft' && decision.status !== 'pending_approval') {
        throw new DecisionConflictError('The decision cannot be approved from its current status.');
      }
      if (
        input.status === 'approved' &&
        decision.status === 'pending_approval' &&
        decision.second_approved_by === actor.userId
      ) {
        return selectDecision(client, actor.tenantId, decisionId);
      }

      await client.query(
        `INSERT INTO hiring.decision_approvals
           (tenant_id, decision_id, required_role, status, requested_by, decided_by, rationale, decided_at)
         VALUES ($1, $2, 'employer_admin_approver', $3, $4, $5, $6, now())
         ON CONFLICT (decision_id, required_role) DO UPDATE
           SET status = EXCLUDED.status, decided_by = EXCLUDED.decided_by,
               rationale = EXCLUDED.rationale, decided_at = now()`,
        [
          actor.tenantId,
          decisionId,
          input.status,
          decision.decided_by,
          actor.userId,
          input.rationale,
        ],
      );
      await client.query(
        `UPDATE review.progression_decisions
            SET status = $3,
                second_approved_by = $4,
                second_approved_at = $5
          WHERE tenant_id = $1 AND id = $2`,
        [
          actor.tenantId,
          decisionId,
          input.status === 'approved' ? 'pending_approval' : 'draft',
          input.status === 'approved' ? actor.userId : null,
          input.status === 'approved' ? new Date() : null,
        ],
      );
      await appendAudit(client, actor, `decision.${input.status}`, decisionId, {
        applicationId: decision.application_id,
        separationOfDuties: true,
      });
      await appendOutbox(client, actor, decisionId, `decision.${input.status}`, {
        applicationId: decision.application_id,
      });
      return selectDecision(client, actor.tenantId, decisionId);
    });
  }

  async issueDecision(
    actor: Actor,
    decisionId: string,
    _idempotencyKey: string,
  ): Promise<DecisionRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const result = await client.query<{
        status: DecisionStatus;
        second_approval_required: boolean;
        second_approved_by: string | null;
        application_id: string;
        decision: DecisionType;
        candidate_reference: string;
      }>(
        `SELECT decision_row.status, decision_row.second_approval_required,
                decision_row.second_approved_by, decision_row.application_id,
                decision_row.decision, candidate.external_reference AS candidate_reference
           FROM review.progression_decisions AS decision_row
           JOIN hiring.applications AS application ON application.id = decision_row.application_id
           JOIN hiring.candidates AS candidate ON candidate.id = application.candidate_id
          WHERE decision_row.tenant_id = $1 AND decision_row.id = $2
          FOR UPDATE OF decision_row`,
        [actor.tenantId, decisionId],
      );
      const decision = result.rows[0];
      if (decision === undefined) return null;
      if (decision.status === 'issued') return selectDecision(client, actor.tenantId, decisionId);
      if (decision.second_approval_required && decision.second_approved_by === null) {
        throw new DecisionConflictError('Required secondary approval has not been recorded.');
      }
      if (decision.status !== 'draft' && decision.status !== 'pending_approval') {
        throw new DecisionConflictError('The decision cannot be issued from its current status.');
      }

      await client.query(
        `UPDATE review.progression_decisions
            SET status = 'issued', issued_at = now()
          WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, decisionId],
      );
      const applicationStatus =
        decision.decision === 'progress'
          ? 'progressed'
          : decision.decision === 'not_progress'
            ? 'not_progressed'
            : decision.decision === 'withdrawn'
              ? 'withdrawn'
              : 'reviewed';
      await client.query(
        `UPDATE hiring.applications SET status = $3, updated_at = now()
          WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, decision.application_id, applicationStatus],
      );
      await client.query(
        `INSERT INTO integration.outbound_messages
           (tenant_id, application_id, template_code, template_version, recipient_hash, status, payload)
         VALUES ($1, $2, 'decision_notice', '1', $3, 'queued', $4::jsonb)`,
        [
          actor.tenantId,
          decision.application_id,
          createHash('sha256').update(decision.candidate_reference).digest('hex'),
          JSON.stringify({ decisionId, applicationId: decision.application_id }),
        ],
      );
      await appendAudit(client, actor, 'decision.issue', decisionId, {
        applicationId: decision.application_id,
        decision: decision.decision,
        noticeQueued: true,
      });
      await appendOutbox(client, actor, decisionId, 'decision.issued', {
        applicationId: decision.application_id,
        decision: decision.decision,
        noticeQueued: true,
      });
      return selectDecision(client, actor.tenantId, decisionId);
    });
  }
}
