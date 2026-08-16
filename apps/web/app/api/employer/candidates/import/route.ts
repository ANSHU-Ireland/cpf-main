import { randomUUID } from 'node:crypto';
import type { ImportRowActionView } from '../../../../lib/types';
import { callPlatform, platformErrorResponse } from '../../../../lib/platform-api.server';
import {
  importResult,
  type PlatformImportJob,
  type PlatformImportRow,
} from '../../../../lib/employer-api.server';

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

async function projectJob(
  request: Request,
  job: PlatformImportJob,
  correlationId: string,
): Promise<Response> {
  const rows = await callPlatform<{ items: readonly PlatformImportRow[]; total: number }>({
    request,
    path: `/candidate-imports/${encodeURIComponent(job.id)}/rows?limit=100`,
    method: 'GET',
    correlationId,
  });
  return Response.json(importResult(job, rows.data.items), {
    headers: { 'x-correlation-id': rows.correlationId },
  });
}

export async function POST(request: Request): Promise<Response> {
  let payload: ImportBody;
  try {
    payload = (await request.json()) as ImportBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }

  try {
    if (payload.stage === 'validate') {
      const rowText = typeof payload.rowText === 'string' ? payload.rowText : '';
      const campaignId = typeof payload.campaignId === 'string' ? payload.campaignId : '';
      const fileName =
        typeof payload.fileName === 'string' && payload.fileName.trim() !== ''
          ? payload.fileName.trim()
          : 'candidate-import.csv';
      const rows = rowText
        .split(/\r?\n/)
        .map((row) => row.trim())
        .filter(Boolean);
      if (campaignId === '' || rows.length === 0) {
        return Response.json(
          { error: 'A campaign and at least one candidate row are required.' },
          { status: 422 },
        );
      }
      const created = await callPlatform<PlatformImportJob>({
        request,
        path: `/campaigns/${encodeURIComponent(campaignId)}/candidate-imports`,
        method: 'POST',
        body: { fileName, rows },
        idempotencyKey: request.headers.get('idempotency-key') ?? randomUUID(),
      });
      return await projectJob(request, created.data, created.correlationId);
    }

    const importId = typeof payload.importId === 'string' ? payload.importId : '';
    if (importId === '') {
      return Response.json({ error: 'An import identifier is required.' }, { status: 422 });
    }
    const idempotencyKey = request.headers.get('idempotency-key') ?? randomUUID();

    if (payload.stage === 'update') {
      const rowId = typeof payload.rowId === 'string' ? payload.rowId : '';
      const action = payload.action;
      if (
        rowId === '' ||
        typeof action !== 'string' ||
        !ACTIONS.includes(action as ImportRowActionView)
      ) {
        return Response.json({ error: 'A row and valid action are required.' }, { status: 422 });
      }
      const value = typeof payload.value === 'string' ? payload.value : undefined;
      const mutation = await callPlatform<PlatformImportRow>({
        request,
        path: `/candidate-imports/${encodeURIComponent(importId)}/rows/${encodeURIComponent(rowId)}`,
        method: 'PATCH',
        body: { action, ...(value === undefined ? {} : { value }) },
        idempotencyKey,
      });
      const job = await callPlatform<PlatformImportJob>({
        request,
        path: `/candidate-imports/${encodeURIComponent(importId)}`,
        method: 'GET',
        correlationId: mutation.correlationId,
      });
      return await projectJob(request, job.data, job.correlationId);
    }

    if (payload.stage === 'commit') {
      const result = await callPlatform<PlatformImportJob>({
        request,
        path: `/candidate-imports/${encodeURIComponent(importId)}/commit`,
        method: 'POST',
        idempotencyKey,
      });
      return await projectJob(request, result.data, result.correlationId);
    }

    if (payload.stage === 'cancel') {
      const result = await callPlatform<PlatformImportJob>({
        request,
        path: `/candidate-imports/${encodeURIComponent(importId)}/cancel`,
        method: 'POST',
        idempotencyKey,
      });
      return new Response(null, {
        status: 204,
        headers: { 'x-correlation-id': result.correlationId },
      });
    }

    return Response.json(
      { error: 'A valid stage (validate, update, commit or cancel) is required.' },
      { status: 422 },
    );
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
