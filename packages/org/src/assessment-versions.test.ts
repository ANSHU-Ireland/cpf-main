import { describe, it, expect } from 'vitest';
import {
  createAssessmentValidation,
  activateAssessmentVersion,
  parseValidationCreate,
  parseVersionId,
} from './assessment-versions.js';
import type {
  AssessmentValidationRepository,
  AssessmentVersionRepository,
} from './assessment-versions.js';
import type {
  AssessmentValidationRecord,
  AssessmentVersionRecord,
} from './assessment-version-types.js';
import type { Actor } from './types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const USER = '22222222-2222-2222-2222-222222222222';
const VER_ID = '33333333-3333-3333-3333-333333333333';

function makeActor(role: string): Actor {
  return { tenantId: TENANT, userId: USER, roles: [role] };
}
const admin = makeActor('employer_admin');
const noRole = makeActor('viewer');

const validation: AssessmentValidationRecord = {
  id: 'val-1',
  assessmentVersionId: VER_ID,
  validationType: 'fairness',
  status: 'passed',
  evidenceUri: null,
  summary: null,
  reviewerUserId: USER,
  reviewedAt: null,
  expiresAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const version: AssessmentVersionRecord = {
  id: VER_ID,
  assessmentId: 'asm-1',
  versionNo: 1,
  status: 'active',
  durationSeconds: 3600,
  createdAt: '2024-01-01T00:00:00.000Z',
};

function valRepo(
  overrides: Partial<AssessmentValidationRepository> = {},
): AssessmentValidationRepository {
  return { createValidation: () => Promise.resolve(validation), ...overrides };
}

function verRepo(
  overrides: Partial<AssessmentVersionRepository> = {},
): AssessmentVersionRepository {
  return { activateVersion: () => Promise.resolve(version), ...overrides };
}

describe('parseValidationCreate', () => {
  it('accepts valid', () => {
    expect(parseValidationCreate({ validationType: 'fairness', status: 'passed' }).ok).toBe(true);
  });
  it('rejects invalid type', () => {
    expect(parseValidationCreate({ validationType: 'bad', status: 'passed' }).ok).toBe(false);
  });
});

describe('parseVersionId', () => {
  it('accepts UUID', () => expect(parseVersionId(VER_ID)).not.toBeNull());
  it('rejects bad', () => expect(parseVersionId('bad')).toBeNull());
});

describe('createAssessmentValidation', () => {
  it('creates for admin', async () => {
    const r = await createAssessmentValidation({ repository: valRepo() }, admin, VER_ID, {
      validationType: 'fairness',
      status: 'passed',
    });
    expect(r.ok).toBe(true);
  });
  it('denies non-admin', async () => {
    const r = await createAssessmentValidation({ repository: valRepo() }, noRole, VER_ID, {
      validationType: 'fairness',
      status: 'passed',
    });
    expect(r.ok).toBe(false);
  });
});

describe('activateAssessmentVersion', () => {
  it('activates for admin', async () => {
    const r = await activateAssessmentVersion({ repository: verRepo() }, admin, VER_ID);
    expect(r.ok).toBe(true);
  });
  it('returns 404 when not found', async () => {
    const r = await activateAssessmentVersion(
      { repository: verRepo({ activateVersion: () => Promise.resolve(null) }) },
      admin,
      VER_ID,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});
