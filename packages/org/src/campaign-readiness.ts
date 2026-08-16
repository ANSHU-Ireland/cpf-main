import type { Pool, PoolClient } from 'pg';
import { can } from '@cpf/policy';
import { withTenant, type TenantContext } from '@cpf/db';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

export type CampaignPreflightSeverity = 'blocker' | 'warning' | 'ok';

export interface CampaignPreflightCheck {
  readonly id: string;
  readonly label: string;
  readonly severity: CampaignPreflightSeverity;
  readonly detail: string;
  readonly resolved: boolean;
}

export interface CampaignActivationPreflight {
  readonly campaignId: string;
  readonly ready: boolean;
  readonly checks: readonly CampaignPreflightCheck[];
}

export interface CampaignCandidatePreview {
  readonly campaignId: string;
  readonly campaignTitle: string;
  readonly roleName: string;
  readonly assessmentTitle: string | null;
  readonly durationSeconds: number | null;
  readonly instructions: unknown;
  readonly technicalRequirements: unknown;
  readonly accessibilityConfig: unknown;
  readonly noticeTypes: readonly string[];
}

export interface CampaignReadinessRepository {
  getActivationPreflight(
    actor: Actor,
    campaignId: string,
  ): Promise<CampaignActivationPreflight | null>;
  getCandidatePreview(actor: Actor, campaignId: string): Promise<CampaignCandidatePreview | null>;
}

interface ReadinessRow {
  campaign_exists: boolean;
  active_version: boolean;
  assessment_ready: boolean;
  validation_ready: boolean;
  reviewer_capacity: boolean;
  notices_ready: boolean;
  lawful_basis_ready: boolean;
  dpia_ready: boolean;
  retention_ready: boolean;
  oversight_ready: boolean;
}

function check(
  id: string,
  label: string,
  resolved: boolean,
  success: string,
  failure: string,
): CampaignPreflightCheck {
  return {
    id,
    label,
    severity: resolved ? 'ok' : 'blocker',
    detail: resolved ? success : failure,
    resolved,
  };
}

/**
 * Evaluates the authoritative launch controls from persisted records. Keep this
 * helper shared with the campaign state transition so a caller cannot bypass
 * the preflight endpoint and activate an unsafe campaign directly.
 */
