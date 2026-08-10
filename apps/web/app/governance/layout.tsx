import { AppShell } from '../components/AppShell';
import type { NavItem } from '../components/SidebarNav';

const GOVERNANCE_NAV: readonly NavItem[] = [
  { label: 'Overview', href: '/governance' },
  { label: 'AI systems', href: '/governance/ai-systems' },
  { label: 'Classifications', href: '/governance/classifications' },
  { label: 'Risks', href: '/governance/risks' },
  { label: 'Datasets', href: '/governance/datasets' },
  { label: 'Technical docs', href: '/governance/technical-docs' },
  { label: 'QMS', href: '/governance/qms' },
  { label: 'Data-use', href: '/governance/data-use' },
  { label: 'Impact assessments', href: '/governance/impact-assessments' },
  { label: 'Oversight', href: '/governance/oversight' },
  { label: 'Deployer instructions', href: '/governance/deployer-instructions' },
  { label: 'AI literacy', href: '/governance/ai-literacy' },
  { label: 'Conformity', href: '/governance/conformity' },
  { label: 'Market access', href: '/governance/market-access' },
  { label: 'Post-market', href: '/governance/post-market' },
  { label: 'Signals', href: '/governance/signals' },
  { label: 'Incidents', href: '/governance/incidents' },
  { label: 'Vendors', href: '/governance/vendors' },
  { label: 'Changes', href: '/governance/changes' },
  { label: 'Evidence', href: '/audit/evidence' },
  { label: 'Traceability', href: '/audit/traceability' },
];

export default function GovernanceLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <AppShell
      homeHref="/governance"
      workspaceLabel="Governance & Audit"
      navLabel="Governance"
      navItems={GOVERNANCE_NAV}
    >
      {children}
    </AppShell>
  );
}
