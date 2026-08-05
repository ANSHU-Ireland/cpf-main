'use client';
import { useCallback, useId, useState } from 'react';
import { AsyncBoundary, Button, Card, PageHeader, StatusBadge, useAsync } from '@cpf/ui';
import type { BadgeTone, Collection, DatasetView } from '../../lib/types';
import { api } from '../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'amber',
  ready: 'blue',
  attention: 'red',
  complete: 'sage',
  archived: 'muted',
};

export default function GovernanceDatasetsPage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<DatasetView> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const collection = await api.getDatasets();
    setData(collection);
    return collection;
  }, []);

  const state = useAsync<Collection<DatasetView>>(loader);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const name = (formData.get('name') as string) || '';
    const provenance = (formData.get('provenance') as string) || '';
    const lawfulBasis = (formData.get('lawfulBasis') as string) || '';
    const representativeness = (formData.get('representativeness') as string) || '';
    if (!name.trim() || !provenance.trim() || !lawfulBasis.trim() || !representativeness.trim())
      return;
    await api.registerDataset(
      name.trim(),
      provenance.trim(),
      lawfulBasis.trim(),
      representativeness.trim(),
    );
    form.reset();
    const updated = await api.getDatasets();
    setData(updated);
  };

  const filtered = data
    ? data.items.filter(
        (d) =>
          d.name.toLowerCase().includes(filter.toLowerCase()) ||
          d.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Dataset governance"
        description="Register training datasets with provenance, lawful basis and representativeness. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={loader}
        label="Datasets"
        isEmpty={!data || data.total === 0}
        emptyTitle="No datasets registered"
        emptyBody="Register your first training dataset to document provenance and compliance."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Register dataset">
              <h2 className="text-base font-semibold text-ink mb-4">Register dataset</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label htmlFor="name" className={labelStyle}>
                    Dataset name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    minLength={2}
                    placeholder="Enter a clear, human-readable name"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="provenance" className={labelStyle}>
                    Provenance
                  </label>
                  <input
                    type="text"
                    id="provenance"
                    name="provenance"
                    required
                    minLength={4}
                    placeholder="Describe the dataset's origin and validation"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="lawfulBasis" className={labelStyle}>
                    Lawful basis
                  </label>
                  <input
                    type="text"
                    id="lawfulBasis"
                    name="lawfulBasis"
                    required
                    minLength={4}
                    placeholder="e.g. Legitimate interest (employment)"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="representativeness" className={labelStyle}>
                    Representativeness
                  </label>
                  <input
                    type="text"
                    id="representativeness"
                    name="representativeness"
                    required
                    minLength={4}
                    placeholder="Describe demographic balance and coverage"
                    className={fieldStyle}
                  />
                </div>
                <Button type="submit" variant="primary">
                  Register dataset
                </Button>
              </form>
            </Card>

            <Card aria-label="Datasets list">
              <div className="mb-4">
                <label htmlFor="filter" className="sr-only">
                  Search by name or ID
                </label>
                <input
                  type="text"
                  id="filter"
                  placeholder="Search by name or ID"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className={fieldStyle}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-line">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Dataset</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Provenance
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Status</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Owner</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-3 text-sm text-ink">{d.name}</td>
                        <td className="px-3 py-3 text-sm text-muted">{d.provenance}</td>
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
