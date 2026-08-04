import { describe, it, expect } from 'vitest';
import {
  listIntegrations,
  getIntegration,
  createIntegration,
  updateIntegration,
  parseIntegrationCreate,
  parseIntegrationUpdate,
  parseIntegrationId,
} from './integrations.js';
import type { IntegrationRepository, IntegrationRecord } from './integrations.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const rec: IntegrationRecord = {
  id: 'i1',
  connectionType: 'ats',
  provider: 'lever',
  status: 'active',
  createdAt: '',
  updatedAt: '',
};

function repo(ov: Partial<IntegrationRepository> = {}): IntegrationRepository {
  return {
    listIntegrations: () => Promise.resolve({ items: [rec], total: 1 }),
    getIntegration: () => Promise.resolve(rec),
    createIntegration: () => Promise.resolve(rec),
    updateIntegration: () => Promise.resolve(rec),
    ...ov,
  };
}

describe('parseIntegrationCreate', () => {
  it('valid', () =>
    expect(parseIntegrationCreate({ connectionType: 'ats', provider: 'lever' }).ok).toBe(true));
  it('invalid', () => expect(parseIntegrationCreate({}).ok).toBe(false));
});
describe('parseIntegrationUpdate', () => {
  it('valid', () => expect(parseIntegrationUpdate({ status: 'active' }).ok).toBe(true));
  it('empty', () => expect(parseIntegrationUpdate({}).ok).toBe(false));
});
describe('parseIntegrationId', () => {
  it('uuid', () => expect(parseIntegrationId(T)).not.toBeNull());
});
describe('listIntegrations', () => {
  it('ok', async () =>
    expect((await listIntegrations({ repository: repo() }, admin)).ok).toBe(true));
  it('403', async () =>
    expect((await listIntegrations({ repository: repo() }, noRole)).ok).toBe(false));
});
describe('getIntegration', () => {
  it('ok', async () =>
    expect((await getIntegration({ repository: repo() }, admin, 'i1')).ok).toBe(true));
  it('404', async () =>
    expect(
      (
        await getIntegration(
          { repository: repo({ getIntegration: () => Promise.resolve(null) }) },
          admin,
          'x',
        )
      ).ok,
    ).toBe(false));
});
describe('createIntegration', () => {
  it('ok', async () =>
    expect(
      (
        await createIntegration({ repository: repo() }, admin, {
          connectionType: 'ats',
          provider: 'lever',
        })
      ).ok,
    ).toBe(true));
});
describe('updateIntegration', () => {
  it('ok', async () =>
    expect(
      (await updateIntegration({ repository: repo() }, admin, 'i1', { status: 'suspended' })).ok,
    ).toBe(true));
  it('404', async () =>
    expect(
      (
        await updateIntegration(
          { repository: repo({ updateIntegration: () => Promise.resolve(null) }) },
          admin,
          'x',
          { status: 'suspended' },
        )
      ).ok,
    ).toBe(false));
});
