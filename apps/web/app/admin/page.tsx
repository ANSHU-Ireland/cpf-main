'use client';

import { useCallback, useId } from 'react';
import Link from 'next/link';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { StatusBadge, type BadgeTone } from '../components/StatusBadge';
import { AsyncBoundary } from '../components/AsyncBoundary';
import { apiClient } from '../lib/api-client';
import { useAsync } from '../lib/useAsync';
import type { AdminDashboardView } from '../lib/types';

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

const ALERT_TONE: Record<string, BadgeTone> = {
  danger: 'danger',
  warning: 'warning',
  info: 'info',
};

function Stat({ label, value }: { label: string; value: number | null }): React.JSX.Element {
  return (
    <Card as="article" aria-label={label}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 1)' }}>
        <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-ink)' }}>
          {value ?? '—'}
        </span>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{label}</span>
      </div>
    </Card>
  );
}

export default function AdminDashboardPage(): React.JSX.Element {
  const headingId = useId();
  const load = useCallback(() => apiClient.getAdminDashboard(), []);
  const { state, reload } = useAsync<AdminDashboardView>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Platform command centre"
        description="Cross-tenant operational health with strict privilege boundaries. No AI output on this surface."
      />
      <AsyncBoundary state={state} onRetry={reload} label="platform overview">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}
          >
            <div style={gridStyle}>
              <Stat label="Tenants" value={data.tenants} />
              <Stat label="Active incidents" value={data.activeIncidents} />
              <Stat label="Failed jobs" value={data.failedJobs} />
              <Stat label="Open access grants" value={data.openAccessGrants} />
            </div>
            <Card as="section" aria-label="Alerts">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Alerts</h2>
              {data.alerts.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--color-muted)' }}>No open alerts.</p>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {data.alerts.map((a) => (
                    <li
                      key={a.id}
                      style={{
                        display: 'flex',
                        gap: 'calc(var(--space-unit) * 2)',
                        alignItems: 'center',
                        padding: 'calc(var(--space-unit) * 2) 0',
                        borderBottom: '1px solid var(--color-line)',
                      }}
                    >
                      <StatusBadge tone={ALERT_TONE[a.severity] ?? 'neutral'}>
                        {a.severity}
                      </StatusBadge>
                      <span style={{ color: 'var(--color-ink)' }}>{a.message}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <div
                style={{ display: 'flex', gap: 'calc(var(--space-unit) * 3)', flexWrap: 'wrap' }}
              >
                <Link href="/admin/tenants" style={linkStyle}>
                  Tenants
                </Link>
                <Link href="/admin/jobs" style={linkStyle}>
                  Background jobs
                </Link>
                <Link href="/admin/privileged-access" style={linkStyle}>
                  Privileged access
                </Link>
              </div>
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
