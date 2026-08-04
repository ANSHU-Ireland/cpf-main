import { describe, it, expect } from 'vitest';
import {
  listGovernanceDocs,
  getGovernanceDoc,
  createGovernanceDoc,
  parseGovernanceDocCreate,
  parseGovernanceDocId,
  type GovernanceDocRepository,
  type GovernanceDocRecord,
  type GovernanceDocType,
} from './governance-docs.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const doc: GovernanceDocRecord = {
  id: 'd1',
  title: 'T',
  status: 'draft',
  createdAt: '',
  updatedAt: '',
};

function repo(ov: Partial<GovernanceDocRepository> = {}): GovernanceDocRepository {
  return {
    listDocs: () => Promise.resolve({ items: [doc], total: 1 }),
    getDocs: () => Promise.resolve(doc),
    createDoc: () => Promise.resolve(doc),
    ...ov,
  };
}

const TYPES: GovernanceDocType[] = [
  'ai_literacy',
  'dataset',
  'data_use_register',
  'impact_assessment',
  'post_market_plan',
  'post_market_signal',
  'qms_document',
  'technical_document',
  'vendor_evidence',
  'deployer_instruction',
];

describe('parseGovernanceDocCreate', () => {
  it('valid', () =>
    expect(parseGovernanceDocCreate({ title: 't', description: 'd' }).ok).toBe(true));
  it('invalid', () => expect(parseGovernanceDocCreate({}).ok).toBe(false));
});

describe('parseGovernanceDocId', () => {
  it('uuid', () => expect(parseGovernanceDocId(T)).not.toBeNull());
  it('bad', () => expect(parseGovernanceDocId('x')).toBeNull());
});

describe('listGovernanceDocs', () => {
  for (const dt of TYPES) {
    it(`lists ${dt}`, async () => {
      const r = await listGovernanceDocs({ repository: repo() }, admin, dt);
      expect(r.ok).toBe(true);
    });
  }
  it('403', async () => {
    const r = await listGovernanceDocs({ repository: repo() }, noRole, 'ai_literacy');
    expect(r.ok).toBe(false);
  });
});

describe('getGovernanceDoc', () => {
  it('ok', async () => {
    const r = await getGovernanceDoc({ repository: repo() }, admin, 'dataset', 'd1');
    expect(r.ok).toBe(true);
  });
  it('404', async () => {
    const r = await getGovernanceDoc(
      { repository: repo({ getDocs: () => Promise.resolve(null) }) },
      admin,
      'dataset',
      'x',
    );
    expect(r.ok).toBe(false);
  });
});

describe('createGovernanceDoc', () => {
  for (const dt of TYPES) {
    it(`creates ${dt}`, async () => {
      const r = await createGovernanceDoc({ repository: repo() }, admin, dt, {
        title: 't',
        description: 'd',
      });
      expect(r.ok).toBe(true);
    });
  }
  it('403', async () => {
    const r = await createGovernanceDoc({ repository: repo() }, noRole, 'ai_literacy', {
      title: 't',
      description: 'd',
    });
    expect(r.ok).toBe(false);
  });
});
