'use client';
import { useCallback, useId, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { OversightPlanView } from '../../lib/types';
import { apiClient } from '../../lib/api-client';
import { governanceStore } from '../../lib/synthetic.server';

export default function GovernanceOversightPage() {
  const headingId = useId();
  const params = useParams<{ systemId?: string }>();
  const systemId = params?.systemId || governanceStore.aiSystemId;
  const [data, setData] = useState<OversightPlanView | null>(null);

  const loader = useCallback(async () => {
    const plan = await apiClient.getOversightPlan(systemId);
    setData(plan);
    return plan;
  }, [systemId]);

  const { state, reload } = useAsync<OversightPlanView>(loader);

  const handleApprove = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const authority = (formData.get('authority') as string) || '';
    const competency = (formData.get('competency') as string) || '';
    const stoppingRules = (formData.get('stoppingRules') as string) || '';
    const outcome = (formData.get('outcome') as string) || '';
    const rationale = (formData.get('rationale') as string) || '';
    if (
      !authority.trim() ||
      !competency.trim() ||
      !stoppingRules.trim() ||
      !outcome.trim() ||
      !rationale.trim()
    )
      return;
    await apiClient.approveOversightPlan(
      systemId,
      authority.trim(),
      competency.trim(),
      stoppingRules.trim(),
      outcome.trim(),
      rationale.trim(),
    );
    const updated = await apiClient.getOversightPlan(systemId);
    setData(updated);
  };

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Human oversight plan"
        description="Define authority, competency, stopping rules and escalation. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary state={state} onRetry={reload} label="Oversight plan">
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
                  <h3 className="text-sm font-medium text-ink mb-1">Authority</h3>
                  <p className="text-sm text-muted">{data.authority}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Competency</h3>
                  <p className="text-sm text-muted">{data.competency}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Stopping rules</h3>
                  <p className="text-sm text-muted">{data.stoppingRules}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Rationale</h3>
                  <p className="text-sm text-muted">{data.rationale}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleApprove} className="space-y-4">
                <div>
                  <label htmlFor="authority" className={labelStyle}>
                    Authority
                  </label>
                  <input
                    type="text"
                    id="authority"
                    name="authority"
                    required
                    minLength={4}
                    placeholder="Define who has authority to stop the system"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="competency" className={labelStyle}>
                    Competency
                  </label>
                  <input
                    type="text"
                    id="competency"
                    name="competency"
                    required
                    minLength={4}
                    placeholder="Define required competency for oversight"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="stoppingRules" className={labelStyle}>
                    Stopping rules
                  </label>
                  <input
                    type="text"
                    id="stoppingRules"
                    name="stoppingRules"
                    required
                    minLength={4}
                    placeholder="Define conditions that trigger stopping the system"
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
