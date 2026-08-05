import { describe, it, expect } from 'vitest';
import {
  listMaintenanceWindows,
  createMaintenanceWindow,
  parseMaintenanceWindowCreate,
  type AdminMaintenanceRepository,
  type MaintenanceWindowRecord,
} from './admin-maintenance.js';
import type { Actor } from './types.js';

const staff: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
const outsider: Actor = { userId: 'u2', tenantId: 't1', roles: ['employer_admin'] };

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

function deps(overrides: Partial<AdminMaintenanceRepository> = {}) {
  return { repository: repo(overrides) };
}

describe('parseMaintenanceWindowCreate', () => {
  it('accepts valid input', () =>
    expect(
      parseMaintenanceWindowCreate({
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2026-01-01T02:00:00.000Z',
        description: 'db upgrade',
      }).ok,
    ).toBe(true));
  it('rejects when startsAt is not before endsAt', () =>
    expect(
      parseMaintenanceWindowCreate({
        startsAt: '2026-01-01T02:00:00.000Z',
        endsAt: '2026-01-01T00:00:00.000Z',
        description: 'x',
      }).ok,
    ).toBe(false));
  it('rejects a missing description', () =>
    expect(
      parseMaintenanceWindowCreate({
        startsAt: '2026-01-01T00:00:00.000Z',
        endsAt: '2026-01-01T02:00:00.000Z',
      }).ok,
    ).toBe(false));
});

describe('listMaintenanceWindows', () => {
  it('allows staff', async () =>
    expect((await listMaintenanceWindows(deps(), staff)).ok).toBe(true));
  it('denies an outsider', async () => {
    const r = await listMaintenanceWindows(deps(), outsider);
    expect(r.ok === false && r.status).toBe(403);
  });
});

describe('createMaintenanceWindow', () => {
  it('creates for staff', async () => {
    const r = await createMaintenanceWindow(deps(), staff, {
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-01-01T02:00:00.000Z',
      description: 'db upgrade',
    });
    expect(r.ok).toBe(true);
  });
  it('denies an outsider', async () => {
    const r = await createMaintenanceWindow(deps(), outsider, {
      startsAt: '2026-01-01T00:00:00.000Z',
      endsAt: '2026-01-01T02:00:00.000Z',
      description: 'db upgrade',
    });
    expect(r.ok === false && r.status).toBe(403);
  });
});
