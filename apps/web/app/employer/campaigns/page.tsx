'use client';

import { useCallback, useId } from 'react';
import Link from 'next/link';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { CampaignStatus, CampaignView, Collection } from '../../lib/types';

const TONE: Record<CampaignStatus, BadgeTone> = {
  draft: 'neutral',
  blocked: 'danger',
  active: 'success',
  paused: 'warning',
  closed: 'neutral',
  archived: 'neutral',
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

export default function CampaignsPage(): React.JSX.Element {
  const headingId = useId();
  const load = useCallback(() => apiClient.getCampaigns(), []);
  const { state, reload } = useAsync<Collection<CampaignView>>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Campaigns"
        description="Hiring campaigns. Activation is gated by preflight checks that must be resolved first."
      />
      <div>
        <Link href="/employer/campaigns/new" style={linkStyle}>
          New campaign
        </Link>
      </div>
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="campaigns"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No campaigns yet"
        emptyBody="Create your first campaign to begin inviting candidates."
      >
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            {data.items.map((c) => (
              <Card key={c.id} as="article" aria-label={c.name}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{c.name}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {c.roleTitle} · {c.candidateCount} candidates
                      {c.openBlockers > 0 ? ` · ${String(c.openBlockers)} open blockers` : ''}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[c.status]}>{c.status}</StatusBadge>
                </div>
                <div style={{ marginTop: 'calc(var(--space-unit) * 3)' }}>
                  <Link href={`/employer/campaigns/${c.id}`} style={linkStyle}>
                    Open campaign
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
