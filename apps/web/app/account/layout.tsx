import type { ReactNode } from 'react';
import { AppShell } from '../components/AppShell';
import type { NavItem } from '../components/SidebarNav';

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/preferences', label: 'Preferences' },
  { href: '/account/notifications', label: 'Notifications' },
  { href: '/account/sessions', label: 'Sessions' },
  { href: '/account/security', label: 'Security activity' },
  { href: '/account/notices', label: 'Notices' },
  { href: '/account/support', label: 'Support' },
];

export default function AccountLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <AppShell navLabel="Account" navItems={NAV_ITEMS}>
      {children}
    </AppShell>
  );
}
