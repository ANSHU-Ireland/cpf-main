'use client';

import { useCallback, useId, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/Card';
import { StatusBadge, type BadgeTone } from '../../../components/StatusBadge';
import { AsyncBoundary } from '../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../lib/api-client';
import { useAsync } from '../../../lib/useAsync';
import type { AssessmentDetailView, AssessmentVersionStatus } from '../../../lib/types';

const VERSION_TONE: Record<AssessmentVersionStatus, BadgeTone> = {
  draft: 'neutral',
  validated: 'info',
  active: 'success',
  suspended: 'warning',
};

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

export default function AssessmentDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const headingId = useId();
  const load = useCallback(() => apiClient.getAssessment(id), [id]);
  const { state, reload, setData } = useAsync<AssessmentDetailView>(load);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function activate(versionId: string): Promise<void> {
    setBusyId(versionId);
    setError(null);
    try {
      await apiClient.setVersionStatus(id, versionId, 'active');
      const fresh = await apiClient.getAssessment(id);
      setData(fresh);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not activate the version. Resolve validation first.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Assessment lifecycle"
        description="Activate or suspend an immutable assessment version. No AI output on this surface."
      />
      <div>
        <Link href="/admin/assessments" style={linkStyle}>
          Back to catalogue
        </Link>
      </div>
      <AsyncBoundary state={state} onRetry={reload} label="assessment">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card as="section" aria-label="Record summary">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Record summary</h2>
              <dl
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                  gap: 'calc(var(--space-unit) * 3)',
                  margin: 0,
                }}
              >
                <div>
                  <dt style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Name</dt>
                  <dd style={{ margin: 0, fontWeight: 600 }}>{data.name}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Status</dt>
                  <dd style={{ margin: 0 }}>{data.status}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Owner</dt>
                  <dd style={{ margin: 0 }}>{data.owner}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Risk tier</dt>
                  <dd style={{ margin: 0 }}>{data.riskTier}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Reference</dt>
                  <dd style={{ margin: 0 }}>{data.reference}</dd>
                </div>
              </dl>
            </Card>
            <Card as="section" aria-label="Details and evidence">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Details and evidence</h2>
              <div
                style={{ display: 'flex', gap: 'calc(var(--space-unit) * 2)', flexWrap: 'wrap' }}
              >
                <Link href={`/admin/assessments/${id}/version`} style={linkStyle}>
                  Version builder
                </Link>
                <Link href={`/admin/assessments/${id}/preview`} style={linkStyle}>
                  Preview
                </Link>
                <Link href={`/admin/assessments/${id}/validation`} style={linkStyle}>
                  Validation
                </Link>
                <Link href={`/admin/assessments/${id}/defects`} style={linkStyle}>
                  Defects
                </Link>
              </div>
            </Card>
            <Card as="section" aria-label="Versions">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Versions</h2>
              {error ? (
                <p role="alert" style={{ margin: '0 0 12px', color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'calc(var(--space-unit) * 3)',
                }}
              >
                {data.versions.map((v) => (
                  <div
                    key={v.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 'calc(var(--space-unit) * 2)',
                      flexWrap: 'wrap',
                      borderTop: '1px solid var(--color-line)',
                      paddingTop: 'calc(var(--space-unit) * 3)',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{v.label}</p>
                      <p style={{ margin: 0, color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                        Effective {new Date(v.effectiveDate).toLocaleDateString()}
                        {v.validationResolved ? ' · validation resolved' : ' · validation pending'}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <StatusBadge tone={VERSION_TONE[v.status]}>{v.status}</StatusBadge>
                      {v.status !== 'active' ? (
                        <Button
                          variant="secondary"
                          disabled={busyId === v.id || !v.validationResolved}
                          onClick={() => void activate(v.id)}
                        >
                          {busyId === v.id ? 'Activating…' : 'Activate version'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
