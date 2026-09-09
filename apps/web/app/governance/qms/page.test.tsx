import { createHash } from 'node:crypto';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../lib/api-client';
import type { QmsDocument } from './qms-contract';
import { qmsClient } from './qms-client';
import GovernanceQmsPage from './page';

const sha256 = createHash('sha256').update('Synthetic QMS UI test document.').digest('hex');
const doc: QmsDocument = {
  id: 'qms-1',
  title: 'Synthetic review procedure',
  documentCode: 'TEST-TENANT-QMS',
  versionNo: 1,
  documentType: 'quality_procedure',
  policy: 'Synthetic policy.',
  contentUri: 's3://test-protected-bucket/qms/v1.txt',
  sha256,
  status: 'draft',
  ownerUserId: 'user-1',
  approvedBy: '',
  reviewDue: '',
  updatedAt: '2026-09-06T12:00:00Z',
};
beforeEach(() => {
  vi.spyOn(qmsClient, 'list').mockResolvedValue({ items: [], total: 0 });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

async function fillForm() {
  const title = await screen.findByLabelText('Procedure title');
  fireEvent.change(title, { target: { value: doc.title } });
  for (const [label, value] of [
    ['Document code', doc.documentCode],
    ['Protected document reference', doc.contentUri],
    ['Document SHA-256 checksum', sha256],
    ['Reason for this version', 'Synthetic test revision.'],
  ] as const)
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  return title.closest('form')!;
}

describe('QMS procedure workspace', () => {
  it('creates the first draft, blocks duplicate submission and refreshes persisted server results', async () => {
    let finish!: (value: QmsDocument) => void;
    const create = vi.spyOn(qmsClient, 'create').mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    render(<GovernanceQmsPage />);
    const form = await fillForm();
    expect(screen.getByText('No procedures yet. Add your first draft above.')).toBeInTheDocument();
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(create).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Saving draft…' })).toBeDisabled();
    await act(async () => {
      finish(doc);
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Draft “Synthetic review procedure” saved.',
    );
    expect(screen.getByLabelText('Procedure title')).toHaveValue('');
    vi.mocked(qmsClient.list).mockResolvedValue({
      items: [{ ...doc, title: 'Persisted server title' }],
      total: 1,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Refresh list' }));
    expect(await screen.findByText('Persisted server title')).toBeInTheDocument();
    expect(qmsClient.list).toHaveBeenCalledTimes(2);
  });

  it('keeps entries and shows the conflict reason on rejected creation', async () => {
    vi.spyOn(qmsClient, 'create').mockRejectedValue(
      new ApiError(409, 'Choose a new version number.'),
    );
    render(<GovernanceQmsPage />);
    fireEvent.submit(await fillForm());
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a new version number.');
    expect(screen.getByLabelText('Document code')).toHaveValue(doc.documentCode);
    expect(screen.getByRole('button', { name: 'Save draft procedure' })).toBeEnabled();
  });

  it('shows real document details and supports a no-match state', async () => {
    vi.mocked(qmsClient.list).mockResolvedValue({ items: [doc], total: 1 });
    render(<GovernanceQmsPage />);
    await screen.findByText(doc.title);
    fireEvent.click(screen.getByText('Document details'));
    expect(screen.getByText(sha256)).toBeVisible();
    expect(screen.getByText(doc.contentUri)).toBeVisible();
    expect(screen.getByText('No approver recorded')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Search procedures'), { target: { value: 'missing' } });
    expect(screen.getByRole('status')).toHaveTextContent('No procedures match your search.');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByText(doc.title)).toBeInTheDocument();
  });
});
