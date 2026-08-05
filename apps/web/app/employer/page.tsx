'use client';

import { useCallback, useId } from 'react';
import Link from 'next/link';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { AsyncBoundary } from '../components/AsyncBoundary';
import { apiClient } from '../lib/api-client';
import { useAsync } from '../lib/useAsync';
import type { EmployerDashboardView } from '../lib/types';

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gap: 'calc(var(--space-unit) * 4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
};

const linkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  minHeight: 'var(--target-min)',
  padding: '0 calc(var(--space-unit) * 4)',
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-blue)',
  color: 'var(--color-blue)',
  textDecoration: 'none',
  fontWeight: 600,
};

function Stat({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <Card as="article" aria-label={label}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 1)' }}>
        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-ink)' }}>
          {value}
        </span>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{label}</span>
      </div>
    </Card>
  );
}

export default function EmployerDashboardPage(): React.JSX.Element {
  const headingId = useId();
  const load = useCallback(() => apiClient.getEmployerDashboard(), []);
  const { state, reload } = useAsync<EmployerDashboardView>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Employer dashboard"
        description="An overview of your hiring activity. Candidate identities are pseudonymous and no AI scores are shown."
      />
      <AsyncBoundary state={state} onRetry={reload} label="dashboard">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}
          >
            <p style={{ margin: 0, color: 'var(--color-muted)' }}>{data.orgName}</p>
            <div style={gridStyle}>
              <Stat label="Active campaigns" value={data.activeCampaigns} />
              <Stat label="Open applications" value={data.openApplications} />
              <Stat label="Pending decisions" value={data.pendingDecisions} />
              <Stat label="Pending accommodations" value={data.pendingAccommodations} />
              <Stat label="Unassigned reviews" value={data.unassignedReviews} />
              <Stat label="Readiness blockers" value={data.readinessBlockers} />
            </div>
            <Card>
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 3)',
                  flexWrap: 'wrap',
                }}
              >
                <Link href="/employer/campaigns" style={linkStyle}>
                  Campaigns
                </Link>
                <Link href="/employer/candidates" style={linkStyle}>
                  Candidates
                </Link>
                <Link href="/employer/readiness" style={linkStyle}>
                  Deployment readiness
                </Link>
              </div>
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
