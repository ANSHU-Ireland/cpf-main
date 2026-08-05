'use client';

import { useCallback, useId, useState, type FormEvent } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { AiMessageView, Collection } from '../../../../lib/types';

function Conversation({
  attemptId,
  initial,
  onChanged,
}: {
  attemptId: string;
  initial: Collection<AiMessageView>;
  onChanged: (next: Collection<AiMessageView>) => void;
}): React.JSX.Element {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (message.trim().length < 2) {
      setError('Enter a message to send.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await apiClient.sendAiMessage(attemptId, message.trim());
      onChanged(next);
      setMessage('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send your message.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}>
      {initial.items.length === 0 ? (
        <Card as="article">
          <p style={{ margin: 0, color: 'var(--color-muted)' }}>
            No messages yet. Anything you ask here is labelled as AI assistance, logged with
            provenance, and never used to score you.
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
          {initial.items.map((m) => (
            <li key={m.id}>
              <Card
                as="article"
                aria-label={m.role === 'assistant' ? 'AI assistant message' : 'Your message'}
                style={{
                  background:
                    m.role === 'assistant' ? 'var(--color-purple-soft)' : 'var(--color-soft)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    alignItems: 'center',
                    marginBlockEnd: 'var(--space-unit)',
                  }}
                >
                  {m.role === 'assistant' ? (
                    <StatusBadge tone="purple">AI-generated</StatusBadge>
                  ) : (
                    <StatusBadge tone="neutral">You</StatusBadge>
                  )}
                  {m.provenanceRef ? (
                    <span style={{ color: 'var(--color-muted)', fontSize: '0.75rem' }}>
                      Provenance {m.provenanceRef}
                    </span>
                  ) : null}
                </div>
                <p style={{ margin: 0 }}>{m.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card as="article" aria-label="Ask the AI assistant">
        <form onSubmit={(e) => void onSubmit(e)} noValidate>
          <label htmlFor={fieldId} style={{ fontWeight: 600 }}>
            Message
          </label>
          <textarea
            id={fieldId}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            style={{
              display: 'block',
              inlineSize: '100%',
              marginBlock: 'var(--space-unit)',
              borderRadius: 'var(--radius-control)',
              border: '1px solid var(--color-line)',
              padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
              fontFamily: 'inherit',
              fontSize: 'inherit',
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
          <Button type="submit" disabled={busy}>
            {busy ? 'Sending…' : 'Send message'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function AiPanelPage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const loader = useCallback(() => apiClient.getAiMessages(id), [id]);
  const { state, reload, setData } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="AI collaboration"
        headingId={headingId}
        description="A governed assistant. Every response is labelled AI-generated and logged. It never creates a score, rank or recommendation about you."
        actions={<StatusBadge tone="purple">AI assistance is labelled &amp; logged</StatusBadge>}
      />
      <AsyncBoundary state={state} onRetry={reload} label="the AI panel">
        {(data) => <Conversation attemptId={id} initial={data} onChanged={setData} />}
      </AsyncBoundary>
    </section>
  );
}
