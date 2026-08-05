import { describe, it, expect } from 'vitest';
import {
  handleGetReviewAssignments,
  handleGetReviewAssignment,
  handlePostReviewAssignment,
  handlePostAcceptAssignment,
  handlePostStopAssignmentAi,
  handlePostDeclineAssignment,
  handlePostAssignmentAnnotation,
  handlePostAssignmentClarification,
  type ReviewAssignmentService,
} from './review-assignments.handler.js';
import type { Actor } from '@cpf/org';

const VALID_ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: VALID_ID, userId: VALID_ID, roles: ['employer_admin'] };

const dto = {
  id: VALID_ID,
  tenantId: VALID_ID,
  submissionId: VALID_ID,
  reviewerProfileId: VALID_ID,
  assignmentType: 'primary' as const,
  blindGroup: null,
  status: 'assigned' as const,
  assignedAt: '',
  dueAt: null,
  submittedAt: null,
};
const page = { items: [dto], nextCursor: null, total: 1 };

function service(overrides: Partial<ReviewAssignmentService> = {}): ReviewAssignmentService {
  return {
    listAssignments: () => Promise.resolve({ ok: true as const, page }),
    getAssignment: () => Promise.resolve({ ok: true as const, assignment: dto }),
    createAssignment: () => Promise.resolve({ ok: true as const, assignment: dto }),
    acceptAssignment: () =>
      Promise.resolve({ ok: true as const, assignment: { ...dto, status: 'accepted' as const } }),
    stopAi: () => Promise.resolve({ ok: true as const, assignment: dto }),
    decline: () =>
      Promise.resolve({ ok: true as const, assignment: { ...dto, status: 'cancelled' as const } }),
    addAnnotation: () =>
      Promise.resolve({
        ok: true as const,
        annotation: {
          id: 'an',
          assignmentId: VALID_ID,
          itemId: VALID_ID,
          body: 'b',
          createdAt: '',
        },
      }),
    addClarification: () =>
      Promise.resolve({
        ok: true as const,
        clarification: {
          id: 'cl',
          assignmentId: VALID_ID,
          question: 'q',
          status: 'open',
          createdAt: '',
        },
      }),
    ...overrides,
  };
}

describe('handleGetReviewAssignments', () => {
  it('returns 200', async () => {
    const res = await handleGetReviewAssignments(service(), { actor, query: {} });
    expect(res.status).toBe(200);
  });
});

describe('handleGetReviewAssignment', () => {
  it('returns 200', async () => {
    const res = await handleGetReviewAssignment(service(), { actor, assignmentId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422', async () => {
    const res = await handleGetReviewAssignment(service(), { actor, assignmentId: 'bad' });
    expect(res.status).toBe(422);
  });
});

describe('handlePostReviewAssignment', () => {
  it('returns 201', async () => {
    const res = await handlePostReviewAssignment(service(), {
      actor,
      body: { submissionId: VALID_ID, reviewerProfileId: VALID_ID, assignmentType: 'primary' },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422', async () => {
    const res = await handlePostReviewAssignment(service(), { actor, body: {} });
    expect(res.status).toBe(422);
  });
});

describe('handlePostAcceptAssignment', () => {
  it('returns 200', async () => {
    const res = await handlePostAcceptAssignment(service(), { actor, assignmentId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 404', async () => {
    const res = await handlePostAcceptAssignment(
      service({
        acceptAssignment: () => Promise.resolve({ ok: false, status: 404, reason: 'not found' }),
      }),
      { actor, assignmentId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
});

describe('handlePostStopAssignmentAi', () => {
  it('returns 200', async () => {
    const res = await handlePostStopAssignmentAi(service(), { actor, assignmentId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handlePostStopAssignmentAi(service(), { actor, assignmentId: 'bad' });
    expect(res.status).toBe(422);
  });
});

describe('handlePostDeclineAssignment', () => {
  it('returns 200', async () => {
    const res = await handlePostDeclineAssignment(service(), {
      actor,
      assignmentId: VALID_ID,
      body: { reason: 'x' },
    });
    expect(res.status).toBe(200);
  });
});

describe('handlePostAssignmentAnnotation', () => {
  it('returns 201', async () => {
    const res = await handlePostAssignmentAnnotation(service(), {
      actor,
      assignmentId: VALID_ID,
      body: { itemId: VALID_ID, body: 'b' },
    });
    expect(res.status).toBe(201);
  });
});

describe('handlePostAssignmentClarification', () => {
  it('returns 201', async () => {
    const res = await handlePostAssignmentClarification(service(), {
      actor,
      assignmentId: VALID_ID,
      body: { question: 'q' },
    });
    expect(res.status).toBe(201);
  });
});
