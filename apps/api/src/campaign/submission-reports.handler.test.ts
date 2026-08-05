import { describe, it, expect } from 'vitest';
import {
  handleListSubmissionReports,
  handleCreateSubmissionReport,
  type SubmissionReportService,
} from './submission-reports.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

function svc(ov: Partial<SubmissionReportService> = {}): SubmissionReportService {
  return {
    list: () => Promise.resolve({ status: 200, headers: {}, body: '{}' }),
    create: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    ...ov,
  };
}

describe('handleListSubmissionReports', () => {
  it('200', async () =>
    expect((await handleListSubmissionReports(svc(), { actor, submissionId: ID })).status).toBe(
      200,
    ));
});
describe('handleCreateSubmissionReport', () => {
  it('201', async () =>
    expect(
      (await handleCreateSubmissionReport(svc(), { actor, submissionId: ID, body: {} })).status,
    ).toBe(201));
});
