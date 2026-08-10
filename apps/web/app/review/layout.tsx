'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '../components/AppShell';
import type { NavItem } from '../components/SidebarNav';

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/review', label: 'Queue', exact: true },
  { href: '/review', label: 'Assignments', exact: true },
  { href: '/review/training', label: 'Training' },
  { href: '/review/availability', label: 'Availability' },
  { href: '/review/profile', label: 'Profile' },
];

export default function ReviewLayout({ children }: { children: ReactNode }): React.JSX.Element {
  const pathname = usePathname();
  const assignmentBase = pathname.match(/^\/review\/assignment\/[^/]+/)?.[0];
  const navItems: readonly NavItem[] =
    assignmentBase === undefined
      ? NAV_ITEMS
      : [
          { href: '/review', label: 'Queue', exact: true },
          { href: assignmentBase, label: 'Assignments' },
          { href: '/review/training', label: 'Training' },
          { href: '/review/availability', label: 'Availability' },
          { href: '/review/profile', label: 'Profile' },
        ];
  return (
    <AppShell
      navLabel="Reviewer"
      navItems={navItems}
      homeHref="/review"
      workspaceLabel="Employer Reviewer"
    >
      {children}
    </AppShell>
  );
}
