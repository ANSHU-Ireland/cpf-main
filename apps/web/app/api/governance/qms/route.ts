import type { GovernanceDocRecord } from '@cpf/org';
import { projectPlatform } from '../../../lib/platform-api.server';
import type { Collection } from '../../../lib/types';
import { parseQmsCreate, projectQmsDocument } from '../../../governance/qms/qms-contract';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return projectPlatform(
    { request, path: '/governance/qms-documents', method: 'GET' },
    (data: Collection<GovernanceDocRecord>) => ({
      items: data.items.map(projectQmsDocument),
      total: data.total,
    }),
  );
}

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ detail: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const parsed = parseQmsCreate(raw);
  if (!parsed.ok) return Response.json({ detail: parsed.detail }, { status: 422 });
  const { reason, reviewDue, ...data } = parsed.value;
  return projectPlatform(
    {
      request,
      path: '/governance/qms-documents',
      method: 'POST',
      body: {
        reason,
        expectedVersion: 0,
        data: { ...data, status: 'draft', ...(reviewDue ? { reviewDue } : {}) },
      },
    },
    projectQmsDocument,
  );
}
