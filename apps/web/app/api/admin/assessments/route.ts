import { randomUUID } from 'node:crypto';
import { projectPlatform } from '../../../lib/platform-api.server';
import { assessment, type PlatformAssessment } from '../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface CreateBody {
  readonly name?: unknown;
  readonly roleFamily?: unknown;
  readonly seniority?: unknown;
  readonly riskTier?: unknown;
}

function assessmentCode(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72);
  return `${slug || 'assessment'}-${randomUUID().slice(0, 8)}`;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformAssessment[]; total: number }, unknown>(
    { request, path: '/assessments?limit=100', method: 'GET' },
    (data) => ({ items: data.items.map(assessment), total: data.total }),
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: CreateBody;
  try {
    payload = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const roleFamily = typeof payload.roleFamily === 'string' ? payload.roleFamily.trim() : '';
  const seniority = typeof payload.seniority === 'string' ? payload.seniority.trim() : '';
  if (name.length < 2 || roleFamily.length < 2 || seniority.length < 2) {
    return Response.json(
      { error: 'An assessment name, role family and seniority are required.' },
      { status: 422 },
    );
  }
  if (payload.riskTier !== 'high') {
    return Response.json(
      { error: 'Employment assessment systems are governed as high-risk on this platform.' },
      { status: 422 },
    );
  }
  return projectPlatform<PlatformAssessment, unknown>(
    {
      request,
      path: '/assessments',
      method: 'POST',
      body: {
        code: assessmentCode(name),
        title: name,
        targetRole: roleFamily,
        seniority,
      },
    },
    assessment,
    201,
  );
}
