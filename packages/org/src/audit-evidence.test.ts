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
const auditor: Actor = { tenantId: T, userId: U, roles: ['auditor'] };
const regulator: Actor = { tenantId: T, userId: U, roles: ['regulator'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const col: EvidenceCollectionRecord = {
  id: 'c1',
  title: 't',
  purpose: 'purpose',
  framework: 'eu_ai_act',
  status: 'draft',
  custodian: 'Auditor',
  sealed: false,
  itemCount: 0,
  requirementIds: ['33333333-3333-4333-8333-333333333333'],
  chainOfCustody: [],
  createdAt: '',
};
const row: TraceabilityRow = {
  id: '33333333-3333-4333-8333-333333333333',
  requirementId: 'REQ-1',
  requirementTitle: 'r',
  controls: ['RC1'],
  surfaces: ['AUD-02'],
  endpoints: ['/audit/traceability/{requirementId}'],
  evidence: ['E1'],
  coverage: 'full',
  status: 'verified',
  createdAt: '',
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
    expect(
      parseEvidenceCollectionCreate({
        reason: 'Quarterly control review',
        expectedVersion: 0,
        data: { title: 'Quarterly evidence', purpose: 'Conformity review' },
      }),
    ).toEqual({
      ok: true,
      value: {
        title: 'Quarterly evidence',
        purpose: 'Conformity review',
        framework: 'EU AI Act',
        reason: 'Quarterly control review',
        expectedVersion: 0,
      },
    }));
  it('normalizes the legacy screen payload without dropping its purpose', () =>
    expect(
      parseEvidenceCollectionCreate({
        title: 'Operational evidence',
        purpose: 'UAT release evidence',
        framework: 'ISO 42001',
      }).ok,
    ).toBe(true));
  it('invalid', () => expect(parseEvidenceCollectionCreate({}).ok).toBe(false));
  it('rejects a framework that violates the database minimum', () =>
    expect(
      parseEvidenceCollectionCreate({
        data: { title: 'Evidence collection', purpose: 'UAT review', framework: 'x' },
      }).ok,
    ).toBe(false));
  it('rejects a non-create expected version', () =>
    expect(
      parseEvidenceCollectionCreate({
        expectedVersion: 2,
        data: { title: 'Quarterly evidence', purpose: 'Conformity review' },
      }).ok,
    ).toBe(false));
});
describe('listEvidenceCollections', () => {
  it('ok', async () =>
    expect((await listEvidenceCollections({ repository: repo() }, auditor)).ok).toBe(true));
  it('allows regulator read access', async () =>
    expect((await listEvidenceCollections({ repository: repo() }, regulator)).ok).toBe(true));
  it('403', async () =>
    expect((await listEvidenceCollections({ repository: repo() }, noRole)).ok).toBe(false));
});
describe('createEvidenceCollection', () => {
  it('ok', async () =>
    expect(
      (
        await createEvidenceCollection({ repository: repo() }, auditor, {
          title: 't',
          purpose: 'purpose',
          framework: 'f',
          reason: null,
          expectedVersion: 0,
        })
      ).ok,
    ).toBe(true));
  it('403', async () =>
    expect(
      (
        await createEvidenceCollection({ repository: repo() }, noRole, {
          title: 't',
          purpose: 'purpose',
          framework: 'f',
          reason: null,
          expectedVersion: 0,
        })
      ).ok,
    ).toBe(false));
});
describe('getTraceability', () => {
  it('ok', async () =>
    expect((await getTraceability({ repository: repo() }, auditor, row.id)).ok).toBe(true));
  it('404', async () =>
    expect(
      (
        await getTraceability(
          { repository: repo({ getTraceability: () => Promise.resolve(null) }) },
          auditor,
          'x',
        )
      ).ok,
    ).toBe(false));
});
