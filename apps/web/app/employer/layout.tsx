import type { ReactNode } from 'react';
import { AppShell } from '../components/AppShell';
import type { NavItem } from '../components/SidebarNav';

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/employer', label: 'Dashboard', exact: true },
  { href: '/employer/organization', label: 'Organisation' },
  { href: '/employer/members', label: 'Members' },
  { href: '/employer/structure', label: 'Structure' },
  { href: '/employer/campaigns', label: 'Campaigns' },
  { href: '/employer/candidates', label: 'Candidates' },
  { href: '/employer/invitations', label: 'Invitations' },
  { href: '/employer/scheduling', label: 'Scheduling' },
  { href: '/employer/accommodations', label: 'Accommodations' },
  { href: '/employer/reviewers', label: 'Reviewers' },
  { href: '/employer/assignments', label: 'Assignments' },
  { href: '/employer/reports', label: 'Reports' },
  { href: '/employer/integrations', label: 'Integrations' },
  { href: '/employer/templates', label: 'Templates' },
  { href: '/employer/readiness', label: 'Readiness' },
];

export default function EmployerLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <AppShell
      navLabel="Employer"
      navItems={NAV_ITEMS}
      homeHref="/employer"
      workspaceLabel="Employer"
    >
      {children}
    </AppShell>
  );
}
