import type { ReactNode } from 'react';
import { AppShell } from '../components/AppShell';
import type { NavItem } from '../components/SidebarNav';

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/candidate', label: 'Home', exact: true },
  { href: '/candidate/profile', label: 'Profile' },
  { href: '/candidate/notices', label: 'Notices' },
  { href: '/candidate/applications', label: 'Applications' },
  { href: '/candidate/practice', label: 'Practice centre' },
  { href: '/candidate/precheck', label: 'System pre-check' },
  { href: '/candidate/accommodations', label: 'Accommodations' },
  { href: '/candidate/schedule', label: 'Scheduling' },
  { href: '/candidate/review-request', label: 'Review requests' },
  { href: '/candidate/data-rights', label: 'Data & privacy' },
  { href: '/candidate/complaints', label: 'Complaints' },
  { href: '/candidate/support', label: 'Support' },
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
