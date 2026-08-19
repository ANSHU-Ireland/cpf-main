'use client';
import { useCallback, useId, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { PostMarketPlanView } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

export default function GovernancePostMarketPage() {
  const headingId = useId();
  const searchParams = useSearchParams();
  const systemId = searchParams.get('systemId') ?? '';
  const [data, setData] = useState<PostMarketPlanView | null>(null);

  const loader = useCallback(async () => {
    const plan = await apiClient.getPostMarketPlan(systemId);
    setData(plan);
    return plan;
  }, [systemId]);

  const { state, reload } = useAsync<PostMarketPlanView>(loader);

  const handleApprove = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const metrics = (formData.get('metrics') as string) || '';
    const thresholds = (formData.get('thresholds') as string) || '';
    const reviewCadence = (formData.get('reviewCadence') as string) || '';
    const outcome = (formData.get('outcome') as string) || '';
    const rationale = (formData.get('rationale') as string) || '';
    if (
      !metrics.trim() ||
      !thresholds.trim() ||
      !reviewCadence.trim() ||
      !outcome.trim() ||
      !rationale.trim()
    )
      return;
    await apiClient.approvePostMarketPlan(
      systemId,
      metrics.trim(),
      thresholds.trim(),
      reviewCadence.trim(),
      outcome.trim(),
      rationale.trim(),
    );
    const updated = await apiClient.getPostMarketPlan(systemId);
    setData(updated);
  };

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Post-market monitoring plan"
        description="Define metrics, thresholds, review cadence and response. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary state={state} onRetry={reload} label="Post-market plan">
        {() => (
          <Card
            aria-label="Human authority checkpoint"
            style={{ borderLeft: '3px solid var(--color-amber)' }}
          >
            <div className="mb-4">
              <StatusBadge tone="warning">Human authority checkpoint</StatusBadge>
              <p className="text-sm text-muted mt-2">
                Human initiates and confirms consequential actions.
              </p>
            </div>

            {data?.resolved ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Outcome</h3>
                  <StatusBadge tone="success">{data.outcome}</StatusBadge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Metrics</h3>
                  <p className="text-sm text-muted">{data.metrics}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Thresholds</h3>
                  <p className="text-sm text-muted">{data.thresholds}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Review cadence</h3>
                  <p className="text-sm text-muted">{data.reviewCadence}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Rationale</h3>
                  <p className="text-sm text-muted">{data.rationale}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleApprove} className="space-y-4">
                <div>
                  <label htmlFor="metrics" className={labelStyle}>
                    Metrics
                  </label>
                  <input
                    type="text"
                    id="metrics"
                    name="metrics"
                    required
                    minLength={4}
                    placeholder="e.g. Accuracy, bias metrics, user feedback"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="thresholds" className={labelStyle}>
                    Thresholds
                  </label>
                  <input
                    type="text"
                    id="thresholds"
                    name="thresholds"
                    required
                    minLength={4}
                    placeholder="e.g. 95% accuracy, <5% bias"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="reviewCadence" className={labelStyle}>
                    Review cadence
                  </label>
                  <input
                    type="text"
                    id="reviewCadence"
                    name="reviewCadence"
                    required
                    minLength={4}
                    placeholder="e.g. Quarterly"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="outcome" className={labelStyle}>
                    Outcome
                  </label>
                  <input
                    type="text"
                    id="outcome"
                    name="outcome"
                    required
                    minLength={2}
                    placeholder="e.g. Approved"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="rationale" className={labelStyle}>
                    Rationale and cited evidence
                  </label>
                  <textarea
                    id="rationale"
                    name="rationale"
                    required
                    minLength={12}
                    rows={4}
                    placeholder="Explain the decision in plain language and link only the evidence needed for this purpose."
                    className={fieldStyle}
                  />
                </div>
                <div className="pt-2">
                  <p className="text-sm text-muted mb-4">
                    <strong>AI boundary:</strong> No AI output on this surface.
                  </p>
                  <Button type="submit" variant="primary">
                    Approve plan
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}
      </AsyncBoundary>
    </>
  );
}
