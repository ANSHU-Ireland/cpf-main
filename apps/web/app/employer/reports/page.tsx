'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, ReportStatus, ReportView } from '../../lib/types';

const TONE: Record<ReportStatus, BadgeTone> = {
  queued: 'neutral',
  running: 'info',
  ready: 'success',
  failed: 'danger',
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

function formatDate(iso: string | null): string {
  return iso === null
    ? '—'
    : new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ReportsPage(): React.JSX.Element {
  const headingId = useId();
  const nameId = useId();
  const kindId = useId();
  const load = useCallback(() => apiClient.getReports(), []);
  const { state, reload, setData } = useAsync<Collection<ReportView>>(load);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('funnel');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(current: Collection<ReportView>): Promise<void> {
    if (name.trim().length < 2) {
      setError('A report name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const report = await apiClient.generateReport(name.trim(), kind);
      setData({ items: [report, ...current.items], total: current.total + 1 });
      setName('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not generate the report.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Reports"
        description="Operational reports across your campaigns. Reports never expose AI scores or rankings."
      />
      <AsyncBoundary state={state} onRetry={reload} label="reports">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card>
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 3)',
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                }}
              >
                <div style={{ flex: '1 1 200px' }}>
                  <label htmlFor={nameId} style={{ fontWeight: 600, display: 'block' }}>
                    Report name
                  </label>
                  <input
                    id={nameId}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div style={{ flex: '0 1 180px' }}>
                  <label htmlFor={kindId} style={{ fontWeight: 600, display: 'block' }}>
                    Type
                  </label>
                  <select
                    id={kindId}
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                    style={fieldStyle}
                  >
                    <option value="funnel">Funnel</option>
                    <option value="throughput">Throughput</option>
                    <option value="accommodations">Accommodations</option>
                  </select>
                </div>
                <Button disabled={busy} onClick={() => void generate(data)}>
                  Generate
                </Button>
              </div>
              {error ? (
                <p role="alert" style={{ margin: '12px 0 0', color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}
            </Card>
            {data.items.map((r) => (
              <Card key={r.id} as="article" aria-label={r.name}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{r.name}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {r.kind} · {formatDate(r.generatedAt)}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[r.status]}>{r.status}</StatusBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
