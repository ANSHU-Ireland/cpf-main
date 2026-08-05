import { describe, it, expect } from 'vitest';
import {
  listAuditEvents,
  createAuditExport,
  parseAuditExportCreate,
  type AdminAuditRepository,
  type AuditEventRecord,
  type AuditExportRecord,
} from './admin-audit.js';
import type { Actor } from './types.js';

const staff: Actor = { userId: 'u1', tenantId: 't1', roles: ['platform_staff'] };
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

function deps(overrides: Partial<AdminAuditRepository> = {}) {
  return { repository: repo(overrides) };
}

describe('parseAuditExportCreate', () => {
  it('accepts valid input', () =>
    expect(
      parseAuditExportCreate({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
        format: 'csv',
      }).ok,
    ).toBe(true));
  it('rejects a bad format', () =>
    expect(
      parseAuditExportCreate({
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
        format: 'xml',
      }).ok,
    ).toBe(false));
  it('rejects a bad timestamp', () =>
    expect(parseAuditExportCreate({ from: 'nope', to: 'nope', format: 'csv' }).ok).toBe(false));
});

describe('listAuditEvents', () => {
  it('allows staff', async () => expect((await listAuditEvents(deps(), staff)).ok).toBe(true));
  it('denies an outsider', async () => {
    const r = await listAuditEvents(deps(), outsider);
    expect(r.ok === false && r.status).toBe(403);
  });
});

describe('createAuditExport', () => {
  it('creates for staff', async () => {
    const r = await createAuditExport(deps(), staff, {
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-02-01T00:00:00.000Z',
      format: 'csv',
    });
    expect(r.ok).toBe(true);
  });
  it('denies an outsider', async () => {
    const r = await createAuditExport(deps(), outsider, {
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-02-01T00:00:00.000Z',
      format: 'csv',
    });
    expect(r.ok === false && r.status).toBe(403);
  });
});
