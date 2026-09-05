import { describe, it, expect } from 'vitest';
import {
  handleListEvidenceCollections,
  handleCreateEvidenceCollection,
  handleGetTraceability,
  type AuditEvidenceService,
} from './audit-evidence.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };
const col = {
  id: 'c1',
  title: 't',
  purpose: 'purpose',
  framework: 'f',
  status: 'draft',
  custodian: 'Auditor',
  sealed: false,
  itemCount: 0,
  requirementIds: [],
  chainOfCustody: [],
  createdAt: '',
};
const row = {
  id: ID,
  requirementId: 'REQ-1',
  requirementTitle: 'r',
  controls: [],
  surfaces: [],
  endpoints: [],
  evidence: [],
  coverage: 'full',
  status: 'verified',
  createdAt: '',
};

function svc(ov: Partial<AuditEvidenceService> = {}): AuditEvidenceService {
  return {
    listCollections: () => Promise.resolve({ ok: true as const, items: [col], total: 1 }),
    createCollection: () => Promise.resolve({ status: 200, headers: {}, body: '{}' }),
    traceability: () => Promise.resolve({ status: 200, headers: {}, body: JSON.stringify(row) }),
    ...ov,
  };
}

describe('handleListEvidenceCollections', () => {
  it('200', async () =>
    expect((await handleListEvidenceCollections(svc(), { actor })).status).toBe(200));
  it('403', async () =>
    expect(
      (
        await handleListEvidenceCollections(
          svc({
            listCollections: () =>
              Promise.resolve({ ok: false as const, status: 403, reason: 'denied' }),
          }),
          { actor },
        )
      ).status,
    ).toBe(403));
});
describe('handleCreateEvidenceCollection', () => {
  it('200', async () =>
    expect((await handleCreateEvidenceCollection(svc(), { actor, body: {} })).status).toBe(200));
});
describe('handleGetTraceability', () => {
  it('200', async () =>
    expect((await handleGetTraceability(svc(), { actor, requirementId: 'REQ-1' })).status).toBe(
      200,
    ));
});
