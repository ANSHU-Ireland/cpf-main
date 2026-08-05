import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const WEBHOOK_STATUSES = ['active', 'paused', 'disabled'] as const;
export type WebhookStatus = (typeof WEBHOOK_STATUSES)[number];

export interface WebhookRecord {
  readonly id: string;
  readonly targetUrl: string;
  readonly eventTypes: readonly string[];
  readonly status: WebhookStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface WebhookCreate {
  readonly targetUrl: string;
  readonly eventTypes: readonly string[];
}

export interface WebhookStatusUpdate {
  readonly status: WebhookStatus;
}

export interface WebhookRepository {
  listWebhooks(actor: Actor): Promise<{ items: readonly WebhookRecord[]; total: number }>;
  createWebhook(actor: Actor, input: WebhookCreate): Promise<WebhookRecord>;
  updateWebhookStatus(
    actor: Actor,
    id: string,
    input: WebhookStatusUpdate,
  ): Promise<WebhookRecord | null>;
}

const VALID_STATUSES: ReadonlySet<string> = new Set(WEBHOOK_STATUSES);

export function parseWebhookCreate(
  raw: unknown,
): { ok: true; value: WebhookCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['targetUrl'] !== 'string' || !/^https:\/\//.test(obj['targetUrl']))
    errors.push('targetUrl must be https URL');
  if (!Array.isArray(obj['eventTypes']) || obj['eventTypes'].length === 0)
    errors.push('eventTypes must be a non-empty array');
  else if (!obj['eventTypes'].every((e) => typeof e === 'string'))
    errors.push('eventTypes must be strings');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { targetUrl: obj['targetUrl'] as string, eventTypes: obj['eventTypes'] as string[] },
  };
}

export function parseWebhookStatusUpdate(
  raw: unknown,
): { ok: true; value: WebhookStatusUpdate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  if (typeof obj['status'] !== 'string' || !VALID_STATUSES.has(obj['status']))
    return { ok: false, errors: ['status must be active|paused|disabled'] };
  return { ok: true, value: { status: obj['status'] as WebhookStatus } };
}

export function parseWebhookId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function listWebhooks(
  deps: { repository: WebhookRepository },
  actor: Actor,
): Promise<Result<{ items: readonly WebhookRecord[]; total: number }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'webhook', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  return { ok: true, ...(await deps.repository.listWebhooks(actor)) };
}

export async function createWebhook(
  deps: { repository: WebhookRepository },
  actor: Actor,
  input: WebhookCreate,
): Promise<Result<{ webhook: WebhookRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'webhook', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.createWebhook(actor, input);
  return { ok: true, webhook: r };
}

export async function updateWebhookStatus(
  deps: { repository: WebhookRepository },
  actor: Actor,
  id: string,
  input: WebhookStatusUpdate,
): Promise<Result<{ webhook: WebhookRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'webhook', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.updateWebhookStatus(actor, id, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, webhook: r };
}
