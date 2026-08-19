import { describe, it, expect } from 'vitest';
import {
  listAiModels,
  getAiModel,
  createAiModel,
  activateAiModel,
  suspendAiModel,
  parseAiModelListQuery,
  parseAiModelCreate,
  parseAiModelId,
} from './ai-models.js';
import type { AiModelRepository, AiModelListResult } from './ai-models.js';
import type { AiModelCreate, AiModelRecord } from './ai-model-types.js';
import type { Actor } from './types.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const USER = '22222222-2222-2222-2222-222222222222';

function makeActor(role: string): Actor {
  return { tenantId: TENANT, userId: USER, roles: [role] };
}
const admin = makeActor('employer_admin');
const noRole = makeActor('viewer');

function model(overrides: Partial<AiModelRecord> = {}): AiModelRecord {
  return {
    id: 'mdl-1',
    provider: 'openai',
    modelKey: 'gpt-4o',
    displayName: 'GPT-4o',
    modelVersion: '2024-08',
    intendedPurpose: 'scoring',
    limitations: 'none',
    dataRegion: null,
    status: 'draft',
    evaluationSummary: {},
    approvedBy: null,
    approvedAt: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function repo(overrides: Partial<AiModelRepository> = {}): AiModelRepository {
  const listResult: AiModelListResult = { items: [model()], total: 1, hasMore: false };
  return {
    listModels: () => Promise.resolve(listResult),
    getModel: () => Promise.resolve(model()),
    createModel: (_a: Actor, input: AiModelCreate) =>
      Promise.resolve(model({ modelKey: input.modelKey })),
    recordEvaluation: () =>
      Promise.resolve(model({ evaluationSummary: { outcome: 'passed' }, status: 'evaluating' })),
    activateModel: () => Promise.resolve(model({ status: 'active' })),
    suspendModel: () => Promise.resolve(model({ status: 'suspended' })),
    ...overrides,
  };
}

describe('parseAiModelListQuery', () => {
  it('defaults', () => {
    const r = parseAiModelListQuery({});
    expect(r.ok).toBe(true);
  });
  it('rejects bad limit', () => expect(parseAiModelListQuery({ limit: -1 }).ok).toBe(false));
});

describe('parseAiModelCreate', () => {
  it('accepts valid', () => {
    expect(
      parseAiModelCreate({
        provider: 'x',
        modelKey: 'k',
        displayName: 'd',
        modelVersion: 'v',
        intendedPurpose: 'p',
        limitations: 'l',
      }).ok,
    ).toBe(true);
  });
  it('rejects empty', () => expect(parseAiModelCreate({}).ok).toBe(false));
});

describe('parseAiModelId', () => {
  it('accepts UUID', () => expect(parseAiModelId(USER)).not.toBeNull());
  it('rejects bad', () => expect(parseAiModelId('x')).toBeNull());
});

describe('listAiModels', () => {
  it('returns page', async () => {
    const r = await listAiModels({ repository: repo() }, admin, { limit: 25, cursor: null });
    expect(r.ok).toBe(true);
  });
  it('denies non-admin', async () => {
    const r = await listAiModels({ repository: repo() }, noRole, { limit: 25, cursor: null });
    expect(r.ok).toBe(false);
  });
});

describe('getAiModel', () => {
  it('returns model', async () => {
    const r = await getAiModel({ repository: repo() }, admin, 'mdl-1');
    expect(r.ok).toBe(true);
  });
  it('returns 404', async () => {
    const r = await getAiModel(
      { repository: repo({ getModel: () => Promise.resolve(null) }) },
      admin,
      'x',
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(404);
  });
});

describe('createAiModel', () => {
  it('creates', async () => {
    const r = await createAiModel({ repository: repo() }, admin, {
      provider: 'x',
      modelKey: 'k',
      displayName: 'd',
      modelVersion: 'v',
      intendedPurpose: 'p',
      limitations: 'l',
    });
    expect(r.ok).toBe(true);
  });
  it('returns 409 on dup', async () => {
    const r = await createAiModel(
      {
        repository: repo({
          createModel: () => {
            const e = new Error('dup') as Error & { code: string };
            e.code = '23505';
            return Promise.reject(e);
          },
        }),
      },
      admin,
      {
        provider: 'x',
        modelKey: 'k',
        displayName: 'd',
        modelVersion: 'v',
        intendedPurpose: 'p',
        limitations: 'l',
      },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
  });
});

describe('activateAiModel', () => {
  it('activates', async () => {
    const r = await activateAiModel({ repository: repo() }, admin, 'mdl-1');
    expect(r.ok).toBe(true);
  });
  it('404 when missing', async () => {
    const r = await activateAiModel(
      { repository: repo({ activateModel: () => Promise.resolve(null) }) },
      admin,
      'x',
    );
    expect(r.ok).toBe(false);
  });
});

describe('suspendAiModel', () => {
  it('suspends', async () => {
    const r = await suspendAiModel({ repository: repo() }, admin, 'mdl-1');
    expect(r.ok).toBe(true);
  });
  it('404 when missing', async () => {
    const r = await suspendAiModel(
      { repository: repo({ suspendModel: () => Promise.resolve(null) }) },
      admin,
      'x',
    );
    expect(r.ok).toBe(false);
  });
});
