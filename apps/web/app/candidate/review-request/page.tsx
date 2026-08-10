'use client';
import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import { apiClient } from '../../lib/api-client';

interface ReviewableDecision {
  readonly id: string;
  readonly decisionType: string;
  readonly outcome: string;
  readonly reasoning: string;
  readonly decidedAt: string;
  readonly canRequest: boolean;
  readonly reviewRequested: boolean;
}

export default function ReviewRequestPage() {
  const headingId = useId();
  const [data, setData] = useState<{ decisions: ReviewableDecision[] } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loader = useCallback(async () => {
    const result = await apiClient.getReviewableDecisions();
    setData(result);
    return result;
  }, []);

  const { state, reload } = useAsync<{ decisions: ReviewableDecision[] }>(loader);

  const handleRequestReview = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedId) return;

    const formData = new FormData(e.currentTarget);
    const grounds = (formData.get('grounds') as string) || '';

    if (grounds.trim().length < 20) return;

    await apiClient.requestHumanReview(selectedId, grounds.trim());
    const updated = await apiClient.getReviewableDecisions();
    setData(updated);
    setSelectedId(null);
  };

  const selectedDecision = data?.decisions.find((d) => d.id === selectedId);

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Explanation and human review"
        description="Demand explanation and escalation when algorithmic decisions affect you."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="Reviewable decisions"
        isEmpty={(data) => !data || data.decisions.length === 0}
        emptyTitle="No decisions available"
        emptyBody="Reviewable decisions will appear here."
      >
        {() => (
          <div className="space-y-6">
            <Card
              aria-label="About human review"
              style={{ borderLeft: '3px solid var(--color-blue)' }}
            >
              <div className="space-y-3">
                <div>
                  <StatusBadge tone="info">Your right</StatusBadge>
                  <h2 className="text-base font-semibold text-ink mt-2">Request human review</h2>
                </div>
                <p className="text-sm text-ink">
                  When an algorithmic decision significantly affects your application, you have the
                  right to:
                </p>
                <ul className="space-y-2 text-sm text-ink">
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Receive an explanation of the decision logic</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Request a review by a qualified human decision-maker</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span>Express your point of view and contest the decision</span>
                  </li>
                </ul>
              </div>
            </Card>

            {data?.decisions.map((decision) => (
              <Card key={decision.id} aria-label={`Decision: ${decision.decisionType}`}>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-semibold text-ink">{decision.decisionType}</h3>
                      {decision.reviewRequested && (
                        <StatusBadge tone="warning">Review requested</StatusBadge>
                      )}
                    </div>
                    <p className="text-sm text-muted">
                      Decision made on {new Date(decision.decidedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-muted">Outcome:</span>
                      <p className="text-sm text-ink mt-1">{decision.outcome}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted">Reasoning:</span>
                      <p className="text-sm text-ink mt-1">{decision.reasoning}</p>
                    </div>
                  </div>

                  {decision.canRequest && !decision.reviewRequested && (
                    <div className="pt-4 border-t border-line">
                      <Button variant="secondary" onClick={() => setSelectedId(decision.id)}>
                        Request human review
                      </Button>
                    </div>
                  )}

                  {decision.reviewRequested && (
                    <div className="pt-4 border-t border-line">
                      <p className="text-sm text-ink">
                        Your review request has been submitted. A human reviewer will assess your
                        case and contact you with the outcome.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            ))}

            {selectedDecision && (
              <Card
                aria-label="Submit review request"
                style={{ borderLeft: '3px solid var(--color-amber)' }}
              >
                <h2 className="text-base font-semibold text-ink mb-4">Submit review request</h2>
                <form onSubmit={handleRequestReview} className="space-y-4">
                  <div>
                    <label htmlFor="grounds" className={labelStyle}>
                      Grounds for review
                    </label>
                    <textarea
                      id="grounds"
                      name="grounds"
                      required
                      minLength={20}
                      rows={6}
                      placeholder="Explain why you believe this decision should be reviewed (minimum 20 characters)"
                      className={fieldStyle}
                    />
                    <p className="text-xs text-muted mt-2">
                      A qualified human reviewer will assess your request. You will be notified of
                      the outcome within 5 business days.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" variant="primary">
                      Submit request
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setSelectedId(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
