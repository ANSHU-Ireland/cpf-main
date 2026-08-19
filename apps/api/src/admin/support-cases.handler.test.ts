import { describe, it, expect } from 'vitest';
import type { Actor, AdminSupportCaseRepository, AdminSupportCaseRecord } from '@cpf/org';
import {
  createAdminSupportCaseService,
  handleListAdminSupportCases,
  handleAssignSupportCase,
  handleUpdateSupportCaseStatus,
} from './support-cases.handler.js';

const actor: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
const ID = '11111111-1111-1111-1111-111111111111';

const kase: AdminSupportCaseRecord = {
  id: ID,
  caseReference: 'SC-1',
  subject: 'help',
  tenantName: 'Acme',
  severity: 'medium',
  category: 'candidate_support',
  requesterUserId: ID,
  status: 'open',
  assigneeId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function repo(overrides: Partial<AdminSupportCaseRepository> = {}): AdminSupportCaseRepository {
  return {
    listCases: () => Promise.resolve({ items: [kase], total: 1 }),
    assignCase: () => Promise.resolve(kase),
    updateStatus: () => Promise.resolve(kase),
    ...overrides,
  };
}

function svc(overrides: Partial<AdminSupportCaseRepository> = {}) {
  return createAdminSupportCaseService({ repository: repo(overrides) });
}

describe('handleListAdminSupportCases', () => {
  it('returns 200', async () =>
    expect((await handleListAdminSupportCases(svc(), { actor })).status).toBe(200));
});

describe('handleAssignSupportCase', () => {
  it('returns 200', async () =>
    expect(
      (await handleAssignSupportCase(svc(), { actor, caseId: ID, body: { assigneeId: ID } }))
        .status,
    ).toBe(200));
  it('returns 422 for a bad id', async () =>
    expect(
      (await handleAssignSupportCase(svc(), { actor, caseId: 'bad', body: { assigneeId: ID } }))
        .status,
    ).toBe(422));
  it('returns 404 when missing', async () =>
    expect(
      (
        await handleAssignSupportCase(svc({ assignCase: () => Promise.resolve(null) }), {
          actor,
          caseId: ID,
          body: { assigneeId: ID },
        })
      ).status,
    ).toBe(404));
});

describe('handleUpdateSupportCaseStatus', () => {
  it('returns 200', async () =>
    expect(
      (
        await handleUpdateSupportCaseStatus(svc(), {
          actor,
          caseId: ID,
          body: { status: 'resolved' },
        })
      ).status,
    ).toBe(200));
  it('returns 422 for an invalid body', async () =>
    expect(
      (await handleUpdateSupportCaseStatus(svc(), { actor, caseId: ID, body: { status: 'weird' } }))
        .status,
    ).toBe(422));
});
