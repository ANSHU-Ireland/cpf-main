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
import type { TenantDetailView, TenantStatus } from '../../../lib/types';

const TONE: Record<TenantStatus, BadgeTone> = {
  active: 'success',
  trial: 'info',
  suspended: 'warning',
  archived: 'neutral',
};

const STATUSES: readonly TenantStatus[] = ['active', 'trial', 'suspended', 'archived'];

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

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
      <span style={{ color: 'var(--color-muted)' }}>{label}</span>
      <span style={{ color: 'var(--color-ink)', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export default function TenantDetailPage(): React.JSX.Element {
  const headingId = useId();
  const statusId = useId();
  const params = useParams<{ id: string }>();
  const load = useCallback(() => apiClient.getTenant(params.id), [params.id]);
  const { state, reload, setData } = useAsync<TenantDetailView>(load);
  const [next, setNext] = useState<TenantStatus>('active');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const updated = await apiClient.setTenantStatus(params.id, next);
      setData(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not change the status.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Tenant detail and status"
        description="Inspect tenant configuration and guarded lifecycle actions. No AI output on this surface."
      />
      <AsyncBoundary state={state} onRetry={reload} label="tenant">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Record summary">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{data.name}</h2>
                <StatusBadge tone={TONE[data.status]}>{data.status}</StatusBadge>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 2)',
                }}
              >
                <Row label="Slug" value={data.slug} />
                <Row label="Plan" value={data.plan} />
                <Row label="Region" value={data.region} />
                <Row label="Seats" value={`${data.seatsUsed} / ${data.seatsLimit}`} />
              </div>
            </Card>
            <Card as="section" aria-label="Change status">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Change status</h2>
              <p style={{ margin: '0 0 12px', color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                A human initiates and confirms this consequential action.
              </p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 2)',
                }}
              >
                <label htmlFor={statusId} style={{ fontWeight: 600 }}>
                  New status
                </label>
                <select
                  id={statusId}
                  value={next}
                  onChange={(e) => setNext(e.target.value as TenantStatus)}
                  style={fieldStyle}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                {error ? (
                  <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                    {error}
                  </p>
                ) : null}
                <div>
                  <Button disabled={busy} onClick={() => void change()}>
                    {busy ? 'Saving…' : 'Change status'}
                  </Button>
                </div>
              </div>
            </Card>
            <Card>
              <div
                style={{ display: 'flex', gap: 'calc(var(--space-unit) * 3)', flexWrap: 'wrap' }}
              >
                <Link href={`/admin/tenants/${params.id}/staff`} style={linkStyle}>
                  Staff and roles
                </Link>
                <Link href={`/admin/tenants/${params.id}/subscription`} style={linkStyle}>
                  Plans and subscription
                </Link>
                <Link href="/admin/tenants" style={linkStyle}>
                  Back to tenants
                </Link>
              </div>
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
