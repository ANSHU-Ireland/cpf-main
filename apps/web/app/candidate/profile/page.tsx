'use client';
import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { useAsync } from '../../lib/useAsync';
import type { CandidateProfile } from '../../lib/types';
import { apiClient } from '../../lib/api-client';

export default function CandidateProfilePage() {
  const headingId = useId();
  const [data, setData] = useState<CandidateProfile | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loader = useCallback(async () => {
    const profile = await apiClient.getCandidateProfile();
    setData(profile);
    return profile;
  }, []);

  const { state, reload } = useAsync<CandidateProfile>(loader);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const field = (formData.get('field') as string) || '';
    const currentValue = (formData.get('currentValue') as string) || '';
    const correctedValue = (formData.get('correctedValue') as string) || '';
    const reason = (formData.get('reason') as string) || '';

    if (!field.trim() || !currentValue.trim() || !correctedValue.trim() || !reason.trim()) return;

    await apiClient.submitProfileCorrection({
      field: field.trim(),
      currentValue: currentValue.trim(),
      correctedValue: correctedValue.trim(),
      reason: reason.trim(),
    });

    form.reset();
    setShowForm(false);
    const updated = await apiClient.getCandidateProfile();
    setData(updated);
  };

  const fieldStyle =
    'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
  const labelStyle = 'block text-sm font-medium text-ink mb-1';

  return (
    <>
      <PageHeader
        title="Profile and corrections"
        description="Review supplied identity and request auditable corrections."
        headingId={headingId}
      />

      <AsyncBoundary state={state} onRetry={reload} label="Candidate profile">
        {() => (
          <div className="space-y-6">
            <Card aria-label="Your profile">
              <h2 className="text-base font-semibold text-ink mb-4">Your profile</h2>
              {data && (
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-muted">Full name</dt>
                    <dd className="text-sm text-ink mt-1">{data.fullName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted">Email</dt>
                    <dd className="text-sm text-ink mt-1">{data.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-muted">Date of birth</dt>
                    <dd className="text-sm text-ink mt-1">{data.dateOfBirth}</dd>
                  </div>
                  {data.phone && (
                    <div>
                      <dt className="text-sm font-medium text-muted">Phone</dt>
                      <dd className="text-sm text-ink mt-1">{data.phone}</dd>
                    </div>
                  )}
                </dl>
              )}

              {!showForm && (
                <div className="mt-6 pt-4 border-t border-line">
                  <p className="text-sm text-muted mb-4">
                    If any information is incorrect, you can request a correction. All requests are
                    reviewed and tracked.
                  </p>
                  <Button variant="secondary" onClick={() => setShowForm(true)}>
                    Request correction
                  </Button>
                </div>
              )}
            </Card>

            {showForm && (
              <Card aria-label="Request correction">
                <h2 className="text-base font-semibold text-ink mb-4">Request correction</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="field" className={labelStyle}>
                      Field to correct
                    </label>
                    <select id="field" name="field" required className={fieldStyle}>
                      <option value="">Select field</option>
                      <option value="fullName">Full name</option>
                      <option value="email">Email</option>
                      <option value="dateOfBirth">Date of birth</option>
                      <option value="phone">Phone</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="currentValue" className={labelStyle}>
                      Current value
                    </label>
                    <input
                      type="text"
                      id="currentValue"
                      name="currentValue"
                      required
                      minLength={2}
                      placeholder="Enter the current incorrect value"
                      className={fieldStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor="correctedValue" className={labelStyle}>
                      Corrected value
                    </label>
                    <input
                      type="text"
                      id="correctedValue"
                      name="correctedValue"
                      required
                      minLength={2}
                      placeholder="Enter the correct value"
                      className={fieldStyle}
                    />
                  </div>
                  <div>
                    <label htmlFor="reason" className={labelStyle}>
                      Reason for correction
                    </label>
                    <textarea
                      id="reason"
                      name="reason"
                      required
                      minLength={10}
                      rows={3}
                      placeholder="Explain why this correction is needed"
                      className={fieldStyle}
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" variant="primary">
                      Submit correction
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </div>
        )}
      </AsyncBoundary>
    </>
  );
}
