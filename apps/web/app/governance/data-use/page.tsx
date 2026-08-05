'use client';
import { useCallback, useId, useState } from 'react';
import { AsyncBoundary, Button, Card, PageHeader, StatusBadge, useAsync } from '@cpf/ui';
import type { BadgeTone, Collection, DataUseView } from '../../lib/types';
import { api } from '../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'amber',
  ready: 'blue',
  attention: 'red',
  complete: 'sage',
  archived: 'muted',
};

export default function GovernanceDataUsePage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<DataUseView> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const collection = await api.getDataUse();
    setData(collection);
    return collection;
  }, []);

  const state = useAsync<Collection<DataUseView>>(loader);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const purpose = (formData.get('purpose') as string) || '';
    const lawfulBasis = (formData.get('lawfulBasis') as string) || '';
    const categories = (formData.get('categories') as string) || '';
    const recipients = (formData.get('recipients') as string) || '';
    const retention = (formData.get('retention') as string) || '';
    if (
      !purpose.trim() ||
      !lawfulBasis.trim() ||
      !categories.trim() ||
      !recipients.trim() ||
      !retention.trim()
    )
      return;
    await api.addDataUsePurpose(
      purpose.trim(),
      lawfulBasis.trim(),
      categories.trim(),
      recipients.trim(),
      retention.trim(),
    );
    form.reset();
    const updated = await api.getDataUse();
    setData(updated);
  };

  const filtered = data
    ? data.items.filter(
        (d) =>
          d.purpose.toLowerCase().includes(filter.toLowerCase()) ||
          d.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Data-use register"
        description="Map processing purpose, lawful basis, categories, recipients and retention. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={loader}
        label="Data-use records"
        isEmpty={!data || data.total === 0}
        emptyTitle="No processing purposes registered"
        emptyBody="Add your first processing purpose to document data-use compliance."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Add processing purpose">
              <h2 className="text-base font-semibold text-ink mb-4">Add processing purpose</h2>
              <form onSubmit={handleAdd} className="space-y-4">
                <div>
                  <label htmlFor="purpose" className={labelStyle}>
                    Processing purpose
                  </label>
                  <input
                    type="text"
                    id="purpose"
                    name="purpose"
                    required
                    minLength={4}
                    placeholder="Describe the processing purpose"
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
                    placeholder="e.g. Legitimate interest"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="categories" className={labelStyle}>
                    Data categories
                  </label>
                  <input
                    type="text"
                    id="categories"
                    name="categories"
                    required
                    minLength={4}
                    placeholder="e.g. Candidate responses, metadata"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="recipients" className={labelStyle}>
                    Recipients
                  </label>
                  <input
                    type="text"
                    id="recipients"
                    name="recipients"
                    required
                    minLength={4}
                    placeholder="e.g. Employer, assessment reviewers"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="retention" className={labelStyle}>
                    Retention period
                  </label>
                  <input
                    type="text"
                    id="retention"
                    name="retention"
                    required
                    minLength={2}
                    placeholder="e.g. 3 years post-decision"
                    className={fieldStyle}
                  />
                </div>
                <Button type="submit" variant="primary">
                  Add purpose
                </Button>
              </form>
            </Card>

            <Card aria-label="Data-use register list">
              <div className="mb-4">
                <label htmlFor="filter" className="sr-only">
                  Search by purpose or ID
                </label>
                <input
                  type="text"
                  id="filter"
                  placeholder="Search by purpose or ID"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className={fieldStyle}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-line">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Purpose</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Lawful basis
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Retention
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Status</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-3 text-sm text-ink">{d.purpose}</td>
                        <td className="px-3 py-3 text-sm text-muted">{d.lawfulBasis}</td>
                        <td className="px-3 py-3 text-sm text-muted">{d.retention}</td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={STATUS_TONE[d.status] || 'muted'}>
                            {d.status}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">{d.owner}</td>
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
