import { describe, it, expect } from 'vitest';
import {
  listPlugins,
  createPlugin,
  updatePluginStatus,
  parsePluginCreate,
  parsePluginStatusUpdate,
  parsePluginId,
  type PluginRepository,
  type PluginRecord,
} from './plugins.js';
import type { Actor } from './types.js';

const admin: Actor = { userId: 'u1', tenantId: 't1', roles: ['employer_admin'] };
const noRole: Actor = { userId: 'u2', tenantId: 't1', roles: ['viewer'] };
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
    updatePluginStatus: () => Promise.resolve({ ...plugin, status: 'disabled' }),
    ...overrides,
  };
}

function deps(overrides: Partial<PluginRepository> = {}) {
  return { repository: repo(overrides) };
}

describe('parsePluginCreate', () => {
  it('accepts a dotted slug', () =>
    expect(parsePluginCreate({ code: 'com.acme.export', name: 'Export' }).ok).toBe(true));
  it('rejects an uppercase code', () =>
    expect(parsePluginCreate({ code: 'Bad', name: 'Export' }).ok).toBe(false));
  it('rejects a missing name', () =>
    expect(parsePluginCreate({ code: 'com.acme' }).ok).toBe(false));
});

describe('parsePluginStatusUpdate', () => {
  it('accepts enabled', () => expect(parsePluginStatusUpdate({ status: 'enabled' }).ok).toBe(true));
  it('rejects a bad status', () =>
    expect(parsePluginStatusUpdate({ status: 'weird' }).ok).toBe(false));
});

describe('parsePluginId', () => {
  it('accepts a UUID', () => expect(parsePluginId(ID)).toBe(ID));
  it('rejects a non-UUID', () => expect(parsePluginId('nope')).toBeNull());
});

describe('listPlugins', () => {
  it('allows an admin', async () => expect((await listPlugins(deps(), admin)).ok).toBe(true));
  it('denies a viewer', async () => {
    const r = await listPlugins(deps(), noRole);
    expect(r.ok === false && r.status).toBe(403);
  });
});

describe('createPlugin', () => {
  it('creates for an admin', async () =>
    expect((await createPlugin(deps(), admin, { code: 'com.acme.x', name: 'X' })).ok).toBe(true));
  it('denies a viewer', async () => {
    const r = await createPlugin(deps(), noRole, { code: 'com.acme.x', name: 'X' });
    expect(r.ok === false && r.status).toBe(403);
  });
});

describe('updatePluginStatus', () => {
  it('updates for an admin', async () =>
    expect((await updatePluginStatus(deps(), admin, ID, { status: 'disabled' })).ok).toBe(true));
  it('returns 404 when missing', async () => {
    const r = await updatePluginStatus(
      deps({ updatePluginStatus: () => Promise.resolve(null) }),
      admin,
      ID,
      {
        status: 'disabled',
      },
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});
