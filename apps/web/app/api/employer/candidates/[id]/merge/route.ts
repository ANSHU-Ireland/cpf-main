import { callPlatform, platformErrorResponse } from '../../../../../lib/platform-api.server';
import { candidateRecord, type PlatformCandidate } from '../../../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

interface MergeBody {
  readonly duplicateId?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: MergeBody;
  try {
    payload = (await request.json()) as MergeBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const duplicateId = typeof payload.duplicateId === 'string' ? payload.duplicateId.trim() : '';
  if (duplicateId === '' || duplicateId === params.id) {
    return Response.json(
      { error: 'A distinct duplicate candidate identifier is required.' },
      { status: 422 },
    );
  }
  try {
    const mutation = await callPlatform<unknown>({
      request,
      path: '/candidates/merge',
      method: 'POST',
      body: { primaryCandidateId: params.id, duplicateCandidateId: duplicateId },
    });
    const candidate = await callPlatform<PlatformCandidate>({
      request,
      path: `/candidates/${encodeURIComponent(params.id)}`,
      method: 'GET',
      correlationId: mutation.correlationId,
    });
    return Response.json(candidateRecord(candidate.data), {
      headers: { 'x-correlation-id': candidate.correlationId },
    });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
