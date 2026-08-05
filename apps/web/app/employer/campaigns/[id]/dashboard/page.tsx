'use client';

import { useCallback, useId } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { CampaignOpsView } from '../../../../lib/types';

function Stat({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <Card as="article" aria-label={label}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 1)' }}>
        <span style={{ fontSize: '1.8rem', fontWeight: 700 }}>{value}</span>
        <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>{label}</span>
      </div>
    </Card>
  );
}

export default function CampaignOpsPage(): React.JSX.Element {
  const headingId = useId();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const load = useCallback(() => apiClient.getCampaignOps(id), [id]);
  const { state, reload } = useAsync<CampaignOpsView>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Campaign operations"
        description="Live funnel and exceptions for this campaign. No AI scores or rankings are shown."
      />
      <AsyncBoundary state={state} onRetry={reload} label="operations">
        {(ops) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 5)' }}
          >
            <div
              style={{
                display: 'grid',
                gap: 'calc(var(--space-unit) * 4)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              }}
            >
              <Stat label="Invited" value={ops.invited} />
              <Stat label="In progress" value={ops.inProgress} />
              <Stat label="Submitted" value={ops.submitted} />
              <Stat label="Under review" value={ops.underReview} />
              <Stat label="Decided" value={ops.decided} />
            </div>
            <Card>
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Exceptions</h2>
              {ops.exceptions.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--color-muted)' }}>No open exceptions.</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--color-muted)' }}>
                  {ops.exceptions.map((ex) => (
                    <li key={ex.id}>
                      <strong>{ex.kind}:</strong> {ex.summary}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
