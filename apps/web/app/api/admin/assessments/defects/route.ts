import type { DefectSeverity } from '../../../../lib/types';
import { assessmentStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface LogBody {
  readonly title?: unknown;
  readonly severity?: unknown;
  readonly scope?: unknown;
}

const SEVERITIES: readonly DefectSeverity[] = ['low', 'medium', 'high', 'critical'];

export async function GET(): Promise<Response> {
  return Response.json(assessmentStore.getDefects());
}

export async function POST(request: Request): Promise<Response> {
  let payload: LogBody;
  try {
    payload = (await request.json()) as LogBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const scope = typeof payload.scope === 'string' ? payload.scope.trim() : '';
  const severity = payload.severity;
  if (title.length < 4) {
    return Response.json({ error: 'A defect title is required.' }, { status: 422 });
  }
  if (typeof severity !== 'string' || !SEVERITIES.includes(severity as DefectSeverity)) {
    return Response.json({ error: 'A valid severity is required.' }, { status: 422 });
  }
  if (scope.length < 2) {
    return Response.json({ error: 'An affected scope is required.' }, { status: 422 });
  }
  return Response.json(assessmentStore.logDefect(title, severity as DefectSeverity, scope), {
    status: 201,
  });
}
