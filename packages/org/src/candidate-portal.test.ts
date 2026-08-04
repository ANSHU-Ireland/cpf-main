import { describe, it, expect } from 'vitest';
import { getCandidateProfile, getCandidateInvitation } from './candidate-portal.js';
import type {
  CandidatePortalRepository,
  CandidateProfileData,
  CandidateInvitationData,
} from './candidate-portal.js';
import type { Actor } from './types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const USER = '22222222-2222-2222-2222-222222222222';

function makeActor(role: string): Actor {
  return { tenantId: TENANT, userId: USER, roles: [role] };
}
const admin = makeActor('employer_admin');
const noRole = makeActor('viewer');

const profile: CandidateProfileData = {
  candidateId: 'c1',
  email: 'a@b.com',
  displayName: 'A',
  applications: [],
};
const invitation: CandidateInvitationData = {
  invitationId: 'i1',
  campaignTitle: 'C',
  expiresAt: '2025-01-01T00:00:00.000Z',
  status: 'pending',
};

function repo(overrides: Partial<CandidatePortalRepository> = {}): CandidatePortalRepository {
  return {
    getProfile: () => Promise.resolve(profile),
    getInvitation: () => Promise.resolve(invitation),
    ...overrides,
  };
}

describe('getCandidateProfile', () => {
  it('returns profile', async () => {
    const r = await getCandidateProfile({ repository: repo() }, admin);
    expect(r.ok).toBe(true);
  });
  it('returns 404', async () => {
    const r = await getCandidateProfile(
      { repository: repo({ getProfile: () => Promise.resolve(null) }) },
      admin,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
  it('denies non-admin', async () => {
    const r = await getCandidateProfile({ repository: repo() }, noRole);
    expect(r.ok).toBe(false);
  });
});

describe('getCandidateInvitation', () => {
  it('returns invitation', async () => {
    const r = await getCandidateInvitation({ repository: repo() }, admin);
    expect(r.ok).toBe(true);
  });
  it('returns 404', async () => {
    const r = await getCandidateInvitation(
      { repository: repo({ getInvitation: () => Promise.resolve(null) }) },
      admin,
    );
    expect(r.ok).toBe(false);
  });
});
