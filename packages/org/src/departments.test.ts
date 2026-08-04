import { describe, it, expect } from 'vitest';
import {
  createDepartment,
  listDepartments,
  parseDepartmentCreate,
  parseDepartmentListQuery,
} from './departments.js';
import type { DepartmentRepository, DepartmentListResult } from './department-repository.js';
import { EMPLOYER_ADMIN_ROLE } from './permissions.js';
import type { Actor } from './types.js';
import type { DepartmentCreate, DepartmentRecord } from './department-types.js';
import { encodeCursor } from './cursor.js';

const TENANT = '11111111-1111-1111-1111-111111111111';
const admin: Actor = { userId: 'user-1', tenantId: TENANT, roles: [EMPLOYER_ADMIN_ROLE] };

function dept(over: Partial<DepartmentRecord> = {}): DepartmentRecord {
  return {
    id: 'dept-1',
    name: 'Engineering',
    code: 'ENG',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

function repo(result: DepartmentListResult): DepartmentRepository {
  return {
    listDepartments: () => Promise.resolve(result),
    createDepartment: (_actor: Actor, input: DepartmentCreate) =>
      Promise.resolve(dept({ name: input.name, code: input.code ?? null })),
  };
}

describe('parseDepartmentListQuery', () => {
  it('applies the default limit when nothing is supplied', () => {
    expect(parseDepartmentListQuery({})).toEqual({ ok: true, value: { limit: 25, cursor: null } });
  });

  it('rejects an out-of-range limit', () => {
    expect(parseDepartmentListQuery({ limit: '0' }).ok).toBe(false);
    expect(parseDepartmentListQuery({ limit: 101 }).ok).toBe(false);
  });

  it('decodes a valid cursor', () => {
    const cursor = encodeCursor({ ts: '2026-01-01T00:00:00.000Z', id: 'abc' });
    const result = parseDepartmentListQuery({ cursor });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.cursor).toEqual({ ts: '2026-01-01T00:00:00.000Z', id: 'abc' });
    }
  });

  it('rejects a malformed cursor', () => {
    expect(parseDepartmentListQuery({ cursor: 'not-valid' }).ok).toBe(false);
  });
});

describe('parseDepartmentCreate', () => {
  it('accepts a valid department with name and code', () => {
    const result = parseDepartmentCreate({ name: 'Engineering', code: 'ENG' });
    expect(result).toEqual({ ok: true, value: { name: 'Engineering', code: 'ENG' } });
  });

  it('accepts a department with only name', () => {
    const result = parseDepartmentCreate({ name: 'Marketing' });
    expect(result).toEqual({ ok: true, value: { name: 'Marketing' } });
  });

  it('rejects unknown properties', () => {
    const result = parseDepartmentCreate({ name: 'HR', status: 'inactive' });
    expect(result.ok).toBe(false);
  });

  it('rejects a non-object body', () => {
    expect(parseDepartmentCreate(null).ok).toBe(false);
    expect(parseDepartmentCreate('nope').ok).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(parseDepartmentCreate({ name: '' }).ok).toBe(false);
  });
});

describe('listDepartments', () => {
  it('returns a page for an Employer Admin', async () => {
    const items = [dept()];
    const result = await listDepartments(
      { repository: repo({ items, total: 1, hasMore: false }) },
      admin,
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.page.items).toHaveLength(1);
      expect(result.page.total).toBe(1);
      expect(result.page.nextCursor).toBeNull();
    }
  });

  it('denies by default (403) without the Employer Admin role', async () => {
    const result = await listDepartments(
      { repository: repo({ items: [], total: 0, hasMore: false }) },
      { userId: 'user-2', tenantId: TENANT, roles: [] },
      { limit: 25, cursor: null },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });
});

describe('createDepartment', () => {
  it('creates a department for an Employer Admin', async () => {
    const result = await createDepartment(
      { repository: repo({ items: [], total: 0, hasMore: false }) },
      admin,
      { name: 'Engineering', code: 'ENG' },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.department.name).toBe('Engineering');
    }
  });

  it('denies by default (403) without the Employer Admin role', async () => {
    const result = await createDepartment(
      { repository: repo({ items: [], total: 0, hasMore: false }) },
      { userId: 'user-2', tenantId: TENANT, roles: [] },
      { name: 'Engineering' },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(403);
    }
  });

  it('returns 409 on duplicate name', async () => {
    const dupRepo: DepartmentRepository = {
      listDepartments: () => Promise.resolve({ items: [], total: 0, hasMore: false }),
      createDepartment: () => {
        const err = new Error('duplicate') as Error & { code: string };
        err.code = '23505';
        return Promise.reject(err);
      },
    };
    const result = await createDepartment({ repository: dupRepo }, admin, { name: 'Engineering' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(409);
    }
  });
});
