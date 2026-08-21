'use client';

import Link from 'next/link';
import { ArrowRight, FileText, Robot, ShieldCheck, WarningDiamond } from '@phosphor-icons/react';
import { useCallback, useId, useState } from 'react';
import { AsyncBoundary } from '../components/AsyncBoundary';
import { Card } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { apiClient } from '../lib/api-client';
import type {
  AiSystemView,
  Collection,
  MarketAccessView,
  RiskView,
  SeriousIncidentView,
} from '../lib/types';
import { useAsync } from '../lib/useAsync';

interface GovernanceOverview {
  readonly systems: Collection<AiSystemView>;
  readonly risks: Collection<RiskView>;
  readonly marketAccess: Collection<MarketAccessView>;
  readonly incidents: Collection<SeriousIncidentView>;
}

const QUICK_LINKS = [
  {
    href: '/governance/ai-systems',
    label: 'AI system inventory',
    description: 'Register systems and review purpose, classification and ownership.',
    icon: Robot,
  },
  {
    href: '/governance/risks',
    label: 'Risk and controls',
    description: 'Review material risks, controls, residual exposure and accountability.',
    icon: WarningDiamond,
  },
  {
    href: '/governance/technical-docs',
    label: 'Technical evidence',
    description: 'Maintain versioned documentation and audit-ready references.',
    icon: FileText,
  },
  {
    href: '/governance/conformity',
    label: 'Conformity readiness',
    description: 'Record human decisions, rationale, tests and remaining gaps.',
    icon: ShieldCheck,
  },
] as const;

export default function GovernanceOverviewPage(): React.JSX.Element {
  const headingId = useId();
  const [data, setData] = useState<GovernanceOverview | null>(null);

  const loader = useCallback(async () => {
    const [systems, risks, marketAccess, incidents] = await Promise.all([
      apiClient.getAiSystems(),
      apiClient.getRisks(),
      apiClient.getMarketAccess(),
      apiClient.getIncidents(),
    ]);
    const overview = { systems, risks, marketAccess, incidents };
    setData(overview);
    return overview;
  }, []);

  const { state, reload } = useAsync<GovernanceOverview>(loader);
  const risksNeedingAttention =
    data?.risks.items.filter((risk) => risk.status === 'attention') ?? [];
  const openIncidents =
    data?.incidents.items.filter((incident) => incident.status !== 'complete') ?? [];
  const completedMarketSteps =
    data?.marketAccess.items.filter((record) => record.status === 'complete').length ?? 0;

  return (
    <>
      <PageHeader
        title="Governance overview"
        description="See what needs attention first, then move into the evidence and decision record."
        headingId={headingId}
        actions={
          <Link
            href="/governance/ai-systems"
            className="inline-flex min-h-target items-center gap-2 rounded-control bg-blue px-5 font-semibold text-paper no-underline hover:brightness-95"
          >
            Review systems <ArrowRight size={18} aria-hidden />
          </Link>
        }
      />

      <AsyncBoundary state={state} onRetry={reload} label="Governance overview">
        {() => (
          <div className="space-y-6">
            <section
              aria-label="Governance status"
              className="grid grid-cols-1 gap-4 md:grid-cols-4"
            >
              <Card>
                <p className="m-0 text-sm text-muted">Registered systems</p>
                <p className="mb-0 mt-2 text-2xl font-semibold text-ink">
                  {data?.systems.total ?? 0}
                </p>
              </Card>
              <Card>
                <p className="m-0 text-sm text-muted">Risks needing attention</p>
                <p className="mb-0 mt-2 text-2xl font-semibold text-ink">
                  {risksNeedingAttention.length}
                </p>
              </Card>
              <Card>
                <p className="m-0 text-sm text-muted">Open incidents</p>
                <p className="mb-0 mt-2 text-2xl font-semibold text-ink">{openIncidents.length}</p>
              </Card>
              <Card>
                <p className="m-0 text-sm text-muted">Market-access steps</p>
                <p className="mb-0 mt-2 text-2xl font-semibold text-ink">
                  {completedMarketSteps}/{data?.marketAccess.total ?? 0}
                </p>
              </Card>
            </section>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
              <Card aria-label="Governance work areas">
                <div className="mb-4">
                  <h2 className="m-0 text-lg font-semibold text-ink">Start with the task</h2>
                  <p className="mb-0 mt-1 text-sm text-muted">
                    Each area explains the record you are about to update.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {QUICK_LINKS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="group rounded-control border border-line p-4 no-underline hover:border-blue hover:bg-blue-soft"
                      >
                        <Icon size={22} color="var(--color-blue)" aria-hidden />
                        <h3 className="mb-0 mt-3 text-sm font-semibold text-blue group-hover:underline">
                          {item.label}
                        </h3>
                        <p className="mb-0 mt-2 text-sm leading-5 text-muted">{item.description}</p>
                      </Link>
                    );
                  })}
                </div>
              </Card>

              <Card aria-label="Governance priorities">
                <h2 className="mb-4 mt-0 text-lg font-semibold text-ink">Priority checks</h2>
                <div className="divide-y divide-line border-t border-line">
                  <Link href="/governance/risks" className="block py-4 no-underline">
                    <div className="mb-2 flex items-center gap-2">
                      <StatusBadge tone={risksNeedingAttention.length ? 'warning' : 'success'}>
                        {risksNeedingAttention.length ? 'Review' : 'Ready'}
                      </StatusBadge>
                    </div>
                    <p className="m-0 text-sm font-medium text-ink">
                      {risksNeedingAttention.length} risk record
                      {risksNeedingAttention.length === 1 ? '' : 's'} need attention
                    </p>
                  </Link>
                  <Link href="/governance/incidents" className="block py-4 no-underline">
                    <div className="mb-2 flex items-center gap-2">
                      <StatusBadge tone={openIncidents.length ? 'danger' : 'success'}>
                        {openIncidents.length ? 'Escalate' : 'Clear'}
                      </StatusBadge>
                    </div>
                    <p className="m-0 text-sm font-medium text-ink">
                      {openIncidents.length} incident{openIncidents.length === 1 ? '' : 's'} remain
                      open
                    </p>
                  </Link>
                  <Link href="/governance/market-access" className="block py-4 no-underline">
                    <div className="mb-2 flex items-center gap-2">
                      <StatusBadge tone="info">Evidence</StatusBadge>
                    </div>
                    <p className="m-0 text-sm font-medium text-ink">
                      {completedMarketSteps} of {data?.marketAccess.total ?? 0} market-access steps
                      complete
                    </p>
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
