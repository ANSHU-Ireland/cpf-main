import { AppShell, type AppShellNavLink } from '@cpf/ui';

const AUDIT_NAV: readonly AppShellNavLink[] = [
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
      navLinks={AUDIT_NAV}
    >
      {children}
    </AppShell>
  );
}
