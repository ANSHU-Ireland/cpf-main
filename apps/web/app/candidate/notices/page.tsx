'use client';
import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { Notice } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

export default function CandidateNoticesPage() {
  const headingId = useId();
  const [data, setData] = useState<{ notices: Notice[]; allAcknowledged: boolean } | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const loader = useCallback(async () => {
    const result = await apiClient.getCandidateNotices();
    setData(result);
    return result;
  }, []);

  const { state, reload } = useAsync<{ notices: Notice[]; allAcknowledged: boolean }>(loader);

  const handleAcknowledge = async () => {
    if (!data) return;
    const current = data.notices[currentIndex];
    if (!current) return;
    await apiClient.acknowledgeCandidateNotice(current.id);

    if (currentIndex < data.notices.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const updated = await apiClient.getCandidateNotices();
      setData(updated);
    }
  };

  const currentNotice = data?.notices[currentIndex];

  return (
    <>
      <PageHeader
        title="Important notices"
        description="Explain processing, monitoring, AI use and human decision boundaries."
        headingId={headingId}
      />

      <AsyncBoundary state={state} onRetry={reload} label="Candidate notices">
        {() => (
          <div className="space-y-6">
            {data?.allAcknowledged ? (
              <Card aria-label="All notices acknowledged">
                <div className="text-center py-8">
                  <StatusBadge tone="success">Complete</StatusBadge>
                  <h2 className="text-lg font-semibold text-ink mt-4">All notices acknowledged</h2>
                  <p className="text-sm text-muted mt-2">
                    You have acknowledged all required notices. You can continue with your
                    application.
                  </p>
                </div>
              </Card>
            ) : (
              currentNotice && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-muted">
                      Notice {currentIndex + 1} of {data.notices.length}
                    </span>
                    <div className="flex gap-1">
                      {data.notices.map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full ${
                            i <= currentIndex ? 'bg-blue' : 'bg-line'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <Card aria-label={currentNotice.title}>
                    <div className="space-y-4">
                      <div>
                        <StatusBadge tone="warning">{currentNotice.category}</StatusBadge>
                        <h2 className="text-lg font-semibold text-ink mt-2">
                          {currentNotice.title}
                        </h2>
                      </div>

                      <div
                        className="prose prose-sm max-w-none text-ink"
                        dangerouslySetInnerHTML={{ __html: currentNotice.content }}
                      />

                      <div className="pt-4 border-t border-line">
                        <div className="flex items-start gap-3 mb-4">
                          <input
                            type="checkbox"
                            id="confirm"
                            required
                            className="mt-1 rounded border-line text-blue focus:ring-blue"
                          />
                          <label htmlFor="confirm" className="text-sm text-ink">
                            I have read and understood this notice
                          </label>
                        </div>
                        <Button
                          variant="primary"
                          onClick={handleAcknowledge}
                          disabled={
                            !(document.getElementById('confirm') as HTMLInputElement | null)
                              ?.checked
                          }
                        >
                          {currentIndex < data.notices.length - 1
                            ? 'Continue to next notice'
                            : 'Complete and continue'}
                        </Button>
                      </div>
                    </div>
                  </Card>
                </>
              )
            )}
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
