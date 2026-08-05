'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../../components/StatusBadge';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { Collection, EvidenceItemView } from '../../../../lib/types';

const KIND_LABEL: Record<EvidenceItemView['kind'], string> = {
  document: 'Document',
  code: 'Code',
  sheet: 'Spreadsheet',
};

export default function EvidencePage({ params }: { params: { id: string } }): React.JSX.Element {
  const { id } = params;
  const headingId = useId();
  const load = useCallback(() => apiClient.getEvidence(id), [id]);
  const { state, reload, setData } = useAsync<Collection<EvidenceItemView>>(load);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function markReviewed(
    evidenceId: string,
    items: readonly EvidenceItemView[],
  ): Promise<void> {
    setBusyId(evidenceId);
    setError(null);
    try {
      const updated = await apiClient.markEvidenceReviewed(id, evidenceId);
      setData({
        items: items.map((it) => (it.id === updated.id ? updated : it)),
        total: items.length,
      });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update this evidence item.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}>
      <PageHeader
        headingId={headingId}
        title="Evidence review workspace"
        description="Read the candidate's work first. Mark each piece reviewed. This is the candidate's own work — no AI content appears here."
      />
      {error ? (
        <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
          {error}
        </p>
      ) : null}
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="evidence"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="No evidence"
        emptyBody="There is no evidence attached to this assignment yet."
      >
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 3)' }}
          >
            {data.items.map((item) => {
              const tone: BadgeTone = item.status === 'reviewed' ? 'success' : 'neutral';
              return (
                <Card key={item.id} as="article" aria-label={item.title}>
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
                        justifyContent: 'space-between',
                        gap: 'calc(var(--space-unit) * 2)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <h2 style={{ margin: 0, fontSize: '1rem' }}>{item.title}</h2>
                        <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                          {KIND_LABEL[item.kind]}
                        </p>
                      </div>
                      <StatusBadge tone={tone}>
                        {item.status === 'reviewed' ? 'Reviewed' : 'Unreviewed'}
                      </StatusBadge>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        fontFamily:
                          item.kind === 'document' ? 'inherit' : 'ui-monospace, monospace',
                        background: 'var(--color-soft)',
                        borderRadius: 'var(--radius-control)',
                        padding: 'calc(var(--space-unit) * 3)',
                        fontSize: '0.9rem',
                      }}
                    >
                      {item.excerpt}
                    </pre>
                    {item.status !== 'reviewed' ? (
                      <div>
                        <Button
                          variant="secondary"
                          disabled={busyId === item.id}
                          onClick={() => void markReviewed(item.id, data.items)}
                        >
                          {busyId === item.id ? 'Saving…' : 'Mark evidence reviewed'}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
