import { describe, it, expect } from 'vitest';
import {
  listWebhooks,
  createWebhook,
  updateWebhookStatus,
  parseWebhookCreate,
  parseWebhookStatusUpdate,
  parseWebhookId,
  type WebhookRepository,
  type WebhookRecord,
} from './webhooks.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const wh: WebhookRecord = {
  id: 'w1',
  targetUrl: 'https://x.example/hook',
  eventTypes: ['campaign.activated'],
  status: 'active',
  createdAt: '',
  updatedAt: '',
};

function repo(ov: Partial<WebhookRepository> = {}): WebhookRepository {
  return {
    listWebhooks: () => Promise.resolve({ items: [wh], total: 1 }),
    createWebhook: () => Promise.resolve(wh),
    updateWebhookStatus: () => Promise.resolve(wh),
    ...ov,
  };
}

describe('parseWebhookCreate', () => {
  it('valid', () =>
    expect(parseWebhookCreate({ targetUrl: 'https://x.example/h', eventTypes: ['a'] }).ok).toBe(
      true,
    ));
  it('non-https', () =>
    expect(parseWebhookCreate({ targetUrl: 'http://x', eventTypes: ['a'] }).ok).toBe(false));
  it('empty events', () =>
    expect(parseWebhookCreate({ targetUrl: 'https://x', eventTypes: [] }).ok).toBe(false));
});
describe('parseWebhookStatusUpdate', () => {
  it('valid', () => expect(parseWebhookStatusUpdate({ status: 'paused' }).ok).toBe(true));
  it('invalid', () => expect(parseWebhookStatusUpdate({ status: 'nope' }).ok).toBe(false));
});
describe('parseWebhookId', () => {
  it('uuid', () => expect(parseWebhookId(T)).not.toBeNull());
  it('bad', () => expect(parseWebhookId('x')).toBeNull());
});
describe('listWebhooks', () => {
  it('ok', async () => expect((await listWebhooks({ repository: repo() }, admin)).ok).toBe(true));
  it('403', async () =>
    expect((await listWebhooks({ repository: repo() }, noRole)).ok).toBe(false));
});
describe('createWebhook', () => {
  it('ok', async () =>
    expect(
      (
        await createWebhook({ repository: repo() }, admin, {
          targetUrl: 'https://x',
          eventTypes: ['a'],
        })
      ).ok,
    ).toBe(true));
  it('403', async () =>
    expect(
      (
        await createWebhook({ repository: repo() }, noRole, {
          targetUrl: 'https://x',
          eventTypes: ['a'],
        })
      ).ok,
    ).toBe(false));
});
describe('updateWebhookStatus', () => {
  it('ok', async () =>
    expect(
      (await updateWebhookStatus({ repository: repo() }, admin, 'w1', { status: 'paused' })).ok,
    ).toBe(true));
  it('404', async () =>
    expect(
      (
        await updateWebhookStatus(
          { repository: repo({ updateWebhookStatus: () => Promise.resolve(null) }) },
          admin,
          'w1',
          { status: 'paused' },
        )
      ).ok,
    ).toBe(false));
});
