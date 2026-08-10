'use client';
import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { BadgeTone, Collection, VendorEvidenceView } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'warning',
  ready: 'info',
  attention: 'danger',
  complete: 'success',
  archived: 'neutral',
};

export default function GovernanceVendorsPage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<VendorEvidenceView> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const collection = await apiClient.getVendorEvidence();
    setData(collection);
    return collection;
  }, []);

  const { state, reload } = useAsync<Collection<VendorEvidenceView>>(loader);

  const handleRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const vendor = (formData.get('vendor') as string) || '';
    const obligation = (formData.get('obligation') as string) || '';
    if (!vendor.trim() || !obligation.trim()) return;
    await apiClient.requestVendorEvidence(vendor.trim(), obligation.trim());
    form.reset();
    const updated = await apiClient.getVendorEvidence();
    setData(updated);
  };

  const filtered = data
    ? data.items.filter(
        (v) =>
          v.vendor.toLowerCase().includes(filter.toLowerCase()) ||
          v.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Vendor evidence"
        description="Track provider obligations, evidence, expiry and exceptions. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="Vendor evidence"
        isEmpty={() => !data || data.total === 0}
        emptyTitle="No vendor evidence requests"
        emptyBody="Request your first vendor evidence to track provider obligations."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Request evidence">
              <h2 className="text-base font-semibold text-ink mb-4">Request evidence</h2>
              <form onSubmit={handleRequest} className="space-y-4">
                <div>
                  <label htmlFor="vendor" className={labelStyle}>
                    Vendor name
                  </label>
                  <input
                    type="text"
                    id="vendor"
                    name="vendor"
                    required
                    minLength={2}
                    placeholder="Enter the vendor or provider name"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="obligation" className={labelStyle}>
                    Obligation
                  </label>
                  <input
                    type="text"
                    id="obligation"
                    name="obligation"
                    required
                    minLength={4}
                    placeholder="e.g. Annual safety certification"
                    className={fieldStyle}
                  />
                </div>
                <Button type="submit" variant="primary">
                  Request evidence
                </Button>
              </form>
            </Card>

            <Card aria-label="Vendor evidence list">
              <div className="mb-4">
                <label htmlFor="filter" className="sr-only">
                  Search by vendor or ID
                </label>
                <input
                  type="text"
                  id="filter"
                  placeholder="Search by vendor or ID"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className={fieldStyle}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-line">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Vendor</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Obligation
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Evidence</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Expires</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Status</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((v) => (
                      <tr key={v.id}>
                        <td className="px-3 py-3 text-sm text-ink">{v.vendor}</td>
                        <td className="px-3 py-3 text-sm text-muted">{v.obligation}</td>
                        <td className="px-3 py-3 text-sm text-muted">{v.evidence || '—'}</td>
                        <td className="px-3 py-3 text-sm text-muted">
                          {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={STATUS_TONE[v.status] || 'neutral'}>
                            {v.status}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">{v.owner}</td>
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
