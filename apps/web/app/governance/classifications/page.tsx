'use client';
import { useCallback, useId, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { ClassificationView } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

export default function GovernanceClassificationsPage() {
  const headingId = useId();
  const searchParams = useSearchParams();
  const systemId = searchParams.get('systemId') ?? '';
  const [data, setData] = useState<ClassificationView | null>(null);

  const loader = useCallback(async () => {
    const classification = await apiClient.getClassification(systemId);
    setData(classification);
    return classification;
  }, [systemId]);

  const { state, reload } = useAsync<ClassificationView>(loader);

  const handleRecord = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const role = (formData.get('role') as string) || '';
    const intendedPurpose = (formData.get('intendedPurpose') as string) || '';
    const classification = (formData.get('classification') as string) || '';
    const reasoning = (formData.get('reasoning') as string) || '';
    if (!role.trim() || !intendedPurpose.trim() || !classification.trim() || !reasoning.trim())
      return;
    await apiClient.recordClassification(
      systemId,
      role.trim(),
      intendedPurpose.trim(),
      classification.trim(),
      reasoning.trim(),
    );
    const updated = await apiClient.getClassification(systemId);
    setData(updated);
  };

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="AI Act classification"
        description="Approve AI Act classification decision. No AI output on this surface."
        headingId={headingId}
      />

      <AsyncBoundary state={state} onRetry={reload} label="Classification">
        {() => (
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

            {data?.resolved ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Classification</h3>
                  <StatusBadge tone="info">{data.classification}</StatusBadge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Reasoning</h3>
                  <p className="text-sm text-muted">{data.reasoning}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Role</h3>
                  <p className="text-sm text-muted">{data.role}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-ink mb-1">Intended purpose</h3>
                  <p className="text-sm text-muted">{data.intendedPurpose}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRecord} className="space-y-4">
                <div>
                  <label htmlFor="role" className={labelStyle}>
                    Role
                  </label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    required
                    minLength={2}
                    placeholder="e.g. Provider, Deployer"
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
                    placeholder="Describe the system's intended purpose"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="classification" className={labelStyle}>
                    Classification
                  </label>
                  <input
                    type="text"
                    id="classification"
                    name="classification"
                    required
                    minLength={2}
                    placeholder="e.g. High-risk (AI Act Article 6)"
                    className={fieldStyle}
                  />
                </div>
                <div>
                  <label htmlFor="reasoning" className={labelStyle}>
                    Reasoning and cited evidence
                  </label>
                  <textarea
                    id="reasoning"
                    name="reasoning"
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
                  <Button type="submit" variant="primary">
                    Record classification
                  </Button>
                </div>
              </form>
            )}
          </Card>
        )}
      </AsyncBoundary>
    </>
  );
}
