import { describe, it, expect } from 'vitest';
import {
  listEvidenceCollections,
  createEvidenceCollection,
  getTraceability,
  parseEvidenceCollectionCreate,
} from './audit-evidence.js';
import type {
  AuditEvidenceRepository,
  EvidenceCollectionRecord,
  TraceabilityRow,
} from './audit-evidence.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const col: EvidenceCollectionRecord = {
  id: 'c1',
  title: 't',
  framework: 'eu_ai_act',
  status: 'open',
  itemCount: 0,
  createdAt: '',
};
const row: TraceabilityRow = {
  requirementId: 'REQ-1',
  requirementTitle: 'r',
  controls: ['RC1'],
  evidence: ['E1'],
  coverage: 'full',
};

function repo(ov: Partial<AuditEvidenceRepository> = {}): AuditEvidenceRepository {
  return {
    listCollections: () => Promise.resolve({ items: [col], total: 1 }),
    createCollection: () => Promise.resolve(col),
    getTraceability: () => Promise.resolve(row),
    ...ov,
  };
}

describe('parseEvidenceCollectionCreate', () => {
  it('valid', () =>
    expect(parseEvidenceCollectionCreate({ title: 't', framework: 'f' }).ok).toBe(true));
  it('invalid', () => expect(parseEvidenceCollectionCreate({}).ok).toBe(false));
});
describe('listEvidenceCollections', () => {
  it('ok', async () =>
    expect((await listEvidenceCollections({ repository: repo() }, admin)).ok).toBe(true));
  it('403', async () =>
    expect((await listEvidenceCollections({ repository: repo() }, noRole)).ok).toBe(false));
});
describe('createEvidenceCollection', () => {
  it('ok', async () =>
    expect(
      (
        await createEvidenceCollection({ repository: repo() }, admin, {
          title: 't',
          framework: 'f',
        })
      ).ok,
    ).toBe(true));
  it('403', async () =>
    expect(
      (
        await createEvidenceCollection({ repository: repo() }, noRole, {
          title: 't',
          framework: 'f',
        })
      ).ok,
    ).toBe(false));
});
describe('getTraceability', () => {
  it('ok', async () =>
    expect((await getTraceability({ repository: repo() }, admin, 'REQ-1')).ok).toBe(true));
  it('404', async () =>
    expect(
      (
        await getTraceability(
          { repository: repo({ getTraceability: () => Promise.resolve(null) }) },
          admin,
          'x',
        )
      ).ok,
    ).toBe(false));
});
