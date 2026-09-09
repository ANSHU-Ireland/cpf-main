'use client';
import { useCallback, useId, useRef, useState } from 'react';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { Card } from '../../components/Card';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { StatusBadge } from '../../components/StatusBadge';
import { useAsync } from '../../lib/useAsync';
import type { BadgeTone, Collection } from '../../lib/types';
import { parseQmsCreate, type QmsDocument } from './qms-contract';
import { qmsClient } from './qms-client';

const STATUS_TONE: Record<string, BadgeTone> = {
  draft: 'warning',
  in_review: 'info',
  approved: 'success',
  effective: 'success',
  superseded: 'neutral',
  retired: 'neutral',
};
const fieldStyle =
  'block w-full min-w-0 rounded-md border border-line bg-paper px-3 py-2 text-sm text-ink focus:border-blue focus:ring-1 focus:ring-blue';
const labelStyle = 'block text-sm font-medium text-ink mb-1';

export default function GovernanceQmsPage() {
  const headingId = useId();
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const loader = useCallback(() => qmsClient.list(), []);
  const { state, reload, setData } = useAsync<Collection<QmsDocument>>(loader);

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current || state.status !== 'ready') return;
    const form = event.currentTarget;
    const fields = Object.fromEntries(new FormData(form));
    const parsed = parseQmsCreate({ ...fields, versionNo: Number(fields.versionNo) });
    setError('');
    setMessage('');
    if (!parsed.ok) {
      setError(parsed.detail);
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      const created = await qmsClient.create(parsed.value);
      setData({ items: [created, ...state.data.items], total: state.data.total + 1 });
      form.reset();
      setFilter('');
      setMessage(`Draft “${created.title}” saved. Refresh the list to read it from storage.`);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : 'The document could not be saved. Your entries have been kept.',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Quality management system"
        headingId={headingId}
        description="Maintain versioned procedures and policies with their document references and review history."
      />
      {message && (
        <p role="status" className="mb-4 text-sm text-ink">
          {message}
        </p>
      )}
      <AsyncBoundary state={state} onRetry={reload} label="QMS procedures">
        {(data) => {
          const search = filter.trim().toLowerCase();
          const filtered = data.items.filter((item) =>
            `${item.title} ${item.documentCode} ${item.id}`.toLowerCase().includes(search),
          );
          return (
            <div className="space-y-6">
              <Card aria-label="Add procedure">
                <h2 className="mb-2 text-base font-semibold text-ink">Add procedure version</h2>
                <p className="mb-4 text-sm text-muted">
                  New versions are saved as drafts under your account. Reference an immutable
                  document already held in approved protected storage. This form records its
                  reference and checksum; it does not upload files, verify the stored content, or
                  approve the procedure.
                </p>
                <form onSubmit={handleAdd} aria-busy={saving} className="space-y-4">
                  <fieldset disabled={saving} className="grid min-w-0 gap-4 md:grid-cols-2">
                    <legend className="sr-only">Procedure details</legend>
                    <div className="md:col-span-2">
                      <label htmlFor="qms-title" className={labelStyle}>
                        Procedure title
                      </label>
                      <input
                        id="qms-title"
                        name="title"
                        required
                        minLength={4}
                        className={fieldStyle}
                      />
                    </div>
                    <div>
                      <label htmlFor="qms-code" className={labelStyle}>
                        Document code
                      </label>
                      <input
                        id="qms-code"
                        name="documentCode"
                        required
                        aria-describedby="qms-code-help"
                        className={fieldStyle}
                      />
                      <p id="qms-code-help" className="mt-1 text-xs text-muted">
                        Use an organisation-specific code. Increment the version for each revision.
                      </p>
                    </div>
                    <div>
                      <label htmlFor="qms-version" className={labelStyle}>
                        Version number
                      </label>
                      <input
                        id="qms-version"
                        name="versionNo"
                        type="number"
                        min={1}
                        max={2147483647}
                        step={1}
                        defaultValue={1}
                        required
                        className={fieldStyle}
                      />
                    </div>
                    <div>
                      <label htmlFor="qms-type" className={labelStyle}>
                        Document type
                      </label>
                      <select
                        id="qms-type"
                        name="documentType"
                        defaultValue="quality_procedure"
                        className={fieldStyle}
                      >
                        <option value="quality_procedure">Quality procedure</option>
                        <option value="policy">Policy</option>
                        <option value="work_instruction">Work instruction</option>
                        <option value="record_template">Record template</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="qms-review" className={labelStyle}>
                        Review due (optional)
                      </label>
                      <input id="qms-review" name="reviewDue" type="date" className={fieldStyle} />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="qms-policy" className={labelStyle}>
                        Policy summary (optional)
                      </label>
                      <textarea id="qms-policy" name="policy" rows={3} className={fieldStyle} />
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="qms-uri" className={labelStyle}>
                        Protected document reference
                      </label>
                      <input
                        id="qms-uri"
                        name="contentUri"
                        type="url"
                        required
                        aria-describedby="qms-uri-help"
                        className={fieldStyle}
                      />
                      <p id="qms-uri-help" className="mt-1 text-xs text-muted">
                        An HTTPS or S3 document reference without embedded credentials.
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="qms-hash" className={labelStyle}>
                        Document SHA-256 checksum
                      </label>
                      <input
                        id="qms-hash"
                        name="sha256"
                        required
                        pattern="[a-fA-F0-9]{64}"
                        minLength={64}
                        maxLength={64}
                        aria-describedby="qms-hash-help"
                        className={fieldStyle}
                      />
                      <p id="qms-hash-help" className="mt-1 text-xs text-muted">
                        Enter the actual 64-character checksum of that document. A checksum is not
                        proof of approval.
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <label htmlFor="qms-reason" className={labelStyle}>
                        Reason for this version
                      </label>
                      <textarea
                        id="qms-reason"
                        name="reason"
                        required
                        minLength={4}
                        maxLength={2000}
                        rows={2}
                        className={fieldStyle}
                      />
                    </div>
                  </fieldset>
                  {error && (
                    <p role="alert" className="text-sm text-ink">
                      {error}
                    </p>
                  )}
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Saving draft…' : 'Save draft procedure'}
                  </Button>
                </form>
              </Card>
              <Card aria-label="QMS procedures list">
                <div className="mb-4 flex flex-wrap items-end gap-3">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="qms-filter" className={labelStyle}>
                      Search procedures
                    </label>
                    <input
                      id="qms-filter"
                      value={filter}
                      onChange={(event) => setFilter(event.target.value)}
                      placeholder="Title, document code or ID"
                      className={fieldStyle}
                    />
                  </div>
                  <Button variant="secondary" onClick={reload} disabled={saving}>
                    Refresh list
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-line">
                    <thead>
                      <tr>
                        {['Procedure', 'Version', 'Status', 'Owner', 'Updated'].map((title) => (
                          <th
                            key={title}
                            scope="col"
                            className="px-3 py-2 text-left text-sm font-medium text-ink"
                          >
                            {title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {filtered.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-sm text-muted">
                            <p role="status">
                              {data.items.length
                                ? 'No procedures match your search.'
                                : 'No procedures yet. Add your first draft above.'}
                            </p>
                            {filter && (
                              <Button variant="secondary" onClick={() => setFilter('')}>
                                Clear search
                              </Button>
                            )}
                          </td>
                        </tr>
                      )}
                      {filtered.map((doc) => (
                        <tr key={doc.id}>
                          <td className="px-3 py-3 text-sm text-ink">
                            <p className="font-medium">{doc.title}</p>
                            <p className="text-muted">{doc.documentCode || 'Code not recorded'}</p>
                            <details className="mt-2">
                              <summary className="cursor-pointer rounded text-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue">
                                Document details<span className="sr-only"> for {doc.title}</span>
                              </summary>
                              <dl className="mt-3 space-y-2 text-muted">
                                <div>
                                  <dt className="font-medium text-ink">Type</dt>
                                  <dd>{doc.documentType.replaceAll('_', ' ') || 'Not recorded'}</dd>
                                </div>
                                <div>
                                  <dt className="font-medium text-ink">Policy summary</dt>
                                  <dd>{doc.policy || 'Not recorded'}</dd>
                                </div>
                                <div>
                                  <dt className="font-medium text-ink">
                                    Protected document reference
                                  </dt>
                                  <dd className="max-w-lg break-all">
                                    {doc.contentUri || 'Not returned by the document service'}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-medium text-ink">SHA-256</dt>
                                  <dd className="max-w-lg break-all font-mono">
                                    {doc.sha256 || 'Not returned by the document service'}
                                  </dd>
                                </div>
                                <div>
                                  <dt className="font-medium text-ink">Approved by</dt>
                                  <dd>{doc.approvedBy || 'No approver recorded'}</dd>
                                </div>
                                <div>
                                  <dt className="font-medium text-ink">Review due</dt>
                                  <dd>
                                    {doc.reviewDue
                                      ? new Date(doc.reviewDue).toLocaleDateString()
                                      : 'Not scheduled'}
                                  </dd>
                                </div>
                              </dl>
                            </details>
                          </td>
                          <td className="px-3 py-3 text-sm text-muted">
                            {doc.versionNo ?? 'Not recorded'}
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge tone={STATUS_TONE[doc.status] ?? 'neutral'}>
                              {doc.status.replaceAll('_', ' ')}
                            </StatusBadge>
                          </td>
                          <td className="px-3 py-3 text-sm text-muted">
                            {doc.ownerUserId || 'Not returned by the document service'}
                          </td>
                          <td className="px-3 py-3 text-sm text-muted">
                            <time dateTime={doc.updatedAt}>
                              {new Date(doc.updatedAt).toLocaleDateString()}
                            </time>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          );
        }}
      </AsyncBoundary>
    </>
  );
}
