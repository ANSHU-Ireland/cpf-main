import { describe, it, expect } from 'vitest';
import {
  listAiSystems,
  getAiSystem,
  createAiSystem,
  classifyAiSystem,
  parseAiSystemCreate,
  parseClassificationCreate,
  parseAiSystemId,
} from './governance-ai-systems.js';
import type {
  AiSystemRepository,
  AiSystemRecord,
  ClassificationRecord,
} from './governance-ai-systems.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };

const sys: AiSystemRecord = {
  id: 's1',
  systemCode: 'SC',
  name: 'N',
  providerLegalName: 'P',
  intendedPurpose: 'I',
  version: '1',
  lifecycleStatus: 'active',
  ownerUserId: U,
  createdAt: '',
  updatedAt: '',
};
const cls: ClassificationRecord = {
  id: 'c1',
  aiSystemId: 's1',
  versionNo: 1,
  highRiskConclusion: true,
  territorialScope: 'EU',
  confidence: 'high',
  status: 'draft',
  createdAt: '',
};

function repo(ov: Partial<AiSystemRepository> = {}): AiSystemRepository {
  return {
    listSystems: () => Promise.resolve({ items: [sys], total: 1 }),
    getSystem: () => Promise.resolve(sys),
    createSystem: () => Promise.resolve(sys),
    createClassification: () => Promise.resolve(cls),
    ...ov,
  };
}

describe('parseAiSystemCreate', () => {
  it('valid', () =>
    expect(
      parseAiSystemCreate({
        systemCode: 'x',
        name: 'n',
        providerLegalName: 'p',
        intendedPurpose: 'i',
        version: 'v',
      }).ok,
    ).toBe(true));
  it('invalid', () => expect(parseAiSystemCreate({}).ok).toBe(false));
});
describe('parseClassificationCreate', () => {
  it('valid', () =>
    expect(
      parseClassificationCreate({
        highRiskConclusion: true,
        territorialScope: 'EU',
        confidence: 'high',
      }).ok,
    ).toBe(true));
  it('invalid', () => expect(parseClassificationCreate({}).ok).toBe(false));
});
describe('parseAiSystemId', () => {
  it('uuid', () => expect(parseAiSystemId(T)).not.toBeNull());
  it('bad', () => expect(parseAiSystemId('x')).toBeNull());
});
describe('listAiSystems', () => {
  it('ok', async () => {
    const r = await listAiSystems({ repository: repo() }, admin);
    expect(r.ok).toBe(true);
  });
  it('403', async () => {
    const r = await listAiSystems({ repository: repo() }, noRole);
    expect(r.ok).toBe(false);
  });
});
describe('getAiSystem', () => {
  it('ok', async () => {
    const r = await getAiSystem({ repository: repo() }, admin, 's1');
    expect(r.ok).toBe(true);
  });
  it('404', async () => {
    const r = await getAiSystem(
      { repository: repo({ getSystem: () => Promise.resolve(null) }) },
      admin,
      'x',
    );
    expect(r.ok).toBe(false);
  });
});
describe('createAiSystem', () => {
  it('ok', async () => {
    const r = await createAiSystem({ repository: repo() }, admin, {
      systemCode: 'x',
      name: 'n',
      providerLegalName: 'p',
      intendedPurpose: 'i',
      version: 'v',
    });
    expect(r.ok).toBe(true);
  });
  it('409', async () => {
    const r = await createAiSystem(
      {
        repository: repo({
          createSystem: () => {
            const e = new Error() as Error & { code: string };
            e.code = '23505';
            return Promise.reject(e);
          },
        }),
      },
      admin,
      { systemCode: 'x', name: 'n', providerLegalName: 'p', intendedPurpose: 'i', version: 'v' },
    );
    expect(r.ok).toBe(false);
  });
});
describe('classifyAiSystem', () => {
  it('ok', async () => {
    const r = await classifyAiSystem({ repository: repo() }, admin, 's1', {
      highRiskConclusion: true,
      territorialScope: 'EU',
      confidence: 'high',
    });
    expect(r.ok).toBe(true);
  });
});
