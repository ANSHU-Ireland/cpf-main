import { describe, it, expect } from 'vitest';
import type { Actor, AdminMaintenanceRepository, MaintenanceWindowRecord } from '@cpf/org';
import {
  createAdminMaintenanceService,
  handleListMaintenanceWindows,
  handleCreateMaintenanceWindow,
} from './maintenance.handler.js';

const actor: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };

const win: MaintenanceWindowRecord = {
  id: 'w1',
  startsAt: '2026-01-01T00:00:00.000Z',
  endsAt: '2026-01-01T02:00:00.000Z',
  description: 'db upgrade',
  status: 'scheduled',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function repo(overrides: Partial<AdminMaintenanceRepository> = {}): AdminMaintenanceRepository {
  return {
    listWindows: () => Promise.resolve({ items: [win], total: 1 }),
    createWindow: () => Promise.resolve(win),
    ...overrides,
  };
}

function svc(overrides: Partial<AdminMaintenanceRepository> = {}) {
  return createAdminMaintenanceService({ repository: repo(overrides) });
}

describe('handleListMaintenanceWindows', () => {
  it('returns 200', async () =>
    expect((await handleListMaintenanceWindows(svc(), { actor })).status).toBe(200));
});

describe('handleCreateMaintenanceWindow', () => {
  it('returns 201', async () => {
    const res = await handleCreateMaintenanceWindow(svc(), {
      actor,
      body: {
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2026-01-01T02:00:00.000Z',
        description: 'db upgrade',
      },
    });
    expect(res.status).toBe(201);
  });
  it('returns 422 for an invalid body', async () =>
    expect((await handleCreateMaintenanceWindow(svc(), { actor, body: {} })).status).toBe(422));
});
