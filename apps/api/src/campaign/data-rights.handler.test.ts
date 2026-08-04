import { describe, it, expect } from 'vitest';
import {
  handleListDataRights,
  handleCreateDataRight,
  handleCreateComplaint,
  type DataRightsService,
} from './data-rights.handler.js';
import type { Actor } from '@cpf/org';

const ID = '11111111-1111-1111-1111-111111111111';
const actor: Actor = { tenantId: ID, userId: ID, roles: ['employer_admin'] };

function svc(ov: Partial<DataRightsService> = {}): DataRightsService {
  return {
    listDataRights: () => Promise.resolve({ ok: true as const, items: [], total: 0 }),
    createDataRight: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    createComplaint: () => Promise.resolve({ status: 201, headers: {}, body: '{}' }),
    ...ov,
  };
}

describe('handleListDataRights', () => {
  it('200', async () => expect((await handleListDataRights(svc(), { actor })).status).toBe(200));
  it('403', async () =>
    expect(
      (
        await handleListDataRights(
          svc({
            listDataRights: () =>
              Promise.resolve({ ok: false as const, status: 403, reason: 'denied' }),
          }),
          { actor },
        )
      ).status,
    ).toBe(403));
});
describe('handleCreateDataRight', () => {
  it('201', async () =>
    expect((await handleCreateDataRight(svc(), { actor, body: {} })).status).toBe(201));
});
describe('handleCreateComplaint', () => {
  it('201', async () =>
    expect((await handleCreateComplaint(svc(), { actor, body: {} })).status).toBe(201));
});
