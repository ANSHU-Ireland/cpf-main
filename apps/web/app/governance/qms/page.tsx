'use client';
import { useCallback, useId, useState } from 'react';
import { AsyncBoundary, Button, Card, PageHeader, StatusBadge, useAsync } from '@cpf/ui';
import type { BadgeTone, Collection, QmsProcedureView } from '../../lib/types';
import { api } from '../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'amber',
  ready: 'blue',
  attention: 'red',
  complete: 'sage',
  archived: 'muted',
};

export default function GovernanceQmsPage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<QmsProcedureView> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const collection = await api.getQmsProcedures();
    setData(collection);
    return collection;
  }, []);

  const state = useAsync<Collection<QmsProcedureView>>(loader);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = (formData.get('title') as string) || '';
    const policy = (formData.get('policy') as string) || '';
    if (!title.trim() || !policy.trim()) return;
    await api.addQmsProcedure(title.trim(), policy.trim());
    form.reset();
    const updated = await api.getQmsProcedures();
    setData(updated);
  };

  const filtered = data
    ? data.items.filter(
        (p) =>
          p.title.toLowerCase().includes(filter.toLowerCase()) ||
          p.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Quality management system"
        description="Maintain QMS procedures and policies. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={loader}
        label="QMS procedures"
        isEmpty={!data || data.total === 0}
        emptyTitle="No QMS procedures documented"
        emptyBody="Add your first QMS procedure to establish governance processes."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Add procedure">
              <h2 className="text-base font-semibold text-ink mb-4">Add procedure</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label htmlFor="title" className={labelStyle}>
                    Procedure title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    minLength={4}
                    placeholder="Enter a clear, human-readable title"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="policy" className={labelStyle}>
                    Policy statement
                  </label>
                  <textarea
                    id="policy"
                    name="policy"
                    required
                    minLength={4}
                    rows={3}
                    placeholder="Describe the policy or requirement"
                    className={fieldStyle}
                  />
                </div>
                <Button type="submit" variant="primary">
                  Add procedure
                </Button>
              </form>
            </Card>

            <Card aria-label="QMS procedures list">
              <div className="mb-4">
                <label htmlFor="filter" className="sr-only">
                  Search by title or ID
                </label>
                <input
                  type="text"
                  id="filter"
                  placeholder="Search by title or ID"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className={fieldStyle}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-line">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Procedure
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Policy</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Approved by
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Status</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Owner</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((p) => (
                      <tr key={p.id}>
                        <td className="px-3 py-3 text-sm text-ink">{p.title}</td>
                        <td className="px-3 py-3 text-sm text-muted">{p.policy}</td>
                        <td className="px-3 py-3 text-sm text-muted">{p.approvedBy || '—'}</td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={STATUS_TONE[p.status] || 'muted'}>
                            {p.status}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">{p.owner}</td>
                        <td className="px-3 py-3 text-sm text-muted">
                          {new Date(p.updatedAt).toLocaleDateString()}
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
