'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, PluginStatus, PluginView } from '../../lib/types';

const TONE: Record<PluginStatus, BadgeTone> = {
  registered: 'neutral',
  approved: 'success',
  suspended: 'warning',
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

export default function PluginsPage(): React.JSX.Element {
  const headingId = useId();
  const codeId = useId();
  const providerId = useId();
  const nameId = useId();
  const versionId = useId();
  const capId = useId();
  const scopeId = useId();
  const load = useCallback(() => apiClient.getPlugins(), []);
  const { state, reload, setData } = useAsync<Collection<PluginView>>(load);
  const [code, setCode] = useState('');
  const [provider, setProvider] = useState('');
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [capabilities, setCapabilities] = useState('');
  const [dataScope, setDataScope] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function register(current: Collection<PluginView>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const caps = capabilities
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      const created = await apiClient.registerPlugin(
        code.trim(),
        provider.trim(),
        name.trim(),
        version.trim(),
        caps,
        dataScope.trim(),
      );
      setData({ items: [created, ...current.items], total: current.total + 1 });
      setCode('');
      setProvider('');
      setName('');
      setVersion('');
      setCapabilities('');
      setDataScope('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not register the plugin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Plugin governance"
        description="Approve capabilities, data scope and runtime controls. No AI output on this surface."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="plugins"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No plugins registered"
        emptyBody="Register the first plugin to begin governance."
      >
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Register plugin">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Register plugin</h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 3)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor={codeId} style={{ fontWeight: 600 }}>
                    Plugin code
                  </label>
                  <input
                    id={codeId}
                    value={code}
                    onChange={(e) => setCode(e.target.value.toLowerCase())}
                    placeholder="com.vendor.plugin"
                    style={fieldStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor={providerId} style={{ fontWeight: 600 }}>
                    Provider
                  </label>
                  <input
                    id={providerId}
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor={nameId} style={{ fontWeight: 600 }}>
                    Plugin name
                  </label>
                  <input
                    id={nameId}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor={versionId} style={{ fontWeight: 600 }}>
                    Version
                  </label>
                  <input
                    id={versionId}
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                    style={fieldStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor={capId} style={{ fontWeight: 600 }}>
                    Capabilities (comma-separated)
                  </label>
                  <input
                    id={capId}
                    value={capabilities}
                    onChange={(e) => setCapabilities(e.target.value)}
                    placeholder="e.g. execute-sandbox, read-artifact"
                    style={fieldStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor={scopeId} style={{ fontWeight: 600 }}>
                    Data scope
                  </label>
                  <input
                    id={scopeId}
                    value={dataScope}
                    onChange={(e) => setDataScope(e.target.value)}
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
                    disabled={
                      busy ||
                      !/^[a-z0-9](?:[a-z0-9._-]{0,80}[a-z0-9])?$/.test(code.trim()) ||
                      provider.trim().length < 2 ||
                      name.trim().length < 2 ||
                      version.trim().length < 1 ||
                      capabilities.trim().length === 0 ||
                      dataScope.trim().length < 2
                    }
                    onClick={() => void register(data)}
                  >
                    {busy ? 'Registering…' : 'Register plugin'}
                  </Button>
                </div>
              </div>
            </Card>
            {data.items.map((p) => (
              <Card key={p.id} as="article" aria-label={p.name}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{p.name}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      Capabilities: {p.capabilities.join(', ')}
                    </p>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      Data scope: {p.dataScope}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[p.status]}>{p.status}</StatusBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
