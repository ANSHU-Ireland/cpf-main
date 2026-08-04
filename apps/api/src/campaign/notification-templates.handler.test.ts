import { describe, it, expect } from 'vitest';
import {
  handleListNotificationTemplates,
  type NotificationTemplateService,
} from './notification-templates.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

function svc(ov: Partial<NotificationTemplateService> = {}): NotificationTemplateService {
  return {
    list: () => Promise.resolve({ ok: true as const, items: [], total: 0 }),
    ...ov,
  };
}

describe('handleListNotificationTemplates', () => {
  it('200', async () =>
    expect((await handleListNotificationTemplates(svc(), { actor })).status).toBe(200));
  it('403', async () =>
    expect(
      (
        await handleListNotificationTemplates(
          svc({
            list: () => Promise.resolve({ ok: false as const, status: 403, reason: 'denied' }),
          }),
          { actor },
        )
      ).status,
    ).toBe(403));
});
