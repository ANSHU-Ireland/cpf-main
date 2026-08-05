import { describe, it, expect } from 'vitest';
import type { Actor, GovernanceSubmissionRepository } from '@cpf/org';
import {
  createGovernanceSubmissionService,
  handleGetDeployerInstruction,
  handleCreateGovernanceSubmission,
  handleApproveConformityAssessment,
  handleUpdateSeriousIncident,
  handleDecideChangeRequest,
} from './governance-submissions.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };
const VALID_ID = '11111111-1111-1111-1111-111111111111';

const sub = {
  id: VALID_ID,
  submissionType: 'ce_marking' as const,
  reference: 'ref-1',
  status: 'submitted',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const instruction = {
  id: VALID_ID,
  aiSystemId: VALID_ID,
  title: 't',
  content: 'c',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function repo(
  overrides: Partial<GovernanceSubmissionRepository> = {},
): GovernanceSubmissionRepository {
  return {
    getDeployerInstruction: () => Promise.resolve(instruction),
    createSubmission: () => Promise.resolve(sub),
    approveConformityAssessment: () => Promise.resolve(sub),
    updateSeriousIncident: () => Promise.resolve(sub),
    decideChangeRequest: () => Promise.resolve(sub),
    ...overrides,
  };
}

function svc(overrides: Partial<GovernanceSubmissionRepository> = {}) {
  return createGovernanceSubmissionService({ repository: repo(overrides) });
}

describe('handleGetDeployerInstruction', () => {
  it('returns 200', async () => {
    const res = await handleGetDeployerInstruction(svc(), { actor, systemId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleGetDeployerInstruction(svc(), { actor, systemId: 'bad' });
    expect(res.status).toBe(422);
  });
  it('returns 404 when missing', async () => {
    const res = await handleGetDeployerInstruction(
      svc({ getDeployerInstruction: () => Promise.resolve(null) }),
      {
        actor,
        systemId: VALID_ID,
      },
    );
    expect(res.status).toBe(404);
  });
});

describe('handleCreateGovernanceSubmission', () => {
  it('returns 201', async () => {
    const res = await handleCreateGovernanceSubmission(svc(), {
      actor,
      submissionType: 'ce_marking',
      body: { reference: 'r', summary: 's' },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handleCreateGovernanceSubmission(svc(), {
      actor,
      submissionType: 'ce_marking',
      body: {},
    });
    expect(res.status).toBe(422);
  });
});

describe('handleApproveConformityAssessment', () => {
  it('returns 200', async () => {
    const res = await handleApproveConformityAssessment(svc(), { actor, assessmentId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 404 when missing', async () => {
    const res = await handleApproveConformityAssessment(
      svc({ approveConformityAssessment: () => Promise.resolve(null) }),
      { actor, assessmentId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
});

describe('handleUpdateSeriousIncident', () => {
  it('returns 200', async () => {
    const res = await handleUpdateSeriousIncident(svc(), {
      actor,
      incidentId: VALID_ID,
      body: { status: 'open', notes: 'n' },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handleUpdateSeriousIncident(svc(), { actor, incidentId: VALID_ID, body: {} });
    expect(res.status).toBe(422);
  });
});

describe('handleDecideChangeRequest', () => {
  it('returns 200', async () => {
    const res = await handleDecideChangeRequest(svc(), {
      actor,
      changeId: VALID_ID,
      body: { decision: 'approved', rationale: 'r' },
    });
    expect(res.status).toBe(200);
  });
  it('returns 422 for invalid body', async () => {
    const res = await handleDecideChangeRequest(svc(), { actor, changeId: VALID_ID, body: {} });
    expect(res.status).toBe(422);
  });
});
