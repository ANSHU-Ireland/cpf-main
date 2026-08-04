import { describe, it, expect } from 'vitest';
import {
  listDataRightRequests,
  createDataRightRequest,
  createComplaint,
  parseDataRightRequestCreate,
  parseComplaintCreate,
} from './data-rights.js';
import type {
  DataRightsRepository,
  DataRightRequestRecord,
  ComplaintRecord,
} from './data-rights.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const C = '33333333-3333-3333-3333-333333333333';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const dr: DataRightRequestRecord = {
  id: 'd1',
  requestType: 'erasure',
  status: 'pending',
  candidateId: C,
  createdAt: '',
};
const cp: ComplaintRecord = {
  id: 'cp1',
  category: 'bias',
  status: 'open',
  candidateId: C,
  createdAt: '',
};

function repo(ov: Partial<DataRightsRepository> = {}): DataRightsRepository {
  return {
    listDataRights: () => Promise.resolve({ items: [dr], total: 1 }),
    createDataRight: () => Promise.resolve(dr),
    createComplaint: () => Promise.resolve(cp),
    ...ov,
  };
}

describe('parseDataRightRequestCreate', () => {
  it('valid', () =>
    expect(
      parseDataRightRequestCreate({ requestType: 'erasure', candidateId: C, justification: 'j' })
        .ok,
    ).toBe(true));
  it('invalid', () => expect(parseDataRightRequestCreate({}).ok).toBe(false));
});
describe('parseComplaintCreate', () => {
  it('valid', () =>
    expect(parseComplaintCreate({ category: 'bias', candidateId: C, description: 'd' }).ok).toBe(
      true,
    ));
  it('invalid', () => expect(parseComplaintCreate({}).ok).toBe(false));
});
describe('listDataRightRequests', () => {
  it('ok', async () =>
    expect((await listDataRightRequests({ repository: repo() }, admin)).ok).toBe(true));
  it('403', async () =>
    expect((await listDataRightRequests({ repository: repo() }, noRole)).ok).toBe(false));
});
describe('createDataRightRequest', () => {
  it('ok', async () =>
    expect(
      (
        await createDataRightRequest({ repository: repo() }, admin, {
          requestType: 'erasure',
          candidateId: C,
          justification: 'j',
        })
      ).ok,
    ).toBe(true));
});
describe('createComplaint', () => {
  it('ok', async () =>
    expect(
      (
        await createComplaint({ repository: repo() }, admin, {
          category: 'bias',
          candidateId: C,
          description: 'd',
        })
      ).ok,
    ).toBe(true));
});
