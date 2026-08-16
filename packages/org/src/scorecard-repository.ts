import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { PgAuditWriter } from '@cpf/audit';
import { withTenant, type TenantContext } from '@cpf/db';
import { ScorecardSubmissionConflictError, type ScorecardRepository } from './scorecards.js';
import type {
  CriterionScoreRecord,
  ScorecardRecord,
  ScorecardStatus,
  ScorecardUpdate,
} from './scorecard-types.js';
import type { Actor } from './types.js';

interface ScorecardRow {
  id: string;
  tenant_id: string;
  assignment_id: string;
  rubric_version_id: string;
  status: ScorecardStatus;
  overall_confidence: string | number | null;
  summary: string | null;
  submitted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface CriterionRow {
  id: string | null;
  criterion_id: string;
  code: string;
  title: string;
  description: string;
  display_order: number;
  max_score: string | number;
  human_score: string | number | null;
  confidence: string | number | null;
  insufficient_evidence: boolean | null;
  evidence_links: unknown[] | null;
  reviewer_comment: string | null;
  updated_at: Date | null;
}

const COLUMNS = `id, tenant_id, assignment_id, rubric_version_id, status,
  overall_confidence, summary, submitted_at, created_at, updated_at`;

function toRecord(
  row: ScorecardRow,
  criteria: readonly CriterionScoreRecord[] = [],
): ScorecardRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    assignmentId: row.assignment_id,
    rubricVersionId: row.rubric_version_id,
    status: row.status,
    overallConfidence: row.overall_confidence === null ? null : Number(row.overall_confidence),
    summary: row.summary,
    submittedAt: row.submitted_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    criteria,
  };
}

function toCriterion(row: CriterionRow): CriterionScoreRecord {
  return {
    id: row.id ?? row.criterion_id,
    criterionId: row.criterion_id,
    code: row.code,
    title: row.title,
    description: row.description,
    displayOrder: row.display_order,
    maxScore: Number(row.max_score),
    humanScore: row.human_score === null ? null : Number(row.human_score),
    confidence: row.confidence === null ? null : Number(row.confidence),
    insufficientEvidence: row.insufficient_evidence ?? false,
    evidenceLinks: row.evidence_links ?? [],
    reviewerComment: row.reviewer_comment,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };
}

async function loadCriteria(
  client: PoolClient,
  tenantId: string,
  scorecardId: string,
  rubricVersionId: string,
): Promise<CriterionScoreRecord[]> {
  const result = await client.query<CriterionRow>(
    `SELECT s.id, c.id AS criterion_id, c.code, c.title, c.description, c.display_order,
            c.max_score,
            s.human_score, s.confidence, s.insufficient_evidence, s.evidence_links,
            s.reviewer_comment, s.updated_at
       FROM assessment.rubric_criteria AS c
       LEFT JOIN review.criterion_scores AS s
         ON s.criterion_id = c.id AND s.scorecard_id = $2 AND s.tenant_id = $1
      WHERE c.rubric_version_id = $3
      ORDER BY c.display_order, c.id`,
    [tenantId, scorecardId, rubricVersionId],
  );
  return result.rows.map(toCriterion);
}

async function appendOutbox(
  client: PoolClient,
  actor: Actor,
  scorecardId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await client.query(
    `INSERT INTO audit.outbox_events
       (tenant_id, aggregate_type, aggregate_id, event_type, event_version, payload,
        data_classification, correlation_id, status)
     VALUES ($1, 'scorecard', $2, 'scorecard.updated', 1, $3::jsonb,
             'confidential', $4, 'pending')`,
    [actor.tenantId, scorecardId, JSON.stringify(payload), randomUUID()],
  );
}

export class PgScorecardRepository implements ScorecardRepository {
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

