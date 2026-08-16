import { describe, it, expect } from 'vitest';
import {
  handleGetAiModels,
  handleGetAiModel,
  handlePostAiModel,
  handlePostActivateAiModel,
  handlePostSuspendAiModel,
  type AiModelService,
} from './ai-models.handler.js';
import type { Actor } from '@cpf/org';

const VALID_ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: VALID_ID, userId: VALID_ID, roles: ['employer_admin'] };

const modelDto = {
  id: VALID_ID,
  provider: 'x',
  modelKey: 'k',
  displayName: 'd',
  modelVersion: 'v',
  intendedPurpose: 'p',
  limitations: 'l',
  dataRegion: null,
  status: 'draft' as const,
  evaluationSummary: {},
  approvedBy: null,
  approvedAt: null,
  createdAt: '',
};
const page = { items: [modelDto], nextCursor: null, total: 1 };

function service(overrides: Partial<AiModelService> = {}): AiModelService {
  return {
    listModels: () => Promise.resolve({ ok: true as const, page }),
    getModel: () => Promise.resolve({ ok: true as const, model: modelDto }),
    createModel: () => Promise.resolve({ ok: true as const, model: modelDto }),
    recordEvaluation: () =>
      Promise.resolve({
        ok: true as const,
        model: { ...modelDto, status: 'evaluating' as const },
      }),
    activateModel: () =>
      Promise.resolve({ ok: true as const, model: { ...modelDto, status: 'active' as const } }),
    suspendModel: () =>
      Promise.resolve({ ok: true as const, model: { ...modelDto, status: 'suspended' as const } }),
    ...overrides,
  };
}

describe('handleGetAiModels', () => {
  it('returns 200', async () => {
    const res = await handleGetAiModels(service(), { actor, query: {} });
    expect(res.status).toBe(200);
  });
});

describe('handleGetAiModel', () => {
  it('returns 200', async () => {
    const res = await handleGetAiModel(service(), { actor, modelId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 422 for bad id', async () => {
    const res = await handleGetAiModel(service(), { actor, modelId: 'bad' });
    expect(res.status).toBe(422);
  });
});

describe('handlePostAiModel', () => {
  it('returns 201', async () => {
    const res = await handlePostAiModel(service(), {
      actor,
      body: {
        provider: 'x',
        modelKey: 'k',
        displayName: 'd',
        modelVersion: 'v',
        intendedPurpose: 'p',
        limitations: 'l',
      },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for bad body', async () => {
    const res = await handlePostAiModel(service(), { actor, body: {} });
    expect(res.status).toBe(422);
  });
});

describe('handlePostActivateAiModel', () => {
  it('returns 200', async () => {
    const res = await handlePostActivateAiModel(service(), { actor, modelId: VALID_ID });
    expect(res.status).toBe(200);
  });
  it('returns 404', async () => {
    const res = await handlePostActivateAiModel(
      service({
        activateModel: () => Promise.resolve({ ok: false, status: 404, reason: 'not found' }),
      }),
      { actor, modelId: VALID_ID },
    );
    expect(res.status).toBe(404);
  });
});

describe('handlePostSuspendAiModel', () => {
  it('returns 200', async () => {
    const res = await handlePostSuspendAiModel(service(), { actor, modelId: VALID_ID });
    expect(res.status).toBe(200);
  });
});
