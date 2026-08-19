'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { ReviewerProfileView } from '../../lib/types';

const fieldStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-control)',
  border: '1px solid var(--color-line)',
  padding: 'calc(var(--space-unit) * 2) calc(var(--space-unit) * 3)',
  fontFamily: 'inherit',
  fontSize: 'inherit',
  color: 'var(--color-ink)',
  background: 'var(--color-paper)',
  width: '100%',
  boxSizing: 'border-box',
};

export default function ReviewerProfilePage(): React.JSX.Element {
  const headingId = useId();
  const nameId = useId();
  const discId = useId();
  const maxId = useId();
  const load = useCallback(() => apiClient.getReviewerProfile(), []);
  const { state, reload, setData } = useAsync<ReviewerProfileView>(load);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Reviewer profile"
        description="Your disciplines help route assignments that match your expertise."
      />
      <AsyncBoundary state={state} onRetry={reload} label="profile">
        {(profile) => (
          <ProfileForm profile={profile} onSaved={setData} ids={{ nameId, discId, maxId }} />
        )}
      </AsyncBoundary>
    </div>
  );
}

function ProfileForm({
  profile,
  onSaved,
  ids,
}: {
  profile: ReviewerProfileView;
  onSaved: (next: ReviewerProfileView) => void;
  ids: { nameId: string; discId: string; maxId: string };
}): React.JSX.Element {
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [disciplines, setDisciplines] = useState(profile.disciplines.join(', '));
  const [maxActiveReviews, setMaxActiveReviews] = useState(
    profile.maxActiveReviews === null ? '' : String(profile.maxActiveReviews),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDisplayName(profile.displayName);
    setDisciplines(profile.disciplines.join(', '));
    setMaxActiveReviews(profile.maxActiveReviews === null ? '' : String(profile.maxActiveReviews));
  }, [profile]);

  async function save(): Promise<void> {
    if (displayName.trim().length < 2) {
      setError('A display name is required.');
      return;
    }
    const maxReviews = maxActiveReviews.trim() === '' ? null : Number(maxActiveReviews);
    if (
      maxReviews !== null &&
      (!Number.isInteger(maxReviews) || maxReviews < 0 || maxReviews > 100)
    ) {
      setError('Maximum active reviews must be blank or an integer from 0 to 100.');
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const next = await apiClient.updateReviewerProfile({
        displayName: displayName.trim(),
        disciplines: disciplines
          .split(',')
          .map((d) => d.trim())
          .filter((d) => d.length > 0),
        maxActiveReviews: maxReviews,
      });
      onSaved(next);
      setSaved(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 2)' }}
        >
          <label htmlFor={ids.nameId} style={{ fontWeight: 600 }}>
            Display name
          </label>
          <input
            id={ids.nameId}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={fieldStyle}
          />
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 2)' }}
        >
          <label htmlFor={ids.discId} style={{ fontWeight: 600 }}>
            Disciplines (comma separated)
          </label>
          <input
            id={ids.discId}
            value={disciplines}
            onChange={(e) => setDisciplines(e.target.value)}
            style={fieldStyle}
          />
        </div>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 2)' }}
        >
          <label htmlFor={ids.maxId} style={{ fontWeight: 600 }}>
            Maximum active reviews
          </label>
          <input
            id={ids.maxId}
            type="number"
            min={0}
            max={100}
            value={maxActiveReviews}
            onChange={(e) => setMaxActiveReviews(e.target.value)}
            style={fieldStyle}
          />
        </div>
        <p style={{ margin: 0, color: 'var(--color-muted)' }}>
          Training: {profile.trainingStatus.replaceAll('_', ' ')} · Calibration:{' '}
          {profile.calibrationStatus.replaceAll('_', ' ')} · Conflict declaration:{' '}
          {profile.conflictDeclarationRequired ? 'required' : 'not required'}
        </p>
        {error ? (
          <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" style={{ margin: 0, color: 'var(--color-sage)' }}>
            Profile saved.
          </p>
        ) : null}
        <div>
          <Button disabled={busy} onClick={() => void save()}>
            {busy ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </div>
    </Card>
  );
}
