import { forwardPlatform, projectPlatform } from '../../../lib/platform-api.server';
import type { DataRightsType } from '../../../lib/types';

export const dynamic = 'force-dynamic';

const TYPES = new Set<DataRightsType>(['export', 'rectification', 'erasure', 'restriction']);

interface CreateBody {
  readonly type?: unknown;
  readonly note?: unknown;
}

interface DataRightRecord {
  readonly id: string;
  readonly requestType: string;
  readonly status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  readonly createdAt: string;
}

interface DataRightPage {
  readonly items: readonly DataRightRecord[];
  readonly total: number;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<DataRightPage, object>(
    { request, path: '/candidate/data-rights-requests', method: 'GET' },
    (page) => ({
      total: page.total,
      items: page.items.map((item) => ({
        id: item.id,
        type: item.requestType,
        status:
          item.status === 'pending'
            ? 'received'
            : item.status === 'rejected'
              ? 'refused'
              : item.status,
        submittedAt: item.createdAt,
        note: null,
      })),
    }),
  );
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
  return forwardPlatform({
    request,
    path: '/candidate/data-rights-requests',
    method: 'POST',
    body: {
      requestType: type,
      justification: note.trim() || 'Candidate self-service request.',
    },
  });
}
