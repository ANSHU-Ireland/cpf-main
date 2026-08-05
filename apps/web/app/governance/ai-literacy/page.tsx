'use client';
import { useCallback, useId, useState } from 'react';
import { AsyncBoundary, Badge, Button, Card, PageHeader, StatusBadge, useAsync } from '@cpf/ui';
import type { AiLiteracyView, BadgeTone, Collection } from '../../lib/types';
import { api } from '../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'amber',
  ready: 'blue',
  attention: 'red',
  complete: 'sage',
  archived: 'muted',
};

export default function GovernanceAiLiteracyPage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<AiLiteracyView> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const collection = await api.getAiLiteracy();
    setData(collection);
    return collection;
  }, []);

  const state = useAsync<Collection<AiLiteracyView>>(loader);

  const handleAssign = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const role = (formData.get('role') as string) || '';
    const trainingModule = (formData.get('trainingModule') as string) || '';
    const assignee = (formData.get('assignee') as string) || '';
    if (!role.trim() || !trainingModule.trim() || !assignee.trim()) return;
    await api.assignTraining(role.trim(), trainingModule.trim(), assignee.trim());
    form.reset();
    const updated = await api.getAiLiteracy();
    setData(updated);
  };

  const filtered = data
    ? data.items.filter(
        (l) =>
          l.role.toLowerCase().includes(filter.toLowerCase()) ||
          l.assignee.toLowerCase().includes(filter.toLowerCase()) ||
          l.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="AI literacy"
        description="Track role-specific training, competency and expiry. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={loader}
        label="AI literacy training"
        isEmpty={!data || data.total === 0}
        emptyTitle="No training assignments"
        emptyBody="Assign your first AI literacy training to track competency."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Assign training">
              <h2 className="text-base font-semibold text-ink mb-4">Assign training</h2>
              <form onSubmit={handleAssign} className="space-y-4">
                <div>
                  <label htmlFor="role" className={labelStyle}>
                    Role
                  </label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    required
                    minLength={2}
                    placeholder="e.g. Reviewer, Employer Admin"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="trainingModule" className={labelStyle}>
                    Training module
                  </label>
                  <input
                    type="text"
                    id="trainingModule"
                    name="trainingModule"
                    required
                    minLength={2}
                    placeholder="e.g. AI Governance Essentials"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="assignee" className={labelStyle}>
                    Assignee
                  </label>
                  <input
                    type="text"
                    id="assignee"
                    name="assignee"
                    required
                    minLength={2}
                    placeholder="Enter the person's name"
                    className={fieldStyle}
                  />
                </div>
                <Button type="submit" variant="primary">
                  Assign training
                </Button>
              </form>
            </Card>

            <Card aria-label="Training assignments list">
              <div className="mb-4">
                <label htmlFor="filter" className="sr-only">
                  Search by role, assignee or ID
                </label>
                <input
                  type="text"
                  id="filter"
                  placeholder="Search by role, assignee or ID"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className={fieldStyle}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-line">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Role</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Module</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Assignee</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Completed
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Expires</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((l) => (
                      <tr key={l.id}>
                        <td className="px-3 py-3">
                          <Badge tone="blue">{l.role}</Badge>
                        </td>
                        <td className="px-3 py-3 text-sm text-ink">{l.trainingModule}</td>
                        <td className="px-3 py-3 text-sm text-muted">{l.assignee}</td>
                        <td className="px-3 py-3 text-sm text-muted">
                          {l.completedAt ? new Date(l.completedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">
                          {l.expiresAt ? new Date(l.expiresAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={STATUS_TONE[l.status] || 'muted'}>
                            {l.status}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
