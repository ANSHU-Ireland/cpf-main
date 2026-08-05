import type { ReactNode } from 'react';
import { AppShell } from '../components/AppShell';
import type { NavItem } from '../components/SidebarNav';

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/candidate', label: 'Home', exact: true },
  { href: '/candidate/applications', label: 'Applications' },
  { href: '/candidate/accommodations', label: 'Accommodations' },
  { href: '/candidate/schedule', label: 'Scheduling' },
  { href: '/candidate/data-rights', label: 'Data & privacy' },
  { href: '/candidate/complaints', label: 'Complaints' },
];

export default function CandidateLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <AppShell
      navLabel="Candidate"
      navItems={NAV_ITEMS}
      homeHref="/candidate"
      workspaceLabel="Candidate"
    >
      {children}
    </AppShell>
  );
}
