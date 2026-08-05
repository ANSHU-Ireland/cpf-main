import type { Permission } from '@cpf/policy';

/**
 * Machine role code for platform staff operating the `/admin` surface. The mapping from
 * `iam.membership_roles` to actor roles is owned by the (unbuilt) auth layer; tests pass it
 * explicitly. Platform staff cross tenant boundaries via `isPlatformStaff` on the policy actor.
 */
export const PLATFORM_STAFF_ROLE = 'platform_staff';

/** Grants for the platform administration surface. */
export const ADMIN_PERMISSIONS: readonly Permission[] = [
  { role: PLATFORM_STAFF_ROLE, action: 'read', resourceType: 'platform_tenant' },
  { role: PLATFORM_STAFF_ROLE, action: 'write', resourceType: 'platform_tenant' },
  { role: PLATFORM_STAFF_ROLE, action: 'read', resourceType: 'platform_staff' },
  { role: PLATFORM_STAFF_ROLE, action: 'write', resourceType: 'platform_staff' },
  { role: PLATFORM_STAFF_ROLE, action: 'read', resourceType: 'platform_plan' },
  { role: PLATFORM_STAFF_ROLE, action: 'write', resourceType: 'platform_plan' },
  { role: PLATFORM_STAFF_ROLE, action: 'read', resourceType: 'platform_feature_flag' },
  { role: PLATFORM_STAFF_ROLE, action: 'write', resourceType: 'platform_feature_flag' },
  { role: PLATFORM_STAFF_ROLE, action: 'read', resourceType: 'platform_release' },
  { role: PLATFORM_STAFF_ROLE, action: 'read', resourceType: 'platform_audit' },
  { role: PLATFORM_STAFF_ROLE, action: 'write', resourceType: 'platform_audit' },
  { role: PLATFORM_STAFF_ROLE, action: 'read', resourceType: 'platform_job' },
  { role: PLATFORM_STAFF_ROLE, action: 'write', resourceType: 'platform_job' },
  { role: PLATFORM_STAFF_ROLE, action: 'read', resourceType: 'platform_maintenance' },
  { role: PLATFORM_STAFF_ROLE, action: 'write', resourceType: 'platform_maintenance' },
  { role: PLATFORM_STAFF_ROLE, action: 'read', resourceType: 'platform_support_case' },
  { role: PLATFORM_STAFF_ROLE, action: 'write', resourceType: 'platform_support_case' },
  { role: PLATFORM_STAFF_ROLE, action: 'write', resourceType: 'platform_privileged_access' },
];
