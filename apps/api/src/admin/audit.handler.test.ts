import { describe, it, expect } from 'vitest';
import type { Actor, AdminAuditRepository, AuditEventRecord, AuditExportRecord } from '@cpf/org';
import {
  createAdminAuditService,
  handleListAuditEvents,
  handleCreateAuditExport,
} from './audit.handler.js';

const actor: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
const outsider: Actor = { userId: 'u2', tenantId: 't1', roles: ['employer_admin'] };

const event: AuditEventRecord = {
  id: 'e1',
  actorId: 'u9',
  action: 'login',
  resourceType: 'session',
  occurredAt: '2026-01-01T00:00:00.000Z',
};
const exp: AuditExportRecord = {
  id: 'x1',
  status: 'pending',
  format: 'csv',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function repo(overrides: Partial<AdminAuditRepository> = {}): AdminAuditRepository {
  return {
    listEvents: () => Promise.resolve({ items: [event], total: 1 }),
    createExport: () => Promise.resolve(exp),
    ...overrides,
  };
}

function svc(overrides: Partial<AdminAuditRepository> = {}) {
  return createAdminAuditService({ repository: repo(overrides) });
}

describe('handleListAuditEvents', () => {
  it('returns 200', async () =>
    expect((await handleListAuditEvents(svc(), { actor })).status).toBe(200));
  it('returns 403 for an outsider', async () =>
    expect((await handleListAuditEvents(svc(), { actor: outsider })).status).toBe(403));
});

describe('handleCreateAuditExport', () => {
  it('returns 201', async () => {
    const res = await handleCreateAuditExport(svc(), {
      actor,
      body: { from: '2026-01-01T00:00:00.000Z', to: '2026-02-01T00:00:00.000Z', format: 'csv' },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for an invalid body', async () =>
    expect((await handleCreateAuditExport(svc(), { actor, body: {} })).status).toBe(422));
});
