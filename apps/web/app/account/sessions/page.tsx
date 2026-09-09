'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { Button } from '@cpf/ui';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { AsyncBoundary } from '../../components/AsyncBoundary';
import { apiClient, ApiError } from '../../lib/api-client';
import { useAsync } from '../../lib/useAsync';
import type { SessionPage, SessionView } from '../../lib/types';
import styles from './sessions.module.css';

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
const label = (session: SessionView): string => session.deviceLabel?.trim() || 'Unlabelled device';

export function SessionList({ data }: { data: SessionPage }): React.JSX.Element {
  const [page, setPage] = useState(data);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [selected, setSelected] = useState<SessionView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const pending = useRef(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const result = useRef<HTMLParagraphElement>(null);
  const titleId = useId();
  const consequenceId = useId();

  useEffect(() => {
    if (selected) dialog.current?.showModal();
  }, [selected]);

  function cancel(): void {
    if (pending.current) return;
    dialog.current?.close();
    setSelected(null);
    setError(null);
    trigger.current?.focus();
  }

  async function revoke(): Promise<void> {
    if (!selected || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await apiClient.revokeSession(selected.id);
      setPage((previous) => ({
        ...previous,
        items: previous.items.map((item) =>
          item.id === selected.id ? { ...item, status: 'revoked' } : item,
        ),
      }));
      setNotice(`Session ended for ${label(selected)}. It cannot be restored.`);
      dialog.current?.close();
      setSelected(null);
      result.current?.focus();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not end this session. Try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  async function loadMore(): Promise<void> {
    if (!page.nextCursor || pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const next = await apiClient.getSessions(page.nextCursor);
      setPage((previous) => ({
        ...next,
        items: [
          ...previous.items,
          ...next.items.filter((item) => !previous.items.some((old) => old.id === item.id)),
        ],
      }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load more sessions. Try again.');
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }

  const items = page.items.filter(
    (session) =>
      (status === 'all' || session.status === status) &&
      `${label(session)} ${session.id}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className={styles.surface}>
      <div className={styles.toolbar}>
        <label className={styles.search}>
          Search loaded sessions
          <input
            type="search"
            value={query}
            placeholder="Device name or session ID"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="revoked">Revoked</option>
          </select>
        </label>
      </div>
      <p className={styles.summary} ref={result} tabIndex={-1} role="status">
        {notice ||
          `${items.length} matching sessions · ${page.items.length} of ${page.total} loaded`}
      </p>
      {error && !selected ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className={styles.caption}>Your signed-in devices and session history</caption>
          <thead>
            <tr>
              <th scope="col">Device</th>
              <th scope="col">Status</th>
              <th scope="col">Last active</th>
              <th scope="col">Expires</th>
              <th scope="col">Next action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((session) => (
              <tr key={session.id}>
                <th scope="row">
                  <strong>{label(session)}</strong>
                  <small>Started {formatDate(session.createdAt)}</small>
                  <small className={styles.identifier}>{session.id}</small>
                </th>
                <td data-label="Status">
                  <StatusBadge
                    tone={
                      session.status === 'active'
                        ? 'success'
                        : session.status === 'revoked'
                          ? 'warning'
                          : 'neutral'
                    }
                  >
                    {session.status[0]?.toUpperCase()}
                    {session.status.slice(1)}
                  </StatusBadge>
                </td>
                <td data-label="Last active">{formatDate(session.lastSeenAt)}</td>
                <td data-label="Expires">{formatDate(session.expiresAt)}</td>
                <td data-label="Next action">
                  {session.status === 'active' ? (
                    <Button
                      variant="danger"
                      disabled={busy}
                      aria-label={`End session for ${label(session)} (${session.id})`}
                      onClick={(event) => {
                        trigger.current = event.currentTarget;
                        setError(null);
                        setSelected(session);
                      }}
                    >
                      End session
                    </Button>
                  ) : (
                    <span className={styles.muted}>No action needed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ? (
          <div className={styles.empty}>
            <h2>{page.total === 0 ? 'No sessions recorded' : 'No matching sessions'}</h2>
            <p>
              {page.total === 0
                ? 'Your session history will appear here after signing in.'
                : 'Change your search or status filter, or load more history below.'}
            </p>
            {query || status !== 'all' ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  setStatus('all');
                }}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className={styles.footer}>
        <p>
          Only your sessions are shown. Device location and the current browser are not identified
          by this service.
        </p>
        {page.nextCursor ? (
          <Button variant="secondary" disabled={busy} onClick={() => void loadMore()}>
            {busy ? 'Loading…' : 'Load more sessions'}
          </Button>
        ) : null}
      </div>
      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={titleId}
        aria-describedby={consequenceId}
        onCancel={(event) => {
          event.preventDefault();
          cancel();
        }}
      >
        <h2 id={titleId}>End this session?</h2>
        <p>{selected ? label(selected) : ''}</p>
        <p id={consequenceId}>
          This revokes the selected session and prevents it from being refreshed. The device will
          need to sign in again. This cannot be undone and may affect this browser.
        </p>
        {error && selected ? (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <Button variant="secondary" disabled={busy} onClick={cancel}>
            Keep session
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => void revoke()}>
            {busy ? 'Ending session…' : 'Confirm end session'}
          </Button>
        </div>
      </dialog>
    </div>
  );
}

export default function SessionsPage(): React.JSX.Element {
  const headingId = useId();
  const loader = useCallback(() => apiClient.getSessions(), []);
  const { state, reload } = useAsync(loader);
  return (
    <section aria-labelledby={headingId}>
      <PageHeader
        title="Security and sessions"
        headingId={headingId}
        description="Review signed-in devices and session history. End any active session you don’t recognise."
        actions={<Link href="/account/security">Password and security activity</Link>}
      />
      <AsyncBoundary state={state} onRetry={reload} label="your sessions">
        {(data) => <SessionList data={data} />}
      </AsyncBoundary>
    </section>
  );
}
