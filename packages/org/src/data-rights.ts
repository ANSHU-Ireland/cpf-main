import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

export const DATA_RIGHT_STATUSES = [
  'received',
  'identity_verification',
  'in_progress',
  'fulfilled',
  'partially_fulfilled',
  'rejected',
  'closed',
] as const;
export type DataRightStatus = (typeof DATA_RIGHT_STATUSES)[number];

export const DATA_RIGHT_REQUEST_TYPES = [
  'access',
  'correction',
  'deletion',
  'restriction',
  'objection',
  'portability',
  'human_review',
  'contest_integrity',
  'complaint',
] as const;
export type DataRightRequestType = (typeof DATA_RIGHT_REQUEST_TYPES)[number];

export interface DataRightRequestRecord {
  readonly id: string;
  readonly requestType: DataRightRequestType;
  readonly status: DataRightStatus;
  readonly candidateId: string;
  readonly createdAt: string;
}

export interface DataRightRequestCreate {
  readonly requestType: DataRightRequestType;
  readonly justification: string;
}

export interface ComplaintRecord {
  readonly id: string;
  readonly category: string;
  readonly status: string;
  readonly candidateId: string;
  readonly createdAt: string;
}

export interface ComplaintCreate {
  readonly category: string;
  readonly description: string;
}

export interface DataRightsRepository {
  listDataRights(
    actor: Actor,
  ): Promise<{ items: readonly DataRightRequestRecord[]; total: number }>;
  createDataRight(
    actor: Actor,
    input: DataRightRequestCreate,
  ): Promise<DataRightRequestRecord | null>;
  createComplaint(actor: Actor, input: ComplaintCreate): Promise<ComplaintRecord | null>;
}

export function parseDataRightRequestCreate(
  raw: unknown,
): { ok: true; value: DataRightRequestCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (
    typeof obj['requestType'] !== 'string' ||
    !DATA_RIGHT_REQUEST_TYPES.includes(obj['requestType'] as DataRightRequestType)
  )
    errors.push(`requestType must be one of: ${DATA_RIGHT_REQUEST_TYPES.join(', ')}`);
  if (typeof obj['justification'] !== 'string' || obj['justification'].length === 0)
    errors.push('justification required');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      requestType: obj['requestType'] as DataRightRequestType,
      justification: obj['justification'] as string,
    },
  };
}

export function parseComplaintCreate(
  raw: unknown,
): { ok: true; value: ComplaintCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['category'] !== 'string' || obj['category'].length === 0)
    errors.push('category required');
  if (typeof obj['description'] !== 'string' || obj['description'].length === 0)
    errors.push('description required');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      category: obj['category'] as string,
      description: obj['description'] as string,
    },
  };
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function listDataRightRequests(
  deps: { repository: DataRightsRepository },
  actor: Actor,
): Promise<Result<{ items: readonly DataRightRequestRecord[]; total: number }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'data_rights_request', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  return { ok: true, ...(await deps.repository.listDataRights(actor)) };
}

export async function createDataRightRequest(
  deps: { repository: DataRightsRepository },
  actor: Actor,
  input: DataRightRequestCreate,
): Promise<Result<{ request: DataRightRequestRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'data_rights_request', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.createDataRight(actor, input);
  if (r === null) return { ok: false, status: 404, reason: 'Candidate profile not found.' };
  return { ok: true, request: r };
}

export async function createComplaint(
  deps: { repository: DataRightsRepository },
  actor: Actor,
  input: ComplaintCreate,
): Promise<Result<{ complaint: ComplaintRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'complaint', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.createComplaint(actor, input);
  if (r === null) return { ok: false, status: 404, reason: 'Candidate profile not found.' };
  return { ok: true, complaint: r };
}
