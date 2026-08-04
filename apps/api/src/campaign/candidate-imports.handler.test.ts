import { describe, it, expect } from 'vitest';
import {
  handleCreateImportJob,
  handleGetImportJob,
  handleCommitImportJob,
  handleCancelImportJob,
  type CandidateImportService,
} from './candidate-imports.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

function svc(ov: Partial<CandidateImportService> = {}): CandidateImportService {
  return {
    create: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    get: () => Promise.resolve({ status: 200, headers: {}, body: '{}' }),
    commit: () => Promise.resolve({ status: 200, headers: {}, body: '{}' }),
    cancel: () => Promise.resolve({ status: 200, headers: {}, body: '{}' }),
    ...ov,
  };
}

describe('handleCreateImportJob', () => {
  it('201', async () =>
    expect((await handleCreateImportJob(svc(), { actor, body: {} })).status).toBe(201));
});
describe('handleGetImportJob', () => {
  it('200', async () =>
    expect((await handleGetImportJob(svc(), { actor, jobId: ID })).status).toBe(200));
});
describe('handleCommitImportJob', () => {
  it('200', async () =>
    expect((await handleCommitImportJob(svc(), { actor, jobId: ID })).status).toBe(200));
});
describe('handleCancelImportJob', () => {
  it('200', async () =>
    expect((await handleCancelImportJob(svc(), { actor, jobId: ID })).status).toBe(200));
});
