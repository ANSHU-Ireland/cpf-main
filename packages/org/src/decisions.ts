import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DECISION_TYPES = [
  'progress',
  'hold',
  'live_verification',
  'reattempt',
  'not_progress',
  'withdrawn',
] as const;
export type DecisionType = (typeof DECISION_TYPES)[number];

export const APPROVAL_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'expired',
  'cancelled',
] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export interface DecisionRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly decision: DecisionType;
  readonly rationale: string;
  readonly decidedBy: string;
  readonly createdAt: string;
}

export interface DecisionApprovalRecord {
  readonly id: string;
  readonly decisionId: string;
  readonly requiredRole: string;
  readonly status: ApprovalStatus;
  readonly approvedBy: string | null;
  readonly createdAt: string;
}

export interface DecisionRepository {
  listDecisions(actor: Actor): Promise<{ items: readonly DecisionRecord[]; total: number }>;
  getDecision(actor: Actor, id: string): Promise<DecisionRecord | null>;
  approveDecision(actor: Actor, id: string): Promise<DecisionApprovalRecord | null>;
  issueDecision(
    actor: Actor,
    applicationId: string,
    input: DecisionCreate,
  ): Promise<DecisionRecord>;
}

export interface DecisionCreate {
  readonly applicationId: string;
  readonly decision: DecisionType;
  readonly rationale: string;
}

const VALID_DECISIONS: ReadonlySet<string> = new Set(DECISION_TYPES);

export function parseDecisionCreate(
  raw: unknown,
): { ok: true; value: DecisionCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['applicationId'] !== 'string' || !UUID_RE.test(obj['applicationId']))
    errors.push('applicationId required (uuid)');
  if (typeof obj['decision'] !== 'string' || !VALID_DECISIONS.has(obj['decision']))
    errors.push('decision must be one of: ' + DECISION_TYPES.join(', '));
  if (typeof obj['rationale'] !== 'string' || obj['rationale'].length === 0)
    errors.push('rationale required');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      applicationId: obj['applicationId'] as string,
      decision: obj['decision'] as DecisionType,
      rationale: obj['rationale'] as string,
    },
  };
}

export function parseDecisionId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function listDecisions(
  deps: { repository: DecisionRepository },
  actor: Actor,
): Promise<Result<{ items: readonly DecisionRecord[]; total: number }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'decision', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  return { ok: true, ...(await deps.repository.listDecisions(actor)) };
}

export async function getDecision(
  deps: { repository: DecisionRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ decision: DecisionRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'decision', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.getDecision(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, decision: r };
}

export async function approveDecision(
  deps: { repository: DecisionRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ approval: DecisionApprovalRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'decision', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.approveDecision(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, approval: r };
}

export async function issueDecision(
  deps: { repository: DecisionRepository },
  actor: Actor,
  input: DecisionCreate,
): Promise<Result<{ decision: DecisionRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'decision', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.issueDecision(actor, input.applicationId, input);
  return { ok: true, decision: r };
}
