import type { ReactNode } from 'react';
import { AppShell } from '../components/AppShell';
import type { NavItem } from '../components/SidebarNav';

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/admin', label: 'Command centre', exact: true },
  { href: '/admin/tenants', label: 'Tenants' },
  { href: '/admin/feature-flags', label: 'Feature flags' },
  { href: '/admin/jobs', label: 'Background jobs' },
  { href: '/admin/audit', label: 'Audit' },
  { href: '/admin/releases', label: 'Releases' },
  { href: '/admin/support', label: 'Support' },
  { href: '/admin/privileged-access', label: 'Privileged access' },
];

export default function AdminLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <AppShell navLabel="Platform" navItems={NAV_ITEMS} homeHref="/admin" workspaceLabel="Platform">
      {children}
    </AppShell>
  );
}
