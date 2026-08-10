import { can, type Permission } from '@cpf/policy';
import { EMPLOYER_ADMIN_ROLE, EMPLOYER_APPROVER_ROLE, ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_RATIONALE = 4_000;
const MAX_EVIDENCE_LINKS = 20;
const MAX_EVIDENCE_LINK = 500;

export const DECISION_TYPES = [
  'progress',
  'hold',
  'live_verification',
  'reattempt',
  'not_progress',
  'withdrawn',
] as const;
export type DecisionType = (typeof DECISION_TYPES)[number];

export const DECISION_STATUSES = [
  'draft',
  'pending_approval',
  'issued',
  'superseded',
  'withdrawn',
] as const;
export type DecisionStatus = (typeof DECISION_STATUSES)[number];

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
  readonly reportId: string | null;
  readonly decision: DecisionType;
  readonly rationale: string;
  readonly evidenceLinks: readonly string[];
  readonly decidedBy: string;
  readonly decidedByName: string;
  readonly decidedAt: string | null;
  readonly issuedAt: string | null;
  readonly secondApprovalRequired: boolean;
  readonly secondApprovedBy: string | null;
  readonly secondApprovedByName: string | null;
  readonly secondApprovedAt: string | null;
  readonly status: DecisionStatus;
}

export interface DecisionApprovalRecord {
  readonly id: string;
  readonly decisionId: string;
  readonly requiredRole: string;
  readonly status: ApprovalStatus;
  readonly requestedBy: string;
  readonly decidedBy: string | null;
  readonly decidedByName: string | null;
  readonly rationale: string | null;
  readonly requestedAt: string;
  readonly decidedAt: string | null;
}

export interface DecisionContext {
  readonly applicationId: string;
  readonly candidateRef: string;
  readonly campaignName: string;
  readonly reviewComplete: boolean;
  readonly decision: DecisionRecord | null;
  readonly approval: DecisionApprovalRecord | null;
}

export interface DecisionRepository {
  getDecisionContext(actor: Actor, applicationId: string): Promise<DecisionContext | null>;
  getDecision(actor: Actor, decisionId: string): Promise<DecisionRecord | null>;
  createDecision(
    actor: Actor,
    applicationId: string,
    input: DecisionCreate,
    idempotencyKey: string,
  ): Promise<DecisionRecord | null>;
  recordApproval(
    actor: Actor,
    decisionId: string,
    input: DecisionApprovalInput,
    idempotencyKey: string,
  ): Promise<DecisionRecord | null>;
  issueDecision(
    actor: Actor,
    decisionId: string,
    idempotencyKey: string,
  ): Promise<DecisionRecord | null>;
}

export interface DecisionCreate {
  readonly decision: DecisionType;
  readonly rationale: string;
  readonly evidenceLinks: readonly string[];
  readonly secondApprovalRequired: boolean;
}

export interface DecisionApprovalInput {
  readonly status: 'approved' | 'rejected';
  readonly rationale: string | null;
}

export class DecisionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecisionConflictError';
  }
}

function commandData(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const root = raw as Record<string, unknown>;
  return root['data'] ?? raw;
}

const DECISION_KEYS = new Set(['decision', 'rationale', 'evidenceLinks', 'secondApprovalRequired']);
const VALID_DECISIONS: ReadonlySet<string> = new Set(DECISION_TYPES);

export function parseDecisionCreate(
  raw: unknown,
): { ok: true; value: DecisionCreate } | { ok: false; errors: string[] } {
  const data = commandData(raw);
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = data as Record<string, unknown>;
  const errors: string[] = [];
  for (const key of Object.keys(input)) {
    if (!DECISION_KEYS.has(key)) errors.push(`unknown property: ${key}`);
  }
  if (typeof input['decision'] !== 'string' || !VALID_DECISIONS.has(input['decision'])) {
    errors.push(`decision must be one of: ${DECISION_TYPES.join(', ')}`);
  }
  const rationale = typeof input['rationale'] === 'string' ? input['rationale'].trim() : '';
  if (rationale.length < 10 || rationale.length > MAX_RATIONALE) {
    errors.push(`rationale must be between 10 and ${MAX_RATIONALE} characters`);
  }
  const evidenceLinks = input['evidenceLinks'] ?? [];
  if (
    !Array.isArray(evidenceLinks) ||
    evidenceLinks.length > MAX_EVIDENCE_LINKS ||
    evidenceLinks.some(
      (value) =>
        typeof value !== 'string' || value.trim().length === 0 || value.length > MAX_EVIDENCE_LINK,
    )
  ) {
    errors.push(
      `evidenceLinks must contain at most ${MAX_EVIDENCE_LINKS} non-empty strings up to ${MAX_EVIDENCE_LINK} characters`,
    );
  }
  if (
    input['secondApprovalRequired'] !== undefined &&
    typeof input['secondApprovalRequired'] !== 'boolean'
  ) {
    errors.push('secondApprovalRequired must be a boolean');
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      decision: input['decision'] as DecisionType,
      rationale,
      evidenceLinks: (evidenceLinks as string[]).map((value) => value.trim()),
      secondApprovalRequired: input['secondApprovalRequired'] !== false,
    },
  };
}

