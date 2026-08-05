'use client';

import { useCallback, useId, useState } from 'react';
import Link from 'next/link';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { AiModelStatus, AiModelView, Collection } from '../../lib/types';

const TONE: Record<AiModelStatus, BadgeTone> = {
  registered: 'neutral',
  in_evaluation: 'info',
  approved: 'success',
  active: 'success',
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

export default function AiModelsPage(): React.JSX.Element {
  const headingId = useId();
  const nameId = useId();
  const providerId = useId();
  const useCaseId = useId();
  const limitId = useId();
  const load = useCallback(() => apiClient.getAiModels(), []);
  const { state, reload, setData } = useAsync<Collection<AiModelView>>(load);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [useCase, setUseCase] = useState('');
  const [limitations, setLimitations] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function register(current: Collection<AiModelView>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const created = await apiClient.registerAiModel(
        name.trim(),
        provider.trim(),
        useCase.trim(),
        limitations.trim(),
      );
      setData({ items: [created, ...current.items], total: current.total + 1 });
      setName('');
      setProvider('');
      setUseCase('');
      setLimitations('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not register the model.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="AI system and model registry"
        description="Register model, provider, use case, limitations and status. No AI output on this surface."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="models"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No models registered"
        emptyBody="Register the first AI model to begin governance."
      >
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Register model">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Register model</h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 3)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor={nameId} style={{ fontWeight: 600 }}>
                    Model name
                  </label>
                  <input
                    id={nameId}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                  <label htmlFor={useCaseId} style={{ fontWeight: 600 }}>
                    Use case
                  </label>
                  <input
                    id={useCaseId}
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor={limitId} style={{ fontWeight: 600 }}>
                    Limitations
                  </label>
                  <textarea
                    id={limitId}
                    value={limitations}
                    onChange={(e) => setLimitations(e.target.value)}
                    rows={2}
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
                      name.trim().length < 2 ||
                      provider.trim().length < 2 ||
                      useCase.trim().length < 4 ||
                      limitations.trim().length < 4
                    }
                    onClick={() => void register(data)}
                  >
                    {busy ? 'Registering…' : 'Register model'}
                  </Button>
                </div>
              </div>
            </Card>
            {data.items.map((m) => (
              <Card key={m.id} as="article" aria-label={m.name}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{m.name}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {m.provider} · {m.useCase}
                    </p>
                  </div>
                  <StatusBadge tone={TONE[m.status]}>{m.status}</StatusBadge>
                </div>
                <div style={{ marginTop: 'calc(var(--space-unit) * 3)' }}>
                  <Link href={`/admin/ai-models/${m.id}`} style={linkStyle}>
                    Open model
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
