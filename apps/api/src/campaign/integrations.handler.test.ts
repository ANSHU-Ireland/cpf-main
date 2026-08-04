import { describe, it, expect } from 'vitest';
import {
  handleListIntegrations,
  handleGetIntegration,
  handleCreateIntegration,
  handleUpdateIntegration,
  type IntegrationService,
} from './integrations.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

function svc(ov: Partial<IntegrationService> = {}): IntegrationService {
  return {
    list: () => Promise.resolve({ ok: true as const, items: [], total: 0 }),
    get: () =>
      Promise.resolve({
        ok: true as const,
        integration: {
          id: ID,
          connectionType: 'ats',
          provider: 'lever',
          status: 'active' as const,
          createdAt: '',
          updatedAt: '',
        },
      }),
    create: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    update: () => Promise.resolve({ status: 200, headers: {}, body: '{}' }),
    ...ov,
  };
}

describe('handleListIntegrations', () => {
  it('200', async () => expect((await handleListIntegrations(svc(), { actor })).status).toBe(200));
  it('403', async () =>
    expect(
      (
        await handleListIntegrations(
          svc({
            list: () => Promise.resolve({ ok: false as const, status: 403, reason: 'denied' }),
          }),
          { actor },
        )
      ).status,
    ).toBe(403));
});
describe('handleGetIntegration', () => {
  it('200', async () =>
    expect((await handleGetIntegration(svc(), { actor, integrationId: ID })).status).toBe(200));
  it('422', async () =>
    expect((await handleGetIntegration(svc(), { actor, integrationId: 'x' })).status).toBe(422));
});
describe('handleCreateIntegration', () => {
  it('201', async () =>
    expect((await handleCreateIntegration(svc(), { actor, body: {} })).status).toBe(201));
});
describe('handleUpdateIntegration', () => {
  it('200', async () =>
    expect(
      (await handleUpdateIntegration(svc(), { actor, integrationId: ID, body: {} })).status,
    ).toBe(200));
});
