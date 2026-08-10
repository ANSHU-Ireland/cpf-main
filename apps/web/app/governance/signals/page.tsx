'use client';
import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { BadgeTone, SignalDashboardView, SignalPriority, SignalType } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'warning',
  ready: 'info',
  attention: 'danger',
  complete: 'success',
  archived: 'neutral',
};
const PRIORITY_TONE: Record<string, BadgeTone> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
};
const TYPE_TONE: Record<string, BadgeTone> = {
  safety: 'danger',
  performance: 'warning',
  bias: 'danger',
  drift: 'warning',
};

export default function GovernanceSignalsPage() {
  const headingId = useId();
  const [data, setData] = useState<SignalDashboardView | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loader = useCallback(async () => {
    const dashboard = await apiClient.getSignalsDashboard();
    setData(dashboard);
    return dashboard;
  }, []);

  const { state, reload } = useAsync<SignalDashboardView>(loader);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const type = (formData.get('type') as string) || '';
    const priority = (formData.get('priority') as string) || '';
    const description = (formData.get('description') as string) || '';
    if (!type.trim() || !priority.trim() || !description.trim()) return;
    await apiClient.createSignal(
      type as SignalType,
      priority as SignalPriority,
      description.trim(),
    );
    form.reset();
    setShowForm(false);
    const updated = await apiClient.getSignalsDashboard();
    setData(updated);
  };

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Signals and drift"
        description="Triage safety, performance, bias and drift signals. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary state={state} onRetry={reload} label="Signals dashboard">
        {() => (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card aria-label="Ready now">
                <h3 className="text-sm font-medium text-muted mb-1">Ready now</h3>
                <p className="text-3xl font-semibold text-ink">{data?.readyNow || 0}</p>
              </Card>
              <Card aria-label="Needs attention">
                <h3 className="text-sm font-medium text-muted mb-1">Needs attention</h3>
                <p className="text-3xl font-semibold text-red">{data?.needsAttention || 0}</p>
              </Card>
              <Card aria-label="In progress">
                <h3 className="text-sm font-medium text-muted mb-1">In progress</h3>
                <p className="text-3xl font-semibold text-amber">{data?.inProgress || 0}</p>
              </Card>
            </div>

            {showForm && (
              <Card aria-label="Open signal">
                <h2 className="text-base font-semibold text-ink mb-4">Open signal</h2>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label htmlFor="type" className={labelStyle}>
                      Signal type
                    </label>
                    <select id="type" name="type" required className={fieldStyle}>
                      <option value="">Select type</option>
                      <option value="safety">Safety</option>
                      <option value="performance">Performance</option>
                      <option value="bias">Bias</option>
                      <option value="drift">Drift</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="priority" className={labelStyle}>
                      Priority
                    </label>
                    <select id="priority" name="priority" required className={fieldStyle}>
                      <option value="">Select priority</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="description" className={labelStyle}>
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      required
                      minLength={4}
                      rows={3}
                      placeholder="Describe the signal"
                      className={fieldStyle}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" variant="primary">
                      Open signal
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            {!showForm && (
              <div className="flex justify-end">
                <Button variant="primary" onClick={() => setShowForm(true)}>
                  Open signal
                </Button>
              </div>
            )}

            <Card aria-label="Signals list">
              <h2 className="text-base font-semibold text-ink mb-4">Signals</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-line">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Type</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Priority</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Description
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Status</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Owner</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Detected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data?.signals.map((s) => (
                      <tr key={s.id}>
                        <td className="px-3 py-3">
                          <StatusBadge tone={TYPE_TONE[s.type]}>{s.type}</StatusBadge>
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={PRIORITY_TONE[s.priority]}>{s.priority}</StatusBadge>
                        </td>
                        <td className="px-3 py-3 text-sm text-ink">{s.description}</td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={STATUS_TONE[s.status] || 'neutral'}>
                            {s.status}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">{s.owner}</td>
                        <td className="px-3 py-3 text-sm text-muted">{s.detectedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card aria-label="Recent activity">
              <h2 className="text-base font-semibold text-ink mb-4">Recent activity</h2>
              <ul className="space-y-2">
                {data?.recentActivity.map((a, i) => (
                  <li key={i} className="text-sm text-muted">
                    {a.event} • {a.timestamp}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
