/** Navigation hints only. The sign-in API and resource APIs remain authoritative for access. */
export const WORKSPACE_NAMES: Readonly<Record<string, string>> = {
  '/candidate': 'Candidate',
  '/review': 'Reviewer',
  '/employer': 'Employer',
  '/admin': 'Platform administration',
  '/governance': 'Governance',
  '/operations': 'Operations',
  '/support': 'Support',
  '/audit/evidence': 'Audit evidence',
  '/audit/traceability': 'Audit traceability',
};

export function safeWorkspace(value: string | null | undefined): string | undefined {
  return value && Object.hasOwn(WORKSPACE_NAMES, value) ? value : undefined;
}

export function securityEntry(redirectTo?: string): string {
  const workspace = safeWorkspace(redirectTo);
  return `/account/security?passwordResetRequired=true${workspace ? `&workspace=${encodeURIComponent(workspace)}` : ''}`;
}

export function passwordChangedEntry(workspace?: string): string {
  const target = safeWorkspace(workspace);
  return `/sign-in?passwordChanged=true${target ? `&workspace=${encodeURIComponent(target)}` : ''}`;
}
