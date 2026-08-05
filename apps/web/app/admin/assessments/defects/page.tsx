'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../components/StatusBadge';
import { AsyncBoundary } from '../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../lib/api-client';
import { useAsync } from '../../../lib/useAsync';
import type { Collection, DefectSeverity, DefectStatus, DefectView } from '../../../lib/types';

const SEVERITY_TONE: Record<DefectSeverity, BadgeTone> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

const STATUS_TONE: Record<DefectStatus, BadgeTone> = {
  open: 'danger',
  triaged: 'warning',
  resolved: 'success',
};

const SEVERITIES: readonly DefectSeverity[] = ['low', 'medium', 'high', 'critical'];

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

export default function DefectsPage(): React.JSX.Element {
  const headingId = useId();
  const titleId = useId();
  const sevId = useId();
  const scopeId = useId();
  const load = useCallback(() => apiClient.getDefects(), []);
  const { state, reload, setData } = useAsync<Collection<DefectView>>(load);
  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState<DefectSeverity>('medium');
  const [scope, setScope] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logDefect(current: Collection<DefectView>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const created = await apiClient.logDefect(title.trim(), severity, scope.trim());
      setData({ items: [created, ...current.items], total: current.total + 1 });
      setTitle('');
      setSeverity('medium');
      setScope('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not log the defect.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Assessment defects"
        description="Triage defects and affected attempt/version scope. No AI output on this surface."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="defects"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No defects logged"
        emptyBody="Log the first defect when an issue is identified."
      >
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Log defect">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Log defect</h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 3)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor={sevId} style={{ fontWeight: 600 }}>
                    Severity
                  </label>
                  <select
                    id={sevId}
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as DefectSeverity)}
                    style={fieldStyle}
                  >
                    {SEVERITIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor={scopeId} style={{ fontWeight: 600 }}>
                    Affected scope
                  </label>
                  <input
                    id={scopeId}
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    placeholder="e.g. ver_123 · Task 2"
                    style={fieldStyle}
                  />
                </div>
                {error ? (
                  <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                    {error}
                  </p>
                ) : null}
                <div>
                  <Button
                    disabled={busy || title.trim().length < 4 || scope.trim().length < 2}
                    onClick={() => void logDefect(data)}
                  >
                    {busy ? 'Logging…' : 'Log defect'}
                  </Button>
                </div>
              </div>
            </Card>
            {data.items.map((d) => (
              <Card key={d.id} as="article" aria-label={d.title}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{d.title}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {d.scope} · {d.owner}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <StatusBadge tone={SEVERITY_TONE[d.severity]}>{d.severity}</StatusBadge>
                    <StatusBadge tone={STATUS_TONE[d.status]}>{d.status}</StatusBadge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
