import { describe, it, expect } from 'vitest';
import type { Actor, WebhookRepository, WebhookRecord } from '@cpf/org';
import {
  createWebhookService,
  handleListWebhooks,
  handleCreateWebhook,
  handleUpdateWebhookStatus,
} from './webhooks.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };
const VALID_ID = '11111111-1111-1111-1111-111111111111';

const hook: WebhookRecord = {
  id: VALID_ID,
  targetUrl: 'https://example.com/hook',
  eventTypes: ['application.created'],
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function repo(overrides: Partial<WebhookRepository> = {}): WebhookRepository {
  return {
    listWebhooks: () => Promise.resolve({ items: [hook], total: 1 }),
    createWebhook: () => Promise.resolve(hook),
    updateWebhookStatus: () => Promise.resolve(hook),
    ...overrides,
  };
}

function svc(overrides: Partial<WebhookRepository> = {}) {
  return createWebhookService({ repository: repo(overrides) });
}

describe('handleListWebhooks', () => {
  it('returns 200', async () => {
    const res = await handleListWebhooks(svc(), { actor });
    expect(res.status).toBe(200);
  });
});

describe('handleCreateWebhook', () => {
  it('returns 201', async () => {
    const res = await handleCreateWebhook(svc(), {
      actor,
      body: { targetUrl: 'https://x.com/h', eventTypes: ['e'] },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for non-https', async () => {
    const res = await handleCreateWebhook(svc(), {
      actor,
      body: { targetUrl: 'http://x', eventTypes: ['e'] },
    });
    expect(res.status).toBe(422);
  });
});

describe('handleUpdateWebhookStatus', () => {
  it('returns 200', async () => {
    const res = await handleUpdateWebhookStatus(svc(), {
      actor,
      webhookId: VALID_ID,
      body: { status: 'paused' },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleUpdateWebhookStatus(svc(), {
      actor,
      webhookId: 'bad',
      body: { status: 'paused' },
    });
    expect(res.status).toBe(422);
  });
  it('returns 404 when missing', async () => {
    const res = await handleUpdateWebhookStatus(
      svc({ updateWebhookStatus: () => Promise.resolve(null) }),
      {
        actor,
        webhookId: VALID_ID,
        body: { status: 'paused' },
      },
    );
    expect(res.status).toBe(404);
  });
});
