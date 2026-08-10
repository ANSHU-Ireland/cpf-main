'use client';

import { useId, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../../components/PageHeader';
import { Card } from '../../../components/Card';
import { StatusBadge } from '../../../components/StatusBadge';
import { apiClient, ApiError } from '../../../lib/api-client';
import type { ImportResultView, ImportRowActionView, ImportRowView } from '../../../lib/types';

const STEPS = ['Upload', 'Validation', 'Review', 'Confirm'] as const;
const DEFAULT_ROWS = [
  'saoirse.oneill@example.test',
  'mateo.silva@example.test',
  'amina.yusuf@example.test',
  'noah.williams@example.test',
].join('\n');

const CAMPAIGNS = [
  { id: 'cmp_frontend_demo', label: 'Backend engineers — Q3' },
  {
    id: '11111111-0000-4000-8000-000000000208',
    label: 'Warehouse Systems Engineers — Autumn 2026',
  },
  {
    id: '11111111-0000-4000-8000-000000000209',
    label: 'Data Analysts — Rolling',
  },
] as const;

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

function rowTone(row: ImportRowView): 'success' | 'danger' | 'warning' | 'neutral' {
  if (row.status === 'valid' || row.status === 'committed') return 'success';
  if (row.status === 'invalid' || row.status === 'failed') return 'danger';
  if (row.status === 'excluded') return 'neutral';
  return 'warning';
}

export default function ImportCandidatesPage(): React.JSX.Element {
  const headingId = useId();
  const campaignId = useId();
  const fileNameId = useId();
  const fileId = useId();
  const textId = useId();
  const [step, setStep] = useState(0);
  const [selectedCampaign, setSelectedCampaign] = useState<string>(CAMPAIGNS[0].id);
  const [fileName, setFileName] = useState('northstar-candidates.csv');
  const [rowText, setRowText] = useState(DEFAULT_ROWS);
  const [result, setResult] = useState<ImportResultView | null>(null);
  const [corrections, setCorrections] = useState<Readonly<Record<string, string>>>({});
  const [busy, setBusy] = useState(false);
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function validate(): Promise<void> {
    if (rowText.trim().length === 0) {
      setError('Paste or choose a file containing at least one candidate email.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await apiClient.validateImport(rowText, selectedCampaign, fileName.trim());
      setResult(response);
      setStep(1);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not validate the import.');
    } finally {
      setBusy(false);
    }
  }

  async function updateRow(
    row: ImportRowView,
    action: ImportRowActionView,
    value?: string,
  ): Promise<void> {
    if (result === null) return;
    setUpdatingRowId(row.id);
    setError(null);
    try {
      const response = await apiClient.updateImportRow(result.importId, row.id, action, value);
      setResult(response);
      setCorrections((current) => ({ ...current, [row.id]: '' }));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not update this import row.');
    } finally {
      setUpdatingRowId(null);
    }
  }

  async function cancelAndEdit(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      if (result !== null) await apiClient.cancelImport(result.importId);
      setResult(null);
      setCorrections({});
      setStep(0);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : 'Could not cancel this staged import.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function commit(): Promise<void> {
    if (result === null) return;
    setBusy(true);
    setError(null);
    try {
      const response = await apiClient.commitImport(result.importId);
      setResult(response);
      setStep(3);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not commit the import.');
    } finally {
      setBusy(false);
    }
  }

  function startAnother(): void {
    setStep(0);
    setResult(null);
    setCorrections({});
    setFileName('northstar-candidates.csv');
    setRowText(DEFAULT_ROWS);
    setError(null);
  }

  const hasErrors = (result?.errors.length ?? 0) > 0;
  const selectedCampaignName =
    CAMPAIGNS.find((campaign) => campaign.id === selectedCampaign)?.label ?? 'Selected campaign';

  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        headingId={headingId}
        title="Candidate import"
        description="Stage, validate, correct and commit candidate imports. Raw values remain encrypted during validation."
        actions={
          step === 0 ? (
            <Button disabled={busy} onClick={() => void validate()}>
              {busy ? 'Validating…' : 'Validate file'}
            </Button>
          ) : null
        }
      />

      <ol
        aria-label="Candidate import progress"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(90px, 1fr))',
          listStyle: 'none',
          margin: '0 0 calc(var(--space-unit) * 6)',
          padding: 0,
          overflowX: 'auto',
        }}
      >
        {STEPS.map((label, index) => {
          const reached = index <= step;
          return (
            <li
              key={label}
              style={{
                textAlign: 'center',
                color: reached ? 'var(--color-blue)' : 'var(--color-muted)',
                borderTop: `2px solid ${reached ? 'var(--color-blue)' : 'var(--color-line)'}`,
                paddingTop: 'calc(var(--space-unit) * 2)',
                minWidth: 90,
              }}
            >
              <span
                aria-current={index === step ? 'step' : undefined}
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  width: 32,
                  height: 32,
                  margin: '0 auto var(--space-unit)',
                  borderRadius: '50%',
                  border: `1px solid ${reached ? 'var(--color-blue)' : 'var(--color-line)'}`,
                  background: index === step ? 'var(--color-blue)' : 'var(--color-paper)',
                  color: index === step ? 'var(--color-paper)' : 'inherit',
                  fontWeight: 700,
                }}
              >
                {index + 1}
              </span>
              <span style={{ fontWeight: index === step ? 700 : 500 }}>{label}</span>
            </li>
          );
        })}
      </ol>

      <Card aria-label={`${STEPS[step]} step`}>
        {step === 0 ? (
          <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 'calc(var(--space-unit) * 4)',
              }}
            >
              <label htmlFor={campaignId} style={{ display: 'grid', gap: 8, fontWeight: 600 }}>
                Campaign
                <select
                  id={campaignId}
                  value={selectedCampaign}
                  onChange={(event) => setSelectedCampaign(event.target.value)}
                  style={fieldStyle}
                >
                  {CAMPAIGNS.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>
                      {campaign.label}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor={fileNameId} style={{ display: 'grid', gap: 8, fontWeight: 600 }}>
                Import name
                <input
                  id={fileNameId}
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  style={fieldStyle}
                />
              </label>
            </div>

            <label htmlFor={fileId} style={{ display: 'grid', gap: 8, fontWeight: 600 }}>
              Choose CSV or text file
              <input
                id={fileId}
                type="file"
                accept=".csv,.txt,text/csv,text/plain"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file === undefined) return;
                  setFileName(file.name);
                  void file.text().then(setRowText);
                }}
                style={fieldStyle}
              />
            </label>

            <label htmlFor={textId} style={{ display: 'grid', gap: 8, fontWeight: 600 }}>
              Candidate emails
              <span style={{ color: 'var(--color-muted)', fontSize: '0.9rem', fontWeight: 400 }}>
                One fabricated demo email per line. The sample is ready to validate.
              </span>
              <textarea
                id={textId}
                value={rowText}
                onChange={(event) => setRowText(event.target.value)}
                rows={8}
                spellCheck={false}
                style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'var(--font-mono)' }}
              />
            </label>
          </div>
        ) : null}

        {step === 1 && result ? (
          <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 'calc(var(--space-unit) * 3)',
              }}
            >
              <Summary label="File" value={result.fileName} />
              <Summary label="Rows" value={String(result.totalRows)} />
              <Summary label="Ready" value={String(result.validRows)} />
              <Summary label="Needs attention" value={String(result.errors.length)} />
            </div>

            <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 3)' }}>
              {result.rows.map((row) => (
                <article
                  key={row.id}
                  aria-label={`Import row ${String(row.row)}`}
                  style={{
                    border: '1px solid var(--color-line)',
                    borderRadius: 'var(--radius-control)',
                    padding: 'calc(var(--space-unit) * 4)',
                    display: 'grid',
                    gap: 'calc(var(--space-unit) * 2)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <strong>Row {row.row}</strong>
                      <div style={{ color: 'var(--color-muted)', marginTop: 4 }}>
                        {row.displayValue}
                      </div>
                    </div>
                    <StatusBadge tone={rowTone(row)}>{row.status.replace('_', ' ')}</StatusBadge>
                  </div>
                  {row.errors.map((message) => (
                    <p key={message} style={{ margin: 0, color: 'var(--color-red)' }}>
                      {message}
                    </p>
                  ))}
                  {row.status === 'invalid' ? (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(220px, 1fr) auto auto',
                        gap: 'calc(var(--space-unit) * 2)',
                        alignItems: 'end',
                      }}
                    >
                      <label style={{ display: 'grid', gap: 6, fontWeight: 600 }}>
                        Correct email
                        <input
                          value={corrections[row.id] ?? ''}
                          onChange={(event) =>
                            setCorrections((current) => ({
                              ...current,
                              [row.id]: event.target.value,
                            }))
                          }
                          placeholder="candidate@example.test"
                          style={fieldStyle}
                        />
                      </label>
                      <Button
                        disabled={
                          updatingRowId !== null || (corrections[row.id] ?? '').trim().length === 0
                        }
                        onClick={() =>
                          void updateRow(row, 'include', (corrections[row.id] ?? '').trim())
                        }
                      >
                        {updatingRowId === row.id ? 'Saving…' : 'Apply correction'}
                      </Button>
                      <Button
                        variant="secondary"
                        disabled={updatingRowId !== null}
                        onClick={() => void updateRow(row, 'exclude')}
                      >
                        Exclude
                      </Button>
                    </div>
                  ) : row.status === 'excluded' ? (
                    <div>
                      <Button
                        variant="secondary"
                        disabled={updatingRowId !== null}
                        onClick={() => void updateRow(row, 'include')}
                      >
                        Include row
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Button
                        variant="secondary"
                        disabled={updatingRowId !== null}
                        onClick={() => void updateRow(row, 'exclude')}
                      >
                        Exclude row
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <Button variant="secondary" disabled={busy} onClick={() => void cancelAndEdit()}>
                Back to upload
              </Button>
              <Button disabled={hasErrors || updatingRowId !== null} onClick={() => setStep(2)}>
                Review import
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 && result ? (
          <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}>
            <div>
              <h2 style={{ margin: '0 0 8px', fontSize: '1.15rem' }}>Review import</h2>
              <p style={{ margin: 0, color: 'var(--color-muted)' }}>
                {result.validRows} validated candidates will be added to {selectedCampaignName}.
              </p>
            </div>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(120px, 180px) 1fr',
                gap: 12,
                margin: 0,
              }}
            >
              <dt style={{ color: 'var(--color-muted)' }}>Import</dt>
              <dd style={{ margin: 0 }}>{result.fileName}</dd>
              <dt style={{ color: 'var(--color-muted)' }}>Campaign</dt>
              <dd style={{ margin: 0 }}>{selectedCampaignName}</dd>
              <dt style={{ color: 'var(--color-muted)' }}>Validated rows</dt>
              <dd style={{ margin: 0 }}>{result.validRows}</dd>
              <dt style={{ color: 'var(--color-muted)' }}>Excluded rows</dt>
              <dd style={{ margin: 0 }}>
                {result.rows.filter((row) => row.status === 'excluded').length}
              </dd>
            </dl>
            <div
              style={{
                background: 'var(--color-soft)',
                borderRadius: 'var(--radius-control)',
                padding: 'calc(var(--space-unit) * 4)',
              }}
            >
              <strong>Governance note</strong>
              <p style={{ margin: '8px 0 0', color: 'var(--color-muted)' }}>
                Validation, row corrections and the final commit are recorded in the tenant audit
                trail. Email values remain encrypted and are never written to logs or events.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <Button variant="secondary" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Continue to confirm</Button>
            </div>
          </div>
        ) : null}

        {step === 3 && result ? (
          result.stage === 'committed' ? (
            <div role="status" style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}>
              <div>
                <StatusBadge tone="success">Import complete</StatusBadge>
                <h2 style={{ margin: '12px 0 8px', fontSize: '1.2rem' }}>
                  {result.validRows} candidates added
                </h2>
                <p style={{ margin: 0, color: 'var(--color-muted)' }}>
                  Candidate and application records were created for {selectedCampaignName}. Audit
                  and outbox evidence was recorded in the same transaction.
                </p>
              </div>
              <div>
                <Button variant="secondary" onClick={startAnother}>
                  Import another file
                </Button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'calc(var(--space-unit) * 4)' }}>
              <div>
                <h2 style={{ margin: '0 0 8px', fontSize: '1.15rem' }}>Confirm import</h2>
                <p style={{ margin: 0, color: 'var(--color-muted)' }}>
                  This will create {result.validRows} candidate applications. The commit is
                  idempotent and can safely be retried if the connection is interrupted.
                </p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <Button variant="secondary" disabled={busy} onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button disabled={busy} onClick={() => void commit()}>
                  {busy ? 'Committing…' : `Commit ${String(result.validRows)} candidates`}
                </Button>
              </div>
            </div>
          )
        ) : null}

        {error ? (
          <p
            role="alert"
            style={{ margin: 'calc(var(--space-unit) * 4) 0 0', color: 'var(--color-red)' }}
          >
            {error}
          </p>
        ) : null}
      </Card>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div
      style={{
        background: 'var(--color-soft)',
        borderRadius: 'var(--radius-control)',
        padding: 'calc(var(--space-unit) * 3)',
      }}
    >
      <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>{label}</div>
      <strong style={{ display: 'block', marginTop: 6, overflowWrap: 'anywhere' }}>{value}</strong>
    </div>
  );
}
