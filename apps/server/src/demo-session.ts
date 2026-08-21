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

function hasPlatformRole(session: DemoSession, role: string): boolean {
  return session.scopes.some((scope) => scope.role === role && scope.scopeType === 'platform');
}

export function authorizeDemoOperation(
  session: DemoSession,
  operationId: string,
  params: Readonly<Record<string, string>>,
): boolean {
  // employer_admin: full access to everything non-admin
  if (hasScope(session, 'employer_admin', session.actor.tenantId)) return true;

  // system_admin: access to all admin/* operations
  if (hasPlatformRole(session, 'system_admin') || hasPlatformRole(session, 'platform_staff')) {
    if (
      operationId.startsWith('get_admin') ||
      operationId.startsWith('post_admin') ||
      operationId.startsWith('put_admin') ||
      operationId.startsWith('patch_admin') ||
      operationId.startsWith('delete_admin')
    )
      return true;
    return true; // system_admin can do everything
  }

  if (
    (operationId.startsWith('get_admin') ||
      operationId.startsWith('post_admin') ||
      operationId.startsWith('put_admin') ||
      operationId.startsWith('patch_admin') ||
      operationId.startsWith('delete_admin')) &&
    hasPlatformRole(session, 'operations_admin')
  ) {
    return operationId.includes('jobs') || operationId.includes('maintenance');
  }

  if (
    session.actor.roles.includes('support_agent') &&
    (operationId === 'get_admin_support_cases' ||
      operationId === 'post_admin_support_cases_caseId_assignment' ||
      operationId === 'put_admin_support_cases_caseId_status')
  ) {
    return true;
  }

  // employer_admin_approver: only decision approvals
  if (hasScope(session, 'employer_admin_approver', session.actor.tenantId)) {
    return operationId === 'post_decisions_decisionId_approvals';
  }

  // A reviewer may list their queue before an assignment id is available.
  if (operationId === 'get_review_assignments') {
    return session.actor.roles.includes('reviewer');
  }

  // reviewer: assignment-scoped operations
  if (operationId.includes('review_assignments_')) {
    return hasScope(session, 'reviewer', params['assignmentId'] ?? '');
  }

  // candidate: attempt operations
  if (operationId.includes('attempts_attemptId')) {
    return hasScope(session, 'candidate', params['attemptId'] ?? '');
  }

  // Candidate booking reads and writes are ownership-scoped again in PgBookingRepository.
  if (
    operationId === 'get_applications_applicationId_bookings' ||
    operationId === 'post_applications_applicationId_bookings' ||
    operationId === 'put_bookings_bookingId'
  ) {
    return session.actor.roles.includes('candidate');
  }

  if (
    (operationId.startsWith('get_support') ||
      operationId.startsWith('post_support') ||
      operationId.startsWith('put_support') ||
      operationId.startsWith('delete_support')) &&
    session.actor.roles.includes('support_agent')
  ) {
    return true;
  }

  if (
    (operationId.startsWith('get_operations') ||
      operationId.startsWith('post_operations') ||
      operationId.startsWith('put_operations') ||
      operationId.startsWith('delete_operations')) &&
    session.actor.roles.includes('operations_admin')
  ) {
    return true;
  }

  if (
    (operationId.startsWith('get_audit') || operationId.startsWith('post_audit')) &&
    session.actor.roles.includes('auditor')
  ) {
    return true;
  }

  // All authenticated users can access /me/* endpoints
  if (
    operationId.startsWith('get_me') ||
    operationId.startsWith('patch_me') ||
    operationId.startsWith('put_me') ||
    operationId.startsWith('post_me') ||
    operationId.startsWith('delete_me')
  ) {
    return session.actor.userId.length > 0;
  }

  // Candidate portal and data-rights (any authenticated candidate)
  if (
    operationId.startsWith('get_candidate_') ||
    operationId.startsWith('post_candidate_') ||
    operationId.startsWith('put_candidate_') ||
    operationId.startsWith('delete_candidate_')
  ) {
    return session.actor.userId.length > 0;
  }

  // Reviewer profile / availability / training
  if (
    operationId.startsWith('get_reviewer') ||
    operationId.startsWith('patch_reviewer') ||
    operationId.startsWith('put_reviewer') ||
    operationId.startsWith('post_reviewer')
  ) {
    return session.actor.roles.includes('reviewer');
  }

  // Governance operations — governance_officer or employer_admin
  if (
    operationId.startsWith('get_governance') ||
    operationId.startsWith('post_governance') ||
    operationId.startsWith('put_governance') ||
    operationId.startsWith('patch_governance')
  ) {
    return (
      hasScope(session, 'governance_officer', session.actor.tenantId) ||
      session.actor.roles.includes('employer_admin')
    );
  }

  // Auth endpoints — always allowed (they establish sessions)
  if (
    operationId.startsWith('post_auth') ||
    operationId.startsWith('get_auth') ||
    operationId.startsWith('delete_auth')
  ) {
    return true;
  }

  return false;
}
