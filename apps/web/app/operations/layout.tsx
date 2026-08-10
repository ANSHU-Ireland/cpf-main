import { type ReactNode } from 'react';
import { AppShell } from '../components/AppShell';
import type { NavItem } from '../components/SidebarNav';

const OPERATIONS_NAV: readonly NavItem[] = [
  { label: 'Dashboard', href: '/operations' },
  { label: 'Security & Incident', href: '/operations/incident' },
  { label: 'Integration Deliveries', href: '/operations/deliveries' },
  { label: '← Back to Home', href: '/' },
];

export default function OperationsLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      navLabel="Operations"
      workspaceLabel="Operations"
      homeHref="/operations"
      navItems={OPERATIONS_NAV}
    >
      {children}
    </AppShell>
  );
}
