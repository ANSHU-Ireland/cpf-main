import type { ImportRowActionView } from '../../../../lib/types';
import { employerStore } from '../../../../lib/synthetic.server';
import { DemoPersistenceError, demoPersistence } from '../../../../lib/persistence.server';

export const dynamic = 'force-dynamic';

interface ImportBody {
  readonly stage?: unknown;
  readonly rowText?: unknown;
  readonly campaignId?: unknown;
  readonly fileName?: unknown;
  readonly importId?: unknown;
  readonly rowId?: unknown;
  readonly action?: unknown;
  readonly value?: unknown;
}

const ACTIONS: readonly ImportRowActionView[] = ['include', 'exclude', 'merge', 'keep_separate'];

function persistenceError(error: unknown): Response | null {
  return error instanceof DemoPersistenceError
    ? Response.json({ error: error.message }, { status: error.status })
    : null;
}

export async function POST(request: Request): Promise<Response> {
  let payload: ImportBody;
  try {
    payload = (await request.json()) as ImportBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  if (payload.stage === 'validate') {
    const rowText = typeof payload.rowText === 'string' ? payload.rowText : '';
    const campaignId =
      typeof payload.campaignId === 'string' ? payload.campaignId : 'cmp_frontend_demo';
    const fileName =
      typeof payload.fileName === 'string' && payload.fileName.trim().length > 0
        ? payload.fileName.trim()
        : 'northstar-candidates.csv';
    if (rowText.trim().length === 0) {
      return Response.json(
        { error: 'Paste or select at least one candidate row.' },
        { status: 422 },
      );
    }
    try {
      const persisted = await demoPersistence.validateCandidateImport(
        campaignId,
        fileName,
        rowText,
      );
      return Response.json(persisted ?? employerStore.validateImport(rowText, fileName));
    } catch (error) {
      const response = persistenceError(error);
      if (response !== null) return response;
      throw error;
    }
  }

  const importId = typeof payload.importId === 'string' ? payload.importId : '';
  if (importId.length === 0) {
    return Response.json({ error: 'An import identifier is required.' }, { status: 422 });
  }

  if (payload.stage === 'update') {
    const rowId = typeof payload.rowId === 'string' ? payload.rowId : '';
    const action = payload.action;
    const value = typeof payload.value === 'string' ? payload.value : undefined;
    if (
      rowId.length === 0 ||
      typeof action !== 'string' ||
      !ACTIONS.includes(action as ImportRowActionView)
    ) {
      return Response.json({ error: 'A row and valid action are required.' }, { status: 422 });
    }
    try {
      const persisted = await demoPersistence.updateCandidateImportRow(
        importId,
        rowId,
        action as ImportRowActionView,
        value,
      );
      const result =
        persisted ??
        employerStore.updateImport(importId, rowId, action as ImportRowActionView, value);
      if (result === null) {
        return Response.json(
          { error: 'Import row not found or no longer editable.' },
          { status: 404 },
        );
      }
      return Response.json(result);
    } catch (error) {
      const response = persistenceError(error);
      if (response !== null) return response;
      throw error;
    }
  }

  if (payload.stage === 'commit') {
    try {
      const persisted = await demoPersistence.commitCandidateImport(importId);
      const result = persisted ?? employerStore.commitImport(importId);
      if (result === null) {
        return Response.json(
          { error: 'Resolve or exclude every invalid row before committing.' },
          { status: 409 },
        );
      }
      return Response.json(result);
    } catch (error) {
      const response = persistenceError(error);
      if (response !== null) return response;
      throw error;
    }
  }

  if (payload.stage === 'cancel') {
    try {
      await demoPersistence.cancelCandidateImport(importId);
      employerStore.cancelImport(importId);
      return new Response(null, { status: 204 });
    } catch (error) {
      const response = persistenceError(error);
      if (response !== null) return response;
      throw error;
    }
  }

  return Response.json(
    { error: 'A valid stage (validate, update, commit or cancel) is required.' },
    { status: 422 },
  );
}
