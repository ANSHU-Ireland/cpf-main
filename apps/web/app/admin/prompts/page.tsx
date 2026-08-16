'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge, type BadgeTone } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, PromptStatus, PromptVersionView } from '../../lib/types';

const TONE: Record<PromptStatus, BadgeTone> = {
  draft: 'neutral',
  active: 'success',
  rolled_back: 'neutral',
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

export default function PromptsPage(): React.JSX.Element {
  const headingId = useId();
  const nameId = useId();
  const purposeId = useId();
  const bodyId = useId();
  const load = useCallback(() => apiClient.getPromptVersions(), []);
  const { state, reload, setData } = useAsync<Collection<PromptVersionView>>(load);
  const [promptCode, setPromptCode] = useState('');
  const [purpose, setPurpose] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createVersion(current: Collection<PromptVersionView>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const created = await apiClient.createPromptVersion(
        promptCode.trim(),
        purpose.trim(),
        body.trim(),
      );
      // This is immutable: the new version supersedes the prior active one.
      const updated = current.items.map((p) =>
        p.name === created.name && p.status === 'active'
          ? { ...p, status: 'rolled_back' as const }
          : p,
      );
      setData({ items: [created, ...updated], total: current.total + 1 });
      setPromptCode('');
      setPurpose('');
      setBody('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the prompt version.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Prompt versions"
        description="Manage reviewed, immutable prompt versions and rollbacks. No AI output on this surface."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="prompts"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No prompt versions"
        emptyBody="Create the first prompt version to begin."
      >
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Create version">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Create version</h2>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 3)',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor={nameId} style={{ fontWeight: 600 }}>
                    Prompt code
                  </label>
                  <input
                    id={nameId}
                    value={promptCode}
                    onChange={(e) => setPromptCode(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor={purposeId} style={{ fontWeight: 600 }}>
                    Intended purpose
                  </label>
                  <input
                    id={purposeId}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <label htmlFor={bodyId} style={{ fontWeight: 600 }}>
                    System prompt
                  </label>
                  <textarea
                    id={bodyId}
                    rows={6}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
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
                      promptCode.trim().length < 2 ||
                      purpose.trim().length < 4 ||
                      body.trim().length < 8
                    }
                    onClick={() => void createVersion(data)}
                  >
                    {busy ? 'Creating…' : 'Create version'}
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
                    <h2 style={{ margin: 0, fontSize: '1.1rem' }}>
                      {p.name} <span style={{ color: 'var(--color-muted)' }}>v{p.version}</span>
                    </h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                      {p.immutable ? ' · immutable' : ''}
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
