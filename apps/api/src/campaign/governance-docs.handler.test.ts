import { describe, it, expect } from 'vitest';
import {
  createGovernanceDocService,
  handleListGovernanceDocs,
  handleGetGovernanceDoc,
  handleCreateGovernanceDoc,
  type GovernanceDocService,
} from './governance-docs.handler.js';
import type {
  Actor,
  GovernanceDocRecord,
  GovernanceDocRepository,
  GovernanceDocType,
} from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

function svc(ov: Partial<GovernanceDocService> = {}): GovernanceDocService {
  return {
    list: () => Promise.resolve({ ok: true as const, items: [], total: 0 }),
    get: () =>
      Promise.resolve({
        ok: true as const,
        doc: { id: ID, title: 'T', status: 'draft', createdAt: '', updatedAt: '', data: {} },
      }),
    create: () => Promise.resolve({ status: 200, headers: {}, body: '{}' }),
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
  'eu_declaration',
  'eu_registration',
  'ce_marking',
];

describe('handleListGovernanceDocs', () => {
  for (const dt of TYPES) {
    it(`200 for ${dt}`, async () => {
      const r = await handleListGovernanceDocs(svc(), { actor, docType: dt });
      expect(r.status).toBe(200);
    });
  }
  it('403', async () => {
    const r = await handleListGovernanceDocs(
      svc({ list: () => Promise.resolve({ ok: false as const, status: 403, reason: 'denied' }) }),
      { actor, docType: 'ai_literacy' },
    );
    expect(r.status).toBe(403);
  });
});

describe('handleGetGovernanceDoc', () => {
  it('200', async () => {
    const r = await handleGetGovernanceDoc(svc(), { actor, docType: 'dataset', docId: ID });
    expect(r.status).toBe(200);
  });
  it('422', async () => {
    const r = await handleGetGovernanceDoc(svc(), { actor, docType: 'dataset', docId: 'bad' });
    expect(r.status).toBe(422);
  });
});

describe('handleCreateGovernanceDoc', () => {
  for (const dt of TYPES) {
    it(`200 for ${dt}`, async () => {
      const r = await handleCreateGovernanceDoc(svc(), { actor, docType: dt, body: {} });
      expect(r.status).toBe(200);
    });
  }

  it('returns explicit validation details without calling the database a success', async () => {
    const doc: GovernanceDocRecord = {
      id: ID,
      title: 'T',
      status: 'draft',
      createdAt: '',
      updatedAt: '',
      data: {},
    };
    const repository: GovernanceDocRepository = {
      listDocs: () => Promise.resolve({ items: [doc], total: 1 }),
      getDocs: () => Promise.resolve(doc),
      createDoc: () =>
        Promise.resolve({
          ok: false,
          status: 422,
          reason: 'invalid_governance_document',
          errors: ['documentCode is required'],
        }),
    };
    const response = await createGovernanceDocService({ repository }).create(
      actor,
      'qms_document',
      {
        data: { title: 'Incomplete' },
      },
    );
    expect(response.status).toBe(422);
    expect(JSON.stringify(response.body)).toContain('documentCode is required');
  });
});
