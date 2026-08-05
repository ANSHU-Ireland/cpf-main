import { describe, it, expect } from 'vitest';
import {
  listReviewAssignments,
  getReviewAssignment,
  createReviewAssignment,
  acceptReviewAssignment,
  stopReviewAssignmentAi,
  declineReviewAssignment,
  addReviewAssignmentAnnotation,
  addReviewAssignmentClarification,
  parseReviewAssignmentListQuery,
  parseReviewAssignmentCreate,
  parseAssignmentDecline,
  parseAssignmentAnnotation,
  parseAssignmentClarification,
  parseAssignmentId,
} from './review-assignments.js';
import type {
  ReviewAssignmentRepository,
  ReviewAssignmentListResult,
  AssignmentAnnotationRecord,
  AssignmentClarificationRecord,
} from './review-assignments.js';
import type { ReviewAssignmentCreate, ReviewAssignmentRecord } from './review-assignment-types.js';
import type { Actor } from './types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const USER = '22222222-2222-2222-2222-222222222222';
const SUB_ID = '33333333-3333-3333-3333-333333333333';

function makeActor(role: string): Actor {
  return { tenantId: TENANT, userId: USER, roles: [role] };
}
const admin = makeActor('employer_admin');
const noRole = makeActor('viewer');

function assignment(overrides: Partial<ReviewAssignmentRecord> = {}): ReviewAssignmentRecord {
  return {
    id: 'ra-1',
    tenantId: TENANT,
    submissionId: SUB_ID,
    reviewerProfileId: USER,
    assignmentType: 'primary',
    blindGroup: null,
    status: 'assigned',
    assignedAt: '2024-01-01T00:00:00.000Z',
    dueAt: null,
    submittedAt: null,
    ...overrides,
  };
}

function repo(overrides: Partial<ReviewAssignmentRepository> = {}): ReviewAssignmentRepository {
  const listResult: ReviewAssignmentListResult = {
    items: [assignment()],
    total: 1,
    hasMore: false,
  };
  return {
    listAssignments: () => Promise.resolve(listResult),
    getAssignment: () => Promise.resolve(assignment()),
    createAssignment: (_a: Actor, input: ReviewAssignmentCreate) =>
      Promise.resolve(assignment({ assignmentType: input.assignmentType })),
    acceptAssignment: () => Promise.resolve(assignment({ status: 'accepted' })),
    stopAssignmentAi: () => Promise.resolve(assignment({ status: 'in_progress' })),
    declineAssignment: () => Promise.resolve(assignment({ status: 'cancelled' })),
    addAnnotation: () => Promise.resolve(annotation),
    addClarification: () => Promise.resolve(clarification),
    ...overrides,
  };
}

const annotation: AssignmentAnnotationRecord = {
  id: 'an-1',
  assignmentId: 'ra-1',
  itemId: SUB_ID,
  body: 'note',
  createdAt: '2024-01-01T00:00:00.000Z',
};
const clarification: AssignmentClarificationRecord = {
  id: 'cl-1',
  assignmentId: 'ra-1',
  question: 'why?',
  status: 'open',
  createdAt: '2024-01-01T00:00:00.000Z',
};

describe('parseReviewAssignmentListQuery', () => {
  it('defaults', () => expect(parseReviewAssignmentListQuery({}).ok).toBe(true));
  it('rejects bad', () => expect(parseReviewAssignmentListQuery({ limit: 0 }).ok).toBe(false));
});

describe('parseReviewAssignmentCreate', () => {
  it('accepts valid', () => {
    expect(
      parseReviewAssignmentCreate({
        submissionId: SUB_ID,
        reviewerProfileId: USER,
        assignmentType: 'primary',
      }).ok,
    ).toBe(true);
  });
  it('rejects bad type', () => {
    expect(
      parseReviewAssignmentCreate({
        submissionId: SUB_ID,
        reviewerProfileId: USER,
        assignmentType: 'nope',
      }).ok,
    ).toBe(false);
  });
});

describe('parseAssignmentId', () => {
  it('accepts UUID', () => expect(parseAssignmentId(USER)).not.toBeNull());
  it('rejects bad', () => expect(parseAssignmentId('x')).toBeNull());
});

describe('listReviewAssignments', () => {
  it('returns page', async () => {
    const r = await listReviewAssignments({ repository: repo() }, admin, {
      limit: 25,
      cursor: null,
    });
    expect(r.ok).toBe(true);
  });
  it('denies non-admin', async () => {
    const r = await listReviewAssignments({ repository: repo() }, noRole, {
      limit: 25,
      cursor: null,
    });
    expect(r.ok).toBe(false);
  });
});

