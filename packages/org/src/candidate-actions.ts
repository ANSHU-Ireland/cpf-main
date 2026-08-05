import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface CandidateComplaintRecord {
  readonly id: string;
  readonly subject: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface ProfileCorrectionRecord {
  readonly id: string;
  readonly field: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface ApplicationRequestRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly kind: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface CandidateComplaintCreate {
  readonly subject: string;
  readonly detail: string;
}

export interface ProfileCorrectionCreate {
  readonly field: string;
  readonly requestedValue: string;
}

export interface ApplicationActionInput {
  readonly reason: string;
}

export interface CandidateActionRepository {
  createComplaint(actor: Actor, input: CandidateComplaintCreate): Promise<CandidateComplaintRecord>;
  createProfileCorrection(
    actor: Actor,
    input: ProfileCorrectionCreate,
  ): Promise<ProfileCorrectionRecord>;
  requestExplanation(
    actor: Actor,
    applicationId: string,
    input: ApplicationActionInput,
  ): Promise<ApplicationRequestRecord | null>;
  requestHumanReview(
    actor: Actor,
    applicationId: string,
    input: ApplicationActionInput,
  ): Promise<ApplicationRequestRecord | null>;
  requestWithdrawal(
    actor: Actor,
    applicationId: string,
    input: ApplicationActionInput,
  ): Promise<ApplicationRequestRecord | null>;
}

function requireStrings(
  raw: unknown,
  keys: readonly string[],
): { ok: true; obj: Record<string, unknown> } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  for (const k of keys) {
    if (typeof obj[k] !== 'string' || (obj[k] as string).length === 0) errors.push(`${k} required`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, obj };
}

export function parseCandidateComplaintCreate(
  raw: unknown,
): { ok: true; value: CandidateComplaintCreate } | { ok: false; errors: string[] } {
  const r = requireStrings(raw, ['subject', 'detail']);
  if (!r.ok) return r;
  return { ok: true, value: { subject: r.obj.subject as string, detail: r.obj.detail as string } };
}

export function parseProfileCorrectionCreate(
  raw: unknown,
): { ok: true; value: ProfileCorrectionCreate } | { ok: false; errors: string[] } {
  const r = requireStrings(raw, ['field', 'requestedValue']);
  if (!r.ok) return r;
  return {
    ok: true,
    value: { field: r.obj.field as string, requestedValue: r.obj.requestedValue as string },
  };
}

export function parseApplicationActionInput(
  raw: unknown,
): { ok: true; value: ApplicationActionInput } | { ok: false; errors: string[] } {
  const r = requireStrings(raw, ['reason']);
  if (!r.ok) return r;
  return { ok: true, value: { reason: r.obj.reason as string } };
}

export function parseCandidateApplicationId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function authorize(actor: Actor, resourceType: string): Result<Record<string, never>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: resourceType, tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  return { ok: true } as Result<Record<string, never>>;
}

export async function createCandidateComplaint(
  deps: { repository: CandidateActionRepository },
  actor: Actor,
  input: CandidateComplaintCreate,
): Promise<Result<{ complaint: CandidateComplaintRecord }>> {
  const authz = authorize(actor, 'complaint');
  if (!authz.ok) return authz;
  const r = await deps.repository.createComplaint(actor, input);
  return { ok: true, complaint: r };
}

export async function createProfileCorrection(
  deps: { repository: CandidateActionRepository },
  actor: Actor,
  input: ProfileCorrectionCreate,
): Promise<Result<{ correction: ProfileCorrectionRecord }>> {
  const authz = authorize(actor, 'candidate');
  if (!authz.ok) return authz;
  const r = await deps.repository.createProfileCorrection(actor, input);
  return { ok: true, correction: r };
}

export async function requestExplanation(
  deps: { repository: CandidateActionRepository },
  actor: Actor,
  applicationId: string,
  input: ApplicationActionInput,
): Promise<Result<{ request: ApplicationRequestRecord }>> {
  const authz = authorize(actor, 'application');
  if (!authz.ok) return authz;
  const r = await deps.repository.requestExplanation(actor, applicationId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, request: r };
}

export async function requestHumanReview(
  deps: { repository: CandidateActionRepository },
  actor: Actor,
  applicationId: string,
  input: ApplicationActionInput,
): Promise<Result<{ request: ApplicationRequestRecord }>> {
  const authz = authorize(actor, 'application');
  if (!authz.ok) return authz;
  const r = await deps.repository.requestHumanReview(actor, applicationId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, request: r };
}

export async function requestWithdrawal(
  deps: { repository: CandidateActionRepository },
  actor: Actor,
  applicationId: string,
  input: ApplicationActionInput,
): Promise<Result<{ request: ApplicationRequestRecord }>> {
  const authz = authorize(actor, 'application');
  if (!authz.ok) return authz;
  const r = await deps.repository.requestWithdrawal(actor, applicationId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, request: r };
}
