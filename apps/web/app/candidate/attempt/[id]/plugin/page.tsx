'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { Collection, PluginRunStatus, PluginRunView } from '../../../../lib/types';

const STATUS_TONE: Record<PluginRunStatus, BadgeTone> = {
  idle: 'neutral',
  running: 'warning',
  passed: 'success',
  failed: 'danger',
};

function Runner({
  attemptId,
  initial,
  onChanged,
}: {
  attemptId: string;
  initial: Collection<PluginRunView>;
  onChanged: () => void;
}): React.JSX.Element {
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();

  async function run(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await apiClient.runPlugin(attemptId, 'Sample test runner', input);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not run the plugin.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}>
      <Card as="article" aria-label="Run the sample test plugin">
        <label htmlFor={fieldId} style={{ fontWeight: 600 }}>
          Input
        </label>
        <textarea
          id={fieldId}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          placeholder="Paste the code or data the plugin should check."
          style={{
            display: 'block',
            inlineSize: '100%',
            marginBlock: 'var(--space-unit)',
            borderRadius: 'var(--radius-control)',
            border: '1px solid var(--color-line)',
            padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.9rem',
            color: 'var(--color-ink)',
            background: 'var(--color-paper)',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
        {error ? (
          <p role="alert" style={{ margin: '0 0 var(--space-unit)', color: 'var(--color-red)' }}>
            {error}
          </p>
        ) : null}
        <Button disabled={busy} onClick={() => void run()}>
          {busy ? 'Executing…' : 'Execute'}
        </Button>
      </Card>

      {initial.items.length === 0 ? (
        <Card as="article">
          <p style={{ margin: 0, color: 'var(--color-muted)' }}>
            No runs yet. Output is captured with provenance for the human reviewer.
          </p>
        </Card>
      ) : (
        <ul
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 'calc(var(--space-unit) * 3)',
          }}
        >
          {initial.items.map((r) => (
            <li key={r.id}>
              <Card as="article" aria-label={`${r.name} run`}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBlockEnd: 'var(--space-unit)',
                    flexWrap: 'wrap',
                  }}
                >
                  <strong>{r.name}</strong>
                  <StatusBadge tone={STATUS_TONE[r.status]}>{r.status}</StatusBadge>
                </div>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: '0.85rem',
                    color: 'var(--color-ink)',
                  }}
                >
                  {r.output}
                </pre>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PluginPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const loader = useCallback(() => apiClient.getPluginRuns(id), [id]);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Plugin execution"
        headingId={headingId}
        description="Run an allowed plugin with visible input, output and status. Results are recorded for review."
      />
      <AsyncBoundary state={state} onRetry={reload} label="plugin runs">
        {(data) => <Runner attemptId={id} initial={data} onChanged={reload} />}
      </AsyncBoundary>
    </section>
  );
}
