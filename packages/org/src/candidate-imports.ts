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
  readonly fileName: string;
  readonly totalRows: number;
  readonly validRows: number;
  readonly errorRows: number;
  readonly createdAt: string;
  readonly completedAt: string | null;
}

export interface ImportJobCreate {
  readonly campaignId: string;
  readonly idempotencyKey: string;
  readonly fileName: string;
  readonly rows: readonly string[];
}

export const IMPORT_ROW_ACTIONS = ['include', 'exclude', 'merge', 'keep_separate'] as const;
export type ImportRowAction = (typeof IMPORT_ROW_ACTIONS)[number];
export type ImportRowStatus = 'valid' | 'invalid' | 'excluded' | 'committed' | 'failed';

export interface ImportRowRecord {
  readonly id: string;
  readonly rowNumber: number;
  readonly displayValue: string;
  readonly validationErrors: readonly string[];
  readonly action: ImportRowAction;
  readonly duplicateCandidateId: string | null;
  readonly status: ImportRowStatus;
}

export interface ImportRowListResult {
  readonly items: readonly ImportRowRecord[];
  readonly total: number;
}

export interface ImportRowUpdate {
  readonly action: ImportRowAction;
  readonly value?: string;
}

export class CandidateImportConflictError extends Error {
  readonly code = 'CPF_IMPORT_CONFLICT';

  constructor(message: string) {
    super(message);
    this.name = 'CandidateImportConflictError';
  }
}

export interface CandidateImportRepository {
  createJob(actor: Actor, input: ImportJobCreate): Promise<ImportJobRecord>;
  getJob(actor: Actor, id: string): Promise<ImportJobRecord | null>;
  listRows(actor: Actor, id: string, limit: number): Promise<ImportRowListResult | null>;
  updateRow(
    actor: Actor,
    importId: string,
    rowId: string,
    input: ImportRowUpdate,
  ): Promise<ImportRowRecord | null>;
  commitJob(actor: Actor, id: string): Promise<ImportJobRecord | null>;
  cancelJob(actor: Actor, id: string): Promise<ImportJobRecord | null>;
}

function commandData(raw: unknown): Record<string, unknown> | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const container = raw as Record<string, unknown>;
  const data = container['data'];
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return container;
}

export function parseImportJobCreate(
  raw: unknown,
): { ok: true; value: ImportJobCreate } | { ok: false; errors: string[] } {
  const obj = commandData(raw);
  if (obj === null) return { ok: false, errors: ['body required'] };
  const errors: string[] = [];
  if (typeof obj['campaignId'] !== 'string' || !UUID_RE.test(obj['campaignId']))
    errors.push('campaignId required (uuid)');
  if (
    typeof obj['idempotencyKey'] !== 'string' ||
    obj['idempotencyKey'].length === 0 ||
    obj['idempotencyKey'].length > 200
  )
    errors.push('idempotencyKey required');
  if (
    typeof obj['fileName'] !== 'string' ||
    obj['fileName'].length === 0 ||
    obj['fileName'].length > 255
  )
    errors.push('fileName required');
  if (
    !Array.isArray(obj['rows']) ||
    obj['rows'].length === 0 ||
    obj['rows'].length > 500 ||
    obj['rows'].some((row) => typeof row !== 'string' || row.length > 320)
  )
    errors.push('rows must contain 1 to 500 text values');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      campaignId: obj['campaignId'] as string,
      idempotencyKey: obj['idempotencyKey'] as string,
      fileName: obj['fileName'] as string,
      rows: obj['rows'] as string[],
    },
  };
}

export function parseImportJobId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export function parseImportRowUpdate(
  raw: unknown,
): { ok: true; value: ImportRowUpdate } | { ok: false; errors: string[] } {
  const obj = commandData(raw);
  if (obj === null) return { ok: false, errors: ['body required'] };
  const action = obj['action'];
  const value = obj['value'];
  const errors: string[] = [];
  if (typeof action !== 'string' || !IMPORT_ROW_ACTIONS.includes(action as ImportRowAction)) {
    errors.push('action must be include, exclude, merge or keep_separate');
  }
  if (
    value !== undefined &&
    (typeof value !== 'string' || value.length === 0 || value.length > 320)
  ) {
    errors.push('value must be a non-empty string of at most 320 characters');
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      action: action as ImportRowAction,
      ...(typeof value === 'string' ? { value } : {}),
    },
  };
}

function isConflict(error: unknown): error is CandidateImportConflictError {
  return (
    error instanceof CandidateImportConflictError ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'CPF_IMPORT_CONFLICT')
  );
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
    if (isConflict(err)) return { ok: false, status: 422, reason: err.message };
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

export async function listImportRows(
  deps: { repository: CandidateImportRepository },
  actor: Actor,
  id: string,
  limit: number,
): Promise<Result<{ rows: ImportRowListResult }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'candidate_import', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const rows = await deps.repository.listRows(actor, id, Math.max(1, Math.min(100, limit)));
  if (rows === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, rows };
}

export async function updateImportRow(
  deps: { repository: CandidateImportRepository },
  actor: Actor,
  importId: string,
  rowId: string,
  input: ImportRowUpdate,
): Promise<Result<{ row: ImportRowRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'candidate_import', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  try {
    const row = await deps.repository.updateRow(actor, importId, rowId, input);
    if (row === null) return { ok: false, status: 404, reason: 'not_found' };
    return { ok: true, row };
  } catch (error) {
    if (isConflict(error)) return { ok: false, status: 409, reason: error.message };
    throw error;
  }
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
  try {
    const r = await deps.repository.commitJob(actor, id);
    if (r === null) return { ok: false, status: 404, reason: 'not_found' };
    return { ok: true, job: r };
  } catch (error) {
    if (isConflict(error)) return { ok: false, status: 409, reason: error.message };
    throw error;
  }
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
  try {
    const r = await deps.repository.cancelJob(actor, id);
    if (r === null) return { ok: false, status: 404, reason: 'not_found' };
    return { ok: true, job: r };
  } catch (error) {
    if (isConflict(error)) return { ok: false, status: 409, reason: error.message };
    throw error;
  }
}
