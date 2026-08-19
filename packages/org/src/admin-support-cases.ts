import { can } from '@cpf/policy';
import { ADMIN_PERMISSIONS } from './admin-permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const ADMIN_SUPPORT_CASE_STATUSES = [
  'draft',
  'open',
  'awaiting_user',
  'awaiting_internal',
  'escalated',
  'resolved',
  'closed',
  'reopened',
] as const;
export type AdminSupportCaseStatus = (typeof ADMIN_SUPPORT_CASE_STATUSES)[number];

export interface AdminSupportCaseRecord {
  readonly id: string;
  readonly caseReference: string;
  readonly subject: string;
  readonly tenantName: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
  readonly category: string;
  readonly requesterUserId: string;
  readonly status: AdminSupportCaseStatus;
  readonly assigneeId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SupportCaseAssignment {
  readonly assigneeId: string;
}

export interface SupportCaseStatusUpdate {
  readonly status: AdminSupportCaseStatus;
  readonly note?: string;
}

export interface AdminSupportCaseRepository {
  listCases(actor: Actor): Promise<{ items: readonly AdminSupportCaseRecord[]; total: number }>;
  assignCase(
    actor: Actor,
    id: string,
    input: SupportCaseAssignment,
  ): Promise<AdminSupportCaseRecord | null>;
  updateStatus(
    actor: Actor,
    id: string,
    input: SupportCaseStatusUpdate,
  ): Promise<AdminSupportCaseRecord | null>;
}

const VALID_STATUSES: ReadonlySet<string> = new Set(ADMIN_SUPPORT_CASE_STATUSES);

export function parseSupportCaseAssignment(
  raw: unknown,
): { ok: true; value: SupportCaseAssignment } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  if (typeof obj['assigneeId'] !== 'string' || !UUID_RE.test(obj['assigneeId']))
    return { ok: false, errors: ['assigneeId must be a UUID'] };
  return { ok: true, value: { assigneeId: obj['assigneeId'] } };
}

export function parseSupportCaseStatusUpdate(
  raw: unknown,
): { ok: true; value: SupportCaseStatusUpdate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['status'] !== 'string' || !VALID_STATUSES.has(obj['status']))
    errors.push('status must be a valid case status');
  if (obj['note'] !== undefined && typeof obj['note'] !== 'string')
    errors.push('note must be a string');
  if (errors.length > 0) return { ok: false, errors };
  const value: { status: AdminSupportCaseStatus; note?: string } = {
    status: obj['status'] as AdminSupportCaseStatus,
  };
  if (typeof obj['note'] === 'string') value.note = obj['note'];
  return { ok: true, value };
}

export function parseSupportCaseId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function authorize(actor: Actor, action: 'read' | 'write'): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles, isPlatformStaff: true },
    action,
    { type: 'platform_support_case', tenantId: actor.tenantId },
    ADMIN_PERMISSIONS,
  ).allowed;
}

export async function listAdminSupportCases(
  deps: { repository: AdminSupportCaseRepository },
  actor: Actor,
): Promise<Result<{ items: readonly AdminSupportCaseRecord[]; total: number }>> {
  if (!authorize(actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  return { ok: true, ...(await deps.repository.listCases(actor)) };
}

export async function assignSupportCase(
  deps: { repository: AdminSupportCaseRepository },
  actor: Actor,
  id: string,
  input: SupportCaseAssignment,
): Promise<Result<{ case: AdminSupportCaseRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.assignCase(actor, id, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, case: r };
}

export async function updateSupportCaseStatus(
  deps: { repository: AdminSupportCaseRepository },
  actor: Actor,
  id: string,
  input: SupportCaseStatusUpdate,
): Promise<Result<{ case: AdminSupportCaseRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.updateStatus(actor, id, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, case: r };
}
