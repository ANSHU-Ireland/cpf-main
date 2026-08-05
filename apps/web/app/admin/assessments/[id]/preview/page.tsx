'use client';

import { useCallback, useId } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { apiClient } from '../../../../lib/api-client';
import { useAsync } from '../../../../lib/useAsync';
import type { AssessmentPreviewView } from '../../../../lib/types';

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

export default function AssessmentPreviewPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const headingId = useId();
  const load = useCallback(() => apiClient.getAssessmentPreview(id), [id]);
  const { state, reload } = useAsync<AssessmentPreviewView>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Assessment preview"
        description="Preview candidate and reviewer surfaces before activation. No AI output on this surface."
      />
      <div>
        <Link href={`/admin/assessments/${id}`} style={linkStyle}>
          Back to assessment
        </Link>
      </div>
      <AsyncBoundary state={state} onRetry={reload} label="preview">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Preview summary">
              <p style={{ margin: 0 }}>
                Previewing <strong>{data.assessmentName}</strong> · version {data.versionId}
              </p>
            </Card>
            {data.sections.map((section) => (
              <Card key={section.title} as="section" aria-label={section.title}>
                <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>{section.title}</h2>
                <ul style={{ margin: 0, paddingLeft: 'calc(var(--space-unit) * 4)' }}>
                  {section.tasks.map((task) => (
                    <li key={task} style={{ marginBottom: 4 }}>
                      {task}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
