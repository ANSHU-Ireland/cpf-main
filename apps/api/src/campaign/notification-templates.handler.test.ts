import { describe, it, expect } from 'vitest';
import {
  handleListNotificationTemplates,
  handleCreateNotificationTemplate,
  handleActivateNotificationTemplate,
  handlePreviewNotificationTemplate,
  handleTestSendNotificationTemplate,
  type NotificationTemplateService,
} from './notification-templates.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

const ok = (status: number) => Promise.resolve({ status, headers: {}, body: '{}' });

function svc(ov: Partial<NotificationTemplateService> = {}): NotificationTemplateService {
  return {
    list: () => Promise.resolve({ ok: true as const, items: [], total: 0 }),
    create: () => ok(201),
    activate: () => ok(200),
    preview: () => ok(200),
    testSend: () => ok(202),
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

describe('handleCreateNotificationTemplate', () => {
  it('delegates to the service', async () =>
    expect((await handleCreateNotificationTemplate(svc(), { actor, body: {} })).status).toBe(201));
});

describe('handleActivateNotificationTemplate', () => {
  it('delegates to the service', async () =>
    expect(
      (await handleActivateNotificationTemplate(svc(), { actor, templateId: ID })).status,
    ).toBe(200));
});

describe('handlePreviewNotificationTemplate', () => {
  it('delegates to the service', async () =>
    expect(
      (await handlePreviewNotificationTemplate(svc(), { actor, templateId: ID, body: {} })).status,
    ).toBe(200));
});

describe('handleTestSendNotificationTemplate', () => {
  it('delegates to the service', async () =>
    expect(
      (await handleTestSendNotificationTemplate(svc(), { actor, templateId: ID, body: {} })).status,
    ).toBe(202));
});
