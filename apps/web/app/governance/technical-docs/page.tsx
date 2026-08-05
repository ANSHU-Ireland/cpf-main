'use client';
import { useCallback, useId, useState } from 'react';
import { AsyncBoundary, Button, Card, PageHeader, StatusBadge, useAsync } from '@cpf/ui';
import type { BadgeTone, Collection, TechnicalDocView } from '../../../lib/types';
import { api } from '../../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'amber',
  ready: 'blue',
  attention: 'red',
  complete: 'sage',
  archived: 'muted',
};

export default function GovernanceTechnicalDocsPage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<TechnicalDocView> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const collection = await api.getTechnicalDocs();
    setData(collection);
    return collection;
  }, []);

  const state = useAsync<Collection<TechnicalDocView>>(loader);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const systemId = (formData.get('systemId') as string) || '';
    const version = (formData.get('version') as string) || '';
    if (!systemId.trim() || !version.trim()) return;
    await api.createTechnicalDocVersion(systemId.trim(), version.trim());
    form.reset();
    const updated = await api.getTechnicalDocs();
    setData(updated);
  };

  const filtered = data
    ? data.items.filter(
        (d) =>
          d.systemId.toLowerCase().includes(filter.toLowerCase()) ||
          d.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Technical documentation"
        description="Create versioned technical documentation. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={loader}
        label="Technical documentation"
        isEmpty={!data || data.total === 0}
        emptyTitle="No technical documentation"
        emptyBody="Create your first technical documentation version."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Create version">
              <h2 className="text-base font-semibold text-ink mb-4">Create version</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label htmlFor="systemId" className={labelStyle}>
                    System ID
                  </label>
                  <input
                    type="text"
                    id="systemId"
                    name="systemId"
                    required
                    minLength={2}
                    placeholder="Enter the AI system ID"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="version" className={labelStyle}>
                    Version
                  </label>
                  <input
                    type="text"
                    id="version"
                    name="version"
                    required
                    minLength={1}
                    placeholder="e.g. v2.0"
                    className={fieldStyle}
                  />
                </div>
                <Button type="submit" variant="primary">
                  Create version
                </Button>
              </form>
            </Card>

            <Card aria-label="Technical documentation list">
              <div className="mb-4">
                <label htmlFor="filter" className="sr-only">
                  Search by system ID
                </label>
                <input
                  type="text"
                  id="filter"
                  placeholder="Search by system ID"
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
                        System ID
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Version</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Reference
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Status</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Owner</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-3 text-sm text-ink">{d.systemId}</td>
                        <td className="px-3 py-3 text-sm text-muted">{d.version}</td>
                        <td className="px-3 py-3 text-sm text-muted">{d.reference}</td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={STATUS_TONE[d.status] || 'muted'}>
                            {d.status}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">{d.owner}</td>
                        <td className="px-3 py-3 text-sm text-muted">
                          {new Date(d.updatedAt).toLocaleDateString()}
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
