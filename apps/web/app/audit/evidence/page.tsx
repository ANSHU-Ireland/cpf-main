'use client';
import { useCallback, useId, useState } from 'react';
import { AsyncBoundary, Badge, Button, Card, PageHeader, StatusBadge, useAsync } from '@cpf/ui';
import type { BadgeTone, Collection, EvidenceCollectionView } from '../../../lib/types';
import { api } from '../../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'amber',
  ready: 'blue',
  attention: 'red',
  complete: 'sage',
  archived: 'muted',
};

export default function AuditEvidencePage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<EvidenceCollectionView> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const collection = await api.getEvidenceCollections();
    setData(collection);
    return collection;
  }, []);

  const state = useAsync<Collection<EvidenceCollectionView>>(loader);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = (formData.get('title') as string) || '';
    const purpose = (formData.get('purpose') as string) || '';
    if (!title.trim() || !purpose.trim()) return;
    await api.createEvidenceCollection(title.trim(), purpose.trim());
    form.reset();
    const updated = await api.getEvidenceCollections();
    setData(updated);
  };

  const filtered = data
    ? data.items.filter(
        (e) =>
          e.title.toLowerCase().includes(filter.toLowerCase()) ||
          e.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Evidence collections"
        description="Assemble immutable evidence bundles with chain of custody. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={loader}
        label="Evidence collections"
        isEmpty={!data || data.total === 0}
        emptyTitle="No evidence collections"
        emptyBody="Create your first evidence collection to establish chain of custody."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Create collection">
              <h2 className="text-base font-semibold text-ink mb-4">Create collection</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label htmlFor="title" className={labelStyle}>
                    Collection title
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
                  <label htmlFor="purpose" className={labelStyle}>
                    Purpose
                  </label>
                  <input
                    type="text"
                    id="purpose"
                    name="purpose"
                    required
                    minLength={4}
                    placeholder="e.g. EU AI Act conformity assessment"
                    className={fieldStyle}
                  />
                </div>
                <Button type="submit" variant="primary">
                  Create collection
                </Button>
              </form>
            </Card>

            <Card aria-label="Evidence collections list">
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
                        Collection
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Purpose</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Custodian
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Sealed</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Status</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((e) => (
                      <tr key={e.id}>
                        <td className="px-3 py-3 text-sm text-ink">{e.title}</td>
                        <td className="px-3 py-3 text-sm text-muted">{e.purpose}</td>
                        <td className="px-3 py-3 text-sm text-muted">{e.custodian}</td>
                        <td className="px-3 py-3">
                          {e.sealed ? (
                            <Badge tone="blue">Sealed</Badge>
                          ) : (
                            <Badge tone="amber">Open</Badge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={STATUS_TONE[e.status] || 'muted'}>
                            {e.status}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">
                          {new Date(e.createdAt).toLocaleDateString()}
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
