'use client';
import { useCallback, useId, useState } from 'react';
import { AsyncBoundary, Badge, Button, Card, PageHeader, StatusBadge, useAsync } from '@cpf/ui';
import type { BadgeTone, Collection, RiskView } from '../../../lib/types';
import { api } from '../../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'amber',
  ready: 'blue',
  attention: 'red',
  complete: 'sage',
  archived: 'muted',
};
const RISK_TONE: Record<string, BadgeTone> = {
  low: 'sage',
  medium: 'amber',
  high: 'red',
  critical: 'red',
};

export default function GovernanceRisksPage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<RiskView> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const collection = await api.getRisks();
    setData(collection);
    return collection;
  }, []);

  const state = useAsync<Collection<RiskView>>(loader);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = (formData.get('title') as string) || '';
    const riskLevel = (formData.get('riskLevel') as string) || '';
    const controls = (formData.get('controls') as string) || '';
    const residual = (formData.get('residual') as string) || '';
    if (!title.trim() || !riskLevel.trim() || !controls.trim() || !residual.trim()) return;
    await api.updateRisk(
      title.trim(),
      riskLevel as 'low' | 'medium' | 'high' | 'critical',
      controls.trim(),
      residual.trim(),
    );
    form.reset();
    const updated = await api.getRisks();
    setData(updated);
  };

  const filtered = data
    ? data.items.filter(
        (r) =>
          r.title.toLowerCase().includes(filter.toLowerCase()) ||
          r.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Risk and control register"
        description="Update control governance and residual risk. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={loader}
        label="Risks"
        isEmpty={!data || data.total === 0}
        emptyTitle="No risks registered"
        emptyBody="Add your first risk to establish control governance."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Update control">
              <h2 className="text-base font-semibold text-ink mb-4">Update control</h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label htmlFor="title" className={labelStyle}>
                    Risk title
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
                  <label htmlFor="riskLevel" className={labelStyle}>
                    Risk level
                  </label>
                  <select id="riskLevel" name="riskLevel" required className={fieldStyle}>
                    <option value="">Select level</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="controls" className={labelStyle}>
                    Controls
                  </label>
                  <input
                    type="text"
                    id="controls"
                    name="controls"
                    required
                    minLength={4}
                    placeholder="Describe the mitigating controls"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="residual" className={labelStyle}>
                    Residual risk
                  </label>
                  <input
                    type="text"
                    id="residual"
                    name="residual"
                    required
                    minLength={2}
                    placeholder="Residual risk after controls"
                    className={fieldStyle}
                  />
                </div>
                <Button type="submit" variant="primary">
                  Update control
                </Button>
              </form>
            </Card>

            <Card aria-label="Risk register list">
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
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Risk</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Level</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Controls</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Residual</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Status</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Owner</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-3 text-sm text-ink">{r.title}</td>
                        <td className="px-3 py-3">
                          <Badge tone={RISK_TONE[r.riskLevel]}>{r.riskLevel}</Badge>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">{r.controls}</td>
                        <td className="px-3 py-3 text-sm text-muted">{r.residual}</td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={STATUS_TONE[r.status] || 'muted'}>
                            {r.status}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">{r.owner}</td>
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
