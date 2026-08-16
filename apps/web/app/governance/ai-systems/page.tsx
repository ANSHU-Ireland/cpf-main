'use client';
import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { AiSystemView, BadgeTone, Collection } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'warning',
  ready: 'info',
  attention: 'danger',
  complete: 'success',
  archived: 'neutral',
};

export default function GovernanceAiSystemsPage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<AiSystemView> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const collection = await apiClient.getAiSystems();
    setData(collection);
    return collection;
  }, []);

  const { state, reload } = useAsync<Collection<AiSystemView>>(loader);

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const systemCode = (formData.get('systemCode') as string) || '';
    const name = (formData.get('name') as string) || '';
    const providerLegalName = (formData.get('providerLegalName') as string) || '';
    const intendedPurpose = (formData.get('intendedPurpose') as string) || '';
    const version = (formData.get('version') as string) || '';
    if (
      !systemCode.trim() ||
      !name.trim() ||
      !providerLegalName.trim() ||
      !intendedPurpose.trim() ||
      !version.trim()
    )
      return;
    await apiClient.registerAiSystem(
      systemCode.trim(),
      name.trim(),
      providerLegalName.trim(),
      intendedPurpose.trim(),
      version.trim(),
    );
    form.reset();
    const updated = await apiClient.getAiSystems();
    setData(updated);
  };

  const filtered = data
    ? data.items.filter(
        (s) =>
          s.name.toLowerCase().includes(filter.toLowerCase()) ||
          s.purpose.toLowerCase().includes(filter.toLowerCase()) ||
          s.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="AI system inventory"
        description="Register AI systems. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="AI systems"
        isEmpty={() => !data || data.total === 0}
        emptyTitle="No AI systems registered"
        emptyBody="Register your first AI system to begin AI Act classification and governance."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Register AI system">
              <h2 className="text-base font-semibold text-ink mb-4">Register AI system</h2>
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label htmlFor="systemCode" className={labelStyle}>
                    System code
                  </label>
                  <input
                    type="text"
                    id="systemCode"
                    name="systemCode"
                    required
                    pattern="[a-z0-9][a-z0-9._-]*[a-z0-9]"
                    placeholder="cpf.employment.assessment"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="name" className={labelStyle}>
                    System name
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
                  <label htmlFor="providerLegalName" className={labelStyle}>
                    Provider legal name
                  </label>
                  <input
                    type="text"
                    id="providerLegalName"
                    name="providerLegalName"
                    required
                    minLength={2}
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="intendedPurpose" className={labelStyle}>
                    Intended purpose
                  </label>
                  <input
                    type="text"
                    id="intendedPurpose"
                    name="intendedPurpose"
                    required
                    minLength={4}
                    placeholder="Describe the AI system's intended purpose"
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
                    placeholder="1.0.0"
                    className={fieldStyle}
                  />
                </div>
                <Button type="submit" variant="primary">
                  Register system
                </Button>
              </form>
            </Card>

            <Card aria-label="AI systems list">
              <div className="mb-4">
                <label htmlFor="filter" className="sr-only">
                  Search by name, ID or purpose
                </label>
                <input
                  type="text"
                  id="filter"
                  placeholder="Search by name, ID or purpose"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className={fieldStyle}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-line">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">System</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Purpose</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Classification
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Status</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Owner</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((s) => (
                      <tr key={s.id}>
                        <td className="px-3 py-3 text-sm text-ink">{s.name}</td>
                        <td className="px-3 py-3 text-sm text-muted">{s.purpose}</td>
                        <td className="px-3 py-3 text-sm text-ink">
                          <StatusBadge tone="info">{s.classification}</StatusBadge>
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={STATUS_TONE[s.status] || 'neutral'}>
                            {s.status}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">{s.owner}</td>
                        <td className="px-3 py-3 text-sm text-muted">
                          {new Date(s.updatedAt).toLocaleDateString()}
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
