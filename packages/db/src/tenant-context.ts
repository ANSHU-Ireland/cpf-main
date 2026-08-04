import type { Pool, PoolClient } from 'pg';

export interface TenantContext {
  readonly tenantId: string;
  readonly userId?: string;
  /** Optional least-privilege role to SET LOCAL, so RLS is enforced (superusers bypass RLS). */
  readonly role?: string;
}

function assertSafeIdentifier(id: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(id)) {
    throw new Error(`Unsafe SQL identifier: ${id}`);
  }
}

/**
 * Runs `fn` in a transaction with request-scoped `app.tenant_id`/`app.user_id` GUCs set via
 * set_config (is_local=true), so PostgreSQL RLS (tenant_id = iam.current_tenant_id()) applies.
 * Tenant identity is therefore derived from server-set context, never trusted from a request body.
 */
export async function withTenant<T>(
  pool: Pool,
  ctx: TenantContext,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (ctx.role !== undefined) {
      assertSafeIdentifier(ctx.role);
      await client.query(`SET LOCAL ROLE "${ctx.role}"`);
    }
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [ctx.tenantId]);
    if (ctx.userId !== undefined) {
      await client.query("SELECT set_config('app.user_id', $1, true)", [ctx.userId]);
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
