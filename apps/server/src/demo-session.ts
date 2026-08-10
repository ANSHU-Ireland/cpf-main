import { createHash, timingSafeEqual } from 'node:crypto';
import type { Pool } from 'pg';
import type { Actor } from '@cpf/org';

interface DemoSessionRow {
  readonly user_id: string;
  readonly tenant_id: string;
  readonly role_code: string;
  readonly scope_type: string;
  readonly scope_id: string;
}

export interface DemoAccessScope {
  readonly role: string;
  readonly scopeType: string;
  readonly scopeId: string;
}

export interface DemoSession {
  readonly actor: Actor;
  readonly scopes: readonly DemoAccessScope[];
}

export function parseBearerToken(authorization: string | undefined): string | null {
  if (authorization === undefined) return null;
  const match = /^Bearer ([^\s]+)$/i.exec(authorization.trim());
  return match?.[1] ?? null;
}

export function hashDemoToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function equalIdentity(left: DemoSessionRow, right: DemoSessionRow): boolean {
  const leftBytes = Buffer.from(`${left.tenant_id}:${left.user_id}`);
  const rightBytes = Buffer.from(`${right.tenant_id}:${right.user_id}`);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

export class DemoSessionResolver {
  readonly #pool: Pick<Pool, 'query'>;

  constructor(pool: Pick<Pool, 'query'>) {
    this.#pool = pool;
  }

  async resolve(authorization: string | undefined): Promise<DemoSession | null> {
    const token = parseBearerToken(authorization);
    if (token === null) return null;
    const result = await this.#pool.query<DemoSessionRow>(
      `SELECT session.user_id, membership.tenant_id, role.code AS role_code,
              membership_role.scope_type, membership_role.scope_id
         FROM iam.user_sessions AS session
         JOIN iam.users AS app_user ON app_user.id = session.user_id
         JOIN iam.memberships AS membership ON membership.user_id = session.user_id
         JOIN iam.membership_roles AS membership_role
           ON membership_role.membership_id = membership.id
         JOIN iam.roles AS role ON role.id = membership_role.role_id
        WHERE session.refresh_token_hash = $1
          AND session.revoked_at IS NULL
          AND session.expires_at > now()
          AND app_user.status = 'active'
          AND membership.status = 'active'
          AND membership.starts_at <= now()
          AND (membership.ends_at IS NULL OR membership.ends_at > now())
          AND (membership_role.expires_at IS NULL OR membership_role.expires_at > now())
        ORDER BY role.code, membership_role.scope_type, membership_role.scope_id`,
      [hashDemoToken(token)],
    );
    const first = result.rows[0];
    if (first === undefined || result.rows.some((row) => !equalIdentity(first, row))) return null;
    return {
      actor: {
        userId: first.user_id,
        tenantId: first.tenant_id,
        roles: [...new Set(result.rows.map((row) => row.role_code))],
      },
      scopes: result.rows.map((row) => ({
        role: row.role_code,
        scopeType: row.scope_type,
        scopeId: row.scope_id,
      })),
    };
  }
}

function hasScope(session: DemoSession, role: string, scopeId: string): boolean {
  return session.scopes.some((scope) => scope.role === role && scope.scopeId === scopeId);
}

export function authorizeDemoOperation(
  session: DemoSession,
  operationId: string,
  params: Readonly<Record<string, string>>,
): boolean {
  if (hasScope(session, 'employer_admin', session.actor.tenantId)) return true;
  if (operationId.includes('review_assignments_')) {
    return hasScope(session, 'reviewer', params['assignmentId'] ?? '');
  }
  if (operationId.includes('attempts_attemptId')) {
    return hasScope(session, 'candidate', params['attemptId'] ?? '');
  }
  return false;
}
