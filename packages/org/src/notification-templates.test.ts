import { describe, it, expect } from 'vitest';
import {
  listNotificationTemplates,
  createNotificationTemplate,
  activateNotificationTemplate,
  previewNotificationTemplate,
  testSendNotificationTemplate,
  parseNotificationTemplateCreate,
  parseNotificationTemplatePreview,
  parseNotificationTemplateTestSend,
  parseNotificationTemplateId,
} from './notification-templates.js';
import type {
  NotificationTemplateRepository,
  NotificationTemplateRecord,
} from './notification-templates.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const ID = '33333333-3333-3333-3333-333333333333';
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

function repo(
  overrides: Partial<NotificationTemplateRepository> = {},
): NotificationTemplateRepository {
  return {
    listTemplates: () => Promise.resolve({ items: [tmpl], total: 1 }),
    createTemplate: () => Promise.resolve(tmpl),
    activateTemplate: () => Promise.resolve({ ...tmpl, status: 'active' }),
    previewTemplate: () => Promise.resolve({ subject: 's', bodyHtml: '<p>hi</p>' }),
    testSendTemplate: () => Promise.resolve({ queued: true }),
    ...overrides,
  };
}

function deps(overrides: Partial<NotificationTemplateRepository> = {}) {
  return { repository: repo(overrides) };
}

describe('parseNotificationTemplateCreate', () => {
  it('accepts valid input', () => {
    expect(
      parseNotificationTemplateCreate({
        templateCode: 'x',
        channel: 'email',
        subject: 's',
        bodyHtml: 'b',
      }).ok,
    ).toBe(true);
  });
  it('rejects a bad channel', () => {
    expect(
      parseNotificationTemplateCreate({
        templateCode: 'x',
        channel: 'pigeon',
        subject: 's',
        bodyHtml: 'b',
      }).ok,
    ).toBe(false);
  });
});

describe('parseNotificationTemplatePreview', () => {
  it('accepts an empty body', () =>
    expect(parseNotificationTemplatePreview(undefined).ok).toBe(true));
  it('accepts variables', () =>
    expect(parseNotificationTemplatePreview({ variables: { a: 1 } }).ok).toBe(true));
  it('rejects non-object variables', () =>
    expect(parseNotificationTemplatePreview({ variables: 'x' }).ok).toBe(false));
});

describe('parseNotificationTemplateTestSend', () => {
  it('accepts a valid email', () =>
    expect(parseNotificationTemplateTestSend({ recipient: 'a@b.com' }).ok).toBe(true));
  it('rejects a bad email', () =>
    expect(parseNotificationTemplateTestSend({ recipient: 'bad' }).ok).toBe(false));
});

describe('parseNotificationTemplateId', () => {
  it('accepts a UUID', () => expect(parseNotificationTemplateId(ID)).toBe(ID));
  it('rejects a non-UUID', () => expect(parseNotificationTemplateId('nope')).toBeNull());
});

describe('listNotificationTemplates', () => {
  it('ok', async () => expect((await listNotificationTemplates(deps(), admin)).ok).toBe(true));
  it('403', async () => expect((await listNotificationTemplates(deps(), noRole)).ok).toBe(false));
});

describe('createNotificationTemplate', () => {
  it('creates', async () => {
    const r = await createNotificationTemplate(deps(), admin, {
      templateCode: 'x',
      channel: 'email',
      subject: 's',
      bodyHtml: 'b',
    });
    expect(r.ok).toBe(true);
  });
  it('denies a non-admin', async () => {
    const r = await createNotificationTemplate(deps(), noRole, {
      templateCode: 'x',
      channel: 'email',
      subject: 's',
      bodyHtml: 'b',
    });
    expect(r.ok === false && r.status).toBe(403);
  });
});

describe('activateNotificationTemplate', () => {
  it('activates', async () =>
    expect((await activateNotificationTemplate(deps(), admin, ID)).ok).toBe(true));
  it('returns 404 when missing', async () => {
    const r = await activateNotificationTemplate(
      deps({ activateTemplate: () => Promise.resolve(null) }),
      admin,
      ID,
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('previewNotificationTemplate', () => {
  it('renders', async () =>
    expect((await previewNotificationTemplate(deps(), admin, ID, {})).ok).toBe(true));
  it('returns 404 when missing', async () => {
    const r = await previewNotificationTemplate(
      deps({ previewTemplate: () => Promise.resolve(null) }),
      admin,
      ID,
      {},
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('testSendNotificationTemplate', () => {
  it('queues a send', async () => {
    expect(
      (await testSendNotificationTemplate(deps(), admin, ID, { recipient: 'a@b.com' })).ok,
    ).toBe(true);
  });
  it('returns 404 when missing', async () => {
    const r = await testSendNotificationTemplate(
      deps({ testSendTemplate: () => Promise.resolve(null) }),
      admin,
      ID,
      {
        recipient: 'a@b.com',
      },
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});
