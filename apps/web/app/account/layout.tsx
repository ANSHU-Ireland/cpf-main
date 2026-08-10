import type { ReactNode } from 'react';
import { AppShell } from '../components/AppShell';
import type { NavItem } from '../components/SidebarNav';

const NAV_ITEMS: readonly NavItem[] = [
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/email', label: 'Email' },
  { href: '/account/preferences', label: 'Preferences' },
  { href: '/account/notifications', label: 'Notifications' },
  { href: '/account/sessions', label: 'Sessions' },
  { href: '/account/security', label: 'Security activity' },
  { href: '/account/notices', label: 'Notices' },
  { href: '/account/onboarding', label: 'Onboarding' },
  { href: '/account/privacy', label: 'Data & privacy' },
  { href: '/account/support', label: 'Support' },
];

export default function AccountLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <AppShell navLabel="Shared account" navItems={NAV_ITEMS} workspaceLabel="Account">
      {children}
    </AppShell>
  );
}
