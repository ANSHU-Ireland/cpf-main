'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { StatusBadge } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { Collection, NoticeView } from '../../lib/types';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { dateStyle: 'long' });
}

function NoticeList({
  data,
  onChanged,
}: {
  data: Collection<NoticeView>;
  onChanged: () => void;
}): React.JSX.Element {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function acknowledge(id: string): Promise<void> {
    setPendingId(id);
    setError(null);
    try {
      await apiClient.acknowledgeNotice(id);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not acknowledge that notice.');
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 3)' }}>
      {error ? (
        <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
          {error}
        </p>
      ) : null}
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
        {data.items.map((notice) => (
          <li key={notice.id}>
            <Card as="article" aria-label={notice.title}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 2)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: 'calc(var(--space-unit) * 2)',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{notice.title}</h2>
                  <StatusBadge tone={notice.acknowledged ? 'success' : 'warning'}>
                    {notice.acknowledged ? 'Acknowledged' : 'Action needed'}
                  </StatusBadge>
                </div>
                <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                  {notice.category} · {formatDate(notice.publishedAt)}
                </p>
                <p style={{ margin: 0 }}>{notice.body}</p>
                {notice.acknowledged ? null : (
                  <div>
                    <Button
                      variant="secondary"
                      disabled={pendingId === notice.id}
                      onClick={() => void acknowledge(notice.id)}
                    >
                      {pendingId === notice.id ? 'Saving…' : 'Acknowledge'}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function NoticesPage(): React.JSX.Element {
  const headingId = useId();
  const loader = useCallback(() => apiClient.getNotices(), []);
  const { state, reload } = useAsync(loader);

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Notices"
        headingId={headingId}
        description="Announcements and policy updates that apply to your account."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="notices"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="You’re all caught up"
        emptyBody="There are no notices for you right now."
      >
        {(data) => <NoticeList data={data} onChanged={reload} />}
      </AsyncBoundary>
    </section>
  );
}
