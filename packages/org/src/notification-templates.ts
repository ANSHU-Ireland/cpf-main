import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

export interface NotificationTemplateRecord {
  readonly id: string;
  readonly templateCode: string;
  readonly channel: string;
  readonly subject: string;
  readonly bodyHtml: string;
  readonly createdAt: string;
}

export interface NotificationTemplateRepository {
  listTemplates(
    actor: Actor,
  ): Promise<{ items: readonly NotificationTemplateRecord[]; total: number }>;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function listNotificationTemplates(
  deps: { repository: NotificationTemplateRepository },
  actor: Actor,
): Promise<Result<{ items: readonly NotificationTemplateRecord[]; total: number }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'notification_template', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  return { ok: true, ...(await deps.repository.listTemplates(actor)) };
}
