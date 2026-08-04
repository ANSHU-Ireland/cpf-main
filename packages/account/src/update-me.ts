import { can, type Permission } from '@cpf/policy';
import { ACCOUNT_PERMISSIONS, AUTHENTICATED_ROLE } from './permissions.js';
import type { AccountRepository } from './repository.js';
import type {
  Actor,
  MembershipRecord,
  ProfileUpdate,
  UserProfileDto,
  UserRecord,
} from './types.js';

export interface UpdateMeDeps {
  readonly repository: AccountRepository;
  readonly permissions?: readonly Permission[];
}

export type UpdateMeResult =
  | { readonly ok: true; readonly profile: UserProfileDto }
  | { readonly ok: false; readonly status: 403 | 404; readonly reason: string };

/**
 * `patch_me` use-case: deny-by-default authorization, then a tenant-scoped, audited profile update.
 * Validation of the raw body happens at the HTTP boundary via `parseProfileUpdate`.
 */
export async function updateMe(
  deps: UpdateMeDeps,
  actor: Actor,
  patch: ProfileUpdate,
): Promise<UpdateMeResult> {
  const permissions = deps.permissions ?? ACCOUNT_PERMISSIONS;
  const decision = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: [...actor.roles, AUTHENTICATED_ROLE] },
    'write',
    { type: 'self_profile', tenantId: actor.tenantId },
    permissions,
  );
  if (!decision.allowed) {
    return { ok: false, status: 403, reason: decision.reason };
  }

  const { user, membership } = await deps.repository.applyProfileUpdate(actor, patch);
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
