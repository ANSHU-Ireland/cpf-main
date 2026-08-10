'use client';
import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { Collection } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

interface IntegrationDelivery {
  readonly id: string;
  readonly deliveryType: 'export' | 'webhook' | 'api';
  readonly destination: string;
  readonly status: 'pending' | 'in_progress' | 'delivered' | 'failed' | 'retrying';
  readonly recordCount: number;
  readonly initiatedAt: string;
  readonly completedAt?: string;
  readonly errorMessage?: string;
  readonly retryCount: number;
}

export default function IntegrationDeliveryMonitorPage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<IntegrationDelivery> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const deliveries = await apiClient.getIntegrationDeliveries();
    setData(deliveries);
    return deliveries;
  }, []);

  const { state, reload } = useAsync<Collection<IntegrationDelivery>>(loader);

  const handleRetry = async (deliveryId: string) => {
    await apiClient.retryIntegrationDelivery(deliveryId);
    const updated = await apiClient.getIntegrationDeliveries();
    setData(updated);
  };

  const filtered = data?.items.filter(
    (d: IntegrationDelivery) =>
      d.destination.toLowerCase().includes(filter.toLowerCase()) ||
      d.deliveryType.toLowerCase().includes(filter.toLowerCase()),
  );

  const statusTone = {
    pending: 'info',
    in_progress: 'warning',
    delivered: 'success',
    failed: 'danger',
    retrying: 'warning',
  } as const;

  const typeTone = {
    export: 'info',
    webhook: 'purple',
    api: 'success',
  } as const;

  return (
    <>
      <PageHeader
        title="Integration delivery monitor"
        description="Track exports, webhooks and external API calls."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="Integration deliveries"
        isEmpty={(data) => !data || data.total === 0}
        emptyTitle="No deliveries"
        emptyBody="Integration deliveries will appear here."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Delivery summary">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink">Integration deliveries</h2>
                  <p className="text-sm text-muted mt-1">
                    {filtered?.length || 0} of {data?.total || 0} deliveries
                  </p>
                </div>
                <input
                  type="search"
                  placeholder="Filter by type or destination"
                  value={filter}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(e.target.value)}
                  className="block w-full rounded-md border border-line bg-paper px-3 py-2 text-sm w-80"
                />
              </div>
            </Card>

            <div className="overflow-x-auto bg-paper rounded-md border border-line">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-neutral-50">
                    <th className="px-4 py-3 text-left font-medium text-ink">Type</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Destination</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Records</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Initiated</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Completed</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Retries</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered?.map((delivery) => (
                    <tr
                      key={delivery.id}
                      className="border-b border-line last:border-0 hover:bg-neutral-50"
                    >
                      <td className="px-4 py-3">
                        <StatusBadge tone={typeTone[delivery.deliveryType]}>
                          {delivery.deliveryType}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-ink font-mono text-xs">
                        {delivery.destination}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={statusTone[delivery.status]}>
                          {delivery.status.replace('_', ' ')}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-ink">{delivery.recordCount}</td>
                      <td className="px-4 py-3 text-muted">
                        {new Date(delivery.initiatedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-muted">
                        {delivery.completedAt
                          ? new Date(delivery.completedAt).toLocaleString()
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-muted">{delivery.retryCount}</td>
                      <td className="px-4 py-3">
                        {delivery.status === 'failed' && (
                          <Button
                            variant="secondary"

                            onClick={() => handleRetry(delivery.id)}
                          >
                            Retry
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filtered && filtered.some((d) => d.errorMessage) && (
              <Card aria-label="Error details">
                <h3 className="text-base font-semibold text-ink mb-4">Failed deliveries</h3>
                <div className="space-y-3">
                  {filtered
                    .filter((d) => d.errorMessage)
                    .map((delivery) => (
                      <div key={delivery.id} className="p-3 bg-red-soft rounded-md">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <StatusBadge tone="danger">{delivery.deliveryType}</StatusBadge>
                            <span className="text-sm text-ink ml-2 font-mono">
                              {delivery.destination}
                            </span>
                          </div>
                          <span className="text-xs text-muted">
                            {new Date(delivery.initiatedAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-red">{delivery.errorMessage}</p>
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
