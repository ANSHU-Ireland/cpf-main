'use client';
import { useCallback, useId, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, WarningOctagon } from '@phosphor-icons/react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { AsyncBoundary } from '../components/AsyncBoundary';
import { StatusBadge } from '../components/StatusBadge';
import { useAsync } from '../lib/useAsync';
import { apiClient } from '../lib/api-client';
import type { OperationsDashboard } from '../lib/types';

export default function OperationsDashboardPage() {
  const headingId = useId();
  const [data, setData] = useState<OperationsDashboard | null>(null);

  const loader = useCallback(async () => {
    const dashboard = await apiClient.getOperationsDashboard();
    setData(dashboard);
    return dashboard;
  }, []);

  const { state, reload } = useAsync<OperationsDashboard>(loader);

  const handleAcknowledge = async (alertId: string) => {
    await apiClient.acknowledgeOperationalAlert(alertId);
    setData((current) =>
      current
        ? {
            ...current,
            alerts: current.alerts.map((alert) =>
              alert.id === alertId ? { ...alert, acknowledged: true } : alert,
            ),
          }
        : current,
    );
  };

  const severityTone = {
    info: 'info',
    warning: 'warning',
    error: 'danger',
    critical: 'danger',
  } as const;

  return (
    <>
      <PageHeader
        title="Operations dashboard"
        description="Monitor availability, queues, dependencies and regional controls."
        headingId={headingId}
        actions={
          <Link
            href="/operations/incident"
            className="inline-flex min-h-target items-center gap-2 rounded-control bg-blue px-5 font-semibold text-paper no-underline hover:brightness-95"
          >
            Open incident <ArrowRight size={18} aria-hidden />
          </Link>
        }
      />

      <AsyncBoundary state={state} onRetry={reload} label="Operations dashboard">
        {() => (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {data?.metrics.map((metric, i) => (
                <Card key={i} aria-label={metric.label}>
                  <div className="space-y-2">
                    <span className="text-sm text-muted">{metric.label}</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-semibold text-ink">{metric.value}</span>
                      {metric.trend && (
                        <StatusBadge tone={metric.tone || 'neutral'}>{metric.trend}</StatusBadge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.9fr)]">
              <Card aria-label="Priority work">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="m-0 text-lg font-semibold text-ink">Priority work</h2>
                    <p className="mb-0 mt-1 text-sm text-muted">
                      Items that need an operator decision.
                    </p>
                  </div>
                  <WarningOctagon size={24} color="var(--color-amber)" aria-hidden />
                </div>
                {data && data.alerts.length === 0 ? (
                  <p className="text-sm text-muted">
                    No active alerts. All monitored services are within policy.
                  </p>
                ) : (
                  <div className="divide-y divide-line border-t border-line">
                    {data?.alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="flex flex-wrap items-center justify-between gap-4 py-4"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <StatusBadge tone={severityTone[alert.severity]}>
                              {alert.severity}
                            </StatusBadge>
                            {alert.acknowledged ? (
                              <StatusBadge tone="success">Acknowledged</StatusBadge>
                            ) : null}
                          </div>
                          <p className="m-0 text-sm font-medium text-ink">{alert.message}</p>
                          <p className="mb-0 mt-1 text-xs text-muted">
                            {new Date(alert.timestamp).toLocaleString()}
                          </p>
                        </div>
                        {!alert.acknowledged ? (
                          <Button variant="secondary" onClick={() => handleAcknowledge(alert.id)}>
                            Acknowledge
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card aria-label="Recent activity">
                <h2 className="mb-4 mt-0 text-lg font-semibold text-ink">Recent activity</h2>
                <div className="divide-y divide-line">
                  {data?.recentActivity.map((activity) => (
                    <div key={activity.id} className="py-3">
                      <p className="m-0 text-sm font-medium text-ink">{activity.description}</p>
                      <p className="mb-0 mt-1 text-xs text-muted">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
