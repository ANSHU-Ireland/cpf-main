'use client';
import { useCallback, useId, useRef, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { BadgeTone, Collection, EvidenceCollectionView } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'warning',
  ready: 'info',
  attention: 'danger',
  complete: 'success',
  archived: 'neutral',
};

export default function AuditEvidencePage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<EvidenceCollectionView> | null>(null);
  const [filter, setFilter] = useState('');
  const creatingRef = useRef(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createMessage, setCreateMessage] = useState('');

  const loader = useCallback(async () => {
    const collection = await apiClient.getEvidenceCollections();
    setData(collection);
    return collection;
  }, []);

  const { state, reload } = useAsync<Collection<EvidenceCollectionView>>(loader);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (creatingRef.current) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = (formData.get('title') as string) || '';
    const purpose = (formData.get('purpose') as string) || '';
    setCreateError('');
    setCreateMessage('');
    if (title.trim().length < 4 || purpose.trim().length < 4) {
      setCreateError('Enter at least four characters for the title and purpose.');
      return;
    }
    creatingRef.current = true;
    setCreating(true);
    try {
      const created = await apiClient.createEvidenceCollection(title.trim(), purpose.trim());
      setData((current) => ({
        ...current,
        items: [created, ...(current?.items ?? [])],
        total: (current?.total ?? 0) + 1,
      }));
      form.reset();
      setFilter('');
      setCreateMessage(`Collection “${created.title}” created.`);
    } catch {
      setCreateError('The collection could not be created. Your entries have been kept.');
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  const filtered = data
    ? data.items.filter(
        (e) =>
          e.title.toLowerCase().includes(filter.trim().toLowerCase()) ||
          e.id.toLowerCase().includes(filter.trim().toLowerCase()),
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

      <AsyncBoundary state={state} onRetry={reload} label="Evidence collections">
        {() => (
          <div className="space-y-6">
            <Card aria-label="Create collection">
              <h2 className="text-base font-semibold text-ink mb-4">Create collection</h2>
              <form onSubmit={handleCreate} className="space-y-4" aria-busy={creating}>
                <div>
                  <label htmlFor="title" className={labelStyle}>
                    Collection title
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    disabled={creating}
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
                    disabled={creating}
                    minLength={4}
                    placeholder="e.g. EU AI Act conformity assessment"
                    className={fieldStyle}
                  />
                </div>
                <Button type="submit" variant="primary" disabled={creating}>
                  {creating ? 'Creating collection…' : 'Create collection'}
                </Button>
                {createError && (
                  <p role="alert" className="text-sm text-ink">
                    {createError}
                  </p>
                )}
                {createMessage && (
                  <p role="status" className="text-sm text-ink">
                    {createMessage}
                  </p>
                )}
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
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-sm text-muted">
                          <p role="status">
                            {data?.items.length
                              ? 'No collections match your search. Try another title or ID.'
                              : 'No evidence collections yet. Create your first collection above to start recording its chain of custody.'}
                          </p>
                          {filter && (
                            <Button variant="secondary" onClick={() => setFilter('')}>
                              Clear search
                            </Button>
                          )}
                        </td>
                      </tr>
                    )}
                    {filtered.map((e) => (
                      <tr key={e.id}>
                        <td className="px-3 py-3 text-sm text-ink">
                          <span className="font-medium">{e.title}</span>
                          <details className="mt-2">
                            <summary className="cursor-pointer rounded text-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue">
                              Chain of custody
                              <span className="sr-only"> for {e.title}</span>
                            </summary>
                            {e.chainOfCustody.length ? (
                              <ol
                                className="mt-3 space-y-3 text-muted"
                                aria-label={`Custody history for ${e.title}`}
                              >
                                {e.chainOfCustody.map((event, index) => (
                                  <li key={`${event.timestamp}-${index}`}>
                                    <p className="text-ink">{event.action}</p>
                                    <p>{event.actor}</p>
                                    <time dateTime={event.timestamp}>
                                      {new Date(event.timestamp).toLocaleString()}
                                    </time>
                                  </li>
                                ))}
                              </ol>
                            ) : (
                              <p className="mt-3 text-muted">No custody events recorded yet.</p>
                            )}
                          </details>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">{e.purpose}</td>
                        <td className="px-3 py-3 text-sm text-muted">{e.custodian}</td>
                        <td className="px-3 py-3">
                          {e.sealed ? (
                            <StatusBadge tone="info">Sealed</StatusBadge>
                          ) : (
                            <StatusBadge tone="warning">Open</StatusBadge>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={STATUS_TONE[e.status] || 'neutral'}>
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
