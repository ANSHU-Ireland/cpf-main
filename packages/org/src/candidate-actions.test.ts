import { describe, it, expect } from 'vitest';
import {
  createCandidateComplaint,
  createProfileCorrection,
  requestExplanation,
  requestHumanReview,
  requestWithdrawal,
  parseCandidateComplaintCreate,
  parseProfileCorrectionCreate,
  parseApplicationActionInput,
  parseCandidateApplicationId,
} from './candidate-actions.js';
import type {
  CandidateActionRepository,
  CandidateComplaintRecord,
  ProfileCorrectionRecord,
  ApplicationRequestRecord,
} from './candidate-actions.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const complaint: CandidateComplaintRecord = {
  id: 'c1',
  subject: 's',
  status: 'open',
  createdAt: '',
};
const correction: ProfileCorrectionRecord = {
  id: 'p1',
  field: 'email',
  status: 'pending',
  createdAt: '',
};
const request: ApplicationRequestRecord = {
  id: 'r1',
  applicationId: T,
  kind: 'explanation',
  status: 'pending',
  createdAt: '',
};

function repo(ov: Partial<CandidateActionRepository> = {}): CandidateActionRepository {
  return {
    createComplaint: () => Promise.resolve(complaint),
    createProfileCorrection: () => Promise.resolve(correction),
    requestExplanation: () => Promise.resolve(request),
    requestHumanReview: () => Promise.resolve(request),
    requestWithdrawal: () => Promise.resolve(request),
    ...ov,
  };
}

describe('parsers', () => {
  it('complaint valid', () =>
    expect(parseCandidateComplaintCreate({ subject: 's', detail: 'd' }).ok).toBe(true));
  it('complaint invalid', () => expect(parseCandidateComplaintCreate({}).ok).toBe(false));
  it('correction valid', () =>
    expect(parseProfileCorrectionCreate({ field: 'f', requestedValue: 'v' }).ok).toBe(true));
  it('correction invalid', () => expect(parseProfileCorrectionCreate({}).ok).toBe(false));
  it('action valid', () => expect(parseApplicationActionInput({ reason: 'r' }).ok).toBe(true));
  it('action invalid', () => expect(parseApplicationActionInput({}).ok).toBe(false));
  it('appId uuid', () => expect(parseCandidateApplicationId(T)).not.toBeNull());
  it('appId bad', () => expect(parseCandidateApplicationId('x')).toBeNull());
});
describe('createComplaint', () => {
  it('ok', async () =>
    expect(
      (await createCandidateComplaint({ repository: repo() }, admin, { subject: 's', detail: 'd' }))
        .ok,
    ).toBe(true));
  it('403', async () =>
    expect(
      (
        await createCandidateComplaint({ repository: repo() }, noRole, {
          subject: 's',
          detail: 'd',
        })
      ).ok,
    ).toBe(false));
});
describe('createProfileCorrection', () => {
  it('ok', async () =>
    expect(
      (
        await createProfileCorrection({ repository: repo() }, admin, {
          field: 'f',
          requestedValue: 'v',
        })
      ).ok,
    ).toBe(true));
  it('403', async () =>
    expect(
      (
        await createProfileCorrection({ repository: repo() }, noRole, {
          field: 'f',
          requestedValue: 'v',
        })
      ).ok,
    ).toBe(false));
});
describe('requestExplanation', () => {
  it('ok', async () =>
    expect((await requestExplanation({ repository: repo() }, admin, T, { reason: 'r' })).ok).toBe(
      true,
    ));
  it('404', async () =>
    expect(
      (
        await requestExplanation(
          { repository: repo({ requestExplanation: () => Promise.resolve(null) }) },
          admin,
          T,
          { reason: 'r' },
        )
      ).ok,
    ).toBe(false));
});
describe('requestHumanReview', () => {
  it('ok', async () =>
    expect((await requestHumanReview({ repository: repo() }, admin, T, { reason: 'r' })).ok).toBe(
      true,
    ));
  it('403', async () =>
    expect((await requestHumanReview({ repository: repo() }, noRole, T, { reason: 'r' })).ok).toBe(
      false,
    ));
});
describe('requestWithdrawal', () => {
  it('ok', async () =>
    expect((await requestWithdrawal({ repository: repo() }, admin, T, { reason: 'r' })).ok).toBe(
      true,
    ));
  it('404', async () =>
    expect(
      (
        await requestWithdrawal(
          { repository: repo({ requestWithdrawal: () => Promise.resolve(null) }) },
          admin,
          T,
          { reason: 'r' },
        )
      ).ok,
    ).toBe(false));
});
