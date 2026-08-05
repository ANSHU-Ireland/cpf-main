import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const NOTIFICATION_CHANNELS = ['email', 'sms', 'in_app'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export interface NotificationTemplateRecord {
  readonly id: string;
  readonly templateCode: string;
  readonly channel: string;
  readonly subject: string;
  readonly bodyHtml: string;
  readonly status?: string;
  readonly createdAt: string;
}

export interface NotificationTemplateCreate {
  readonly templateCode: string;
  readonly channel: NotificationChannel;
  readonly subject: string;
  readonly bodyHtml: string;
}

export interface NotificationTemplatePreview {
  readonly variables?: Record<string, unknown>;
}

export interface NotificationTemplateRendered {
  readonly subject: string;
  readonly bodyHtml: string;
}

export interface NotificationTemplateTestSend {
  readonly recipient: string;
}

export interface NotificationTemplateTestSendResult {
  readonly queued: boolean;
}

export interface NotificationTemplateRepository {
  listTemplates(
    actor: Actor,
  ): Promise<{ items: readonly NotificationTemplateRecord[]; total: number }>;
  createTemplate(
    actor: Actor,
    input: NotificationTemplateCreate,
  ): Promise<NotificationTemplateRecord>;
  activateTemplate(actor: Actor, id: string): Promise<NotificationTemplateRecord | null>;
  previewTemplate(
    actor: Actor,
    id: string,
    input: NotificationTemplatePreview,
  ): Promise<NotificationTemplateRendered | null>;
  testSendTemplate(
    actor: Actor,
    id: string,
    input: NotificationTemplateTestSend,
  ): Promise<NotificationTemplateTestSendResult | null>;
}

const VALID_CHANNELS: ReadonlySet<string> = new Set(NOTIFICATION_CHANNELS);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function parseNotificationTemplateCreate(
  raw: unknown,
): { ok: true; value: NotificationTemplateCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['templateCode'] !== 'string' || obj['templateCode'].length === 0)
    errors.push('templateCode required');
  if (typeof obj['channel'] !== 'string' || !VALID_CHANNELS.has(obj['channel']))
    errors.push('channel must be email|sms|in_app');
  if (typeof obj['subject'] !== 'string' || obj['subject'].length === 0)
    errors.push('subject required');
  if (typeof obj['bodyHtml'] !== 'string' || obj['bodyHtml'].length === 0)
    errors.push('bodyHtml required');
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      templateCode: obj['templateCode'] as string,
      channel: obj['channel'] as NotificationChannel,
      subject: obj['subject'] as string,
      bodyHtml: obj['bodyHtml'] as string,
    },
  };
}

export function parseNotificationTemplatePreview(
  raw: unknown,
): { ok: true; value: NotificationTemplatePreview } | { ok: false; errors: string[] } {
  if (raw === undefined || raw === null) return { ok: true, value: {} };
  if (typeof raw !== 'object') return { ok: false, errors: ['body must be an object'] };
  const obj = raw as Record<string, unknown>;
  if (
    obj['variables'] !== undefined &&
    (typeof obj['variables'] !== 'object' || obj['variables'] === null)
  )
    return { ok: false, errors: ['variables must be an object'] };
  const value: { variables?: Record<string, unknown> } = {};
  if (obj['variables'] !== undefined) value.variables = obj['variables'] as Record<string, unknown>;
  return { ok: true, value };
}

export function parseNotificationTemplateTestSend(
  raw: unknown,
): { ok: true; value: NotificationTemplateTestSend } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  if (typeof obj['recipient'] !== 'string' || !EMAIL_RE.test(obj['recipient']))
    return { ok: false, errors: ['recipient must be a valid email'] };
  return { ok: true, value: { recipient: obj['recipient'] } };
}

export function parseNotificationTemplateId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function authorize(actor: Actor, action: 'read' | 'write'): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    action,
    { type: 'notification_template', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  ).allowed;
}

export async function listNotificationTemplates(
  deps: { repository: NotificationTemplateRepository },
  actor: Actor,
): Promise<Result<{ items: readonly NotificationTemplateRecord[]; total: number }>> {
  if (!authorize(actor, 'read')) return { ok: false, status: 403, reason: 'forbidden' };
  return { ok: true, ...(await deps.repository.listTemplates(actor)) };
}

export async function createNotificationTemplate(
  deps: { repository: NotificationTemplateRepository },
  actor: Actor,
  input: NotificationTemplateCreate,
): Promise<Result<{ template: NotificationTemplateRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.createTemplate(actor, input);
  return { ok: true, template: r };
}

export async function activateNotificationTemplate(
  deps: { repository: NotificationTemplateRepository },
  actor: Actor,
  id: string,
): Promise<Result<{ template: NotificationTemplateRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.activateTemplate(actor, id);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, template: r };
}

export async function previewNotificationTemplate(
  deps: { repository: NotificationTemplateRepository },
  actor: Actor,
  id: string,
  input: NotificationTemplatePreview,
): Promise<Result<{ rendered: NotificationTemplateRendered }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.previewTemplate(actor, id, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, rendered: r };
}

export async function testSendNotificationTemplate(
  deps: { repository: NotificationTemplateRepository },
  actor: Actor,
  id: string,
  input: NotificationTemplateTestSend,
): Promise<Result<{ result: NotificationTemplateTestSendResult }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.testSendTemplate(actor, id, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, result: r };
}