export async function evaluateCampaignActivationPreflight(
  client: PoolClient,
  tenantId: string,
  campaignId: string,
): Promise<CampaignActivationPreflight | null> {
  const result = await client.query<ReadinessRow>(
    `SELECT
       EXISTS (
         SELECT 1 FROM hiring.campaigns c
          WHERE c.tenant_id = $1 AND c.id = $2
       ) AS campaign_exists,
       EXISTS (
         SELECT 1
           FROM hiring.campaigns c
           JOIN hiring.campaign_versions cv
             ON cv.campaign_id = c.id
            AND cv.tenant_id = c.tenant_id
            AND cv.version_no = c.current_version_no
            AND cv.status = 'active'
          WHERE c.tenant_id = $1 AND c.id = $2
       ) AS active_version,
       EXISTS (
         SELECT 1
           FROM hiring.campaigns c
           JOIN hiring.campaign_versions cv
             ON cv.campaign_id = c.id
            AND cv.tenant_id = c.tenant_id
            AND cv.version_no = c.current_version_no
            AND cv.status = 'active'
           JOIN assessment.assessment_versions av
             ON av.id = cv.assessment_version_id
            AND av.status = 'active'
           JOIN assessment.assessments a
             ON a.id = av.assessment_id
            AND a.lifecycle_status = 'active'
          WHERE c.tenant_id = $1 AND c.id = $2
       ) AS assessment_ready,
       EXISTS (
         SELECT 1
           FROM hiring.campaigns c
           JOIN hiring.campaign_versions cv
             ON cv.campaign_id = c.id
            AND cv.tenant_id = c.tenant_id
            AND cv.version_no = c.current_version_no
          WHERE c.tenant_id = $1
            AND c.id = $2
            AND NOT EXISTS (
              SELECT 1
                FROM (VALUES
                  ('accessibility'), ('privacy'), ('security'), ('fairness'), ('technical')
                ) AS required(validation_type)
               WHERE NOT EXISTS (
                 SELECT 1
                   FROM assessment.assessment_validations v
                  WHERE v.assessment_version_id = cv.assessment_version_id
                    AND v.validation_type = required.validation_type
                    AND v.status IN ('passed', 'passed_with_conditions')
                    AND (v.expires_at IS NULL OR v.expires_at > now())
               )
            )
       ) AS validation_ready,
       EXISTS (
         SELECT 1
           FROM hiring.campaign_reviewers cr
           JOIN hiring.reviewer_profiles rp
             ON rp.id = cr.reviewer_profile_id
            AND rp.tenant_id = cr.tenant_id
          WHERE cr.tenant_id = $1
            AND cr.campaign_id = $2
            AND cr.active
            AND cr.conflict_status IN ('clear', 'waived')
            AND rp.training_status IN ('passed', 'complete', 'completed', 'current')
            AND rp.calibration_status IN ('passed', 'calibrated', 'current')
            AND EXISTS (
              SELECT 1
                FROM review.reviewer_availability ra
               WHERE ra.reviewer_profile_id = rp.id
                 AND ra.tenant_id = rp.tenant_id
                 AND ra.status = 'available'
                 AND ra.capacity > 0
                 AND ra.available_to > now()
            )
       ) AS reviewer_capacity,
       NOT EXISTS (
         SELECT 1
           FROM (VALUES
             ('privacy'), ('monitoring'), ('ai_use'), ('assessment_rules'), ('accessibility')
           ) AS required(template_code)
          WHERE NOT EXISTS (
            SELECT 1
              FROM integration.notification_templates nt
             WHERE (nt.tenant_id = $1 OR nt.tenant_id IS NULL)
               AND nt.template_code = required.template_code
               AND nt.status = 'active'
          )
       ) AS notices_ready,
       EXISTS (
         SELECT 1
           FROM governance.data_use_register dur
          WHERE (dur.tenant_id = $1 OR dur.tenant_id IS NULL)
            AND dur.status = 'active'
            AND NULLIF(btrim(dur.lawful_basis), '') IS NOT NULL
            AND dur.owner_user_id IS NOT NULL
       ) AS lawful_basis_ready,
       EXISTS (
         SELECT 1
           FROM governance.impact_assessments ia
          WHERE (ia.tenant_id = $1 OR ia.tenant_id IS NULL)
            AND ia.assessment_type = 'dpia'
            AND ia.scope_type = 'campaign'
            AND ia.scope_id = $2
            AND ia.status = 'approved'
            AND (ia.review_due IS NULL OR ia.review_due >= current_date)
       ) AS dpia_ready,
       EXISTS (
         SELECT 1
           FROM governance.retention_policies rp
          WHERE (rp.tenant_id = $1 OR rp.tenant_id IS NULL)
            AND rp.status = 'active'
            AND rp.effective_from <= current_date
            AND NULLIF(btrim(rp.legal_basis), '') IS NOT NULL
       ) AS retention_ready,
       EXISTS (
         SELECT 1
           FROM governance.human_oversight_assignments hoa
          WHERE hoa.tenant_id = $1
            AND hoa.campaign_id = $2
            AND hoa.status = 'active'
            AND NULLIF(btrim(hoa.support_contact), '') IS NOT NULL
            AND (hoa.training_valid_until IS NULL OR hoa.training_valid_until >= current_date)
       ) AS oversight_ready`,
    [tenantId, campaignId],
  );
  const row = result.rows[0];
  if (row === undefined || !row.campaign_exists) return null;

  const checks = [
    check(
      'campaign-version',
      'Campaign version',
      row.active_version,
      'The current campaign version is active.',
      'Activate the current campaign version before launch.',
    ),
    check(
      'assessment-version',
      'Assessment version',
      row.assessment_ready,
      'The bound assessment and assessment version are active.',
      'Bind an active, approved assessment version to the campaign.',
    ),
    check(
      'assessment-validation',
      'Assessment validation',
      row.validation_ready,
      'Accessibility, privacy, security, fairness and technical validations are current.',
      'Complete the required assessment validations before launch.',
    ),
    check(
      'reviewer-capacity',
      'Reviewer capacity',
      row.reviewer_capacity,
      'A trained, calibrated reviewer with cleared conflicts has capacity.',
      'Assign an eligible reviewer with current availability and cleared conflicts.',
    ),
    check(
      'candidate-notices',
      'Candidate notices',
      row.notices_ready,
      'All required candidate notice templates are active.',
      'Activate privacy, monitoring, AI-use, assessment-rules and accessibility notices.',
    ),
    check(
      'lawful-basis',
      'Lawful basis and owner',
      row.lawful_basis_ready,
      'An active data-use record has a lawful basis and accountable owner.',
      'Approve an active data-use record with a lawful basis and accountable owner.',
    ),
    check(
      'dpia',
      'Data protection impact assessment',
      row.dpia_ready,
      'A current campaign DPIA is approved.',
      'Obtain approval for a current DPIA scoped to this campaign.',
    ),
    check(
      'retention',
      'Retention controls',
      row.retention_ready,
      'An active retention policy is in force.',
      'Approve and activate the applicable retention policy.',
    ),
    check(
      'human-oversight',
      'Human oversight and support',
      row.oversight_ready,
      'A trained human-oversight owner and support contact are active.',
      'Assign an active human-oversight owner with current training and a support contact.',
    ),
  ];
  return { campaignId, ready: checks.every((item) => item.resolved), checks };
}

