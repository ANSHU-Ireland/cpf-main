import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const IMPORT_JOB_STATUSES = [
  'uploaded',
  'validating',
  'preview_ready',
  'committing',
  'completed',
  'partial',
  'cancelled',
  'failed',
] as const;
export type ImportJobStatus = (typeof IMPORT_JOB_STATUSES)[number];

export interface ImportJobRecord {
  readonly id: string;
  readonly campaignId: string;
  readonly status: ImportJobStatus;
  readonly totalRows: number;
  readonly validRows: number;
  readonly errorRows: number;
  readonly createdAt: string;
}

export interface ImportJobCreate {
  readonly campaignId: string;
  readonly idempotencyKey: string;
  readonly fileName: string;
}

export interface CandidateImportRepository {
  createJob(actor: Actor, input: ImportJobCreate): Promise<ImportJobRecord>;
  getJob(actor: Actor, id: string): Promise<ImportJobRecord | null>;
  commitJob(actor: Actor, id: string): Promise<ImportJobRecord | null>;
  cancelJob(actor: Actor, id: string): Promise<ImportJobRecord | null>;
}

export function parseImportJobCreate(
  raw: unknown,
): { ok: true; value: ImportJobCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['campaignId'] !== 'string' || !UUID_RE.test(obj['campaignId']))
    errors.push('campaignId required (uuid)');
  if (typeof obj['idempotencyKey'] !== 'string' || obj['idempotencyKey'].length === 0)
    errors.push('idempotencyKey required');
  if (typeof obj['fileName'] !== 'string' || obj['fileName'].length === 0)
    errors.push('fileName required');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      campaignId: obj['campaignId'] as string,
      idempotencyKey: obj['idempotencyKey'] as string,
      fileName: obj['fileName'] as string,
    },
  };
}

export function parseImportJobId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function createImportJob(
  deps: { repository: CandidateImportRepository },
  actor: Actor,
  input: ImportJobCreate,
): Promise<Result<{ job: ImportJobRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'candidate_import', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  try {
    const r = await deps.repository.createJob(actor, input);
    return { ok: true, job: r };
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    )
      return { ok: false, status: 409, reason: 'duplicate_idempotency_key' };
    throw err;
  }
}

export async function getImportJob(
  deps: { repository: CandidateImportRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ job: ImportJobRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'candidate_import', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.getJob(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, job: r };
}

export async function commitImportJob(
  deps: { repository: CandidateImportRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ job: ImportJobRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'candidate_import', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.commitJob(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, job: r };
}

export async function cancelImportJob(
  deps: { repository: CandidateImportRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ job: ImportJobRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'candidate_import', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.cancelJob(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, job: r };
}
