'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, FeatureFlagView } from '../../lib/types';

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

export default function FeatureFlagsPage(): React.JSX.Element {
  const headingId = useId();
  const keyId = useId();
  const descId = useId();
  const load = useCallback(() => apiClient.getFeatureFlags(), []);
  const { state, reload, setData } = useAsync<Collection<FeatureFlagView>>(load);
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(current: Collection<FeatureFlagView>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const created = await apiClient.createFeatureFlag(key.trim(), description.trim());
      setData({ items: [...current.items, created], total: current.total + 1 });
      setKey('');
      setDescription('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the flag.');
    } finally {
      setBusy(false);
    }
  }

  async function toggle(current: Collection<FeatureFlagView>, id: string): Promise<void> {
    setBusyId(id);
    setError(null);
    try {
      const updated = await apiClient.toggleFeatureFlag(id);
      setData({
        items: current.items.map((f) => (f.id === updated.id ? updated : f)),
        total: current.total,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not toggle the flag.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Feature flags"
        description="Stage and target feature flags with rollback. No AI output on this surface."
      />
      <AsyncBoundary state={state} onRetry={reload} label="feature flags">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Create flag">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Create flag</h2>
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
                  <label htmlFor={keyId} style={{ fontWeight: 600 }}>
                    Key
                  </label>
                  <input
                    id={keyId}
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="lowercase_underscored"
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
                  <label htmlFor={descId} style={{ fontWeight: 600 }}>
                    Description
                  </label>
                  <input
                    id={descId}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                    disabled={busy || key.trim().length < 2 || description.trim().length < 4}
                    onClick={() => void create(data)}
                  >
                    {busy ? 'Creating…' : 'Create flag'}
                  </Button>
                </div>
              </div>
            </Card>
            {data.items.map((f) => (
              <Card key={f.id} as="article" aria-label={f.key}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ flex: '1 1 260px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{f.key}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {f.description} · rollout {f.rollout}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <StatusBadge tone={f.enabled ? 'success' : 'neutral'}>
                      {f.enabled ? 'enabled' : 'disabled'}
                    </StatusBadge>
                    <Button
                      variant="secondary"
                      disabled={busyId === f.id}
                      onClick={() => void toggle(data, f.id)}
                    >
                      {busyId === f.id ? 'Saving…' : f.enabled ? 'Disable' : 'Enable'}
                    </Button>
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
