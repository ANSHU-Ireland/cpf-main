import { describe, it, expect } from 'vitest';
import {
  handleListRiskControls,
  handleGetRiskControl,
  handleCreateRiskControl,
  type RiskControlService,
} from './governance-risk-controls.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

function svc(ov: Partial<RiskControlService> = {}): RiskControlService {
  return {
    list: () => Promise.resolve({ ok: true as const, items: [], total: 0 }),
    get: () =>
      Promise.resolve({
        ok: true as const,
        control: {
          id: ID,
          riskCode: 'RC1',
          harm: 'h',
          controlDescription: 'c',
          status: 'open' as const,
          createdAt: '',
        },
      }),
    create: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    ...ov,
  };
}

describe('handleListRiskControls', () => {
  it('200', async () => expect((await handleListRiskControls(svc(), { actor })).status).toBe(200));
  it('403', async () =>
    expect(
      (
        await handleListRiskControls(
          svc({
            list: () => Promise.resolve({ ok: false as const, status: 403, reason: 'denied' }),
          }),
          { actor },
        )
      ).status,
    ).toBe(403));
});
describe('handleGetRiskControl', () => {
  it('200', async () =>
    expect((await handleGetRiskControl(svc(), { actor, controlId: ID })).status).toBe(200));
  it('422', async () =>
    expect((await handleGetRiskControl(svc(), { actor, controlId: 'bad' })).status).toBe(422));
});
describe('handleCreateRiskControl', () => {
  it('201', async () =>
    expect((await handleCreateRiskControl(svc(), { actor, body: {} })).status).toBe(201));
});
