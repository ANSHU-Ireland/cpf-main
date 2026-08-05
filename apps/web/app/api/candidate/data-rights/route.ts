import { candidateStore } from '../../../lib/synthetic.server';
import type { DataRightsType } from '../../../lib/types';

export const dynamic = 'force-dynamic';

const TYPES = new Set<DataRightsType>(['export', 'rectification', 'erasure', 'restriction']);

interface CreateBody {
  readonly type?: unknown;
  readonly note?: unknown;
}

export function GET(): Response {
  return Response.json(candidateStore.getDataRights());
}

export async function POST(request: Request): Promise<Response> {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const type = typeof body.type === 'string' ? body.type : '';
  if (!TYPES.has(type as DataRightsType)) {
    return Response.json({ error: 'Choose a valid request type.' }, { status: 422 });
  }
  const note = typeof body.note === 'string' ? body.note : '';
  return Response.json(candidateStore.createDataRightsRequest(type as DataRightsType, note), {
    status: 201,
  });
}
