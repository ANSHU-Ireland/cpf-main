'use client';

import { useCallback, useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { StructureView } from '../../lib/types';

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

export default function StructurePage(): React.JSX.Element {
  const headingId = useId();
  const depId = useId();
  const teamId = useId();
  const teamDepId = useId();
  const load = useCallback(() => apiClient.getStructure(), []);
  const { state, reload, setData } = useAsync<StructureView>(load);
  const [depName, setDepName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamDept, setTeamDept] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function addDepartment(current: StructureView): Promise<void> {
    if (depName.trim().length < 2) {
      setError('A department name is required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const dep = await apiClient.addDepartment(depName.trim());
      setData({ ...current, departments: [...current.departments, dep] });
      setDepName('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add the department.');
    } finally {
      setBusy(false);
    }
  }

  async function addTeam(current: StructureView): Promise<void> {
    if (teamName.trim().length < 2 || teamDept.length === 0) {
      setError('A team name and parent department are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const team = await apiClient.addTeam(teamName.trim(), teamDept);
      setData({ ...current, teams: [...current.teams, team] });
      setTeamName('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not add the team.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 6)' }}>
      <PageHeader
        headingId={headingId}
        title="Organisation structure"
        description="Departments and teams used to route campaigns and reviews."
      />
      <AsyncBoundary state={state} onRetry={reload} label="structure">
        {(data) => (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'calc(var(--space-unit) * 4)' }}
          >
            <Card>
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 3)',
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                }}
              >
                <div style={{ flex: '1 1 220px' }}>
                  <label htmlFor={depId} style={{ fontWeight: 600, display: 'block' }}>
                    New department
                  </label>
                  <input
                    id={depId}
                    value={depName}
                    onChange={(e) => setDepName(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <Button disabled={busy} onClick={() => void addDepartment(data)}>
                  Add department
                </Button>
              </div>
            </Card>
            <Card>
              <div
                style={{
                  display: 'flex',
                  gap: 'calc(var(--space-unit) * 3)',
                  flexWrap: 'wrap',
                  alignItems: 'flex-end',
                }}
              >
                <div style={{ flex: '1 1 180px' }}>
                  <label htmlFor={teamId} style={{ fontWeight: 600, display: 'block' }}>
                    New team
                  </label>
                  <input
                    id={teamId}
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    style={fieldStyle}
                  />
                </div>
                <div style={{ flex: '0 1 200px' }}>
                  <label htmlFor={teamDepId} style={{ fontWeight: 600, display: 'block' }}>
                    Department
                  </label>
                  <select
                    id={teamDepId}
                    value={teamDept}
                    onChange={(e) => setTeamDept(e.target.value)}
                    style={fieldStyle}
                  >
                    <option value="">Select…</option>
                    {data.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Button disabled={busy} onClick={() => void addTeam(data)}>
                  Add team
                </Button>
              </div>
            </Card>
            {error ? (
              <p role="alert" style={{ margin: 0, color: 'var(--color-red)' }}>
                {error}
              </p>
            ) : null}
            <div
              style={{
                display: 'grid',
                gap: 'calc(var(--space-unit) * 4)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              }}
            >
              {data.departments.map((dep) => (
                <Card key={dep.id} as="article" aria-label={dep.name}>
                  <h2 style={{ margin: '0 0 8px', fontSize: '1.05rem' }}>{dep.name}</h2>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--color-muted)' }}>
                    {data.teams
                      .filter((t) => t.departmentId === dep.id)
                      .map((t) => (
                        <li key={t.id}>{t.name}</li>
                      ))}
                  </ul>
                </Card>
              ))}
            </div>
          </div>
        )}
      </AsyncBoundary>
    </div>
  );
}
