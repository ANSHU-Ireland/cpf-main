'use client';

import { useCallback, useId, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { SubscriptionView } from '../../../../lib/types';

const fieldStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-line)',
  padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  color: 'var(--color-ink)',
  background: 'var(--color-paper)',
  width: '100%',
  boxSizing: 'border-box',
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

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export default function SubscriptionPage(): React.JSX.Element {
  const headingId = useId();
  const planId = useId();
  const params = useParams<{ id: string }>();
  const load = useCallback(() => apiClient.getSubscription(params.id), [params.id]);
  const { state, reload, setData } = useAsync<SubscriptionView>(load);
  const [plan, setPlan] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const updated = await apiClient.updateSubscription(params.id, plan.trim());
      setData(updated);
      setPlan('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update the subscription.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Plans and subscription"
        description="Assign plan, limits and effective dates. No AI output on this surface."
      />
      <AsyncBoundary state={state} onRetry={reload} label="subscription">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Current subscription">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Current subscription</h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 2)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Plan</span>
                  <span style={{ fontWeight: 600 }}>{data.plan}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Seat limit</span>
                  <span style={{ fontWeight: 600 }}>{data.seatsLimit}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Effective from</span>
                  <span style={{ fontWeight: 600 }}>
                    {data.effectiveFrom === null ? 'Not active' : fmt(data.effectiveFrom)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                  <span style={{ color: 'var(--color-muted)' }}>Renews</span>
                  <span style={{ fontWeight: 600 }}>
                    {data.renewsAt === null ? 'No scheduled end' : fmt(data.renewsAt)}
                  </span>
                </div>
              </div>
            </Card>
            <Card as="section" aria-label="Update subscription">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Update subscription</h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 3)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 1)',
                  }}
                >
                  <label htmlFor={planId} style={{ fontWeight: 600 }}>
                    Plan
                  </label>
                  <input
                    id={planId}
                    value={plan}
                    onChange={(e) => setPlan(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                {error ? (
                  <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                    {error}
                  </p>
                ) : null}
                <div>
                  <Button disabled={busy || plan.trim().length < 2} onClick={() => void update()}>
                    {busy ? 'Saving…' : 'Update subscription'}
                  </Button>
                </div>
              </div>
            </Card>
            <div>
              <Link href={`/admin/tenants/${params.id}`} style={linkStyle}>
                Back to tenant
              </Link>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
