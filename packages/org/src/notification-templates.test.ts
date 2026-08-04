import { describe, it, expect } from 'vitest';
import { listNotificationTemplates } from './notification-templates.js';
import type {
  NotificationTemplateRepository,
  NotificationTemplateRecord,
} from './notification-templates.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const tmpl: NotificationTemplateRecord = {
  id: 't1',
  templateCode: 'TC',
  channel: 'email',
  subject: 's',
  bodyHtml: '<p>hi</p>',
  createdAt: '',
};

function repo(): NotificationTemplateRepository {
  return { listTemplates: () => Promise.resolve({ items: [tmpl], total: 1 }) };
}

describe('listNotificationTemplates', () => {
  it('ok', async () =>
    expect((await listNotificationTemplates({ repository: repo() }, admin)).ok).toBe(true));
  it('403', async () =>
    expect((await listNotificationTemplates({ repository: repo() }, noRole)).ok).toBe(false));
});
