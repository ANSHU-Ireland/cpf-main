import { describe, it, expect } from 'vitest';
import {
  getScorecard,
  updateScorecard,
  parseScorecardAssignmentId,
  parseScorecardUpdate,
} from './scorecards.js';
import type { ScorecardRepository } from './scorecards.js';
import type { ScorecardRecord } from './scorecard-types.js';
import type { Actor } from './types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const USER = '22222222-2222-2222-2222-222222222222';

function makeActor(role: string): Actor {
  return { tenantId: TENANT, userId: USER, roles: [role] };
}
const admin = makeActor('employer_admin');
const noRole = makeActor('viewer');

const sc: ScorecardRecord = {
  id: 'sc-1',
  tenantId: TENANT,
  assignmentId: 'ra-1',
  rubricVersionId: 'rv-1',
  status: 'draft',
  overallConfidence: null,
  summary: null,
  submittedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

function repo(overrides: Partial<ScorecardRepository> = {}): ScorecardRepository {
  return {
    getScorecard: () => Promise.resolve(sc),
    updateScorecard: () => Promise.resolve(sc),
    ...overrides,
  };
}

describe('parseScorecardAssignmentId', () => {
  it('accepts UUID', () => expect(parseScorecardAssignmentId(USER)).not.toBeNull());
  it('rejects bad', () => expect(parseScorecardAssignmentId('x')).toBeNull());
});

describe('parseScorecardUpdate', () => {
  it('accepts summary', () => expect(parseScorecardUpdate({ summary: 'x' }).ok).toBe(true));
  it('rejects empty', () => expect(parseScorecardUpdate({}).ok).toBe(false));
  it('rejects bad status', () => expect(parseScorecardUpdate({ status: 'bad' }).ok).toBe(false));
  it('accepts an evidence-linked criterion draft', () =>
    expect(
      parseScorecardUpdate({
        criterion: {
          criterionId: TENANT,
          humanScore: 3,
          confidence: 0.8,
          insufficientEvidence: false,
          evidenceLinks: [{ responseId: USER, locator: 'paragraph 2' }],
          reviewerComment: 'The cited passage supports this score.',
        },
      }).ok,
    ).toBe(true));
  it('rejects an out-of-range criterion score', () =>
    expect(
      parseScorecardUpdate({
        criterion: {
          criterionId: TENANT,
          humanScore: 5,
          insufficientEvidence: false,
          evidenceLinks: [],
          reviewerComment: 'Invalid score.',
        },
      }).ok,
    ).toBe(false));
});

describe('getScorecard', () => {
  it('returns scorecard', async () => {
    const r = await getScorecard({ repository: repo() }, admin, 'ra-1');
    expect(r.ok).toBe(true);
  });
  it('returns 404', async () => {
    const r = await getScorecard(
      { repository: repo({ getScorecard: () => Promise.resolve(null) }) },
      admin,
      'x',
    );
    expect(r.ok).toBe(false);
  });
  it('denies non-admin', async () => {
    const r = await getScorecard({ repository: repo() }, noRole, 'ra-1');
    expect(r.ok).toBe(false);
  });
});

describe('updateScorecard', () => {
  it('updates', async () => {
    const r = await updateScorecard({ repository: repo() }, admin, 'ra-1', { summary: 'new' });
    expect(r.ok).toBe(true);
  });
  it('returns 404', async () => {
    const r = await updateScorecard(
      { repository: repo({ updateScorecard: () => Promise.resolve(null) }) },
      admin,
      'x',
      { summary: 'y' },
    );
    expect(r.ok).toBe(false);
  });
});
