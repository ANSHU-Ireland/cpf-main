import { describe, it, expect } from 'vitest';
import {
  createImportJob,
  getImportJob,
  commitImportJob,
  cancelImportJob,
  parseImportJobCreate,
  parseImportJobId,
} from './candidate-imports.js';
import type { CandidateImportRepository, ImportJobRecord } from './candidate-imports.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const job: ImportJobRecord = {
  id: 'j1',
  campaignId: C,
  status: 'uploaded',
  totalRows: 10,
  validRows: 8,
  errorRows: 2,
  createdAt: '',
};

function repo(ov: Partial<CandidateImportRepository> = {}): CandidateImportRepository {
  return {
    createJob: () => Promise.resolve(job),
    getJob: () => Promise.resolve(job),
    commitJob: () => Promise.resolve(job),
    cancelJob: () => Promise.resolve(job),
    ...ov,
  };
}

describe('parseImportJobCreate', () => {
  it('valid', () =>
    expect(parseImportJobCreate({ campaignId: C, idempotencyKey: 'k', fileName: 'f.csv' }).ok).toBe(
      true,
    ));
  it('invalid', () => expect(parseImportJobCreate({}).ok).toBe(false));
});
describe('parseImportJobId', () => {
  it('uuid', () => expect(parseImportJobId(T)).not.toBeNull());
});
describe('createImportJob', () => {
  it('ok', async () =>
    expect(
      (
        await createImportJob({ repository: repo() }, admin, {
          campaignId: C,
          idempotencyKey: 'k',
          fileName: 'f.csv',
        })
      ).ok,
    ).toBe(true));
  it('403', async () =>
    expect(
      (
        await createImportJob({ repository: repo() }, noRole, {
          campaignId: C,
          idempotencyKey: 'k',
          fileName: 'f.csv',
        })
      ).ok,
    ).toBe(false));
  it('409', async () => {
    const r = await createImportJob(
      {
        repository: repo({
          createJob: () => {
            const e = new Error() as Error & { code: string };
            e.code = '23505';
            return Promise.reject(e);
          },
        }),
      },
      admin,
      { campaignId: C, idempotencyKey: 'k', fileName: 'f.csv' },
    );
    expect(r.ok).toBe(false);
  });
});
describe('getImportJob', () => {
  it('ok', async () =>
    expect((await getImportJob({ repository: repo() }, admin, 'j1')).ok).toBe(true));
  it('404', async () =>
    expect(
      (
        await getImportJob(
          { repository: repo({ getJob: () => Promise.resolve(null) }) },
          admin,
          'x',
        )
      ).ok,
    ).toBe(false));
});
describe('commitImportJob', () => {
  it('ok', async () =>
    expect((await commitImportJob({ repository: repo() }, admin, 'j1')).ok).toBe(true));
});
describe('cancelImportJob', () => {
  it('ok', async () =>
    expect((await cancelImportJob({ repository: repo() }, admin, 'j1')).ok).toBe(true));
});