interface PreviewRow {
  campaign_id: string;
  campaign_title: string;
  role_name: string;
  assessment_title: string | null;
  duration_seconds: number | null;
  instructions: unknown;
  technical_requirements: unknown;
  accessibility_config: unknown;
}

export class PgCampaignReadinessRepository implements CampaignReadinessRepository {
  constructor(
    private readonly pool: Pool,
    private readonly role?: string,
  ) {}

  private context(actor: Actor): TenantContext {
    return this.role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.role };
  }

  async getActivationPreflight(
    actor: Actor,
    campaignId: string,
  ): Promise<CampaignActivationPreflight | null> {
    return withTenant(this.pool, this.context(actor), (client) =>
      evaluateCampaignActivationPreflight(client, actor.tenantId, campaignId),
    );
  }

  async getCandidatePreview(
    actor: Actor,
    campaignId: string,
  ): Promise<CampaignCandidatePreview | null> {
    return withTenant(this.pool, this.context(actor), async (client) => {
      const result = await client.query<PreviewRow>(
        `SELECT c.id AS campaign_id,
                c.title AS campaign_title,
                c.role_name,
                a.title AS assessment_title,
                av.duration_seconds,
                av.instructions,
                av.technical_requirements,
                av.accessibility_config
           FROM hiring.campaigns c
           LEFT JOIN hiring.campaign_versions cv
             ON cv.campaign_id = c.id
            AND cv.tenant_id = c.tenant_id
            AND cv.version_no = c.current_version_no
           LEFT JOIN assessment.assessment_versions av ON av.id = cv.assessment_version_id
           LEFT JOIN assessment.assessments a ON a.id = av.assessment_id
          WHERE c.tenant_id = $1 AND c.id = $2`,
        [actor.tenantId, campaignId],
      );
      const row = result.rows[0];
      if (row === undefined) return null;
      const noticeResult = await client.query<{ template_code: string }>(
        `SELECT DISTINCT nt.template_code
           FROM integration.notification_templates nt
          WHERE (nt.tenant_id = $1 OR nt.tenant_id IS NULL)
            AND nt.status = 'active'
            AND nt.template_code = ANY($2::text[])
          ORDER BY nt.template_code`,
        [actor.tenantId, ['privacy', 'monitoring', 'ai_use', 'assessment_rules', 'accessibility']],
      );
      return {
        campaignId: row.campaign_id,
        campaignTitle: row.campaign_title,
        roleName: row.role_name,
        assessmentTitle: row.assessment_title,
        durationSeconds: row.duration_seconds,
        instructions: row.instructions ?? {},
        technicalRequirements: row.technical_requirements ?? {},
        accessibilityConfig: row.accessibility_config ?? {},
        noticeTypes: noticeResult.rows.map((item) => item.template_code),
      };
    });
  }
}

type ReadResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly status: 403 | 404; readonly reason: string };

function canRead(actor: Actor): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'campaign', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  ).allowed;
}

export async function getCampaignActivationPreflight(
  repository: CampaignReadinessRepository,
  actor: Actor,
  campaignId: string,
): Promise<ReadResult<CampaignActivationPreflight>> {
  if (!canRead(actor)) return { ok: false, status: 403, reason: 'Forbidden.' };
  const value = await repository.getActivationPreflight(actor, campaignId);
  return value === null
    ? { ok: false, status: 404, reason: 'Campaign not found.' }
    : { ok: true, value };
}

export async function getCampaignCandidatePreview(
  repository: CampaignReadinessRepository,
  actor: Actor,
  campaignId: string,
): Promise<ReadResult<CampaignCandidatePreview>> {
  if (!canRead(actor)) return { ok: false, status: 403, reason: 'Forbidden.' };
  const value = await repository.getCandidatePreview(actor, campaignId);
  return value === null
    ? { ok: false, status: 404, reason: 'Campaign not found.' }
    : { ok: true, value };
}
