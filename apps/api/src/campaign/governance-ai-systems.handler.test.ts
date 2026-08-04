import { describe, it, expect } from 'vitest';
import {
  handleListAiSystems,
  handleGetAiSystem,
  handleCreateAiSystem,
  handleClassifyAiSystem,
  type AiSystemService,
} from './governance-ai-systems.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

function svc(ov: Partial<AiSystemService> = {}): AiSystemService {
  return {
    list: () => Promise.resolve({ ok: true as const, items: [], total: 0 }),
    get: () =>
      Promise.resolve({
        ok: true as const,
        system: {
          id: ID,
          systemCode: 'x',
          name: 'n',
          providerLegalName: 'p',
          intendedPurpose: 'i',
          version: '1',
          lifecycleStatus: 'active' as const,
          ownerUserId: ID,
          createdAt: '',
          updatedAt: '',
        },
      }),
    create: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    classify: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    ...ov,
  };
}

describe('handleListAiSystems', () => {
  it('200', async () => {
    const r = await handleListAiSystems(svc(), { actor });
    expect(r.status).toBe(200);
  });
  it('403', async () => {
    const r = await handleListAiSystems(
      svc({ list: () => Promise.resolve({ ok: false as const, status: 403, reason: 'denied' }) }),
      { actor },
    );
    expect(r.status).toBe(403);
  });
});
describe('handleGetAiSystem', () => {
  it('200', async () => {
    const r = await handleGetAiSystem(svc(), { actor, systemId: ID });
    expect(r.status).toBe(200);
  });
  it('422', async () => {
    const r = await handleGetAiSystem(svc(), { actor, systemId: 'bad' });
    expect(r.status).toBe(422);
  });
});
describe('handleCreateAiSystem', () => {
  it('201', async () => {
    const r = await handleCreateAiSystem(svc(), { actor, body: {} });
    expect(r.status).toBe(201);
  });
});
describe('handleClassifyAiSystem', () => {
  it('201', async () => {
    const r = await handleClassifyAiSystem(svc(), { actor, systemId: ID, body: {} });
    expect(r.status).toBe(201);
  });
});
