import { can } from '@cpf/policy';
import { ADMIN_PERMISSIONS } from './admin-permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface FeatureFlagRecord {
  readonly id: string;
  readonly key: string;
  readonly description: string;
  readonly enabled: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FeatureFlagCreate {
  readonly key: string;
  readonly description: string;
  readonly enabled: boolean;
}

export interface FeatureFlagUpdate {
  readonly enabled: boolean;
}

export interface FeatureFlagRepository {
  listFlags(actor: Actor): Promise<{ items: readonly FeatureFlagRecord[]; total: number }>;
  createFlag(actor: Actor, input: FeatureFlagCreate): Promise<FeatureFlagRecord>;
  updateFlag(actor: Actor, id: string, input: FeatureFlagUpdate): Promise<FeatureFlagRecord | null>;
}

const KEY_RE = /^[a-z0-9](?:[a-z0-9._-]{0,80}[a-z0-9])?$/;

export function parseFeatureFlagCreate(
  raw: unknown,
): { ok: true; value: FeatureFlagCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['key'] !== 'string' || !KEY_RE.test(obj['key']))
    errors.push('key must be a dotted lowercase slug');
  if (typeof obj['description'] !== 'string' || obj['description'].length === 0)
    errors.push('description required');
  if (typeof obj['enabled'] !== 'boolean') errors.push('enabled must be a boolean');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      key: obj['key'] as string,
      description: obj['description'] as string,
      enabled: obj['enabled'] as boolean,
    },
  };
}

export function parseFeatureFlagUpdate(
  raw: unknown,
): { ok: true; value: FeatureFlagUpdate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  if (typeof obj['enabled'] !== 'boolean')
    return { ok: false, errors: ['enabled must be a boolean'] };
  return { ok: true, value: { enabled: obj['enabled'] } };
}

export function parseFeatureFlagId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function authorize(actor: Actor, action: 'read' | 'write'): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles, isPlatformStaff: true },
    action,
    { type: 'platform_feature_flag', tenantId: actor.tenantId },
    ADMIN_PERMISSIONS,
  ).allowed;
}

export async function listFeatureFlags(
  deps: { repository: FeatureFlagRepository },
  actor: Actor,
): Promise<Result<{ items: readonly FeatureFlagRecord[]; total: number }>> {
  if (!authorize(actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  return { ok: true, ...(await deps.repository.listFlags(actor)) };
}

export async function createFeatureFlag(
  deps: { repository: FeatureFlagRepository },
  actor: Actor,
  input: FeatureFlagCreate,
): Promise<Result<{ flag: FeatureFlagRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.createFlag(actor, input);
  return { ok: true, flag: r };
}

export async function updateFeatureFlag(
  deps: { repository: FeatureFlagRepository },
  actor: Actor,
  id: string,
  input: FeatureFlagUpdate,
): Promise<Result<{ flag: FeatureFlagRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.updateFlag(actor, id, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, flag: r };
}
