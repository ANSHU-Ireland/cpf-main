import { describe, it, expect } from 'vitest';
import {
  createAssessmentValidation,
  activateAssessmentVersion,
  previewAssessmentVersion,
  createAssessmentDefect,
  duplicateAssessmentVersion,
  suspendAssessmentVersion,
  parseValidationCreate,
  parseAssessmentDefectCreate,
  parseVersionId,
} from './assessment-versions.js';
import type {
  AssessmentValidationRepository,
  AssessmentVersionRepository,
  AssessmentVersionPreview,
  AssessmentDefectRecord,
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

const preview: AssessmentVersionPreview = {
  versionId: VER_ID,
  itemCount: 2,
  durationSeconds: 3600,
  items: [{ id: 'q1', prompt: 'p' }],
};

const defect: AssessmentDefectRecord = {
  id: 'd1',
  assessmentVersionId: VER_ID,
  severity: 'high',
  summary: 'broken',
  createdAt: '2024-01-01T00:00:00.000Z',
};

function verRepo(
  overrides: Partial<AssessmentVersionRepository> = {},
): AssessmentVersionRepository {
  return {
    createVersionForAssessment: () =>
      Promise.resolve({ ...version, id: 'new-ver', status: 'draft' }),
    activateVersion: () => Promise.resolve(version),
    previewVersion: () => Promise.resolve(preview),
    duplicateVersion: () => Promise.resolve({ ...version, id: 'new-ver', status: 'draft' }),
    suspendVersion: () => Promise.resolve({ ...version, status: 'suspended' }),
    createDefect: () => Promise.resolve(defect),
    ...overrides,
  };
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

describe('parseAssessmentDefectCreate', () => {
  it('accepts valid', () =>
    expect(parseAssessmentDefectCreate({ severity: 'high', summary: 'x' }).ok).toBe(true));
  it('rejects a bad severity', () =>
    expect(parseAssessmentDefectCreate({ severity: 'nope', summary: 'x' }).ok).toBe(false));
});

describe('previewAssessmentVersion', () => {
  it('previews for admin', async () =>
    expect((await previewAssessmentVersion({ repository: verRepo() }, admin, VER_ID)).ok).toBe(
      true,
    ));
  it('denies a viewer', async () => {
    const r = await previewAssessmentVersion({ repository: verRepo() }, noRole, VER_ID);
    expect(r.ok === false && r.status).toBe(403);
  });
  it('404 when missing', async () => {
    const r = await previewAssessmentVersion(
      { repository: verRepo({ previewVersion: () => Promise.resolve(null) }) },
      admin,
      VER_ID,
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('createAssessmentDefect', () => {
  it('creates for admin', async () =>
    expect(
      (
        await createAssessmentDefect({ repository: verRepo() }, admin, VER_ID, {
          severity: 'high',
          summary: 'x',
        })
      ).ok,
    ).toBe(true));
  it('404 when missing', async () => {
    const r = await createAssessmentDefect(
      { repository: verRepo({ createDefect: () => Promise.resolve(null) }) },
      admin,
      VER_ID,
      { severity: 'high', summary: 'x' },
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('duplicateAssessmentVersion', () => {
  it('duplicates for admin', async () =>
    expect((await duplicateAssessmentVersion({ repository: verRepo() }, admin, VER_ID)).ok).toBe(
      true,
    ));
  it('denies a viewer', async () => {
    const r = await duplicateAssessmentVersion({ repository: verRepo() }, noRole, VER_ID);
    expect(r.ok === false && r.status).toBe(403);
  });
});

describe('suspendAssessmentVersion', () => {
  it('suspends for admin', async () =>
    expect((await suspendAssessmentVersion({ repository: verRepo() }, admin, VER_ID)).ok).toBe(
      true,
    ));
  it('404 when missing', async () => {
    const r = await suspendAssessmentVersion(
      { repository: verRepo({ suspendVersion: () => Promise.resolve(null) }) },
      admin,
      VER_ID,
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});