const APPROVAL_KEYS = new Set(['status', 'rationale']);

export function parseDecisionApproval(
  raw: unknown,
): { ok: true; value: DecisionApprovalInput } | { ok: false; errors: string[] } {
  const data = commandData(raw);
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = data as Record<string, unknown>;
  const errors: string[] = [];
  for (const key of Object.keys(input)) {
    if (!APPROVAL_KEYS.has(key)) errors.push(`unknown property: ${key}`);
  }
  if (input['status'] !== 'approved' && input['status'] !== 'rejected') {
    errors.push('status must be approved or rejected');
  }
  const rationale = typeof input['rationale'] === 'string' ? input['rationale'].trim() : '';
  if (input['status'] === 'rejected' && rationale.length < 10) {
    errors.push('rationale must be at least 10 characters when returning a decision');
  }
  if (rationale.length > MAX_RATIONALE) {
    errors.push(`rationale must be at most ${MAX_RATIONALE} characters`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      status: input['status'] as 'approved' | 'rejected',
      rationale: rationale.length === 0 ? null : rationale,
    },
  };
}

export function parseDecisionId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export function parseDecisionApplicationId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export function parseIdempotencyKey(raw: string): string | null {
  const value = raw.trim();
  return value.length >= 8 && value.length <= 200 ? value : null;
}

interface DecisionDeps {
  readonly repository: DecisionRepository;
  readonly permissions?: readonly Permission[];
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: 403 | 404 | 409; reason: string };

function canRead(deps: DecisionDeps, actor: Actor): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'decision', tenantId: actor.tenantId },
    deps.permissions ?? ORG_PERMISSIONS,
  ).allowed;
}

function canWrite(deps: DecisionDeps, actor: Actor): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'decision', tenantId: actor.tenantId },
    deps.permissions ?? ORG_PERMISSIONS,
  ).allowed;
}

export async function getDecisionContext(
  deps: DecisionDeps,
  actor: Actor,
  applicationId: string,
): Promise<Result<{ context: DecisionContext }>> {
  if (!canRead(deps, actor)) return { ok: false, status: 403, reason: 'Forbidden.' };
  const context = await deps.repository.getDecisionContext(actor, applicationId);
  if (context === null) return { ok: false, status: 404, reason: 'Application not found.' };
  return { ok: true, context };
}

export async function createDecision(
  deps: DecisionDeps,
  actor: Actor,
  applicationId: string,
  input: DecisionCreate,
  idempotencyKey: string,
): Promise<Result<{ decision: DecisionRecord }>> {
  if (!actor.roles.includes(EMPLOYER_ADMIN_ROLE) || !canWrite(deps, actor)) {
    return { ok: false, status: 403, reason: 'Employer Admin authority is required.' };
  }
  try {
    const decision = await deps.repository.createDecision(
      actor,
      applicationId,
      input,
      idempotencyKey,
    );
    if (decision === null) return { ok: false, status: 404, reason: 'Application not found.' };
    return { ok: true, decision };
  } catch (error) {
    if (error instanceof DecisionConflictError) {
      return { ok: false, status: 409, reason: error.message };
    }
    throw error;
  }
}

export async function approveDecision(
  deps: DecisionDeps,
  actor: Actor,
  decisionId: string,
  input: DecisionApprovalInput,
  idempotencyKey: string,
): Promise<Result<{ decision: DecisionRecord }>> {
  if (!actor.roles.includes(EMPLOYER_APPROVER_ROLE) || !canWrite(deps, actor)) {
    return { ok: false, status: 403, reason: 'Employer Approver authority is required.' };
  }
  try {
    const decision = await deps.repository.recordApproval(actor, decisionId, input, idempotencyKey);
    if (decision === null) return { ok: false, status: 404, reason: 'Decision not found.' };
    return { ok: true, decision };
  } catch (error) {
    if (error instanceof DecisionConflictError) {
      return { ok: false, status: 409, reason: error.message };
    }
    throw error;
  }
}

export async function issueDecision(
  deps: DecisionDeps,
  actor: Actor,
  decisionId: string,
  idempotencyKey: string,
): Promise<Result<{ decision: DecisionRecord }>> {
  if (!actor.roles.includes(EMPLOYER_ADMIN_ROLE) || !canWrite(deps, actor)) {
    return { ok: false, status: 403, reason: 'Employer Admin authority is required.' };
  }
  try {
    const decision = await deps.repository.issueDecision(actor, decisionId, idempotencyKey);
    if (decision === null) return { ok: false, status: 404, reason: 'Decision not found.' };
    return { ok: true, decision };
  } catch (error) {
    if (error instanceof DecisionConflictError) {
      return { ok: false, status: 409, reason: error.message };
    }
    throw error;
  }
}
