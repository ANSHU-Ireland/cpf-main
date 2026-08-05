import { describe, it, expect } from 'vitest';
import {
  listSubmissionReports,
  createSubmissionReport,
  parseSubmissionReportCreate,
  parseSubmissionId,
} from './submission-reports.js';
import type { SubmissionReportRepository, SubmissionReportRecord } from './submission-reports.js';
import type { Actor } from './types.js';

const T = '11111111-1111-1111-1111-111111111111';
const U = '22222222-2222-2222-2222-222222222222';
const admin: Actor = { tenantId: T, userId: U, roles: ['employer_admin'] };
const noRole: Actor = { tenantId: T, userId: U, roles: ['viewer'] };
const rep: SubmissionReportRecord = {
  id: 'r1',
  submissionId: 's1',
  format: 'pdf',
  status: 'ready',
  requestedAt: '',
};

function repo(ov: Partial<SubmissionReportRepository> = {}): SubmissionReportRepository {
  return {
    listReports: () => Promise.resolve({ items: [rep], total: 1 }),
    createReport: () => Promise.resolve(rep),
    ...ov,
  };
}

describe('parseSubmissionReportCreate', () => {
  it('valid', () => expect(parseSubmissionReportCreate({ format: 'pdf' }).ok).toBe(true));
  it('invalid', () => expect(parseSubmissionReportCreate({ format: 'xml' }).ok).toBe(false));
});
describe('parseSubmissionId', () => {
  it('uuid', () => expect(parseSubmissionId(T)).not.toBeNull());
  it('bad', () => expect(parseSubmissionId('x')).toBeNull());
});
describe('listSubmissionReports', () => {
  it('ok', async () =>
    expect((await listSubmissionReports({ repository: repo() }, admin, 's1')).ok).toBe(true));
  it('403', async () =>
    expect((await listSubmissionReports({ repository: repo() }, noRole, 's1')).ok).toBe(false));
  it('404', async () =>
    expect(
      (
        await listSubmissionReports(
          { repository: repo({ listReports: () => Promise.resolve(null) }) },
          admin,
          'x',
        )
      ).ok,
    ).toBe(false));
});
describe('createSubmissionReport', () => {
  it('ok', async () =>
    expect(
      (await createSubmissionReport({ repository: repo() }, admin, 's1', { format: 'pdf' })).ok,
    ).toBe(true));
  it('403', async () =>
    expect(
      (await createSubmissionReport({ repository: repo() }, noRole, 's1', { format: 'pdf' })).ok,
    ).toBe(false));
});
