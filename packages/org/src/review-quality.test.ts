import { describe, it, expect } from 'vitest';
import {
  createScorecardAmendment,
  setObservationDisposition,
  resolveIntegrityEvent,
  parseScorecardAmendmentCreate,
  parseObservationDisposition,
  parseIntegrityResolution,
  parseReviewQualityId,
  listReviewObservations,
} from './review-quality.js';
import type {
  ReviewQualityRepository,
  ScorecardAmendmentRecord,
  ObservationRecord,
  IntegrityEventRecord,
} from './review-quality.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const amendment: ScorecardAmendmentRecord = {
  id: 'a1',
  scorecardId: 's1',
  rationale: 'r',
  createdAt: '',
};
const observation: ObservationRecord = {
  id: 'o1',
  disposition: 'useful',
  note: null,
  updatedAt: '',
};
const event: IntegrityEventRecord = {
  id: 'e1',
  resolution: 'explained',
  note: null,
  resolvedAt: '',
};

function repo(ov: Partial<ReviewQualityRepository> = {}): ReviewQualityRepository {
  return {
    listObservations: () =>
      Promise.resolve({ items: [], total: 0, independentScoringComplete: true }),
    createAmendment: () => Promise.resolve(amendment),
    setObservationDisposition: () => Promise.resolve(observation),
    resolveIntegrityEvent: () => Promise.resolve(event),
    ...ov,
  };
}

describe('parsers', () => {
  it('amendment valid', () =>
    expect(parseScorecardAmendmentCreate({ rationale: 'r', changes: 'c' }).ok).toBe(true));
  it('amendment invalid', () => expect(parseScorecardAmendmentCreate({}).ok).toBe(false));
  it('disposition valid', () =>
    expect(parseObservationDisposition({ disposition: 'useful' }).ok).toBe(true));
  it('disposition invalid', () =>
    expect(parseObservationDisposition({ disposition: 'x' }).ok).toBe(false));
  it('resolution valid', () =>
    expect(parseIntegrityResolution({ resolution: 'explained', note: 'n' }).ok).toBe(true));
  it('resolution invalid', () => expect(parseIntegrityResolution({}).ok).toBe(false));
  it('id uuid', () => expect(parseReviewQualityId(T)).not.toBeNull());
  it('id bad', () => expect(parseReviewQualityId('x')).toBeNull());
});
describe('createScorecardAmendment', () => {
  it('ok', async () =>
    expect(
      (
        await createScorecardAmendment({ repository: repo() }, admin, 's1', {
          rationale: 'r',
          changes: 'c',
        })
      ).ok,
    ).toBe(true));
  it('403', async () =>
    expect(
      (
        await createScorecardAmendment({ repository: repo() }, noRole, 's1', {
          rationale: 'r',
          changes: 'c',
        })
      ).ok,
    ).toBe(false));
  it('404', async () =>
    expect(
      (
        await createScorecardAmendment(
          { repository: repo({ createAmendment: () => Promise.resolve(null) }) },
          admin,
          'x',
          { rationale: 'r', changes: 'c' },
        )
      ).ok,
    ).toBe(false));
});
describe('listReviewObservations', () => {
  it('returns the repository page to an authorised reviewer', async () => {
    const result = await listReviewObservations({ repository: repo() }, admin, T);
    expect(result).toMatchObject({
      ok: true,
      page: { independentScoringComplete: true, total: 0 },
    });
  });
  it('denies actors without review access', async () => {
    const result = await listReviewObservations({ repository: repo() }, noRole, T);
    expect(result.ok).toBe(false);
  });
});
describe('setObservationDisposition', () => {
  it('ok', async () =>
    expect(
      (
        await setObservationDisposition({ repository: repo() }, admin, 'o1', {
          disposition: 'useful',
        })
      ).ok,
    ).toBe(true));
  it('404', async () =>
    expect(
      (
        await setObservationDisposition(
          { repository: repo({ setObservationDisposition: () => Promise.resolve(null) }) },
          admin,
          'x',
          { disposition: 'useful' },
        )
      ).ok,
    ).toBe(false));
});
describe('resolveIntegrityEvent', () => {
  it('ok', async () =>
    expect(
      (
        await resolveIntegrityEvent({ repository: repo() }, admin, 'e1', {
          resolution: 'explained',
        })
      ).ok,
    ).toBe(true));
  it('403', async () =>
    expect(
      (
        await resolveIntegrityEvent({ repository: repo() }, noRole, 'e1', {
          resolution: 'explained',
        })
      ).ok,
    ).toBe(false));
});
