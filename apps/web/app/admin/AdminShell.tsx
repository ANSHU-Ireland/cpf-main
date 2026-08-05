'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '../components/AppShell';
import type { NavItem } from '../components/SidebarNav';

const PLATFORM_NAV: readonly NavItem[] = [
  { href: '/admin', label: 'Command centre', exact: true },
  { href: '/admin/tenants', label: 'Tenants' },
  { href: '/admin/feature-flags', label: 'Feature flags' },
  { href: '/admin/jobs', label: 'Background jobs' },
  { href: '/admin/audit', label: 'Audit' },
  { href: '/admin/releases', label: 'Releases' },
  { href: '/admin/support', label: 'Support' },
  { href: '/admin/privileged-access', label: 'Privileged access' },
];

const ASSESSMENT_NAV: readonly NavItem[] = [
  { href: '/admin/assessments', label: 'Assessments' },
  { href: '/admin/ai-models', label: 'AI models' },
  { href: '/admin/prompts', label: 'Prompts' },
  { href: '/admin/plugins', label: 'Plugins' },
];

const ASSESSMENT_PREFIXES = [
  '/admin/assessments',
  '/admin/ai-models',
  '/admin/prompts',
  '/admin/plugins',
];

export function AdminShell({ children }: { children: ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const isAssessment = ASSESSMENT_PREFIXES.some((p) => pathname.startsWith(p));

  if (isAssessment) {
    return (
      <AppShell
        navLabel="Assessment governance"
        navItems={ASSESSMENT_NAV}
        homeHref="/admin/assessments"
        workspaceLabel="Assessment governance"
      >
        {children}
      </AppShell>
    );
  }

  return (
    <AppShell
      navLabel="Platform"
      navItems={PLATFORM_NAV}
      homeHref="/admin"
      workspaceLabel="Platform"
    >
      {children}
    </AppShell>
  );
}
