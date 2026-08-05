'use client';
import { useCallback, useId, useState } from 'react';
import { AsyncBoundary, Badge, Card, PageHeader, useAsync } from '@cpf/ui';
import type { Collection, TraceabilityView } from '../../../lib/types';
import { api } from '../../../lib/api-client';

export default function AuditTraceabilityPage() {
  const headingId = useId();
  const [data, setData] = useState<Collection<TraceabilityView> | null>(null);
  const [filter, setFilter] = useState('');

  const loader = useCallback(async () => {
    const collection = await api.getTraceability();
    setData(collection);
    return collection;
  }, []);

  const state = useAsync<Collection<TraceabilityView>>(loader);

  const filtered = data
    ? data.items.filter(
        (t) =>
          t.requirementId.toLowerCase().includes(filter.toLowerCase()) ||
          t.description.toLowerCase().includes(filter.toLowerCase()),
      )
    : [];

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';

  return (
    <>
      <PageHeader
        title="Requirement traceability"
        description="Trace requirement to control, surface, endpoint, entity and evidence. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary
        state={state}
        onRetry={loader}
        label="Traceability matrix"
        isEmpty={!data || data.total === 0}
        emptyTitle="No traceability records"
        emptyBody="The traceability matrix will appear when requirements are mapped to controls and evidence."
      >
        {() => (
          <Card aria-label="Traceability matrix">
            <div className="mb-4">
              <label htmlFor="filter" className="sr-only">
                Search by requirement ID or description
              </label>
              <input
                type="text"
                id="filter"
                placeholder="Search by requirement ID or description"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={fieldStyle}
              />
            </div>

            <div className="space-y-4">
              {filtered.map((t) => (
                <div key={t.requirementId} className="border border-line rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <Badge tone="blue">{t.requirementId}</Badge>
                      <p className="text-sm text-ink mt-1">{t.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div>
                      <h4 className="text-sm font-medium text-ink mb-2">Controls</h4>
                      <ul className="text-sm text-muted space-y-1">
                        {t.controls.map((c, i) => (
                          <li key={i}>• {c}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-ink mb-2">Surfaces</h4>
                      <ul className="text-sm text-muted space-y-1">
                        {t.surfaces.map((s, i) => (
                          <li key={i}>• {s}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-ink mb-2">Endpoints</h4>
                      <ul className="text-sm text-muted space-y-1">
                        {t.endpoints.map((e, i) => (
                          <li key={i}>• {e}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-ink mb-2">Evidence</h4>
                      <ul className="text-sm text-muted space-y-1">
                        {t.evidence.map((e, i) => (
                          <li key={i}>• {e}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </AsyncBoundary>
    </>
  );
}