  async getScorecard(actor: Actor, assignmentId: string): Promise<ScorecardRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const result = await client.query<ScorecardRow>(
        `SELECT scorecard.id, scorecard.tenant_id, scorecard.assignment_id,
                scorecard.rubric_version_id, scorecard.status,
                scorecard.overall_confidence, scorecard.summary, scorecard.submitted_at,
                scorecard.created_at, scorecard.updated_at
           FROM review.scorecards AS scorecard
           JOIN review.reviewer_assignments AS assignment
             ON assignment.id = scorecard.assignment_id
            AND assignment.tenant_id = scorecard.tenant_id
           JOIN hiring.reviewer_profiles AS reviewer
             ON reviewer.id = assignment.reviewer_profile_id
            AND reviewer.tenant_id = assignment.tenant_id
          WHERE scorecard.tenant_id = $1 AND scorecard.assignment_id = $2
            AND ($3::boolean = false OR reviewer.user_id = $4)`,
        [actor.tenantId, assignmentId, actor.roles.includes('employer_reviewer'), actor.userId],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      const criteria = await loadCriteria(client, actor.tenantId, row.id, row.rubric_version_id);
      return toRecord(row, criteria);
    });
  }

  async updateScorecard(
    actor: Actor,
    assignmentId: string,
    input: ScorecardUpdate,
  ): Promise<ScorecardRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const sets: string[] = [];
      const params: unknown[] = [actor.tenantId, assignmentId];

      if (input.summary !== undefined) {
        params.push(input.summary);
        sets.push(`summary = $${params.length}`);
      }
      if (input.overallConfidence !== undefined) {
        params.push(input.overallConfidence);
        sets.push(`overall_confidence = $${params.length}`);
      }
      if (input.status !== undefined) {
        params.push(input.status);
        sets.push(`status = $${params.length}`);
        if (input.status === 'submitted') sets.push('submitted_at = COALESCE(submitted_at, now())');
      }
      let row: ScorecardRow | undefined;
      if (sets.length > 0) {
        sets.push('updated_at = now()');
        const result = await client.query<ScorecardRow>(
          `UPDATE review.scorecards AS scorecard
              SET ${sets.join(', ')}
             FROM review.reviewer_assignments AS assignment
             JOIN hiring.reviewer_profiles AS reviewer
               ON reviewer.id = assignment.reviewer_profile_id
              AND reviewer.tenant_id = assignment.tenant_id
            WHERE scorecard.tenant_id = $1 AND scorecard.assignment_id = $2
              AND assignment.id = scorecard.assignment_id
              AND scorecard.status = 'draft'
              AND ($${params.length + 1}::boolean = false OR reviewer.user_id = $${params.length + 2})
          RETURNING scorecard.id, scorecard.tenant_id, scorecard.assignment_id,
                    scorecard.rubric_version_id, scorecard.status,
                    scorecard.overall_confidence, scorecard.summary, scorecard.submitted_at,
                    scorecard.created_at, scorecard.updated_at`,
          [...params, actor.roles.includes('employer_reviewer'), actor.userId],
        );
        row = result.rows[0];
      } else {
        const result = await client.query<ScorecardRow>(
          `SELECT scorecard.id, scorecard.tenant_id, scorecard.assignment_id,
                  scorecard.rubric_version_id, scorecard.status,
                  scorecard.overall_confidence, scorecard.summary, scorecard.submitted_at,
                  scorecard.created_at, scorecard.updated_at
             FROM review.scorecards AS scorecard
             JOIN review.reviewer_assignments AS assignment
               ON assignment.id = scorecard.assignment_id
              AND assignment.tenant_id = scorecard.tenant_id
             JOIN hiring.reviewer_profiles AS reviewer
               ON reviewer.id = assignment.reviewer_profile_id
              AND reviewer.tenant_id = assignment.tenant_id
            WHERE scorecard.tenant_id = $1 AND scorecard.assignment_id = $2
              AND ($3::boolean = false OR reviewer.user_id = $4)`,
          [actor.tenantId, assignmentId, actor.roles.includes('employer_reviewer'), actor.userId],
        );
        row = result.rows[0];
      }
      if (row === undefined) return null;

      if (input.criterion !== undefined) {
        const criterion = input.criterion;
        await client.query(
          `INSERT INTO review.criterion_scores
             (tenant_id, scorecard_id, criterion_id, human_score, confidence,
              insufficient_evidence, evidence_links, reviewer_comment)
           SELECT $1, $2, c.id, $4, $5, $6, $7::jsonb, $8
             FROM assessment.rubric_criteria AS c
            WHERE c.id = $3 AND c.rubric_version_id = $9
           ON CONFLICT (scorecard_id, criterion_id) DO UPDATE
               SET human_score = EXCLUDED.human_score,
                   confidence = EXCLUDED.confidence,
                   insufficient_evidence = EXCLUDED.insufficient_evidence,
                   evidence_links = EXCLUDED.evidence_links,
                   reviewer_comment = EXCLUDED.reviewer_comment,
                   updated_at = now()`,
          [
            actor.tenantId,
            row.id,
            criterion.criterionId,
            criterion.humanScore,
            criterion.confidence ?? null,
            criterion.insufficientEvidence,
            JSON.stringify(criterion.evidenceLinks),
            criterion.reviewerComment,
            row.rubric_version_id,
          ],
        );
        await client.query(
          `UPDATE review.scorecards SET updated_at = now() WHERE tenant_id = $1 AND id = $2`,
          [actor.tenantId, row.id],
        );
      }

      const metadata = input as Record<string, unknown>;
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'scorecard.update',
        resourceType: 'scorecard',
        resourceId: row.id,
        outcome: 'success',
        metadata,
      });
      await appendOutbox(client, actor, row.id, metadata);
      const refreshed = await client.query<ScorecardRow>(
        `SELECT ${COLUMNS} FROM review.scorecards WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, row.id],
      );
      const finalRow = refreshed.rows[0] ?? row;
      const criteria = await loadCriteria(
        client,
        actor.tenantId,
        finalRow.id,
        finalRow.rubric_version_id,
      );
      return toRecord(finalRow, criteria);
    });
  }

  async submitScorecard(actor: Actor, assignmentId: string): Promise<ScorecardRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const scorecardResult = await client.query<ScorecardRow>(
        `SELECT scorecard.id, scorecard.tenant_id, scorecard.assignment_id,
                scorecard.rubric_version_id, scorecard.status,
                scorecard.overall_confidence, scorecard.summary, scorecard.submitted_at,
                scorecard.created_at, scorecard.updated_at
           FROM review.scorecards AS scorecard
           JOIN review.reviewer_assignments AS assignment
             ON assignment.id = scorecard.assignment_id
            AND assignment.tenant_id = scorecard.tenant_id
           JOIN hiring.reviewer_profiles AS reviewer
             ON reviewer.id = assignment.reviewer_profile_id
            AND reviewer.tenant_id = assignment.tenant_id
          WHERE scorecard.tenant_id = $1 AND scorecard.assignment_id = $2
            AND ($3::boolean = false OR reviewer.user_id = $4)
          FOR UPDATE OF scorecard, assignment`,
        [actor.tenantId, assignmentId, actor.roles.includes('employer_reviewer'), actor.userId],
      );
      const row = scorecardResult.rows[0];
      if (row === undefined) return null;
      if (row.status === 'locked' || row.status === 'submitted') {
        const criteria = await loadCriteria(client, actor.tenantId, row.id, row.rubric_version_id);
        return toRecord(row, criteria);
      }

      const readiness = await client.query<{
        incomplete_criteria: string;
        open_integrity_events: string;
        unreviewed_evidence: string;
      }>(
        `SELECT
           (SELECT count(*)::text
              FROM assessment.rubric_criteria AS criterion
         LEFT JOIN review.criterion_scores AS score
                ON score.criterion_id = criterion.id
               AND score.scorecard_id = $2
               AND score.tenant_id = $1
             WHERE criterion.rubric_version_id = $3
               AND (
                 score.id IS NULL
                 OR score.reviewer_comment IS NULL
                 OR length(trim(score.reviewer_comment)) < 3
                 OR (score.human_score IS NULL AND score.insufficient_evidence = false)
                 OR (score.insufficient_evidence = false AND jsonb_array_length(score.evidence_links) = 0)
               )) AS incomplete_criteria,
           (SELECT count(*)::text
              FROM review.reviewer_assignments AS assignment
              JOIN runtime.submissions AS submission ON submission.id = assignment.submission_id
              JOIN evidence.integrity_events AS event ON event.attempt_id = submission.attempt_id
             WHERE assignment.tenant_id = $1 AND assignment.id = $4
               AND event.tenant_id = assignment.tenant_id
               AND event.status <> 'resolved') AS open_integrity_events,
           (SELECT count(*)::text
              FROM review.reviewer_assignments AS assignment
              JOIN runtime.submissions AS submission ON submission.id = assignment.submission_id
              JOIN evidence.evidence_objects AS evidence
                ON evidence.attempt_id = submission.attempt_id
               AND evidence.tenant_id = assignment.tenant_id
         LEFT JOIN review.evidence_annotations AS annotation
                ON annotation.tenant_id = assignment.tenant_id
               AND annotation.assignment_id = assignment.id
               AND annotation.evidence_object_id = evidence.id
               AND annotation.created_by = $5
             WHERE assignment.tenant_id = $1 AND assignment.id = $4
               AND annotation.id IS NULL) AS unreviewed_evidence`,
        [actor.tenantId, row.id, row.rubric_version_id, assignmentId, actor.userId],
      );
      const incomplete = Number(readiness.rows[0]?.incomplete_criteria ?? 0);
      const openIntegrity = Number(readiness.rows[0]?.open_integrity_events ?? 0);
      const unreviewedEvidence = Number(readiness.rows[0]?.unreviewed_evidence ?? 0);
      if (incomplete > 0) {
        throw new ScorecardSubmissionConflictError(
          `${String(incomplete)} required criterion record(s) are incomplete.`,
        );
      }
      if (openIntegrity > 0) {
        throw new ScorecardSubmissionConflictError(
          `${String(openIntegrity)} integrity event(s) require a human resolution.`,
        );
      }
      if (unreviewedEvidence > 0) {
        throw new ScorecardSubmissionConflictError(
          `${String(unreviewedEvidence)} evidence item(s) require reviewer acknowledgement.`,
        );
      }

      const submitted = await client.query<ScorecardRow>(
        `UPDATE review.scorecards
            SET status = 'locked', submitted_at = now(), updated_at = now()
          WHERE tenant_id = $1 AND id = $2
        RETURNING ${COLUMNS}`,
        [actor.tenantId, row.id],
      );
      await client.query(
        `UPDATE review.reviewer_assignments
            SET status = 'submitted', submitted_at = now()
          WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, assignmentId],
      );
      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'scorecard.submit',
        resourceType: 'scorecard',
        resourceId: row.id,
        outcome: 'success',
        metadata: { assignmentId },
      });
      await appendOutbox(client, actor, row.id, { assignmentId, status: 'locked' });
      const finalRow = submitted.rows[0];
      if (finalRow === undefined) return null;
      const criteria = await loadCriteria(
        client,
        actor.tenantId,
        finalRow.id,
        finalRow.rubric_version_id,
      );
      return toRecord(finalRow, criteria);
    });
  }
}
