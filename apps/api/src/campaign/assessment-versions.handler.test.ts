import { describe, it, expect } from 'vitest';
import {
  handlePostAssessmentValidation,
  handlePostActivateVersion,
  handleGetVersionPreview,
  handlePostVersionDefect,
  handlePostDuplicateVersion,
  handlePostSuspendVersion,
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
    previewVersion: () =>
      Promise.resolve({
        ok: true as const,
        preview: {
          versionId: VALID_ID,
          itemCount: 1,
          durationSeconds: 3600,
          items: [{ id: 'i', prompt: 'p' }],
        },
      }),
    createDefect: () =>
      Promise.resolve({
        ok: true as const,
        defect: {
          id: 'd',
          assessmentVersionId: VALID_ID,
          severity: 'high' as const,
          summary: 's',
          createdAt: '',
        },
      }),
    duplicateVersion: () =>
      Promise.resolve({
        ok: true as const,
        version: {
          id: VALID_ID,
          assessmentId: 'a',
          versionNo: 2,
          status: 'draft' as const,
          durationSeconds: 3600,
          createdAt: '',
        },
      }),
    suspendVersion: () =>
      Promise.resolve({
        ok: true as const,
        version: {
          id: VALID_ID,
          assessmentId: 'a',
          versionNo: 1,
          status: 'suspended' as const,
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

describe('handleGetVersionPreview', () => {
  it('returns 200', async () => {
    const res = await handleGetVersionPreview(service(), { actor, versionId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleGetVersionPreview(service(), { actor, versionId: 'bad' });
    expect(res.status).toBe(422);
  });
});

describe('handlePostVersionDefect', () => {
  it('returns 201', async () => {
    const res = await handlePostVersionDefect(service(), {
      actor,
      versionId: VALID_ID,
      body: { severity: 'high', summary: 's' },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for bad body', async () => {
    const res = await handlePostVersionDefect(service(), { actor, versionId: VALID_ID, body: {} });
    expect(res.status).toBe(422);
  });
});

describe('handlePostDuplicateVersion', () => {
  it('returns 201', async () => {
    const res = await handlePostDuplicateVersion(service(), { actor, versionId: VALID_ID });
    expect(res.status).toBe(201);
  });
});

describe('handlePostSuspendVersion', () => {
  it('returns 200', async () => {
    const res = await handlePostSuspendVersion(service(), { actor, versionId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 404 when not found', async () => {
    const res = await handlePostSuspendVersion(
      service({
        suspendVersion: () => Promise.resolve({ ok: false, status: 404, reason: 'not found' }),
      }),
      { actor, versionId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
});
