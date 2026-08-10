'use client';
import { useCallback, useId, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../../components/PageHeader';
import { Card } from '../../../../components/Card';
import { AsyncBoundary } from '../../../../components/AsyncBoundary';
import { StatusBadge } from '../../../../components/StatusBadge';
import { useAsync } from '../../../../lib/useAsync';
import type { ApplicationDetail } from '../../../../lib/types';
import { apiClient } from '../../../../lib/api-client';

export default function WithdrawApplicationPage() {
  const headingId = useId();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const applicationId = params?.id || '';
  const [data, setData] = useState<ApplicationDetail | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loader = useCallback(async () => {
    const app = await apiClient.getApplicationDetail(applicationId);
    setData(app);
    return app;
  }, [applicationId]);

  const { state, reload } = useAsync<ApplicationDetail>(loader);

  const handleWithdraw = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!confirmed) return;

    setIsSubmitting(true);
    try {
      await apiClient.withdrawApplication(applicationId);
      router.push('/candidate/applications');
    } catch (error) {
      setIsSubmitting(false);
      throw error;
    }
  };

  return (
    <>
      <PageHeader
        title="Withdraw application"
        description="Explain irreversible effects before withdrawal."
        headingId={headingId}
      />

      <AsyncBoundary state={state} onRetry={reload} label="Application details">
        {() => (
          <div className="space-y-6">
            <Card
              aria-label="Application summary"
              style={{ borderLeft: '3px solid var(--color-amber)' }}
            >
              <div className="space-y-4">
                <div>
                  <StatusBadge tone="warning">Warning</StatusBadge>
                  <h2 className="text-lg font-semibold text-ink mt-2">Confirm withdrawal</h2>
                </div>

                {data && (
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-muted">Campaign</dt>
                      <dd className="text-sm text-ink mt-1">{data.campaignTitle}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted">Role</dt>
                      <dd className="text-sm text-ink mt-1">{data.roleTitle}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted">Application date</dt>
                      <dd className="text-sm text-ink mt-1">
                        {new Date(data.appliedAt).toLocaleDateString()}
                      </dd>
                    </div>
                  </dl>
                )}
              </div>
            </Card>

            <Card aria-label="Withdrawal effects">
              <h3 className="text-base font-semibold text-ink mb-3">
                What happens when you withdraw
              </h3>
              <ul className="space-y-2 text-sm text-ink">
                <li className="flex gap-2">
                  <span className="text-red">•</span>
                  <span>
                    This action is <strong>irreversible</strong> - you cannot undo a withdrawal
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red">•</span>
                  <span>Your assessment attempt (if any) will be voided</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red">•</span>
                  <span>All your application data will be retained for compliance purposes</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red">•</span>
                  <span>You will not be considered for this role</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red">•</span>
                  <span>The employer will be notified of your withdrawal</span>
                </li>
              </ul>

              <form onSubmit={handleWithdraw} className="mt-6">
                <div className="flex items-start gap-3 mb-4">
                  <input
                    type="checkbox"
                    id="confirm"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-1 rounded border-line text-red focus:ring-red"
                  />
                  <label htmlFor="confirm" className="text-sm text-ink">
                    I understand this is irreversible and wish to withdraw my application
                  </label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit" variant="danger" disabled={!confirmed || isSubmitting}>
                    {isSubmitting ? 'Withdrawing...' : 'Confirm withdrawal'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
