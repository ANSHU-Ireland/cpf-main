'use client';
import { Suspense, useCallback, useId, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { ImpactAssessmentView } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

function GovernanceImpactAssessmentsPageContent() {
  const headingId = useId();
  const searchParams = useSearchParams();
  const systemId = searchParams.get('systemId') ?? '';
  const [data, setData] = useState<ImpactAssessmentView | null>(null);

  const loader = useCallback(async () => {
    const assessment = await apiClient.getImpactAssessment(systemId);
    setData(assessment);
    return assessment;
  }, [systemId]);

  const { state, reload } = useAsync<ImpactAssessmentView>(loader);

  const handleRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const assessmentType = (formData.get('assessmentType') as string) || '';
    const outcome = (formData.get('outcome') as string) || '';
    const rationale = (formData.get('rationale') as string) || '';
    if (!assessmentType.trim() || !outcome.trim() || !rationale.trim()) return;
    await apiClient.recordImpactAssessment(
      systemId,
      assessmentType as 'DPIA' | 'FundamentalRights',
      outcome.trim(),
      rationale.trim(),
    );
    const updated = await apiClient.getImpactAssessment(systemId);
    setData(updated);
  };

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Impact assessments"
        description="Record DPIA and fundamental-rights impact evidence. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary state={state} onRetry={reload} label="Impact assessment">
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
                  <h3 className="text-sm font-medium text-ink mb-1">Assessment type</h3>
                  <StatusBadge tone="info">{data.assessmentType}</StatusBadge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Outcome</h3>
                  <p className="text-sm text-muted">{data.outcome}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Rationale</h3>
                  <p className="text-sm text-muted">{data.rationale}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRecord} className="space-y-4">
                <div>
                  <label htmlFor="assessmentType" className={labelStyle}>
                    Assessment type
                  </label>
                  <select id="assessmentType" name="assessmentType" required className={fieldStyle}>
                    <option value="">No selection — choose deliberately</option>
                    <option value="DPIA">DPIA (Data Protection Impact Assessment)</option>
                    <option value="FundamentalRights">Fundamental Rights Impact</option>
                  </select>
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
                    placeholder="e.g. Approved with conditions"
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
                    Record assessment
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

export default function GovernanceImpactAssessmentsPage() {
  return (
    <Suspense fallback={<p role="status">Loading impact assessments…</p>}>
      <GovernanceImpactAssessmentsPageContent />
    </Suspense>
  );
}
