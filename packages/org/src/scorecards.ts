import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';
import { SCORECARD_STATUSES } from './scorecard-types.js';
import type { ScorecardRecord, ScorecardUpdate, ScorecardStatus } from './scorecard-types.js';

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
    obj['status'] !== undefined;
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
  if (errors.length > 0) return { ok: false, errors };
  const value: ScorecardUpdate = {};
  if (typeof obj['summary'] === 'string')
    (value as Record<string, unknown>)['summary'] = obj['summary'];
  if (obj['overallConfidence'] !== undefined)
    (value as Record<string, unknown>)['overallConfidence'] = obj['overallConfidence'];
  if (typeof obj['status'] === 'string')
    (value as Record<string, unknown>)['status'] = obj['status'] as ScorecardStatus;
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
