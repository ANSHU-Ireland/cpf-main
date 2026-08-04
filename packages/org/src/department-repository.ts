import type { Pool } from 'pg';
import { withTenant, type TenantContext } from '@cpf/db';
import { PgAuditWriter } from '@cpf/audit';
import type { Actor } from './types.js';
import type {
  DepartmentCreate,
  DepartmentListQuery,
  DepartmentRecord,
  DepartmentStatus,
  DepartmentUpdate,
} from './department-types.js';

export interface DepartmentListResult {
  readonly items: readonly DepartmentRecord[];
  readonly total: number;
  readonly hasMore: boolean;
}

export interface DepartmentRepository {
  listDepartments(actor: Actor, query: DepartmentListQuery): Promise<DepartmentListResult>;
  createDepartment(actor: Actor, input: DepartmentCreate): Promise<DepartmentRecord>;
  updateDepartment(
    actor: Actor,
    id: string,
    input: DepartmentUpdate,
  ): Promise<DepartmentRecord | null>;
}

export interface PgDepartmentRepositoryOptions {
  readonly role?: string;
}

interface DepartmentRow {
  id: string;
  name: string;
  code: string | null;
  status: DepartmentStatus;
  created_at: Date;
  updated_at: Date;
}

const COLUMNS = 'id, name, code, status, created_at, updated_at';

function toRecord(row: DepartmentRow): DepartmentRecord {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export class PgDepartmentRepository implements DepartmentRepository {
  readonly #pool: Pool;
  readonly #role: string | undefined;

  constructor(pool: Pool, options: PgDepartmentRepositoryOptions = {}) {
    this.#pool = pool;
    this.#role = options.role;
  }

  #context(actor: Actor): TenantContext {
    return this.#role === undefined
      ? { tenantId: actor.tenantId, userId: actor.userId }
      : { tenantId: actor.tenantId, userId: actor.userId, role: this.#role };
  }

  async listDepartments(actor: Actor, query: DepartmentListQuery): Promise<DepartmentListResult> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const totalRes = await client.query<{ count: string }>(
        'SELECT count(*)::text AS count FROM tenant.departments WHERE tenant_id = $1',
        [actor.tenantId],
      );
      const total = Number(totalRes.rows[0]?.count ?? '0');

      const params: unknown[] = [actor.tenantId];
      let keyset = '';
      if (query.cursor !== null) {
        keyset = 'AND (created_at, id) < ($2, $3)';
        params.push(query.cursor.ts, query.cursor.id);
      }
      params.push(query.limit + 1);

      const res = await client.query<DepartmentRow>(
        `SELECT ${COLUMNS}
           FROM tenant.departments
          WHERE tenant_id = $1
            ${keyset}
          ORDER BY created_at DESC, id DESC
          LIMIT $${params.length}`,
        params,
      );

      const hasMore = res.rows.length > query.limit;
      const rows = hasMore ? res.rows.slice(0, query.limit) : res.rows;
      return { items: rows.map(toRecord), total, hasMore };
    });
  }

  async createDepartment(actor: Actor, input: DepartmentCreate): Promise<DepartmentRecord> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const res = await client.query<DepartmentRow>(
        `INSERT INTO tenant.departments (tenant_id, name, code)
           VALUES ($1, $2, $3)
         RETURNING ${COLUMNS}`,
        [actor.tenantId, input.name, input.code ?? null],
      );

      const row = res.rows[0];
      if (row === undefined) {
        throw new Error('department row missing after insert');
      }

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'department.create',
        resourceType: 'department',
        resourceId: row.id,
        outcome: 'success',
        metadata: { name: input.name },
      });

      return toRecord(row);
    });
  }

  async updateDepartment(
    actor: Actor,
    id: string,
    input: DepartmentUpdate,
  ): Promise<DepartmentRecord | null> {
    return withTenant(this.#pool, this.#context(actor), async (client) => {
      const sets: string[] = [];
      const params: unknown[] = [actor.tenantId, id];
      let idx = 3;

      if (input.name !== undefined) {
        sets.push(`name = $${idx++}`);
        params.push(input.name);
      }
      if (input.code !== undefined) {
        sets.push(`code = $${idx++}`);
        params.push(input.code);
      }
      if (input.status !== undefined) {
        sets.push(`status = $${idx++}`);
        params.push(input.status);
      }

      const res = await client.query<DepartmentRow>(
        `UPDATE tenant.departments
            SET ${sets.join(', ')}, updated_at = now()
          WHERE tenant_id = $1 AND id = $2
         RETURNING ${COLUMNS}`,
        params,
      );

      const row = res.rows[0];
      if (row === undefined) return null;

      await new PgAuditWriter(client).append({
        tenantId: actor.tenantId,
        actorType: 'user',
        actorId: actor.userId,
        action: 'department.update',
        resourceType: 'department',
        resourceId: row.id,
        outcome: 'success',
        metadata: input as unknown as Record<string, unknown>,
      });

      return toRecord(row);
    });
  }
}
