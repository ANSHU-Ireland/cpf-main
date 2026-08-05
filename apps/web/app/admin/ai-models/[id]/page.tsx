'use client';

import { useCallback, useId, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/Card';
import { StatusBadge } from '../../../components/StatusBadge';
import { AsyncBoundary } from '../../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../../lib/api-client';
import { useAsync } from '../../../lib/useAsync';
import type { AiModelDetailView } from '../../../lib/types';

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

export default function AiModelDetailPage(): React.JSX.Element {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const headingId = useId();
  const load = useCallback(() => apiClient.getAiModel(id), [id]);
  const { state, reload, setData } = useAsync<AiModelDetailView>(load);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const updated = await apiClient.setAiModelStatus(id, 'active');
      setData(updated);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Could not activate the model. Record evaluation and required approvals first.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="AI model lifecycle"
        description="Activate or suspend only after required approvals and evidence. No AI output on this surface."
      />
      <div>
        <Link href="/admin/ai-models" style={linkStyle}>
          Back to registry
        </Link>
      </div>
      <AsyncBoundary state={state} onRetry={reload} label="model">
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
                  <dt style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Provider</dt>
                  <dd style={{ margin: 0 }}>{data.provider}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Status</dt>
                  <dd style={{ margin: 0 }}>{data.status}</dd>
                </div>
                <div>
                  <dt style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>Reference</dt>
                  <dd style={{ margin: 0 }}>{data.reference}</dd>
                </div>
              </dl>
              <p style={{ marginTop: 'calc(var(--space-unit) * 3)', color: 'var(--color-muted)' }}>
                <strong>Use case:</strong> {data.useCase}
              </p>
              <p style={{ marginTop: 'calc(var(--space-unit) * 2)', color: 'var(--color-muted)' }}>
                <strong>Limitations:</strong> {data.limitations}
              </p>
            </Card>
            <Card as="section" aria-label="Details and evidence">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Details and evidence</h2>
              <div
                style={{ display: 'flex', gap: 'calc(var(--space-unit) * 2)', flexWrap: 'wrap' }}
              >
                <Link href={`/admin/ai-models/${id}/evaluation`} style={linkStyle}>
                  Evaluation
                </Link>
              </div>
            </Card>
            <Card as="section" aria-label="Approvals">
              <h2 style={{ margin: '0 0 12px', fontSize: '1.05rem' }}>Approvals</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {data.evaluationRecorded ? (
                  <StatusBadge tone="success">Evaluation recorded</StatusBadge>
                ) : (
                  <StatusBadge tone="warning">Evaluation pending</StatusBadge>
                )}
                <span>
                  {data.approvals} / {data.approvalsRequired} required approvals
                </span>
              </div>
              {error ? (
                <p role="alert" style={{ marginTop: 12, color: 'var(--color-red)' }}>
                  {error}
                </p>
              ) : null}
              {data.status !== 'active' ? (
                <div style={{ marginTop: 'calc(var(--space-unit) * 3)' }}>
                  <Button
                    disabled={
                      busy || !data.evaluationRecorded || data.approvals < data.approvalsRequired
                    }
                    onClick={() => void activate()}
                  >
                    {busy ? 'Activating…' : 'Activate model'}
                  </Button>
                </div>
              ) : null}
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
