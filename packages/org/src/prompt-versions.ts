import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const PROMPT_VERSION_STATUSES = ['draft', 'active', 'retired'] as const;
export type PromptVersionStatus = (typeof PROMPT_VERSION_STATUSES)[number];

export interface PromptVersionRecord {
  readonly id: string;
  readonly promptCode: string;
  readonly version: number;
  readonly status: PromptVersionStatus;
  readonly body: string;
  readonly createdAt: string;
}

export interface PromptVersionCreate {
  readonly promptCode: string;
  readonly body: string;
}

export interface PromptVersionRepository {
  listVersions(actor: Actor): Promise<{ items: readonly PromptVersionRecord[]; total: number }>;
  createVersion(actor: Actor, input: PromptVersionCreate): Promise<PromptVersionRecord>;
  activateVersion(actor: Actor, id: string): Promise<PromptVersionRecord | null>;
}

export function parsePromptVersionCreate(
  raw: unknown,
): { ok: true; value: PromptVersionCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  for (const k of ['promptCode', 'body'] as const) {
    if (typeof obj[k] !== 'string' || (obj[k] as string).length === 0) errors.push(`${k} required`);
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { promptCode: obj.promptCode as string, body: obj.body as string } };
}

export function parsePromptVersionId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function listPromptVersions(
  deps: { repository: PromptVersionRepository },
  actor: Actor,
): Promise<Result<{ items: readonly PromptVersionRecord[]; total: number }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'prompt_version', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.listVersions(actor);
  return { ok: true, items: r.items, total: r.total };
}

export async function createPromptVersion(
  deps: { repository: PromptVersionRepository },
  actor: Actor,
  input: PromptVersionCreate,
): Promise<Result<{ version: PromptVersionRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'prompt_version', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.createVersion(actor, input);
  return { ok: true, version: r };
}

export async function activatePromptVersion(
  deps: { repository: PromptVersionRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ version: PromptVersionRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'prompt_version', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.activateVersion(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, version: r };
}
