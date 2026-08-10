'use client';
import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { BadgeTone, Collection, DeployerInstructionsView } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'warning',
  ready: 'info',
  attention: 'danger',
  complete: 'success',
  archived: 'neutral',
};

export default function GovernanceDeployerInstructionsPage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<DeployerInstructionsView> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const collection = await apiClient.getDeployerInstructions();
    setData(collection);
    return collection;
  }, []);

  const { state, reload } = useAsync<Collection<DeployerInstructionsView>>(loader);

  const handlePublish = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const systemId = (formData.get('systemId') as string) || '';
    const version = (formData.get('version') as string) || '';
    const limitations = (formData.get('limitations') as string) || '';
    const oversight = (formData.get('oversight') as string) || '';
    if (!systemId.trim() || !version.trim() || !limitations.trim() || !oversight.trim()) return;
    await apiClient.publishDeployerInstructions(
      systemId.trim(),
      version.trim(),
      limitations.trim(),
      oversight.trim(),
    );
    form.reset();
    const updated = await apiClient.getDeployerInstructions();
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
        title="Deployer instructions"
        description="Issue current limitations, inputs, oversight and monitoring instructions. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="Deployer instructions"
        isEmpty={() => !data || data.total === 0}
        emptyTitle="No deployer instructions"
        emptyBody="Publish your first set of deployer instructions."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Publish version">
              <h2 className="text-base font-semibold text-ink mb-4">Publish version</h2>
              <form onSubmit={handlePublish} className="space-y-4">
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
                    placeholder="e.g. v1.2"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="limitations" className={labelStyle}>
                    Limitations
                  </label>
                  <textarea
                    id="limitations"
                    name="limitations"
                    required
                    minLength={4}
                    rows={3}
                    placeholder="Document system limitations"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="oversight" className={labelStyle}>
                    Oversight instructions
                  </label>
                  <textarea
                    id="oversight"
                    name="oversight"
                    required
                    minLength={4}
                    rows={3}
                    placeholder="Define oversight and monitoring requirements"
                    className={fieldStyle}
                  />
                </div>
                <Button type="submit" variant="primary">
                  Publish version
                </Button>
              </form>
            </Card>

            <Card aria-label="Deployer instructions list">
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-3 text-sm text-ink">{d.systemId}</td>
                        <td className="px-3 py-3 text-sm text-muted">{d.version}</td>
                        <td className="px-3 py-3 text-sm text-muted">{d.reference}</td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={STATUS_TONE[d.status] || 'neutral'}>
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
