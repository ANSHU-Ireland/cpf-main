'use client';
import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import { apiClient } from '../../lib/api-client';

type CheckStatus = 'not_started' | 'checking' | 'passed' | 'warning' | 'failed';

interface SystemCheck {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: CheckStatus;
  readonly message?: string;
  readonly required: boolean;
}

export default function SystemPreCheckPage() {
  const headingId = useId();
  const [data, setData] = useState<{ checks: SystemCheck[]; overallStatus: CheckStatus } | null>(
    null,
  );
  const [isRunning, setIsRunning] = useState(false);

  const loader = useCallback(async () => {
    const result = await apiClient.getSystemChecks();
    setData(result);
    return result;
  }, []);

  const { state, reload } = useAsync<{ checks: SystemCheck[]; overallStatus: CheckStatus }>(loader);

  const handleRunChecks = async () => {
    setIsRunning(true);
    try {
      const result = await apiClient.runSystemChecks();
      setData(result);
    } finally {
      setIsRunning(false);
    }
  };

  const statusTone = {
    not_started: 'neutral',
    checking: 'info',
    passed: 'success',
    warning: 'warning',
    failed: 'danger',
  } as const;

  const statusLabel = {
    not_started: 'Not started',
    checking: 'Checking...',
    passed: 'Passed',
    warning: 'Warning',
    failed: 'Failed',
  };

  return (
    <>
      <PageHeader
        title="System pre-check"
        description="Validate browser, desktop companion, network and permissions."
        headingId={headingId}
      />

      <AsyncBoundary state={state} onRetry={reload} label="System checks">
        {() => (
          <div className="space-y-6">
            <Card aria-label="Pre-check overview">
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-ink mb-2">System readiness check</h2>
                  <p className="text-sm text-muted">
                    Run these checks before starting your assessment to ensure your system meets all
                    requirements.
                  </p>
                </div>

                <Button variant="primary" onClick={handleRunChecks} disabled={isRunning}>
                  {isRunning ? 'Running checks...' : 'Run system checks'}
                </Button>

                {data && data.overallStatus !== 'not_started' && (
                  <div className="pt-4 border-t border-line">
                    <div className="flex items-center gap-2">
                      <StatusBadge tone={statusTone[data.overallStatus]}>
                        {statusLabel[data.overallStatus]}
                      </StatusBadge>
                      {data.overallStatus === 'passed' && (
                        <span className="text-sm text-sage">
                          All checks passed. Your system is ready.
                        </span>
                      )}
                      {data.overallStatus === 'failed' && (
                        <span className="text-sm text-red">
                          Some required checks failed. Please resolve issues before starting.
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {data && data.checks.length > 0 && (
              <Card aria-label="Check results">
                <h3 className="text-base font-semibold text-ink mb-4">Check results</h3>
                <div className="space-y-3">
                  {data.checks.map((check) => (
                    <div
                      key={check.id}
                      className="flex items-start justify-between gap-4 py-3 border-b border-line last:border-0"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-ink">{check.name}</h4>
                          {check.required && <span className="text-xs text-red">(Required)</span>}
                        </div>
                        <p className="text-sm text-muted">{check.description}</p>
                        {check.message && <p className="text-sm text-ink mt-1">{check.message}</p>}
                      </div>
                      <StatusBadge tone={statusTone[check.status]}>
                        {statusLabel[check.status]}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
