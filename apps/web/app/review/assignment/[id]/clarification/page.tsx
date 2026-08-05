'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { ClarificationView, Collection } from '../../../../lib/types';

const STATUS_TONE: Record<ClarificationView['status'], BadgeTone> = {
  sent: 'info',
  answered: 'success',
  escalated: 'warning',
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

export default function ClarificationPage({
  params,
}: {
  params: { id: string };
}): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const topicId = useId();
  const bodyId = useId();
  const load = useCallback(() => apiClient.getClarifications(id), [id]);
  const { state, reload, setData } = useAsync<Collection<ClarificationView>>(load);
  const [topic, setTopic] = useState('');
  const [body, setBody] = useState('');
  const [escalate, setEscalate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(items: readonly ClarificationView[]): Promise<void> {
    if (topic.trim().length < 3 || body.trim().length < 3) {
      setError('A topic and a message are both required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await apiClient.sendClarification(id, topic.trim(), body.trim(), escalate);
      setData({ items: [created, ...items], total: items.length + 1 });
      setTopic('');
      setBody('');
      setEscalate(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send your request.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}>
      <PageHeader
        headingId={headingId}
        title="Clarification and escalation"
        description="Ask the assessment owner a question, or escalate a concern. Requests are routed to a person, never answered by AI."
      />
      <AsyncBoundary state={state} onRetry={reload} label="clarifications">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}
          >
            <Card>
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
                    gap: 'calc(var(--space-unit) * 2)',
                  }}
                >
                  <label htmlFor={topicId} style={{ fontWeight: 600 }}>
                    Topic
                  </label>
                  <input
                    id={topicId}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'calc(var(--space-unit) * 2)',
                  }}
                >
                  <label htmlFor={bodyId} style={{ fontWeight: 600 }}>
                    Message
                  </label>
                  <textarea
                    id={bodyId}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={3}
                    style={{ ...fieldStyle, resize: 'vertical' }}
                  />
                </div>
                <label
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    alignItems: 'center',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={escalate}
                    onChange={(e) => setEscalate(e.target.checked)}
                  />
                  Escalate this as a concern
                </label>
                {error ? (
                  <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                    {error}
                  </p>
                ) : null}
                <div>
                  <Button disabled={busy} onClick={() => void send(data.items)}>
                    {busy ? 'Sending…' : 'Send request'}
                  </Button>
                </div>
              </div>
            </Card>

            {data.items.length > 0 ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 3)',
                }}
              >
                <h2 style={{ margin: 0, fontSize: '1rem' }}>History</h2>
                {data.items.map((item) => (
                  <Card key={item.id} as="article">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 'calc(var(--space-unit) * 2)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <strong>{item.topic}</strong>
                      <StatusBadge tone={STATUS_TONE[item.status]}>{item.status}</StatusBadge>
                    </div>
                    <p style={{ margin: 'calc(var(--space-unit) * 2) 0 0' }}>{item.body}</p>
                  </Card>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
