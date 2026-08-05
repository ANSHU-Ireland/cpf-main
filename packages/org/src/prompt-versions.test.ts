import { describe, it, expect } from 'vitest';
import {
  listPromptVersions,
  createPromptVersion,
  activatePromptVersion,
  parsePromptVersionCreate,
  parsePromptVersionId,
} from './prompt-versions.js';
import type { PromptVersionRepository, PromptVersionRecord } from './prompt-versions.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const pv: PromptVersionRecord = {
  id: 'p1',
  promptCode: 'PC1',
  version: 1,
  status: 'draft',
  body: 'b',
  createdAt: '',
};

function repo(ov: Partial<PromptVersionRepository> = {}): PromptVersionRepository {
  return {
    listVersions: () => Promise.resolve({ items: [pv], total: 1 }),
    createVersion: () => Promise.resolve(pv),
    activateVersion: () => Promise.resolve({ ...pv, status: 'active' }),
    ...ov,
  };
}

describe('parsePromptVersionCreate', () => {
  it('valid', () => expect(parsePromptVersionCreate({ promptCode: 'c', body: 'b' }).ok).toBe(true));
  it('invalid', () => expect(parsePromptVersionCreate({}).ok).toBe(false));
});
describe('parsePromptVersionId', () => {
  it('uuid', () => expect(parsePromptVersionId(T)).not.toBeNull());
  it('bad', () => expect(parsePromptVersionId('x')).toBeNull());
});
describe('listPromptVersions', () => {
  it('ok', async () =>
    expect((await listPromptVersions({ repository: repo() }, admin)).ok).toBe(true));
  it('403', async () =>
    expect((await listPromptVersions({ repository: repo() }, noRole)).ok).toBe(false));
});
describe('createPromptVersion', () => {
  it('ok', async () =>
    expect(
      (await createPromptVersion({ repository: repo() }, admin, { promptCode: 'c', body: 'b' })).ok,
    ).toBe(true));
  it('403', async () =>
    expect(
      (await createPromptVersion({ repository: repo() }, noRole, { promptCode: 'c', body: 'b' }))
        .ok,
    ).toBe(false));
});
describe('activatePromptVersion', () => {
  it('ok', async () =>
    expect((await activatePromptVersion({ repository: repo() }, admin, 'p1')).ok).toBe(true));
  it('404', async () =>
    expect(
      (
        await activatePromptVersion(
          { repository: repo({ activateVersion: () => Promise.resolve(null) }) },
          admin,
          'x',
        )
      ).ok,
    ).toBe(false));
});
