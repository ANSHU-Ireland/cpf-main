'use client';

import { useCallback, useId, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../components/StatusBadge';
import { AsyncBoundary } from '../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../lib/api-client';
import { useAsync } from '../../../lib/useAsync';
import type { CampaignStatus, CampaignView } from '../../../lib/types';

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

export default function CampaignDetailPage(): React.JSX.Element {
  const headingId = useId();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const load = useCallback(() => apiClient.getCampaign(id), [id]);
  const { state, reload, setData } = useAsync<CampaignView>(load);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: CampaignStatus): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const updated = await apiClient.setCampaignStatus(id, next);
      setData(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update the campaign.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Campaign"
        description="Manage this campaign's lifecycle. Activation requires all preflight blockers to be resolved."
      />
      <AsyncBoundary state={state} onRetry={reload} label="campaign">
        {(c) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card>
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 2)',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{c.name}</h2>
                  <p style={{ margin: 0, color: 'var(--color-muted)' }}>
                    {c.roleTitle} · {c.candidateCount} candidates
                  </p>
                </div>
                <StatusBadge tone={TONE[c.status]}>{c.status}</StatusBadge>
              </div>
              {c.openBlockers > 0 ? (
                <p style={{ margin: '12px 0 0', color: 'var(--color-red)' }}>
                  {c.openBlockers} preflight blocker(s) must be resolved before activation.
                </p>
              ) : null}
              {error ? (
                <p role="alert" style={{ margin: '12px 0 0', color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 3)',
                  flexWrap: 'wrap',
                  marginTop: 'calc(var(--space-unit) * 4)',
                }}
              >
                <Button
                  disabled={busy || c.openBlockers > 0 || c.status === 'active'}
                  onClick={() => void setStatus('active')}
                >
                  Activate
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || c.status !== 'active'}
                  onClick={() => void setStatus('paused')}
                >
                  Pause
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || c.status === 'closed' || c.status === 'archived'}
                  onClick={() => void setStatus('closed')}
                >
                  Close
                </Button>
              </div>
            </Card>
            <Card>
              <div
                style={{ display: 'flex', gap: 'calc(var(--space-unit) * 3)', flexWrap: 'wrap' }}
              >
                <Link href={`/employer/campaigns/${id}/preflight`} style={linkStyle}>
                  Preflight checks
                </Link>
                <Link href={`/employer/campaigns/${id}/dashboard`} style={linkStyle}>
                  Operations
                </Link>
                <Link href={`/employer/campaigns/${id}/comparison`} style={linkStyle}>
                  Comparison
                </Link>
              </div>
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
