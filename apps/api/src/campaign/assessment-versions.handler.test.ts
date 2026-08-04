import { describe, it, expect } from 'vitest';
import {
  handlePostAssessmentValidation,
  handlePostActivateVersion,
  type AssessmentVersionService,
} from './assessment-versions.handler.js';
import type { Actor } from '@cpf/org';

const VALID_ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: VALID_ID, userId: VALID_ID, roles: ['employer_admin'] };

function service(overrides: Partial<AssessmentVersionService> = {}): AssessmentVersionService {
  return {
    createValidation: () =>
      Promise.resolve({
        ok: true as const,
        validation: {
          id: 'v',
          assessmentVersionId: VALID_ID,
          validationType: 'fairness' as const,
          status: 'passed' as const,
          evidenceUri: null,
          summary: null,
          reviewerUserId: null,
          reviewedAt: null,
          expiresAt: null,
          createdAt: '',
        },
      }),
    activateVersion: () =>
      Promise.resolve({
        ok: true as const,
        version: {
          id: VALID_ID,
          assessmentId: 'a',
          versionNo: 1,
          status: 'active' as const,
          durationSeconds: 3600,
          createdAt: '',
        },
      }),
    ...overrides,
  };
}

describe('handlePostAssessmentValidation', () => {
  it('returns 201', async () => {
    const res = await handlePostAssessmentValidation(service(), {
      actor,
      versionId: VALID_ID,
      body: { validationType: 'fairness', status: 'passed' },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for bad id', async () => {
    const res = await handlePostAssessmentValidation(service(), {
      actor,
      versionId: 'bad',
      body: { validationType: 'fairness', status: 'passed' },
    });
    expect(res.status).toBe(422);
  });
  it('returns 422 for bad body', async () => {
    const res = await handlePostAssessmentValidation(service(), {
      actor,
      versionId: VALID_ID,
      body: {},
    });
    expect(res.status).toBe(422);
  });
});

describe('handlePostActivateVersion', () => {
  it('returns 200', async () => {
    const res = await handlePostActivateVersion(service(), { actor, versionId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 404 when not found', async () => {
    const res = await handlePostActivateVersion(
      service({
        activateVersion: () => Promise.resolve({ ok: false, status: 404, reason: 'not found' }),
      }),
      { actor, versionId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
});
