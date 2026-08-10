'use client';
import { useCallback, useId, useState } from 'react';
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
    const updated = await apiClient.getOperationsDashboard();
    setData(updated);
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
        description="Monitor system health, alerts and delivery metrics."
        headingId={headingId}
      />

      <AsyncBoundary state={state} onRetry={reload} label="Operations dashboard">
        {() => (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            <Card aria-label="System alerts">
              <h2 className="text-base font-semibold text-ink mb-4">System alerts</h2>
              {data && data.alerts.length === 0 ? (
                <p className="text-sm text-muted">No active alerts</p>
              ) : (
                <div className="space-y-3">
                  {data?.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-start justify-between gap-4 p-3 rounded-md bg-neutral-50"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge tone={severityTone[alert.severity]}>
                            {alert.severity}
                          </StatusBadge>
                          {alert.acknowledged && (
                            <StatusBadge tone="success">Acknowledged</StatusBadge>
                          )}
                        </div>
                        <p className="text-sm text-ink">{alert.message}</p>
                        <p className="text-xs text-muted">
                          {new Date(alert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      {!alert.acknowledged && (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="text-sm text-blue hover:underline"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card aria-label="Recent activity">
              <h2 className="text-base font-semibold text-ink mb-4">Recent activity</h2>
              <div className="space-y-2">
                {data?.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between py-2 border-b border-line last:border-0"
                  >
                    <span className="text-sm text-ink">{activity.description}</span>
                    <span className="text-xs text-muted">
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
