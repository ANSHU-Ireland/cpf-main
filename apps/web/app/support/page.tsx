'use client';
import { useCallback, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { AsyncBoundary } from '../components/AsyncBoundary';
import { StatusBadge } from '../components/StatusBadge';
import { useAsync } from '../lib/useAsync';
import type { Collection } from '../lib/types';
import type { BadgeTone } from '../components/StatusBadge';
import { apiClient } from '../lib/api-client';

interface SupportCase {
  readonly id: string;
  readonly ticketNumber: string;
  readonly subject: string;
  readonly requester: string;
  readonly priority: 'low' | 'medium' | 'high' | 'critical';
  readonly status: 'new' | 'assigned' | 'in_progress' | 'escalated' | 'resolved';
  readonly category: string;
  readonly age: string;
  readonly assignedTo?: string;
}

export default function SupportQueuePage() {
  const headingId = useId();
  const router = useRouter();
  const [data, setData] = useState<Collection<SupportCase> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const cases = await apiClient.getSupportQueue();
    setData(cases);
    return cases;
  }, []);

  const { state, reload } = useAsync<Collection<SupportCase>>(loader);

  const filtered = data?.items.filter(
    (c) =>
      c.subject.toLowerCase().includes(filter.toLowerCase()) ||
      c.requester.toLowerCase().includes(filter.toLowerCase()) ||
      c.ticketNumber.toLowerCase().includes(filter.toLowerCase()),
  );

  const priorityTone: Record<string, BadgeTone> = {
    low: 'neutral',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  } as const;

  const statusTone = {
    new: 'info',
    assigned: 'warning',
    in_progress: 'warning',
    escalated: 'danger',
    resolved: 'success',
  } as const;

  return (
    <>
      <PageHeader
        title="Support queue"
        description="Triage and assign candidate support requests."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="Support queue"
        isEmpty={(data: Collection<SupportCase>) => !data || data.total === 0}
        emptyTitle="No support cases"
        emptyBody="Support requests will appear here."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Queue summary">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-ink">Active cases</h2>
                  <p className="text-sm text-muted mt-1">
                    {filtered?.length || 0} of {data?.total || 0} cases
                  </p>
                </div>
                <input
                  type="search"
                  placeholder="Filter by ticket, subject, or requester"
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
                    <th className="px-4 py-3 text-left font-medium text-ink">Ticket</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Subject</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Requester</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Priority</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Category</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Age</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Assigned to</th>
                    <th className="px-4 py-3 text-left font-medium text-ink">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered?.map((supportCase: SupportCase) => (
                    <tr
                      key={supportCase.id}
                      className="border-b border-line last:border-0 hover:bg-neutral-50 cursor-pointer"
                      onClick={() => router.push(`/support/cases/${supportCase.id}`)}
                    >
                      <td className="px-4 py-3 text-ink font-medium">{supportCase.ticketNumber}</td>
                      <td className="px-4 py-3 text-ink">{supportCase.subject}</td>
                      <td className="px-4 py-3 text-ink">{supportCase.requester}</td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={priorityTone[supportCase.priority]}>
                          {supportCase.priority}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge tone={statusTone[supportCase.status]}>
                          {supportCase.status.replace('_', ' ')}
                        </StatusBadge>
                      </td>
                      <td className="px-4 py-3 text-muted">{supportCase.category}</td>
                      <td className="px-4 py-3 text-muted">{supportCase.age}</td>
                      <td className="px-4 py-3 text-muted">
                        {supportCase.assignedTo || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/support/cases/${supportCase.id}`);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
