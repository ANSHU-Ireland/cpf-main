import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const INTEGRATION_STATUSES = [
  'draft',
  'active',
  'degraded',
  'suspended',
  'revoked',
] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

export interface IntegrationRecord {
  readonly id: string;
  readonly connectionType: string;
  readonly provider: string;
  readonly status: IntegrationStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface IntegrationCreate {
  readonly connectionType: string;
  readonly provider: string;
  readonly config?: Record<string, unknown>;
}

export interface IntegrationUpdate {
  readonly status?: IntegrationStatus;
  readonly config?: Record<string, unknown>;
}

export interface IntegrationRepository {
  listIntegrations(actor: Actor): Promise<{ items: readonly IntegrationRecord[]; total: number }>;
  getIntegration(actor: Actor, id: string): Promise<IntegrationRecord | null>;
  createIntegration(actor: Actor, input: IntegrationCreate): Promise<IntegrationRecord>;
  updateIntegration(
    actor: Actor,
    id: string,
    input: IntegrationUpdate,
  ): Promise<IntegrationRecord | null>;
  rotateIntegration(actor: Actor, id: string): Promise<IntegrationRecord | null>;
}

const VALID_STATUSES: ReadonlySet<string> = new Set(INTEGRATION_STATUSES);

export function parseIntegrationCreate(
  raw: unknown,
): { ok: true; value: IntegrationCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['connectionType'] !== 'string' || obj['connectionType'].length === 0)
    errors.push('connectionType required');
  if (typeof obj['provider'] !== 'string' || obj['provider'].length === 0)
    errors.push('provider required');
  if (
    obj.config !== undefined &&
    (obj.config === null || typeof obj.config !== 'object' || Array.isArray(obj.config))
  ) {
    errors.push('config must be an object');
  }
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      connectionType: obj['connectionType'] as string,
      provider: obj['provider'] as string,
      ...(obj.config !== undefined &&
      obj.config !== null &&
      typeof obj.config === 'object' &&
      !Array.isArray(obj.config)
        ? { config: obj.config as Record<string, unknown> }
        : {}),
    },
  };
}

export function parseIntegrationUpdate(
  raw: unknown,
): { ok: true; value: IntegrationUpdate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  if (obj['status'] === undefined && obj['config'] === undefined)
    return { ok: false, errors: ['at least one field required'] };
  if (
    obj['status'] !== undefined &&
    (typeof obj['status'] !== 'string' || !VALID_STATUSES.has(obj['status']))
  )
    return { ok: false, errors: ['invalid status'] };
  return { ok: true, value: obj as unknown as IntegrationUpdate };
}

export function parseIntegrationId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function listIntegrations(
  deps: { repository: IntegrationRepository },
  actor: Actor,
): Promise<Result<{ items: readonly IntegrationRecord[]; total: number }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'integration', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  return { ok: true, ...(await deps.repository.listIntegrations(actor)) };
}

export async function getIntegration(
  deps: { repository: IntegrationRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ integration: IntegrationRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'integration', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.getIntegration(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, integration: r };
}

export async function createIntegration(
  deps: { repository: IntegrationRepository },
  actor: Actor,
  input: IntegrationCreate,
): Promise<Result<{ integration: IntegrationRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'integration', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.createIntegration(actor, input);
  return { ok: true, integration: r };
}

export async function updateIntegration(
  deps: { repository: IntegrationRepository },
  actor: Actor,
  id: string,
  input: IntegrationUpdate,
): Promise<Result<{ integration: IntegrationRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'integration', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.updateIntegration(actor, id, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, integration: r };
}

export async function rotateIntegration(
  deps: { repository: IntegrationRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ integration: IntegrationRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'integration', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.rotateIntegration(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, integration: r };
}
