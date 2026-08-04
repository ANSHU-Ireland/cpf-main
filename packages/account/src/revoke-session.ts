import { can, type Permission } from '@cpf/policy';
import { ACCOUNT_PERMISSIONS, AUTHENTICATED_ROLE } from './permissions.js';
import type { SessionRepository } from './session-repository.js';
import type { Actor } from './types.js';

export interface RevokeSessionDeps {
  readonly repository: SessionRepository;
  readonly permissions?: readonly Permission[];
}

export type RevokeSessionResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly status: 403 | 404; readonly reason: string };

const DEFAULT_REASON = 'user_revoked';

/** `delete_me_sessions_sessionId`: deny-by-default, audited revocation of the caller's own session. */
export async function revokeSession(
  deps: RevokeSessionDeps,
  actor: Actor,
  sessionId: string,
  reason: string = DEFAULT_REASON,
): Promise<RevokeSessionResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: [...actor.roles, AUTHENTICATED_ROLE] },
    'write',
    { type: 'self_session', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const revoked = await deps.repository.revokeSession(actor, sessionId, reason);
  if (!revoked) {
    return { ok: false, status: 404, reason: 'session not found or already revoked' };
  }
  return { ok: true };
}
