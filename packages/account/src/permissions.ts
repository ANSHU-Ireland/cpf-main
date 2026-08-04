import type { Permission } from '@cpf/policy';

/** Implicit role every authenticated caller holds; models "All authenticated users". */
export const AUTHENTICATED_ROLE = 'authenticated';

/** Minimal grant for `get_me`: any authenticated user may read their own profile. */
export const ACCOUNT_PERMISSIONS: readonly Permission[] = [
  { role: AUTHENTICATED_ROLE, action: 'read', resourceType: 'self_profile' },
  { role: AUTHENTICATED_ROLE, action: 'write', resourceType: 'self_profile' },
  { role: AUTHENTICATED_ROLE, action: 'read', resourceType: 'self_session' },
  { role: AUTHENTICATED_ROLE, action: 'write', resourceType: 'self_session' },
];
