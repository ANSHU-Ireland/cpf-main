import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type { AssessmentCreate, AssessmentRecord, AssessmentStatus } from './assessment-types.js';

export interface AssessmentListResult {
  readonly items: readonly AssessmentRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface AssessmentRepository {
  listAssessments(
    actor: Actor,
    limit: number,
    cursor: string | null,
  ): Promise<AssessmentListResult>;
  getAssessment(actor: Actor, id: string): Promise<AssessmentRecord | null>;
  createAssessment(actor: Actor, input: AssessmentCreate): Promise<AssessmentRecord>;
}

interface AssessmentRow {
  id: string;
  tenant_id: string;
  code: string;
  title: string;
  target_role: string;
  seniority: string;
  owner_user_id: string;
  lifecycle_status: AssessmentStatus;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS =
  'id, tenant_id, code, title, target_role, seniority, owner_user_id, lifecycle_status, created_at, updated_at';

function toRecord(row: AssessmentRow): AssessmentRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    code: row.code,
    title: row.title,
    targetRole: row.target_role,
    seniority: row.seniority,
    ownerUserId: row.owner_user_id,
    lifecycleStatus: row.lifecycle_status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PgAssessmentRepository implements AssessmentRepository {
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

  async listAssessments(
    actor: Actor,
    limit: number,
    cursor: string | null,
  ): Promise<AssessmentListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const params: unknown[] = [actor.tenantId, limit + 1];
      let where = 'WHERE tenant_id = $1';
      if (cursor !== null) {
        params.push(cursor);
        where += ` AND created_at < (SELECT created_at FROM assessment.assessments WHERE id = $${params.length})`;
      }
      const res = await client.query<AssessmentRow>(
        `SELECT ${COLUMNS} FROM assessment.assessments ${where} ORDER BY created_at DESC LIMIT $2`,
        params,
      );
      const hasMore = res.rows.length > limit;
      const items = hasMore ? res.rows.slice(0, limit).map(toRecord) : res.rows.map(toRecord);
      return { items, total: items.length, hasMore };
    });
  }

  async getAssessment(actor: Actor, id: string): Promise<AssessmentRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<AssessmentRow>(
        `SELECT ${COLUMNS} FROM assessment.assessments WHERE tenant_id = $1 AND id = $2`,
        [actor.tenantId, id],
      );
      const row = res.rows[0];
      if (row === undefined) return null;
      const versions = await client.query<{
        id: string;
        assessment_id: string;
        version_no: number;
        status: string;
        duration_seconds: number;
        created_at: Date;
        validations: unknown;
      }>(
        `SELECT av.id, av.assessment_id, av.version_no, av.status, av.duration_seconds,
                av.created_at,
                COALESCE(
                  jsonb_agg(
                    jsonb_build_object(
                      'id', validation.id,
                      'validationType', validation.validation_type,
                      'status', validation.status,
                      'summary', validation.summary
                    ) ORDER BY validation.created_at
                  ) FILTER (WHERE validation.id IS NOT NULL),
                  '[]'::jsonb
                ) AS validations
           FROM assessment.assessment_versions av
      LEFT JOIN assessment.assessment_validations validation
             ON validation.assessment_version_id = av.id
          WHERE av.assessment_id = $1
          GROUP BY av.id
          ORDER BY av.version_no DESC`,
        [id],
      );
      const defects = await client.query<{
        id: string;
        assessment_version_id: string;
        defect_type: string;
        severity: string;
        description: string;
        status: string;
        created_at: Date;
      }>(
        `SELECT defect.id, defect.assessment_version_id, defect.defect_type,
                defect.severity, defect.description, defect.status, defect.created_at
           FROM governance.assessment_defects defect
           JOIN assessment.assessment_versions version
             ON version.id = defect.assessment_version_id
          WHERE version.assessment_id = $1
          ORDER BY defect.created_at DESC`,
        [id],
      );
      return {
        ...toRecord(row),
        versions: versions.rows.map((version) => ({
          id: version.id,
          assessmentId: version.assessment_id,
          versionNo: version.version_no,
          status: version.status,
          durationSeconds: version.duration_seconds,
          createdAt: version.created_at.toISOString(),
          validations: Array.isArray(version.validations)
            ? (version.validations as {
                id: string;
                validationType: string;
                status: string;
                summary: string | null;
              }[])
            : [],
        })),
        defects: defects.rows.map((defect) => ({
          id: defect.id,
          assessmentVersionId: defect.assessment_version_id,
          defectType: defect.defect_type,
          severity: defect.severity,
          description: defect.description,
          status: defect.status,
          createdAt: defect.created_at.toISOString(),
        })),
      };
    });
  }

  async createAssessment(actor: Actor, input: AssessmentCreate): Promise<AssessmentRecord> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<AssessmentRow>(
        `INSERT INTO assessment.assessments (tenant_id, code, title, target_role, seniority, owner_user_id, lifecycle_status)
           VALUES ($1, $2, $3, $4, $5, $6, 'draft')
         RETURNING ${COLUMNS}`,
        [
          actor.tenantId,
          input.code,
          input.title,
          input.targetRole,
          input.seniority,
          input.ownerUserId,
        ],
      );
      const row = res.rows[0];
      if (row === undefined) throw new Error('assessment row missing after insert');

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'assessment.create',
        resourceType: 'assessment',
        resourceId: row.id,
        outcome: 'success',
        metadata: { code: input.code },
      });

      return toRecord(row);
    });
  }
}
