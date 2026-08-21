'use client';
import { Suspense, useCallback, useId, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { ConformityAssessmentView } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

function GovernanceConformityPageContent() {
  const headingId = useId();
  const searchParams = useSearchParams();
  const systemId = searchParams.get('systemId') ?? '';
  const [data, setData] = useState<ConformityAssessmentView | null>(null);

  const loader = useCallback(async () => {
    const assessment = await apiClient.getConformityAssessment(systemId);
    setData(assessment);
    return assessment;
  }, [systemId]);

  const { state, reload } = useAsync<ConformityAssessmentView>(loader);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const requirements = (formData.get('requirements') as string) || '';
    const tests = (formData.get('tests') as string) || '';
    const gaps = (formData.get('gaps') as string) || '';
    const outcome = (formData.get('outcome') as string) || '';
    const rationale = (formData.get('rationale') as string) || '';
    if (
      !requirements.trim() ||
      !tests.trim() ||
      !gaps.trim() ||
      !outcome.trim() ||
      !rationale.trim()
    )
      return;
    await apiClient.submitConformityAssessment(
      systemId,
      requirements.trim(),
      tests.trim(),
      gaps.trim(),
      outcome.trim(),
      rationale.trim(),
    );
    const updated = await apiClient.getConformityAssessment(systemId);
    setData(updated);
  };

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Conformity assessment"
        description="Assemble requirements, tests, gaps, approvals and evidence. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary state={state} onRetry={reload} label="Conformity assessment">
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
                  <h3 className="text-sm font-medium text-ink mb-1">Requirements</h3>
                  <p className="text-sm text-muted">{data.requirements}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Tests</h3>
                  <p className="text-sm text-muted">{data.tests}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Gaps</h3>
                  <p className="text-sm text-muted">{data.gaps}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Rationale</h3>
                  <p className="text-sm text-muted">{data.rationale}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="requirements" className={labelStyle}>
                    Requirements
                  </label>
                  <input
                    type="text"
                    id="requirements"
                    name="requirements"
                    required
                    minLength={4}
                    placeholder="e.g. EU AI Act, ISO 42001"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="tests" className={labelStyle}>
                    Tests
                  </label>
                  <input
                    type="text"
                    id="tests"
                    name="tests"
                    required
                    minLength={4}
                    placeholder="e.g. Validation suite, bias testing"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="gaps" className={labelStyle}>
                    Gaps
                  </label>
                  <input
                    type="text"
                    id="gaps"
                    name="gaps"
                    required
                    minLength={2}
                    placeholder="Document any identified gaps"
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
                    Submit for approval
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

export default function GovernanceConformityPage() {
  return (
    <Suspense fallback={<p role="status">Loading conformity assessment…</p>}>
      <GovernanceConformityPageContent />
    </Suspense>
  );
}
