'use client';
import { useCallback, useId, useState } from 'react';
import { AsyncBoundary, Badge, Button, Card, PageHeader, StatusBadge, useAsync } from '@cpf/ui';
import type { BadgeTone, Collection, MarketAccessView, MarketAccessType } from '../../../lib/types';
import { api } from '../../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'amber',
  ready: 'blue',
  attention: 'red',
  complete: 'sage',
  archived: 'muted',
};
const ACCESS_TYPE_TONE: Record<string, BadgeTone> = {
  declaration: 'blue',
  registration: 'amber',
  ce_marking: 'sage',
};

export default function GovernanceMarketAccessPage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<MarketAccessView> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const collection = await api.getMarketAccess();
    setData(collection);
    return collection;
  }, []);

  const state = useAsync<Collection<MarketAccessView>>(loader);

  const handleRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const systemId = (formData.get('systemId') as string) || '';
    const accessType = (formData.get('accessType') as string) || '';
    const evidence = (formData.get('evidence') as string) || '';
    if (!systemId.trim() || !accessType.trim() || !evidence.trim()) return;
    await api.recordMarketAccess(systemId.trim(), accessType as MarketAccessType, evidence.trim());
    form.reset();
    const updated = await api.getMarketAccess();
    setData(updated);
  };

  const filtered = data
    ? data.items.filter(
        (m) =>
          m.systemId.toLowerCase().includes(filter.toLowerCase()) ||
          m.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Market access"
        description="Record declaration, registration and CE marking. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={loader}
        label="Market access"
        isEmpty={!data || data.total === 0}
        emptyTitle="No market access records"
        emptyBody="Record your first market access completion."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Record completion">
              <h2 className="text-base font-semibold text-ink mb-4">Record completion</h2>
              <form onSubmit={handleRecord} className="space-y-4">
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
                  <label htmlFor="accessType" className={labelStyle}>
                    Access type
                  </label>
                  <select id="accessType" name="accessType" required className={fieldStyle}>
                    <option value="">Select type</option>
                    <option value="declaration">Declaration</option>
                    <option value="registration">Registration</option>
                    <option value="ce_marking">CE marking</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="evidence" className={labelStyle}>
                    Evidence
                  </label>
                  <input
                    type="text"
                    id="evidence"
                    name="evidence"
                    required
                    minLength={4}
                    placeholder="Document evidence of completion"
                    className={fieldStyle}
                  />
                </div>
                <Button type="submit" variant="primary">
                  Record completion
                </Button>
              </form>
            </Card>

            <Card aria-label="Market access list">
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
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Access type
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Evidence</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Completed
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Status</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((m) => (
                      <tr key={m.id}>
                        <td className="px-3 py-3 text-sm text-ink">{m.systemId}</td>
                        <td className="px-3 py-3">
                          <Badge tone={ACCESS_TYPE_TONE[m.accessType]}>{m.accessType}</Badge>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">{m.evidence}</td>
                        <td className="px-3 py-3 text-sm text-muted">
                          {new Date(m.completedAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={STATUS_TONE[m.status] || 'muted'}>
                            {m.status}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">{m.owner}</td>
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
