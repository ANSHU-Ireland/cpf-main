'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, ReleaseStatus, ReleaseView } from '../../lib/types';

const TONE: Record<ReleaseStatus, BadgeTone> = {
  scheduled: 'info',
  in_progress: 'warning',
  complete: 'success',
  cancelled: 'neutral',
};

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

function fmt(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function ReleasesPage(): React.JSX.Element {
  const headingId = useId();
  const titleId = useId();
  const kindId = useId();
  const load = useCallback(() => apiClient.getReleases(), []);
  const { state, reload, setData } = useAsync<Collection<ReleaseView>>(load);
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<'maintenance' | 'release'>('maintenance');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function schedule(current: Collection<ReleaseView>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const created = await apiClient.scheduleRelease(title.trim(), kind);
      setData({ items: [created, ...current.items], total: current.total + 1 });
      setTitle('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not schedule the release.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Maintenance and releases"
        description="Coordinate maintenance windows, notices and releases. No AI output on this surface."
      />
      <AsyncBoundary state={state} onRetry={reload} label="releases">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Schedule maintenance">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Schedule maintenance</h2>
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
                  <label htmlFor={titleId} style={{ fontWeight: 600 }}>
                    Title
                  </label>
                  <input
                    id={titleId}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 1)',
                  }}
                >
                  <label htmlFor={kindId} style={{ fontWeight: 600 }}>
                    Kind
                  </label>
                  <select
                    id={kindId}
                    value={kind}
                    onChange={(e) => setKind(e.target.value as 'maintenance' | 'release')}
                    style={fieldStyle}
                  >
                    <option value="maintenance">Maintenance</option>
                    <option value="release">Release</option>
                  </select>
                </div>
                {error ? (
                  <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                    {error}
                  </p>
                ) : null}
                <div>
                  <Button
                    disabled={busy || title.trim().length < 2}
                    onClick={() => void schedule(data)}
                  >
                    {busy ? 'Scheduling…' : 'Schedule maintenance'}
                  </Button>
                </div>
              </div>
            </Card>
            {data.items.map((r) => (
              <Card key={r.id} as="article" aria-label={r.title}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{r.title}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {r.kind} · {fmt(r.window)}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[r.status]}>{r.status.replace('_', ' ')}</StatusBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
