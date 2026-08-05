import { can } from '@cpf/policy';
import { ADMIN_PERMISSIONS } from './admin-permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export interface PrivilegedAccessGrantRecord {
  readonly id: string;
  readonly userId: string;
  readonly scope: string;
  readonly reason: string;
  readonly expiresAt: string;
  readonly createdAt: string;
}

export interface PrivilegedAccessGrantCreate {
  readonly userId: string;
  readonly scope: string;
  readonly reason: string;
  readonly expiresAt: string;
}

export interface AdminPrivilegedAccessRepository {
  createGrant(
    actor: Actor,
    input: PrivilegedAccessGrantCreate,
  ): Promise<PrivilegedAccessGrantRecord>;
  revokeGrant(actor: Actor, id: string): Promise<boolean>;
}

export function parsePrivilegedAccessGrantCreate(
  raw: unknown,
): { ok: true; value: PrivilegedAccessGrantCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['userId'] !== 'string' || !UUID_RE.test(obj['userId']))
    errors.push('userId must be a UUID');
  if (typeof obj['scope'] !== 'string' || obj['scope'].length === 0) errors.push('scope required');
  if (typeof obj['reason'] !== 'string' || obj['reason'].length === 0)
    errors.push('reason required');
  if (typeof obj['expiresAt'] !== 'string' || !ISO_DATE_RE.test(obj['expiresAt']))
    errors.push('expiresAt must be an ISO timestamp');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      userId: obj['userId'] as string,
      scope: obj['scope'] as string,
      reason: obj['reason'] as string,
      expiresAt: obj['expiresAt'] as string,
    },
  };
}

export function parsePrivilegedAccessGrantId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function authorize(actor: Actor): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles, isPlatformStaff: true },
    'write',
    { type: 'platform_privileged_access', tenantId: actor.tenantId },
    ADMIN_PERMISSIONS,
  ).allowed;
}

export async function createPrivilegedAccessGrant(
  deps: { repository: AdminPrivilegedAccessRepository },
  actor: Actor,
  input: PrivilegedAccessGrantCreate,
): Promise<Result<{ grant: PrivilegedAccessGrantRecord }>> {
  if (!authorize(actor)) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.createGrant(actor, input);
  return { ok: true, grant: r };
}

export async function revokePrivilegedAccessGrant(
  deps: { repository: AdminPrivilegedAccessRepository },
  actor: Actor,
  id: string,
): Promise<Result<Record<string, never>>> {
  if (!authorize(actor)) return { ok: false, status: 403, reason: 'forbidden' };
  const removed = await deps.repository.revokeGrant(actor, id);
  if (!removed) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true } as Result<Record<string, never>>;
}