describe('getReviewAssignment', () => {
  it('returns assignment', async () => {
    const r = await getReviewAssignment({ repository: repo() }, admin, 'ra-1');
    expect(r.ok).toBe(true);
  });
  it('returns 404', async () => {
    const r = await getReviewAssignment(
      { repository: repo({ getAssignment: () => Promise.resolve(null) }) },
      admin,
      'x',
    );
    expect(r.ok).toBe(false);
  });
});

describe('createReviewAssignment', () => {
  it('creates', async () => {
    const r = await createReviewAssignment({ repository: repo() }, admin, {
      submissionId: SUB_ID,
      reviewerProfileId: USER,
      assignmentType: 'primary',
    });
    expect(r.ok).toBe(true);
  });
  it('409 on dup', async () => {
    const r = await createReviewAssignment(
      {
        repository: repo({
          createAssignment: () => {
            const e = new Error() as Error & { code: string };
            e.code = '23505';
            return Promise.reject(e);
          },
        }),
      },
      admin,
      { submissionId: SUB_ID, reviewerProfileId: USER, assignmentType: 'primary' },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });
});

describe('acceptReviewAssignment', () => {
  it('accepts', async () => {
    const r = await acceptReviewAssignment({ repository: repo() }, admin, 'ra-1');
    expect(r.ok).toBe(true);
  });
  it('404', async () => {
    const r = await acceptReviewAssignment(
      { repository: repo({ acceptAssignment: () => Promise.resolve(null) }) },
      admin,
      'x',
    );
    expect(r.ok).toBe(false);
  });
});

describe('parseAssignmentDecline / Annotation / Clarification', () => {
  it('decline', () => {
    expect(parseAssignmentDecline({ reason: 'busy' }).ok).toBe(true);
    expect(parseAssignmentDecline({}).ok).toBe(false);
  });
  it('annotation', () => {
    expect(parseAssignmentAnnotation({ itemId: SUB_ID, body: 'x' }).ok).toBe(true);
    expect(parseAssignmentAnnotation({ itemId: 'bad', body: 'x' }).ok).toBe(false);
  });
  it('clarification', () => {
    expect(parseAssignmentClarification({ question: 'q' }).ok).toBe(true);
    expect(parseAssignmentClarification({}).ok).toBe(false);
  });
});

describe('stopReviewAssignmentAi', () => {
  it('stops', async () =>
    expect((await stopReviewAssignmentAi({ repository: repo() }, admin, 'ra-1')).ok).toBe(true));
  it('denies a viewer', async () => {
    const r = await stopReviewAssignmentAi({ repository: repo() }, noRole, 'ra-1');
    expect(r.ok === false && r.status).toBe(403);
  });
  it('404', async () => {
    const r = await stopReviewAssignmentAi(
      { repository: repo({ stopAssignmentAi: () => Promise.resolve(null) }) },
      admin,
      'x',
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('declineReviewAssignment', () => {
  it('declines', async () =>
    expect(
      (await declineReviewAssignment({ repository: repo() }, admin, 'ra-1', { reason: 'busy' })).ok,
    ).toBe(true));
  it('404', async () => {
    const r = await declineReviewAssignment(
      { repository: repo({ declineAssignment: () => Promise.resolve(null) }) },
      admin,
      'x',
      { reason: 'busy' },
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('addReviewAssignmentAnnotation', () => {
  it('adds', async () =>
    expect(
      (
        await addReviewAssignmentAnnotation({ repository: repo() }, admin, 'ra-1', {
          itemId: SUB_ID,
          body: 'x',
        })
      ).ok,
    ).toBe(true));
  it('404', async () => {
    const r = await addReviewAssignmentAnnotation(
      { repository: repo({ addAnnotation: () => Promise.resolve(null) }) },
      admin,
      'x',
      { itemId: SUB_ID, body: 'x' },
    );
    expect(r.ok === false && r.status).toBe(404);
  });
});

describe('addReviewAssignmentClarification', () => {
  it('adds', async () =>
    expect(
      (
        await addReviewAssignmentClarification({ repository: repo() }, admin, 'ra-1', {
          question: 'q',
        })
      ).ok,
    ).toBe(true));
  it('denies a viewer', async () => {
    const r = await addReviewAssignmentClarification({ repository: repo() }, noRole, 'ra-1', {
      question: 'q',
    });
    expect(r.ok === false && r.status).toBe(403);
  });
});
