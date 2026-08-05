import { can } from '@cpf/policy';
import { ADMIN_PERMISSIONS } from './admin-permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const STAFF_STATUSES = ['active', 'suspended'] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export interface StaffRecord {
  readonly userId: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly string[];
  readonly status: StaffStatus;
  readonly createdAt: string;
}

export interface StaffInvitationRecord {
  readonly id: string;
  readonly email: string;
  readonly roles: readonly string[];
  readonly status: string;
  readonly createdAt: string;
}

export interface StaffInvitationCreate {
  readonly email: string;
  readonly roles: readonly string[];
}

export interface StaffRolesUpdate {
  readonly roles: readonly string[];
}

export interface StaffStatusUpdate {
  readonly status: StaffStatus;
  readonly reason: string;
}

export interface StaffRepository {
  listStaff(actor: Actor): Promise<{ items: readonly StaffRecord[]; total: number }>;
  createInvitation(actor: Actor, input: StaffInvitationCreate): Promise<StaffInvitationRecord>;
  resendInvitation(actor: Actor, id: string): Promise<StaffInvitationRecord | null>;
  revokeInvitation(actor: Actor, id: string): Promise<boolean>;
  updateRoles(actor: Actor, userId: string, input: StaffRolesUpdate): Promise<StaffRecord | null>;
  updateStatus(actor: Actor, userId: string, input: StaffStatusUpdate): Promise<StaffRecord | null>;
}

const VALID_STATUSES: ReadonlySet<string> = new Set(STAFF_STATUSES);

function parseRoles(value: unknown, errors: string[]): readonly string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push('roles must be a non-empty array');
    return null;
  }
  if (!value.every((r) => typeof r === 'string' && r.length > 0)) {
    errors.push('roles must be non-empty strings');
    return null;
  }
  return value as string[];
}

export function parseStaffInvitationCreate(
  raw: unknown,
): { ok: true; value: StaffInvitationCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['email'] !== 'string' || !EMAIL_RE.test(obj['email']))
    errors.push('valid email required');
  const roles = parseRoles(obj['roles'], errors);
  if (errors.length > 0 || roles === null) return { ok: false, errors };
  return { ok: true, value: { email: obj['email'] as string, roles } };
}

export function parseStaffRolesUpdate(
  raw: unknown,
): { ok: true; value: StaffRolesUpdate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  const roles = parseRoles(obj['roles'], errors);
  if (errors.length > 0 || roles === null) return { ok: false, errors };
  return { ok: true, value: { roles } };
}

export function parseStaffStatusUpdate(
  raw: unknown,
): { ok: true; value: StaffStatusUpdate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['status'] !== 'string' || !VALID_STATUSES.has(obj['status']))
    errors.push('status must be active|suspended');
  if (typeof obj['reason'] !== 'string' || obj['reason'].length === 0)
    errors.push('reason required');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { status: obj['status'] as StaffStatus, reason: obj['reason'] as string },
  };
}

export function parseStaffId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function authorize(actor: Actor, action: 'read' | 'write'): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles, isPlatformStaff: true },
    action,
    { type: 'platform_staff', tenantId: actor.tenantId },
    ADMIN_PERMISSIONS,
  ).allowed;
}

export async function listStaff(
  deps: { repository: StaffRepository },
  actor: Actor,
): Promise<Result<{ items: readonly StaffRecord[]; total: number }>> {
  if (!authorize(actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  return { ok: true, ...(await deps.repository.listStaff(actor)) };
}

export async function createStaffInvitation(
  deps: { repository: StaffRepository },
  actor: Actor,
  input: StaffInvitationCreate,
): Promise<Result<{ invitation: StaffInvitationRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.createInvitation(actor, input);
  return { ok: true, invitation: r };
}

export async function resendStaffInvitation(
  deps: { repository: StaffRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ invitation: StaffInvitationRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.resendInvitation(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, invitation: r };
}

export async function revokeStaffInvitation(
  deps: { repository: StaffRepository },
  actor: Actor,
  id: string,
): Promise<Result<Record<string, never>>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const removed = await deps.repository.revokeInvitation(actor, id);
  if (!removed) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true } as Result<Record<string, never>>;
}

export async function updateStaffRoles(
  deps: { repository: StaffRepository },
  actor: Actor,
  userId: string,
  input: StaffRolesUpdate,
): Promise<Result<{ staff: StaffRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.updateRoles(actor, userId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, staff: r };
}

export async function updateStaffStatus(
  deps: { repository: StaffRepository },
  actor: Actor,
  userId: string,
  input: StaffStatusUpdate,
): Promise<Result<{ staff: StaffRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.updateStatus(actor, userId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, staff: r };
}
