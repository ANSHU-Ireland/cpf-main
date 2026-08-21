import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type GovernanceSubmissionType =
  | 'ce_marking'
  | 'conformity_assessment'
  | 'eu_declaration'
  | 'eu_registration'
  | 'serious_incident'
  | 'change_request';

export interface GovernanceSubmissionRecord {
  readonly id: string;
  readonly submissionType: GovernanceSubmissionType;
  readonly reference: string;
  readonly status: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface DeployerInstructionRecord {
  readonly id: string;
  readonly aiSystemId: string;
  readonly title: string;
  readonly content: string;
  readonly createdAt: string;
}

export interface GovernanceSubmissionCreate {
  readonly reference: string;
  readonly summary: string;
}

export interface SeriousIncidentUpdate {
  readonly status: string;
  readonly notes: string;
}

export const SERIOUS_INCIDENT_STATUSES = [
  'open',
  'assessing',
  'reportable',
  'reported',
  'not_reportable_with_reason',
  'follow_up',
  'closed',
] as const;

const VALID_SERIOUS_INCIDENT_STATUSES: ReadonlySet<string> = new Set(SERIOUS_INCIDENT_STATUSES);

export interface ChangeRequestDecision {
  readonly decision: 'approved' | 'rejected';
  readonly rationale: string;
}

export interface GovernanceSubmissionRepository {
  getDeployerInstruction(actor: Actor, systemId: string): Promise<DeployerInstructionRecord | null>;
  createSubmission(
    actor: Actor,
    submissionType: GovernanceSubmissionType,
    input: GovernanceSubmissionCreate,
  ): Promise<GovernanceSubmissionRecord>;
  approveConformityAssessment(
    actor: Actor,
    assessmentId: string,
  ): Promise<GovernanceSubmissionRecord | null>;
  updateSeriousIncident(
    actor: Actor,
    incidentId: string,
    input: SeriousIncidentUpdate,
  ): Promise<GovernanceSubmissionRecord | null>;
  decideChangeRequest(
    actor: Actor,
    changeId: string,
    input: ChangeRequestDecision,
  ): Promise<GovernanceSubmissionRecord | null>;
}

export function parseGovernanceSubmissionCreate(
  raw: unknown,
): { ok: true; value: GovernanceSubmissionCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['reference'] !== 'string' || obj['reference'].length === 0)
    errors.push('reference required');
  if (typeof obj['summary'] !== 'string' || obj['summary'].length === 0)
    errors.push('summary required');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { reference: obj['reference'] as string, summary: obj['summary'] as string },
  };
}

export function parseSeriousIncidentUpdate(
  raw: unknown,
): { ok: true; value: SeriousIncidentUpdate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['status'] !== 'string' || !VALID_SERIOUS_INCIDENT_STATUSES.has(obj['status']))
    errors.push(`status must be ${SERIOUS_INCIDENT_STATUSES.join('|')}`);
  if (typeof obj['notes'] !== 'string' || obj['notes'].length === 0) errors.push('notes required');
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { status: obj['status'] as string, notes: obj['notes'] as string } };
}

export function parseChangeRequestDecision(
  raw: unknown,
): { ok: true; value: ChangeRequestDecision } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (obj['decision'] !== 'approved' && obj['decision'] !== 'rejected')
    errors.push('decision must be approved|rejected');
  if (typeof obj['rationale'] !== 'string' || obj['rationale'].length === 0)
    errors.push('rationale required');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      decision: obj['decision'] as 'approved' | 'rejected',
      rationale: obj['rationale'] as string,
    },
  };
}

export function parseGovernanceSubmissionId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function read(actor: Actor): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'governance_submission', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  ).allowed;
}

function write(actor: Actor): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'governance_submission', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  ).allowed;
}

export async function getDeployerInstruction(
  deps: { repository: GovernanceSubmissionRepository },
  actor: Actor,
  systemId: string,
): Promise<Result<{ instruction: DeployerInstructionRecord }>> {
  if (!read(actor)) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.getDeployerInstruction(actor, systemId);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, instruction: r };
}

export async function createGovernanceSubmission(
  deps: { repository: GovernanceSubmissionRepository },
  actor: Actor,
  submissionType: GovernanceSubmissionType,
  input: GovernanceSubmissionCreate,
): Promise<Result<{ submission: GovernanceSubmissionRecord }>> {
  if (!write(actor)) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.createSubmission(actor, submissionType, input);
  return { ok: true, submission: r };
}

export async function approveConformityAssessment(
  deps: { repository: GovernanceSubmissionRepository },
  actor: Actor,
  assessmentId: string,
): Promise<Result<{ submission: GovernanceSubmissionRecord }>> {
  if (!write(actor)) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.approveConformityAssessment(actor, assessmentId);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, submission: r };
}

export async function updateSeriousIncident(
  deps: { repository: GovernanceSubmissionRepository },
  actor: Actor,
  incidentId: string,
  input: SeriousIncidentUpdate,
): Promise<Result<{ submission: GovernanceSubmissionRecord }>> {
  if (!write(actor)) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.updateSeriousIncident(actor, incidentId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, submission: r };
}

export async function decideChangeRequest(
  deps: { repository: GovernanceSubmissionRepository },
  actor: Actor,
  changeId: string,
  input: ChangeRequestDecision,
): Promise<Result<{ submission: GovernanceSubmissionRecord }>> {
  if (!write(actor)) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.decideChangeRequest(actor, changeId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, submission: r };
}
