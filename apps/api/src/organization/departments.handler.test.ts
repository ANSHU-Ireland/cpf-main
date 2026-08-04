import { describe, it, expect } from 'vitest';
import type { Actor, CreateDepartmentResult, ListDepartmentsResult } from '@cpf/org';
import {
  handleGetOrganizationDepartments,
  handlePostOrganizationDepartment,
  type DepartmentService,
} from './departments.handler.js';

const actor: Actor = { userId: 'user-1', tenantId: 'tenant-1', roles: ['employer_admin'] };

const page = {
  items: [
    {
      id: 'dept-1',
      name: 'Engineering',
      code: 'ENG',
      status: 'active' as const,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  nextCursor: null,
  total: 1,
};

const deptDto = page.items[0]!;

function service(
  list: ListDepartmentsResult = { ok: true, page },
  create: CreateDepartmentResult = { ok: true, department: deptDto },
): DepartmentService {
  return {
    listDepartments: () => Promise.resolve(list),
    createDepartment: () => Promise.resolve(create),
  };
}

describe('handleGetOrganizationDepartments', () => {
  it('returns 200 with the departments page', async () => {
    const res = await handleGetOrganizationDepartments(service(), {
      actor,
      query: {},
      correlationId: 'corr-1',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-1');
    expect(res.body).toEqual(page);
  });

  it('returns 422 for an invalid limit', async () => {
    const res = await handleGetOrganizationDepartments(service(), {
      actor,
      query: { limit: '0' },
    });
    expect(res.status).toBe(422);
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handleGetOrganizationDepartments(
      service({ ok: false, status: 403, reason: 'denied' }),
      { actor, query: {} },
    );
    expect(res.status).toBe(403);
  });
});

describe('handlePostOrganizationDepartment', () => {
  it('returns 200 with the created department', async () => {
    const res = await handlePostOrganizationDepartment(service(), {
      actor,
      body: { name: 'Engineering', code: 'ENG' },
      correlationId: 'corr-2',
    });
    expect(res.status).toBe(200);
    expect(res.headers['X-Correlation-ID']).toBe('corr-2');
  });

  it('returns 422 for an empty body', async () => {
    const res = await handlePostOrganizationDepartment(service(), { actor, body: {} });
    expect(res.status).toBe(422);
  });

  it('maps a 409 result to problem+json', async () => {
    const res = await handlePostOrganizationDepartment(
      service(undefined, { ok: false, status: 409, reason: 'duplicate' }),
      { actor, body: { name: 'Engineering' } },
    );
    expect(res.status).toBe(409);
  });

  it('maps a 403 result to problem+json', async () => {
    const res = await handlePostOrganizationDepartment(
      service(undefined, { ok: false, status: 403, reason: 'denied' }),
      { actor, body: { name: 'Engineering' } },
    );
    expect(res.status).toBe(403);
  });
});
