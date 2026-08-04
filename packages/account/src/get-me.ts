import { can, type Permission } from '@cpf/policy';
import { ACCOUNT_PERMISSIONS, AUTHENTICATED_ROLE } from './permissions.js';
import type { AccountRepository } from './repository.js';
import type { Actor, MembershipRecord, UserProfileDto, UserRecord } from './types.js';

export interface GetMeDeps {
  readonly repository: AccountRepository;
  /** Overridable for testing; defaults to the account permission catalog. */
  readonly permissions?: readonly Permission[];
}

export type GetMeResult =
  | { readonly ok: true; readonly profile: UserProfileDto }
  | { readonly ok: false; readonly status: 403 | 404; readonly reason: string };

/**
 * `get_me` use-case: deny-by-default authorization, then a tenant-scoped read of the caller's own
 * profile and role context. Server policy is authoritative; the DB RLS context is defence-in-depth.
 */
export async function getMe(deps: GetMeDeps, actor: Actor): Promise<GetMeResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: [...actor.roles, AUTHENTICATED_ROLE] },
    'read',
    { type: 'self_profile', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const { user, membership } = await deps.repository.findProfileData(actor);
  if (user === null) {
    return { ok: false, status: 404, reason: 'profile not found' };
  }

  return { ok: true, profile: toProfile(user, membership) };
}

function toProfile(user: UserRecord, membership: MembershipRecord | null): UserProfileDto {
  return {
    userId: user.id,
    email: user.email,
    displayName: user.displayName,
    userType: user.userType,
    status: user.status,
    tenant:
      membership === null
        ? null
        : {
            tenantId: membership.tenantId,
            membershipStatus: membership.status,
            roles: membership.roles,
          },
  };
}
