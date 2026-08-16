import { describe, it, expect } from 'vitest';
import {
  handleListPromptVersions,
  handleCreatePromptVersion,
  handleActivatePromptVersion,
  type PromptVersionService,
} from './prompt-versions.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };
const pv = {
  id: ID,
  promptCode: 'PC1',
  version: 1,
  status: 'draft' as const,
  body: 'b',
  purpose: 'reviewer guidance',
  safetyPolicy: {},
  createdAt: '',
};

function svc(ov: Partial<PromptVersionService> = {}): PromptVersionService {
  return {
    list: () => Promise.resolve({ ok: true as const, items: [pv], total: 1 }),
    create: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    activate: () => Promise.resolve({ status: 200, headers: {}, body: '{}' }),
    ...ov,
  };
}

describe('handleListPromptVersions', () => {
  it('200', async () =>
    expect((await handleListPromptVersions(svc(), { actor })).status).toBe(200));
  it('403', async () =>
    expect(
      (
        await handleListPromptVersions(
          svc({
            list: () => Promise.resolve({ ok: false as const, status: 403, reason: 'denied' }),
          }),
          { actor },
        )
      ).status,
    ).toBe(403));
});
describe('handleCreatePromptVersion', () => {
  it('201', async () =>
    expect((await handleCreatePromptVersion(svc(), { actor, body: {} })).status).toBe(201));
});
describe('handleActivatePromptVersion', () => {
  it('200', async () =>
    expect((await handleActivatePromptVersion(svc(), { actor, promptId: ID })).status).toBe(200));
});
