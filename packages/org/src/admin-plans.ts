import { can } from '@cpf/policy';
import { ADMIN_PERMISSIONS } from './admin-permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PlanRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly priceCents: number;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PlanCreate {
  readonly code: string;
  readonly name: string;
  readonly priceCents: number;
}

export interface PlanUpdate {
  readonly name?: string;
  readonly priceCents?: number;
  readonly active?: boolean;
}

export interface PlanRepository {
  listPlans(actor: Actor): Promise<{ items: readonly PlanRecord[]; total: number }>;
  createPlan(actor: Actor, input: PlanCreate): Promise<PlanRecord>;
  updatePlan(actor: Actor, id: string, input: PlanUpdate): Promise<PlanRecord | null>;
}

const CODE_RE = /^[A-Z0-9_]{2,40}$/;

export function parsePlanCreate(
  raw: unknown,
): { ok: true; value: PlanCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['code'] !== 'string' || !CODE_RE.test(obj['code']))
    errors.push('code must be an uppercase slug');
  if (typeof obj['name'] !== 'string' || obj['name'].length === 0) errors.push('name required');
  if (
    typeof obj['priceCents'] !== 'number' ||
    !Number.isInteger(obj['priceCents']) ||
    obj['priceCents'] < 0
  )
    errors.push('priceCents must be a non-negative integer');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      code: obj['code'] as string,
      name: obj['name'] as string,
      priceCents: obj['priceCents'] as number,
    },
  };
}

export function parsePlanUpdate(
  raw: unknown,
): { ok: true; value: PlanUpdate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  const value: { name?: string; priceCents?: number; active?: boolean } = {};
  for (const key of Object.keys(obj)) {
    if (key !== 'name' && key !== 'priceCents' && key !== 'active')
      errors.push(`unknown property '${key}'`);
  }
  if ('name' in obj) {
    if (typeof obj['name'] !== 'string' || obj['name'].length === 0)
      errors.push('name must be a non-empty string');
    else value.name = obj['name'];
  }
  if ('priceCents' in obj) {
    if (
      typeof obj['priceCents'] !== 'number' ||
      !Number.isInteger(obj['priceCents']) ||
      obj['priceCents'] < 0
    )
      errors.push('priceCents must be a non-negative integer');
    else value.priceCents = obj['priceCents'];
  }
  if ('active' in obj) {
    if (typeof obj['active'] !== 'boolean') errors.push('active must be a boolean');
    else value.active = obj['active'];
  }
  if (errors.length > 0) return { ok: false, errors };
  if (Object.keys(value).length === 0)
    return { ok: false, errors: ['at least one field required'] };
  return { ok: true, value };
}

export function parsePlanId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function authorize(actor: Actor, action: 'read' | 'write'): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles, isPlatformStaff: true },
    action,
    { type: 'platform_plan', tenantId: actor.tenantId },
    ADMIN_PERMISSIONS,
  ).allowed;
}

export async function listPlans(
  deps: { repository: PlanRepository },
  actor: Actor,
): Promise<Result<{ items: readonly PlanRecord[]; total: number }>> {
  if (!authorize(actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  return { ok: true, ...(await deps.repository.listPlans(actor)) };
}

export async function createPlan(
  deps: { repository: PlanRepository },
  actor: Actor,
  input: PlanCreate,
): Promise<Result<{ plan: PlanRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.createPlan(actor, input);
  return { ok: true, plan: r };
}

export async function updatePlan(
  deps: { repository: PlanRepository },
  actor: Actor,
  id: string,
  input: PlanUpdate,
): Promise<Result<{ plan: PlanRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.updatePlan(actor, id, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, plan: r };
}
