'use client';
import { useCallback, useId, useState } from 'react';
import { AsyncBoundary, Badge, Button, Card, PageHeader, StatusBadge, useAsync } from '@cpf/ui';
import type {
  BadgeTone,
  Collection,
  IncidentSeverity,
  SeriousIncidentView,
} from '../../../lib/types';
import { api } from '../../../lib/api-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'amber',
  ready: 'blue',
  attention: 'red',
  complete: 'sage',
  archived: 'muted',
};
const SEVERITY_TONE: Record<string, BadgeTone> = {
  minor: 'blue',
  moderate: 'amber',
  serious: 'red',
  critical: 'red',
};

export default function GovernanceIncidentsPage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<SeriousIncidentView> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const collection = await api.getIncidents();
    setData(collection);
    return collection;
  }, []);

  const state = useAsync<Collection<SeriousIncidentView>>(loader);

  const handleEscalate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const title = (formData.get('title') as string) || '';
    const severity = (formData.get('severity') as string) || '';
    const contained = formData.get('contained') === 'on';
    const notified = formData.get('notified') === 'on';
    if (!title.trim() || !severity.trim()) return;
    await api.escalateIncident(title.trim(), severity as IncidentSeverity, contained, notified);
    form.reset();
    const updated = await api.getIncidents();
    setData(updated);
  };

  const filtered = data
    ? data.items.filter(
        (i) =>
          i.title.toLowerCase().includes(filter.toLowerCase()) ||
          i.id.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Serious incidents"
        description="Escalate and report serious incidents. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={loader}
        label="Serious incidents"
        isEmpty={!data || data.total === 0}
        emptyTitle="No incidents"
        emptyBody="Escalate your first serious incident."
      >
        {() => (
          <div className="space-y-6">
            <Card aria-label="Escalate incident">
              <h2 className="text-base font-semibold text-ink mb-4">Escalate incident</h2>
              <form onSubmit={handleEscalate} className="space-y-4">
                <div>
                  <label htmlFor="title" className={labelStyle}>
                    Incident title
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
                  <label htmlFor="severity" className={labelStyle}>
                    Severity
                  </label>
                  <select id="severity" name="severity" required className={fieldStyle}>
                    <option value="">Select severity</option>
                    <option value="minor">Minor</option>
                    <option value="moderate">Moderate</option>
                    <option value="serious">Serious</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="contained"
                    name="contained"
                    className="rounded border-line text-blue focus:ring-blue"
                  />
                  <label htmlFor="contained" className="text-sm text-ink">
                    Incident contained
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="notified"
                    name="notified"
                    className="rounded border-line text-blue focus:ring-blue"
                  />
                  <label htmlFor="notified" className="text-sm text-ink">
                    Authority notified
                  </label>
                </div>
                <Button type="submit" variant="primary">
                  Escalate incident
                </Button>
              </form>
            </Card>

            <Card aria-label="Incidents list">
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
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Incident</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Severity</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">
                        Contained
                      </th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Notified</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Status</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Owner</th>
                      <th className="px-3 py-2 text-left text-sm font-medium text-ink">Occurred</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map((i) => (
                      <tr key={i.id}>
                        <td className="px-3 py-3 text-sm text-ink">{i.title}</td>
                        <td className="px-3 py-3">
                          <Badge tone={SEVERITY_TONE[i.severity]}>{i.severity}</Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone={i.contained ? 'sage' : 'red'}>
                            {i.contained ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <Badge tone={i.notified ? 'sage' : 'amber'}>
                            {i.notified ? 'Yes' : 'No'}
                          </Badge>
                        </td>
                        <td className="px-3 py-3">
                          <StatusBadge tone={STATUS_TONE[i.status] || 'muted'}>
                            {i.status}
                          </StatusBadge>
                        </td>
                        <td className="px-3 py-3 text-sm text-muted">{i.owner}</td>
                        <td className="px-3 py-3 text-sm text-muted">
                          {new Date(i.occurredAt).toLocaleDateString()}
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
