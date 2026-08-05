import { can } from '@cpf/policy';
import { ADMIN_PERMISSIONS } from './admin-permissions.js';
import type { Actor } from './types.js';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export interface MaintenanceWindowRecord {
  readonly id: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly description: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface MaintenanceWindowCreate {
  readonly startsAt: string;
  readonly endsAt: string;
  readonly description: string;
}

export interface AdminMaintenanceRepository {
  listWindows(actor: Actor): Promise<{ items: readonly MaintenanceWindowRecord[]; total: number }>;
  createWindow(actor: Actor, input: MaintenanceWindowCreate): Promise<MaintenanceWindowRecord>;
}

export function parseMaintenanceWindowCreate(
  raw: unknown,
): { ok: true; value: MaintenanceWindowCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['startsAt'] !== 'string' || !ISO_DATE_RE.test(obj['startsAt']))
    errors.push('startsAt must be an ISO timestamp');
  if (typeof obj['endsAt'] !== 'string' || !ISO_DATE_RE.test(obj['endsAt']))
    errors.push('endsAt must be an ISO timestamp');
  if (typeof obj['description'] !== 'string' || obj['description'].length === 0)
    errors.push('description required');
  if (errors.length === 0 && (obj['startsAt'] as string) >= (obj['endsAt'] as string))
    errors.push('startsAt must precede endsAt');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      startsAt: obj['startsAt'] as string,
      endsAt: obj['endsAt'] as string,
      description: obj['description'] as string,
    },
  };
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function authorize(actor: Actor, action: 'read' | 'write'): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles, isPlatformStaff: true },
    action,
    { type: 'platform_maintenance', tenantId: actor.tenantId },
    ADMIN_PERMISSIONS,
  ).allowed;
}

export async function listMaintenanceWindows(
  deps: { repository: AdminMaintenanceRepository },
  actor: Actor,
): Promise<Result<{ items: readonly MaintenanceWindowRecord[]; total: number }>> {
  if (!authorize(actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  return { ok: true, ...(await deps.repository.listWindows(actor)) };
}

export async function createMaintenanceWindow(
  deps: { repository: AdminMaintenanceRepository },
  actor: Actor,
  input: MaintenanceWindowCreate,
): Promise<Result<{ window: MaintenanceWindowRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.createWindow(actor, input);
  return { ok: true, window: r };
}
