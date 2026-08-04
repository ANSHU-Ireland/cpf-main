import type { Permission } from '@cpf/policy';

/**
 * Machine role code assumed for the "Employer Admin" human role (ASM-13). The mapping from
 * `iam.membership_roles` to actor roles is owned by the (unbuilt) auth layer; tests pass it explicitly.
 */
export const EMPLOYER_ADMIN_ROLE = 'employer_admin';

/** Minimal grants for the Employer Admin organisation surface. */
export const ORG_PERMISSIONS: readonly Permission[] = [
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'organization' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'organization' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'organization_member' },
];
