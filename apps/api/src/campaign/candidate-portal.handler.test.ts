import { describe, it, expect } from 'vitest';
import {
  handleGetCandidateProfile,
  handleGetCandidateInvitation,
  handleGetCandidateApplicationStatus,
  type CandidatePortalService,
} from './candidate-portal.handler.js';
import type { Actor } from '@cpf/org';

const VALID_ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: VALID_ID, userId: VALID_ID, roles: ['employer_admin'] };

function service(overrides: Partial<CandidatePortalService> = {}): CandidatePortalService {
  return {
    getProfile: () =>
      Promise.resolve({
        ok: true as const,
        profile: { candidateId: 'c', email: 'a@b.com', displayName: 'A', applications: [] },
      }),
    getInvitation: () =>
      Promise.resolve({
        ok: true as const,
        invitation: { invitationId: 'i', campaignTitle: 'C', expiresAt: '', status: 'pending' },
      }),
    getApplicationStatus: () =>
      Promise.resolve({
        ok: true as const,
        application: {
          applicationId: VALID_ID,
          employerName: 'Example employer',
          roleName: 'Engineer',
          assessmentTitle: 'Practical',
          status: 'invited',
          appliedAt: '2026-08-01T00:00:00.000Z',
          invitedAt: null,
          dueAt: null,
          decision: null,
        },
      }),
    ...overrides,
  };
}

describe('handleGetCandidateProfile', () => {
  it('returns 200', async () => {
    const res = await handleGetCandidateProfile(service(), { actor });
    expect(res.status).toBe(200);
  });
  it('returns 404', async () => {
    const res = await handleGetCandidateProfile(
      service({
        getProfile: () => Promise.resolve({ ok: false, status: 404, reason: 'not found' }),
      }),
      { actor },
    );
    expect(res.status).toBe(404);
  });
});

describe('handleGetCandidateInvitation', () => {
  it('returns 200', async () => {
    const res = await handleGetCandidateInvitation(service(), { actor });
    expect(res.status).toBe(200);
  });
  it('returns 404', async () => {
    const res = await handleGetCandidateInvitation(
      service({
        getInvitation: () => Promise.resolve({ ok: false, status: 404, reason: 'not found' }),
      }),
      { actor },
    );
    expect(res.status).toBe(404);
  });
});

describe('handleGetCandidateApplicationStatus', () => {
  it('returns 200', async () => {
    const res = await handleGetCandidateApplicationStatus(service(), {
      actor,
      applicationId: VALID_ID,
    });
    expect(res.status).toBe(200);
  });
});
