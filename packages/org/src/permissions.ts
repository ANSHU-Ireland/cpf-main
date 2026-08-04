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
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'organization_member' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'department' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'department' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'team' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'team' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'campaign' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'campaign' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'campaign_reviewer' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'campaign_reviewer' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'application' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'application' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'reviewer_profile' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'reviewer_profile' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'invitation' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'invitation' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'candidate' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'candidate' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'accommodation' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'accommodation' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'notice_acknowledgement' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'notice_acknowledgement' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'assessment' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'assessment' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'ai_model' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'ai_model' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'read', resourceType: 'review_assignment' },
  { role: EMPLOYER_ADMIN_ROLE, action: 'write', resourceType: 'review_assignment' },
];
