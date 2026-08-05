'use client';

import { useCallback, useId } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { Collection, ComparisonRowView } from '../../../../lib/types';

const linkStyle: React.CSSProperties = {
  color: 'var(--color-blue)',
  fontWeight: 600,
  textDecoration: 'none',
};

export default function ComparisonPage(): React.JSX.Element {
  const headingId = useId();
  const params = useParams<{ id: string }>();
  const id = params.id;
  const load = useCallback(() => apiClient.getComparison(id), [id]);
  const { state, reload } = useAsync<Collection<ComparisonRowView>>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Candidate comparison"
        description="Review progress by candidate. The platform never produces scores, rankings or bands — decisions remain human."
      />
      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="comparison"
        isEmpty={(data) => data.items.length === 0}
        emptyTitle="Nothing to compare"
        emptyBody="No applications are ready for comparison yet."
      >
        {(data) => (
          <Card>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '520px' }}>
                <caption
                  style={{ textAlign: 'left', color: 'var(--color-muted)', paddingBottom: 8 }}
                >
                  Human-authored review coverage per candidate.
                </caption>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-line)' }}>
                    <th style={{ padding: '8px 12px' }}>Candidate</th>
                    <th style={{ padding: '8px 12px' }}>Review status</th>
                    <th style={{ padding: '8px 12px' }}>Criteria scored</th>
                    <th style={{ padding: '8px 12px' }}>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((row) => (
                    <tr
                      key={row.applicationId}
                      style={{ borderBottom: '1px solid var(--color-soft)' }}
                    >
                      <td style={{ padding: '8px 12px' }}>{row.candidateRef}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-muted)' }}>
                        {row.reviewStatus}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        {row.criteriaScored} / {row.criteriaTotal}
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <Link
                          href={`/employer/applications/${row.applicationId}/decision`}
                          style={linkStyle}
                        >
                          Draft decision
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </AsyncBoundary>
    </div>
  );
}
