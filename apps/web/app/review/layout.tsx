import type { ReactNode } from 'react';
import { AppShell } from '../components/AppShell';
import type { NavItem } from '../components/SidebarNav';

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/review', label: 'Queue', exact: true },
  { href: '/review/profile', label: 'Profile' },
  { href: '/review/availability', label: 'Availability' },
  { href: '/review/training', label: 'Training' },
];

export default function ReviewLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <AppShell navLabel="Reviewer" navItems={NAV_ITEMS} homeHref="/review" workspaceLabel="Reviewer">
      {children}
    </AppShell>
  );
}
