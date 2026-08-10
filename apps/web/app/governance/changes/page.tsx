'use client';
import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { BadgeTone, ChangeRequestView, Collection } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'warning',
  ready: 'info',
  attention: 'danger',
  complete: 'success',
  archived: 'neutral',
};

export default function GovernanceChangesPage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<ChangeRequestView> | null>(null);
  const [filter, setFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loader = useCallback(async () => {
    const collection = await apiClient.getChangeRequests();
    setData(collection);
    return collection;
  }, []);

  const { state, reload } = useAsync<Collection<ChangeRequestView>>(loader);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = (formData.get('title') as string) || '';
    const significance = (formData.get('significance') as string) || '';
    const affectedControls = (formData.get('affectedControls') as string) || '';
    if (!title.trim() || !significance.trim() || !affectedControls.trim()) return;
    await apiClient.submitChangeRequest(
      title.trim(),
      significance as 'minor' | 'major' | 'substantial',
      affectedControls.trim(),
    );
    form.reset();
    const updated = await apiClient.getChangeRequests();
    setData(updated);
  };

  const handleRecordDecision = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedId) return;
    const form = e.currentTarget;
    const formData = new FormData(form);
    const outcome = (formData.get('outcome') as string) || '';
    const rationale = (formData.get('rationale') as string) || '';
    if (!outcome.trim() || !rationale.trim()) return;
    await apiClient.recordChangeDecision(selectedId, outcome.trim(), rationale.trim());
    form.reset();
    setSelectedId(null);
    const updated = await apiClient.getChangeRequests();
    setData(updated);
  };

  const filtered = data
    ? data.items.filter(
        (c) =>
          c.title.toLowerCase().includes(filter.toLowerCase()) ||
          c.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Change control"
        description="Assess significance, affected controls, retesting and approval. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={reload}
        label="Change requests"
        isEmpty={() => !data || data.total === 0}
        emptyTitle="No change requests"
        emptyBody="Submit your first change request to establish change governance."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Submit change">
              <h2 className="text-base font-semibold text-ink mb-4">Submit change</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="title" className={labelStyle}>
                    Change title
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
                  <label htmlFor="significance" className={labelStyle}>
                    Significance
                  </label>
                  <select id="significance" name="significance" required className={fieldStyle}>
                    <option value="">Select significance</option>
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="substantial">Substantial</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="affectedControls" className={labelStyle}>
                    Affected controls
                  </label>
                  <input
                    type="text"
                    id="affectedControls"
                    name="affectedControls"
                    required
                    minLength={4}
                    placeholder="List affected controls"
                    className={fieldStyle}
                  />
                </div>
                <Button type="submit" variant="primary">
                  Submit change
                </Button>
              </form>
            </Card>

            {selectedId && (
              <Card
                aria-label="Human authority checkpoint"
                style={{ borderLeft: '3px solid var(--color-amber)' }}
              >
                <div className="mb-4">
                  <StatusBadge tone="warning">Human authority checkpoint</StatusBadge>
                  <p className="text-sm text-muted mt-2">
                    Human initiates and confirms consequential actions.
                  </p>
                </div>
                <form onSubmit={handleRecordDecision} className="space-y-4">
                  <div>
                    <label htmlFor="outcome" className={labelStyle}>
                      Outcome
                    </label>
                    <input
                      type="text"
                      id="outcome"
                      name="outcome"
                      required
                      minLength={2}
                      placeholder="e.g. Approved, Rejected"
                      className={fieldStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor="rationale" className={labelStyle}>
                      Rationale and cited evidence
                    </label>
                    <textarea
                      id="rationale"
                      name="rationale"
                      required
                      minLength={12}
                      rows={4}
                      placeholder="Explain the decision in plain language and link only the evidence needed for this purpose."
                      className={fieldStyle}
                    />
                  </div>
                  <div className="pt-2">
                    <p className="text-sm text-muted mb-4">
                      <strong>AI boundary:</strong> No AI output on this surface.
                    </p>
                    <div className="flex gap-2">
                      <Button type="submit" variant="primary">
                        Record decision
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setSelectedId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              </Card>
            )}

            <Card aria-label="Change requests list">
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
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Change</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Significance
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Status</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Owner</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((c) => (
                      <tr key={c.id}>
                        <td className="px-3 py-3 text-sm text-ink">{c.title}</td>
                        <td className="px-3 py-3">
                          <StatusBadge
                            tone={c.significance === 'substantial' ? 'danger' : 'warning'}
                          >
                            {c.significance}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={STATUS_TONE[c.status] || 'neutral'}>
                            {c.status}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">{c.owner}</td>
                        <td className="px-3 py-3">
                          {!c.resolved && (
                            <Button variant="secondary" onClick={() => setSelectedId(c.id)}>
                              Decide
                            </Button>
                          )}
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
