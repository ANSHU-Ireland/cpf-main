'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, TemplateView } from '../../lib/types';

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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'medium' });
}

export default function TemplatesPage(): React.JSX.Element {
  const headingId = useId();
  const nameId = useId();
  const subjectId = useId();
  const load = useCallback(() => apiClient.getTemplates(), []);
  const { state, reload, setData } = useAsync<Collection<TemplateView>>(load);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(current: Collection<TemplateView>): Promise<void> {
    if (name.trim().length < 2 || subject.trim().length < 2) {
      setError('A name and subject line are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const tpl = await apiClient.createTemplate(name.trim(), subject.trim());
      setData({ items: [tpl, ...current.items], total: current.total + 1 });
      setName('');
      setSubject('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not create the template.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Message templates"
        description="Reusable email templates for candidate communications."
      />
      <AsyncBoundary state={state} onRetry={reload} label="templates">
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
                <div style={{ flex: '1 1 180px' }}>
                  <label htmlFor={nameId} style={{ fontWeight: 600, display: 'block' }}>
                    Template name
                  </label>
                  <input
                    id={nameId}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div style={{ flex: '1 1 200px' }}>
                  <label htmlFor={subjectId} style={{ fontWeight: 600, display: 'block' }}>
                    Subject line
                  </label>
                  <input
                    id={subjectId}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <Button disabled={busy} onClick={() => void create(data)}>
                  Create template
                </Button>
              </div>
              {error ? (
                <p role="alert" style={{ margin: '12px 0 0', color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}
            </Card>
            {data.items.map((t) => (
              <Card key={t.id} as="article" aria-label={t.name}>
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{t.name}</h2>
                    <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.9rem' }}>
                      {t.subject} · updated {formatDate(t.updatedAt)}
                    </p>
                  </div>
                  <StatusBadge tone="info">{t.channel}</StatusBadge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
