import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { apiClient } from '../../lib/api-client';
import type { SessionPage, SessionView } from '../../lib/types';
import { SessionList } from './page';

const active: SessionView = {
  id: 'session-1',
  deviceLabel: 'Demo laptop',
  createdAt: '2026-09-01T10:00:00Z',
  lastSeenAt: '2026-09-09T10:00:00Z',
  expiresAt: '2026-09-15T10:00:00Z',
  status: 'active',
};
const data: SessionPage = {
  items: [
    active,
    { ...active, id: 'session-2', deviceLabel: null, status: 'expired' },
    { ...active, id: 'session-3', deviceLabel: 'Old tablet', status: 'revoked' },
  ],
  total: 3,
  nextCursor: null,
};
beforeEach(() => {
  // jsdom lacks the browser's native dialog methods; model only open/closed state here.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value: function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    },
  });
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.setAttribute('open', '');
  });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (
    this: HTMLDialogElement,
  ) {
    this.removeAttribute('open');
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('canonical session management', () => {
  it('renders real fields, all statuses and no invented location or current device', () => {
    render(<SessionList data={data} />);
    expect(screen.getByText('Demo laptop')).toBeInTheDocument();
    expect(screen.getByText('Unlabelled device')).toBeInTheDocument();
    expect(screen.getAllByText('No action needed')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /End session for/ })).toHaveLength(1);
    expect(screen.queryByText('This device')).not.toBeInTheDocument();
  });
  it('filters loaded history, distinguishes no matches, and clears filters', () => {
    render(<SessionList data={data} />);
    fireEvent.change(screen.getByLabelText('Search loaded sessions'), {
      target: { value: 'missing' },
    });
    expect(screen.getByText('No matching sessions')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'revoked' } });
    expect(screen.getByText('Old tablet')).toBeInTheDocument();
    expect(screen.queryByText('Demo laptop')).not.toBeInTheDocument();
  });
  it('does not revoke before confirmation and restores focus on cancel', () => {
    const revoke = vi.spyOn(apiClient, 'revokeSession');
    render(<SessionList data={data} />);
    const button = screen.getByRole('button', { name: /End session for/ });
    fireEvent.click(button);
    expect(screen.getByRole('dialog', { name: 'End this session?' })).toBeInTheDocument();
    expect(revoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep session' }));
    expect(button).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('blocks repeated confirmation and updates status only after success', async () => {
    let finish!: () => void;
    const revoke = vi.spyOn(apiClient, 'revokeSession').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(<SessionList data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /End session for/ }));
    const confirm = screen.getByRole('button', { name: 'Confirm end session' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(revoke).toHaveBeenCalledTimes(1);
    expect(revoke).toHaveBeenCalledWith(active.id);
    expect(screen.getByRole('button', { name: 'Keep session' })).toBeDisabled();
    await act(async () => finish());
    expect(screen.getByRole('status')).toHaveTextContent('Session ended for Demo laptop');
    expect(screen.getByRole('status')).toHaveFocus();
    expect(screen.queryByRole('button', { name: /End session for/ })).not.toBeInTheDocument();
  });
  it('keeps confirmation and the session intact after failure, allowing retry', async () => {
    const revoke = vi
      .spyOn(apiClient, 'revokeSession')
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(undefined);
    render(<SessionList data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /End session for/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm end session' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not end this session');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm end session' }));
    await screen.findByText('Session ended for Demo laptop. It cannot be restored.');
    expect(revoke).toHaveBeenCalledTimes(2);
  });
  it('loads the next cursor without losing existing history or duplicating rows', async () => {
    const next = vi.spyOn(apiClient, 'getSessions').mockResolvedValue({
      ...data,
      items: [active, { ...active, id: 'session-4', deviceLabel: 'Phone' }],
      total: 4,
    });
    render(<SessionList data={{ ...data, total: 4, nextCursor: 'opaque+cursor' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load more sessions' }));
    expect(await screen.findByText('Phone')).toBeInTheDocument();
    expect(next).toHaveBeenCalledWith('opaque+cursor');
    expect(screen.getAllByText('Demo laptop')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('4 of 4 loaded');
  });
  it('offers retry when loading more fails without discarding rows', async () => {
    vi.spyOn(apiClient, 'getSessions').mockRejectedValue(new Error('offline'));
    render(<SessionList data={{ ...data, nextCursor: 'next' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Load more sessions' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load more sessions');
    expect(screen.getByText('Demo laptop')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load more sessions' })).toBeEnabled();
  });
  it('distinguishes an empty account history', () => {
    render(<SessionList data={{ items: [], total: 0, nextCursor: null }} />);
    expect(screen.getByText('No sessions recorded')).toBeInTheDocument();
  });
});
