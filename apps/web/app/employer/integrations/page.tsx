'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, IntegrationStatus, IntegrationView } from '../../lib/types';

const TONE: Record<IntegrationStatus, BadgeTone> = {
  connected: 'success',
  disabled: 'neutral',
  error: 'danger',
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

export default function IntegrationsPage(): React.JSX.Element {
  const headingId = useId();
  const nameId = useId();
  const kindId = useId();
  const endpointId = useId();
  const load = useCallback(() => apiClient.getIntegrations(), []);
  const { state, reload, setData } = useAsync<Collection<IntegrationView>>(load);
  const [name, setName] = useState('');
  const [kind, setKind] = useState('webhook');
  const [endpoint, setEndpoint] = useState('https://');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(current: Collection<IntegrationView>): Promise<void> {
    if (name.trim().length < 2) {
      setError('An integration name is required.');
      return;
    }
    if (!endpoint.startsWith('https://')) {
      setError('A secure https endpoint is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const integration = await apiClient.addIntegration(name.trim(), kind, endpoint.trim());
      setData({ items: [...current.items, integration], total: current.total + 1 });
      setName('');
      setEndpoint('https://');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add the integration.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Integrations"
        description="Connect your ATS or webhooks. Endpoints must use https."
      />
      <AsyncBoundary state={state} onRetry={reload} label="integrations">
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
                <div style={{ flex: '1 1 160px' }}>
                  <label htmlFor={nameId} style={{ fontWeight: 600, display: 'block' }}>
                    Name
                  </label>
                  <input
                    id={nameId}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div style={{ flex: '0 1 150px' }}>
                  <label htmlFor={kindId} style={{ fontWeight: 600, display: 'block' }}>
                    Type
                  </label>
                  <select
                    id={kindId}
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                    style={fieldStyle}
                  >
                    <option value="ats">ATS</option>
                    <option value="webhook">Webhook</option>
                    <option value="sso">SSO</option>
                  </select>
                </div>
                <div style={{ flex: '1 1 220px' }}>
                  <label htmlFor={endpointId} style={{ fontWeight: 600, display: 'block' }}>
                    Endpoint
                  </label>
                  <input
                    id={endpointId}
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <Button disabled={busy} onClick={() => void add(data)}>
                  Connect
                </Button>
              </div>
              {error ? (
                <p role="alert" style={{ margin: '12px 0 0', color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}
            </Card>
            {data.items.map((i) => (
              <Card key={i.id} as="article" aria-label={i.name}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{i.name}</h2>
                    <p
                      style={{
                        margin: 0,
                        color: 'var(--color-muted)',
                        fontSize: '0.85rem',
                        wordBreak: 'break-all',
                      }}
                    >
                      {i.kind} · {i.endpoint}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[i.status]}>{i.status}</StatusBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
