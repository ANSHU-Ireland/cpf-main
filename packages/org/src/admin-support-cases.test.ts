import { describe, it, expect } from 'vitest';
import {
  listAdminSupportCases,
  assignSupportCase,
  updateSupportCaseStatus,
  parseSupportCaseAssignment,
  parseSupportCaseStatusUpdate,
  parseSupportCaseId,
  type AdminSupportCaseRepository,
  type AdminSupportCaseRecord,
} from './admin-support-cases.js';
import type { Actor } from './types.js';

const staff: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
const supportAgent: Actor = { userId: 'u3', tenantId: 't1', roles: ['support_agent'] };
const outsider: Actor = { userId: 'u2', tenantId: 't1', roles: ['employer_admin'] };
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
    assignCase: () => Promise.resolve({ ...kase, assigneeId: ID }),
    updateStatus: () => Promise.resolve({ ...kase, status: 'resolved' }),
    ...overrides,
  };
}

function deps(overrides: Partial<AdminSupportCaseRepository> = {}) {
  return { repository: repo(overrides) };
}

describe('parseSupportCaseAssignment', () => {
  it('accepts a UUID assignee', () =>
    expect(parseSupportCaseAssignment({ assigneeId: ID }).ok).toBe(true));
  it('rejects a bad assignee', () =>
    expect(parseSupportCaseAssignment({ assigneeId: 'nope' }).ok).toBe(false));
});

describe('parseSupportCaseStatusUpdate', () => {
  it('accepts status only', () =>
    expect(parseSupportCaseStatusUpdate({ status: 'resolved' }).ok).toBe(true));
  it('accepts status with note', () =>
    expect(parseSupportCaseStatusUpdate({ status: 'resolved', note: 'done' }).ok).toBe(true));
  it('rejects a bad status', () =>
    expect(parseSupportCaseStatusUpdate({ status: 'weird' }).ok).toBe(false));
});

describe('parseSupportCaseId', () => {
  it('accepts a UUID', () => expect(parseSupportCaseId(ID)).toBe(ID));
  it('rejects a non-UUID', () => expect(parseSupportCaseId('nope')).toBeNull());
});

describe('listAdminSupportCases', () => {
  it('allows staff', async () =>
    expect((await listAdminSupportCases(deps(), staff)).ok).toBe(true));
  it('allows a support agent', async () =>
    expect((await listAdminSupportCases(deps(), supportAgent)).ok).toBe(true));
  it('denies an outsider', async () => {
    const r = await listAdminSupportCases(deps(), outsider);
    expect(r.ok === false && r.status).toBe(403);
  });
});

describe('assignSupportCase', () => {
  it('assigns for staff', async () =>
    expect((await assignSupportCase(deps(), staff, ID, { assigneeId: ID })).ok).toBe(true));
  it('returns 404 when missing', async () => {
    const r = await assignSupportCase(
      deps({ assignCase: () => Promise.resolve(null) }),
      staff,
      ID,
      {
        assigneeId: ID,
      },
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('updateSupportCaseStatus', () => {
  it('updates for staff', async () =>
    expect((await updateSupportCaseStatus(deps(), staff, ID, { status: 'resolved' })).ok).toBe(
      true,
    ));
  it('denies an outsider', async () => {
    const r = await updateSupportCaseStatus(deps(), outsider, ID, { status: 'resolved' });
    expect(r.ok === false && r.status).toBe(403);
  });
  it('returns 404 when missing', async () => {
    const r = await updateSupportCaseStatus(
      deps({ updateStatus: () => Promise.resolve(null) }),
      staff,
      ID,
      {
        status: 'resolved',
      },
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});
