import { can, type Permission } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import { encodeCursor, decodeCursor } from './cursor.js';
import type { DepartmentRepository } from './department-repository.js';
import type { Actor } from './types.js';
import type {
  DepartmentCreate,
  DepartmentDto,
  DepartmentListQuery,
  DepartmentPageDto,
  DepartmentStatus,
  DepartmentUpdate,
} from './department-types.js';
import { DEPARTMENT_STATUSES } from './department-types.js';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;
const MAX_CURSOR = 512;
const MAX_NAME = 200;
const MAX_CODE = 50;

const CREATE_KEYS = new Set(['name', 'code']);

export interface RawDepartmentListQuery {
  readonly limit?: string | number;
  readonly cursor?: string;
}

export type ParseDepartmentListQueryResult =
  | { readonly ok: true; readonly value: DepartmentListQuery }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseDepartmentListQuery(
  raw: RawDepartmentListQuery,
): ParseDepartmentListQueryResult {
  const errors: string[] = [];

  let limit = DEFAULT_LIMIT;
  if (raw.limit !== undefined) {
    const n = typeof raw.limit === 'number' ? raw.limit : Number(raw.limit);
    if (!Number.isInteger(n) || n < 1 || n > MAX_LIMIT) {
      errors.push(`limit must be an integer between 1 and ${MAX_LIMIT}`);
    } else {
      limit = n;
    }
  }

  let cursor = null;
  if (raw.cursor !== undefined && raw.cursor !== '') {
    if (raw.cursor.length > MAX_CURSOR) {
      errors.push(`cursor must be at most ${MAX_CURSOR} characters`);
    } else {
      cursor = decodeCursor(raw.cursor);
      if (cursor === null) {
        errors.push('cursor is malformed');
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: { limit, cursor } };
}

export type ParseDepartmentCreateResult =
  | { readonly ok: true; readonly value: DepartmentCreate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseDepartmentCreate(raw: unknown): ParseDepartmentCreateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!CREATE_KEYS.has(key)) {
      errors.push(`unknown property: ${key}`);
    }
  }

  if (typeof input.name !== 'string' || input.name.length === 0 || input.name.length > MAX_NAME) {
    errors.push(`name must be a non-empty string up to ${MAX_NAME} chars`);
  }

  if (input.code !== undefined) {
    if (typeof input.code !== 'string' || input.code.length === 0 || input.code.length > MAX_CODE) {
      errors.push(`code must be a non-empty string up to ${MAX_CODE} chars`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name: input.name as string,
      ...(input.code !== undefined ? { code: input.code as string } : {}),
    },
  };
}

export interface DepartmentDeps {
  readonly repository: DepartmentRepository;
  readonly permissions?: readonly Permission[];
}

export type ListDepartmentsResult =
  | { readonly ok: true; readonly page: DepartmentPageDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string };

export async function listDepartments(
  deps: DepartmentDeps,
  actor: Actor,
  query: DepartmentListQuery,
): Promise<ListDepartmentsResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'department', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const result = await deps.repository.listDepartments(actor, query);
  const items: DepartmentDto[] = result.items.map((r) => r);
  const lastItem = items[items.length - 1];
  const nextCursor =
    result.hasMore && lastItem !== undefined
      ? encodeCursor({ ts: lastItem.createdAt, id: lastItem.id })
      : null;

  return { ok: true, page: { items, nextCursor, total: result.total } };
}

export type CreateDepartmentResult =
  | { readonly ok: true; readonly department: DepartmentDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 409; readonly reason: string };

export async function createDepartment(
  deps: DepartmentDeps,
  actor: Actor,
  input: DepartmentCreate,
): Promise<CreateDepartmentResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'department', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  try {
    const record = await deps.repository.createDepartment(actor, input);
    return { ok: true, department: record };
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as Record<string, unknown>).code === '23505'
    ) {
      return { ok: false, status: 409, reason: 'A department with that name already exists.' };
    }
    throw err;
  }
}

// --- Update ---

const UPDATE_KEYS = new Set(['name', 'code', 'status']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ParseDepartmentUpdateResult =
  | { readonly ok: true; readonly value: DepartmentUpdate }
  | { readonly ok: false; readonly errors: readonly string[] };

export function parseDepartmentUpdate(raw: unknown): ParseDepartmentUpdateResult {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, errors: ['body must be a JSON object'] };
  }
  const input = raw as Record<string, unknown>;
  const errors: string[] = [];

  for (const key of Object.keys(input)) {
    if (!UPDATE_KEYS.has(key)) {
      errors.push(`unknown property: ${key}`);
    }
  }

  const hasAtLeastOne =
    (UPDATE_KEYS.has('name') && input.name !== undefined) ||
    (UPDATE_KEYS.has('code') && input.code !== undefined) ||
    (UPDATE_KEYS.has('status') && input.status !== undefined);
  if (!hasAtLeastOne) {
    errors.push('at least one of name, code, status is required');
  }

  if (input.name !== undefined) {
    if (typeof input.name !== 'string' || input.name.length === 0 || input.name.length > MAX_NAME) {
      errors.push(`name must be a non-empty string up to ${MAX_NAME} chars`);
    }
  }
  if (input.code !== undefined) {
    if (typeof input.code !== 'string' || input.code.length === 0 || input.code.length > MAX_CODE) {
      errors.push(`code must be a non-empty string up to ${MAX_CODE} chars`);
    }
  }
  if (input.status !== undefined) {
    if (!DEPARTMENT_STATUSES.includes(input.status as DepartmentStatus)) {
      errors.push(`status must be one of: ${DEPARTMENT_STATUSES.join(', ')}`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  const value: DepartmentUpdate = {
    ...(input.name !== undefined ? { name: input.name as string } : {}),
    ...(input.code !== undefined ? { code: input.code as string } : {}),
    ...(input.status !== undefined ? { status: input.status as DepartmentStatus } : {}),
  };
  return { ok: true, value };
}

export function parseDepartmentId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export type UpdateDepartmentResult =
  | { readonly ok: true; readonly department: DepartmentDto }
  | { readonly ok: false; readonly status: 403; readonly reason: string }
  | { readonly ok: false; readonly status: 404; readonly reason: string }
  | { readonly ok: false; readonly status: 409; readonly reason: string };

export async function updateDepartment(
  deps: DepartmentDeps,
  actor: Actor,
  id: string,
  input: DepartmentUpdate,
): Promise<UpdateDepartmentResult> {
  const permissions = deps.permissions ?? ORG_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'department', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  try {
    const record = await deps.repository.updateDepartment(actor, id, input);
    if (record === null) {
      return { ok: false, status: 404, reason: 'Department not found.' };
    }
    return { ok: true, department: record };
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as Record<string, unknown>).code === '23505'
    ) {
      return { ok: false, status: 409, reason: 'A department with that name already exists.' };
    }
    throw err;
  }
}
