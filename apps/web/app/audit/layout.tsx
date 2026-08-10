import { AppShell } from '../components/AppShell';
import type { NavItem } from '../components/SidebarNav';

const AUDIT_NAV: readonly NavItem[] = [
  { label: 'Evidence collections', href: '/audit/evidence' },
  { label: 'Traceability', href: '/audit/traceability' },
  { label: '← Back to Governance', href: '/governance' },
];

export default function AuditLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <AppShell
      homeHref="/audit/evidence"
      workspaceLabel="Governance & Audit"
      navLabel="Audit"
      navItems={AUDIT_NAV}
    >
      {children}
    </AppShell>
  );
}
