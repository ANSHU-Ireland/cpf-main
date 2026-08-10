import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';
import { SCORECARD_STATUSES } from './scorecard-types.js';
import type {
  CriterionScoreUpdate,
  ScorecardRecord,
  ScorecardUpdate,
  ScorecardStatus,
} from './scorecard-types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES: ReadonlySet<string> = new Set(SCORECARD_STATUSES);

export function parseScorecardAssignmentId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export function parseScorecardUpdate(
  raw: unknown,
): { ok: true; value: ScorecardUpdate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object')
    return { ok: false, errors: ['body must be object'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  const hasFields =
    obj['summary'] !== undefined ||
    obj['overallConfidence'] !== undefined ||
    obj['status'] !== undefined ||
    obj['criterion'] !== undefined;
  if (!hasFields) return { ok: false, errors: ['at least one field required'] };
  if (obj['summary'] !== undefined && typeof obj['summary'] !== 'string')
    errors.push('summary must be string');
  if (
    obj['overallConfidence'] !== undefined &&
    obj['overallConfidence'] !== null &&
    typeof obj['overallConfidence'] !== 'number'
  )
    errors.push('overallConfidence must be number or null');
  if (
    obj['status'] !== undefined &&
    (typeof obj['status'] !== 'string' || !VALID_STATUSES.has(obj['status']))
  )
    errors.push('status invalid');
  let criterion: CriterionScoreUpdate | undefined;
  if (obj['criterion'] !== undefined) {
    if (obj['criterion'] === null || typeof obj['criterion'] !== 'object') {
      errors.push('criterion must be object');
    } else {
      const raw = obj['criterion'] as Record<string, unknown>;
      const criterionId = raw['criterionId'];
      const humanScore = raw['humanScore'];
      const confidence = raw['confidence'];
      const insufficientEvidence = raw['insufficientEvidence'];
      const evidenceLinks = raw['evidenceLinks'];
      const reviewerComment = raw['reviewerComment'];
      if (typeof criterionId !== 'string' || !UUID_RE.test(criterionId))
        errors.push('criterion.criterionId invalid');
      if (humanScore !== null && typeof humanScore !== 'number')
        errors.push('criterion.humanScore must be number or null');
      if (typeof humanScore === 'number' && (humanScore < 1 || humanScore > 4))
        errors.push('criterion.humanScore must be between 1 and 4');
      if (confidence !== undefined && confidence !== null && typeof confidence !== 'number')
        errors.push('criterion.confidence must be number or null');
      if (typeof confidence === 'number' && (confidence < 0 || confidence > 1))
        errors.push('criterion.confidence must be between 0 and 1');
      if (typeof insufficientEvidence !== 'boolean')
        errors.push('criterion.insufficientEvidence must be boolean');
      if (!Array.isArray(evidenceLinks)) errors.push('criterion.evidenceLinks must be array');
      if (typeof reviewerComment !== 'string' || reviewerComment.trim().length < 3)
        errors.push('criterion.reviewerComment required');
      if (
        typeof criterionId === 'string' &&
        UUID_RE.test(criterionId) &&
        (humanScore === null || typeof humanScore === 'number') &&
        (confidence === undefined || confidence === null || typeof confidence === 'number') &&
        typeof insufficientEvidence === 'boolean' &&
        Array.isArray(evidenceLinks) &&
        typeof reviewerComment === 'string'
      ) {
        criterion = {
          criterionId,
          humanScore,
          ...(confidence !== undefined ? { confidence } : {}),
          insufficientEvidence,
          evidenceLinks,
          reviewerComment: reviewerComment.trim(),
        };
      }
    }
  }
  if (errors.length > 0) return { ok: false, errors };
  const value: ScorecardUpdate = {};
  if (typeof obj['summary'] === 'string')
    (value as Record<string, unknown>)['summary'] = obj['summary'];
  if (obj['overallConfidence'] !== undefined)
    (value as Record<string, unknown>)['overallConfidence'] = obj['overallConfidence'];
  if (typeof obj['status'] === 'string')
    (value as Record<string, unknown>)['status'] = obj['status'] as ScorecardStatus;
  if (criterion !== undefined) (value as Record<string, unknown>)['criterion'] = criterion;
  return { ok: true, value };
}

// --- repository ---

export interface ScorecardRepository {
  getScorecard(actor: Actor, assignmentId: string): Promise<ScorecardRecord | null>;
  updateScorecard(
    actor: Actor,
    assignmentId: string,
    input: ScorecardUpdate,
  ): Promise<ScorecardRecord | null>;
}

// --- domain ---

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };
export type GetScorecardResult = Result<{ scorecard: ScorecardRecord }>;
export type UpdateScorecardResult = Result<{ scorecard: ScorecardRecord }>;

export async function getScorecard(
  deps: { repository: ScorecardRepository },
  actor: Actor,
  assignmentId: string,
): Promise<GetScorecardResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'review_assignment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.getScorecard(actor, assignmentId);
  if (record === null) return { ok: false, status: 404, reason: 'Scorecard not found.' };
  return { ok: true, scorecard: record };
}

export async function updateScorecard(
  deps: { repository: ScorecardRepository },
  actor: Actor,
  assignmentId: string,
  input: ScorecardUpdate,
): Promise<UpdateScorecardResult> {
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'review_assignment', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!decision.allowed) return { ok: false, status: 403, reason: decision.reason };
  const record = await deps.repository.updateScorecard(actor, assignmentId, input);
  if (record === null) return { ok: false, status: 404, reason: 'Scorecard not found.' };
  return { ok: true, scorecard: record };
}
