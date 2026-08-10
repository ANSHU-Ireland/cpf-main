import { type ReactNode } from 'react';
import { AppShell } from '../components/AppShell';
import type { NavItem } from '../components/SidebarNav';

const SUPPORT_NAV: readonly NavItem[] = [
  { label: 'Support queue', href: '/support' },
  { label: 'JIT access', href: '/support/access' },
  { label: '← Back to Home', href: '/' },
];

export default function SupportLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      navLabel="Support"
      workspaceLabel="Support"
      homeHref="/support"
      navItems={SUPPORT_NAV}
    >
      {children}
    </AppShell>
  );
}
