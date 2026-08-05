import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PLUGIN_STATUSES = ['enabled', 'disabled'] as const;
export type PluginStatus = (typeof PLUGIN_STATUSES)[number];

export interface PluginRecord {
  readonly id: string;
  readonly code: string;
  readonly name: string;
  readonly status: PluginStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PluginCreate {
  readonly code: string;
  readonly name: string;
}

export interface PluginStatusUpdate {
  readonly status: PluginStatus;
}

export interface PluginRepository {
  listPlugins(actor: Actor): Promise<{ items: readonly PluginRecord[]; total: number }>;
  createPlugin(actor: Actor, input: PluginCreate): Promise<PluginRecord>;
  updatePluginStatus(
    actor: Actor,
    id: string,
    input: PluginStatusUpdate,
  ): Promise<PluginRecord | null>;
}

const CODE_RE = /^[a-z0-9](?:[a-z0-9._-]{0,80}[a-z0-9])?$/;
const VALID_STATUSES: ReadonlySet<string> = new Set(PLUGIN_STATUSES);

export function parsePluginCreate(
  raw: unknown,
): { ok: true; value: PluginCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['code'] !== 'string' || !CODE_RE.test(obj['code']))
    errors.push('code must be a dotted lowercase slug');
  if (typeof obj['name'] !== 'string' || obj['name'].length === 0) errors.push('name required');
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { code: obj['code'] as string, name: obj['name'] as string } };
}

export function parsePluginStatusUpdate(
  raw: unknown,
): { ok: true; value: PluginStatusUpdate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  if (typeof obj['status'] !== 'string' || !VALID_STATUSES.has(obj['status']))
    return { ok: false, errors: ['status must be enabled|disabled'] };
  return { ok: true, value: { status: obj['status'] as PluginStatus } };
}

export function parsePluginId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function authorize(actor: Actor, action: 'read' | 'write'): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    action,
    { type: 'plugin', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  ).allowed;
}

export async function listPlugins(
  deps: { repository: PluginRepository },
  actor: Actor,
): Promise<Result<{ items: readonly PluginRecord[]; total: number }>> {
  if (!authorize(actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  return { ok: true, ...(await deps.repository.listPlugins(actor)) };
}

export async function createPlugin(
  deps: { repository: PluginRepository },
  actor: Actor,
  input: PluginCreate,
): Promise<Result<{ plugin: PluginRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.createPlugin(actor, input);
  return { ok: true, plugin: r };
}

export async function updatePluginStatus(
  deps: { repository: PluginRepository },
  actor: Actor,
  id: string,
  input: PluginStatusUpdate,
): Promise<Result<{ plugin: PluginRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.updatePluginStatus(actor, id, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, plugin: r };
}
