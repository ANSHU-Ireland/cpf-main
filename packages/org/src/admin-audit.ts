import { can } from '@cpf/policy';
import { ADMIN_PERMISSIONS } from './admin-permissions.js';
import type { Actor } from './types.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export const AUDIT_EXPORT_FORMATS = ['csv', 'json'] as const;
export type AuditExportFormat = (typeof AUDIT_EXPORT_FORMATS)[number];

export interface AuditEventRecord {
  readonly id: string;
  readonly actorId: string;
  readonly action: string;
  readonly resourceType: string;
  readonly occurredAt: string;
}

export interface AuditExportRecord {
  readonly id: string;
  readonly status: string;
  readonly format: AuditExportFormat;
  readonly createdAt: string;
}

export interface AuditExportCreate {
  readonly from: string;
  readonly to: string;
  readonly format: AuditExportFormat;
}

export interface AdminAuditRepository {
  listEvents(actor: Actor): Promise<{ items: readonly AuditEventRecord[]; total: number }>;
  createExport(actor: Actor, input: AuditExportCreate): Promise<AuditExportRecord>;
}

const VALID_FORMATS: ReadonlySet<string> = new Set(AUDIT_EXPORT_FORMATS);

export function parseAuditExportCreate(
  raw: unknown,
): { ok: true; value: AuditExportCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['from'] !== 'string' || !ISO_DATE_RE.test(obj['from']))
    errors.push('from must be an ISO timestamp');
  if (typeof obj['to'] !== 'string' || !ISO_DATE_RE.test(obj['to']))
    errors.push('to must be an ISO timestamp');
  if (typeof obj['format'] !== 'string' || !VALID_FORMATS.has(obj['format']))
    errors.push('format must be csv|json');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      from: obj['from'] as string,
      to: obj['to'] as string,
      format: obj['format'] as AuditExportFormat,
    },
  };
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function authorize(actor: Actor, action: 'read' | 'write'): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles, isPlatformStaff: true },
    action,
    { type: 'platform_audit', tenantId: actor.tenantId },
    ADMIN_PERMISSIONS,
  ).allowed;
}

export async function listAuditEvents(
  deps: { repository: AdminAuditRepository },
  actor: Actor,
): Promise<Result<{ items: readonly AuditEventRecord[]; total: number }>> {
  if (!authorize(actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  return { ok: true, ...(await deps.repository.listEvents(actor)) };
}

export async function createAuditExport(
  deps: { repository: AdminAuditRepository },
  actor: Actor,
  input: AuditExportCreate,
): Promise<Result<{ export: AuditExportRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.createExport(actor, input);
  return { ok: true, export: r };
}
