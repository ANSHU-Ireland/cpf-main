import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { apiClient, ApiError } from '../../lib/api-client';
import type { EvidenceCollectionView } from '../../lib/types';
import AuditEvidencePage from './page';

const collection: EvidenceCollectionView = {
  id: 'collection-1',
  title: 'Tenant isolation evidence',
  purpose: 'Verify access controls',
  custodian: 'Casey Auditor',
  sealed: false,
  chainOfCustody: [
    { actor: 'Casey Auditor', action: 'Collection created', timestamp: '2026-08-21T12:00:00Z' },
  ],
  status: 'ready',
  createdAt: '2026-08-21T12:00:00Z',
};

beforeEach(() => {
  vi.spyOn(apiClient, 'getEvidenceCollections').mockResolvedValue({ items: [], total: 0 });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function fillCreateForm() {
  const title = await screen.findByLabelText('Collection title');
  fireEvent.change(title, { target: { value: collection.title } });
  fireEvent.change(screen.getByLabelText('Purpose'), { target: { value: collection.purpose } });
  return title.closest('form')!;
}

describe('Audit evidence workspace', () => {
  it('can create the first collection and ignores duplicate submissions while pending', async () => {
    let finish!: (value: EvidenceCollectionView) => void;
    const create = vi.spyOn(apiClient, 'createEvidenceCollection').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<AuditEvidencePage />);
    const form = await fillCreateForm();
    expect(screen.getByText(/No evidence collections yet/)).toBeInTheDocument();

    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(create).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Creating collection…' })).toBeDisabled();
    expect(screen.getByLabelText('Collection title')).toBeDisabled();

    await act(async () => {
      finish(collection);
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Collection “Tenant isolation evidence” created.',
    );
    expect(screen.getByRole('cell', { name: /Tenant isolation evidence/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Collection title')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Create collection' })).toBeEnabled();
  });

  it('retains the form after a failed create and allows a subsequent attempt', async () => {
    vi.spyOn(apiClient, 'createEvidenceCollection').mockRejectedValue(
      new ApiError(503, 'Unavailable'),
    );
    render(<AuditEvidencePage />);
    fireEvent.submit(await fillCreateForm());
    expect(await screen.findByRole('alert')).toHaveTextContent('Your entries have been kept');
    expect(screen.getByLabelText('Collection title')).toHaveValue(collection.title);
    expect(screen.getByLabelText('Purpose')).toHaveValue(collection.purpose);
    expect(screen.getByRole('button', { name: 'Create collection' })).toBeEnabled();
  });

  it('explains unmatched searches and exposes the recorded custody history', async () => {
    vi.mocked(apiClient.getEvidenceCollections).mockResolvedValue({
      items: [collection],
      total: 1,
    });
    render(<AuditEvidencePage />);
    const search = await screen.findByLabelText('Search by title or ID');
    fireEvent.change(search, { target: { value: 'unmatched term' } });
    expect(screen.getByRole('status')).toHaveTextContent('No collections match your search');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(search).toHaveValue('');
    const summary = screen.getByText('Chain of custody');
    expect(summary.tagName).toBe('SUMMARY');
    fireEvent.click(summary);
    const history = screen.getByRole('list', { name: `Custody history for ${collection.title}` });
    expect(within(history).getByText('Collection created')).toBeVisible();
    expect(within(history).getByText('Casey Auditor')).toBeVisible();
  });

  it('keeps the create form hidden when the workspace is denied', async () => {
    vi.mocked(apiClient.getEvidenceCollections).mockRejectedValue(
      new ApiError(403, 'Access denied'),
    );
    render(<AuditEvidencePage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Access denied');
    expect(screen.queryByRole('button', { name: 'Create collection' })).not.toBeInTheDocument();
  });
});
