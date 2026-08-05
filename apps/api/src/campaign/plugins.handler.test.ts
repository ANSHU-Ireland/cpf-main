import { describe, it, expect } from 'vitest';
import type { Actor, PluginRepository, PluginRecord } from '@cpf/org';
import {
  createPluginService,
  handleListPlugins,
  handleCreatePlugin,
  handleUpdatePluginStatus,
} from './plugins.handler.js';

const actor: Actor = { userId: 'u1', tenantId: 't1', roles: ['employer_admin'] };
const ID = '11111111-1111-1111-1111-111111111111';

const plugin: PluginRecord = {
  id: ID,
  code: 'com.acme.export',
  name: 'Export',
  status: 'enabled',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function repo(overrides: Partial<PluginRepository> = {}): PluginRepository {
  return {
    listPlugins: () => Promise.resolve({ items: [plugin], total: 1 }),
    createPlugin: () => Promise.resolve(plugin),
    updatePluginStatus: () => Promise.resolve(plugin),
    ...overrides,
  };
}

function svc(overrides: Partial<PluginRepository> = {}) {
  return createPluginService({ repository: repo(overrides) });
}

describe('handleListPlugins', () => {
  it('returns 200', async () =>
    expect((await handleListPlugins(svc(), { actor })).status).toBe(200));
});

describe('handleCreatePlugin', () => {
  it('returns 201', async () => {
    const res = await handleCreatePlugin(svc(), { actor, body: { code: 'com.acme.x', name: 'X' } });
    expect(res.status).toBe(201);
  });
  it('returns 422 for an invalid body', async () =>
    expect((await handleCreatePlugin(svc(), { actor, body: {} })).status).toBe(422));
});

describe('handleUpdatePluginStatus', () => {
  it('returns 200', async () =>
    expect(
      (await handleUpdatePluginStatus(svc(), { actor, pluginId: ID, body: { status: 'disabled' } }))
        .status,
    ).toBe(200));
  it('returns 422 for a bad id', async () =>
    expect(
      (
        await handleUpdatePluginStatus(svc(), {
          actor,
          pluginId: 'bad',
          body: { status: 'disabled' },
        })
      ).status,
    ).toBe(422));
  it('returns 404 when missing', async () =>
    expect(
      (
        await handleUpdatePluginStatus(svc({ updatePluginStatus: () => Promise.resolve(null) }), {
          actor,
          pluginId: ID,
          body: { status: 'disabled' },
        })
      ).status,
    ).toBe(404));
});
