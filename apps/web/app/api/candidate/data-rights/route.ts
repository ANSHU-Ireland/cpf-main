import { forwardPlatform, projectPlatform } from '../../../lib/platform-api.server';
import type { DataRightsType } from '../../../lib/types';

export const dynamic = 'force-dynamic';

const TYPES = new Set<DataRightsType>(['export', 'rectification', 'erasure', 'restriction']);
const TO_PLATFORM_TYPE: Readonly<Record<DataRightsType, string>> = {
  export: 'access',
  rectification: 'correction',
  erasure: 'deletion',
  restriction: 'restriction',
};
const FROM_PLATFORM_TYPE: Readonly<Record<string, DataRightsType>> = {
  access: 'export',
  correction: 'rectification',
  deletion: 'erasure',
  restriction: 'restriction',
};

interface CreateBody {
  readonly type?: unknown;
  readonly note?: unknown;
}

interface DataRightRecord {
  readonly id: string;
  readonly requestType: string;
  readonly status:
    | 'received'
    | 'identity_verification'
    | 'in_progress'
    | 'fulfilled'
    | 'partially_fulfilled'
    | 'rejected'
    | 'closed';
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
        type: FROM_PLATFORM_TYPE[item.requestType] ?? 'export',
        status:
          item.status === 'fulfilled' || item.status === 'closed'
            ? 'completed'
            : item.status === 'rejected'
              ? 'refused'
              : item.status === 'identity_verification' || item.status === 'partially_fulfilled'
                ? 'in_progress'
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
      requestType: TO_PLATFORM_TYPE[type as DataRightsType],
      justification: note.trim() || 'Candidate self-service request.',
    },
  });
}
