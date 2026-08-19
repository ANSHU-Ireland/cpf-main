import {
  callPlatform,
  platformErrorResponse,
  projectPlatform,
} from '../../../../lib/platform-api.server';
import type { DefectSeverity } from '../../../../lib/types';
import { assessmentDefects, type PlatformAssessment } from '../../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface LogBody {
  readonly title?: unknown;
  readonly severity?: unknown;
  readonly scope?: unknown;
}

const SEVERITIES: readonly DefectSeverity[] = ['low', 'medium', 'high', 'critical'];

export async function GET(request: Request): Promise<Response> {
  try {
    const page = await callPlatform<{ items: readonly PlatformAssessment[] }>({
      request,
      path: '/assessments?limit=100',
      method: 'GET',
    });
    const details = await Promise.all(
      page.data.items.map((item) =>
        callPlatform<PlatformAssessment>({
          request,
          path: `/assessments/${encodeURIComponent(item.id)}`,
          method: 'GET',
          correlationId: page.correlationId,
        }),
      ),
    );
    const items = details.flatMap((item) => assessmentDefects(item.data));
    return Response.json(
      { items, total: items.length },
      { headers: { 'x-correlation-id': page.correlationId } },
    );
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}

export async function POST(request: Request): Promise<Response> {
  let payload: LogBody;
  try {
    payload = (await request.json()) as LogBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  const versionId = typeof payload.scope === 'string' ? payload.scope.trim() : '';
  if (
    title.length < 4 ||
    typeof payload.severity !== 'string' ||
    !SEVERITIES.includes(payload.severity as DefectSeverity) ||
    versionId === ''
  ) {
    return Response.json(
      { error: 'A title, severity and assessment version id are required.' },
      { status: 422 },
    );
  }
  return projectPlatform<
    { id: string; assessmentVersionId: string; severity: DefectSeverity; summary: string },
    unknown
  >(
    {
      request,
      path: `/assessment-versions/${encodeURIComponent(versionId)}/defects`,
      method: 'POST',
      body: { severity: payload.severity, summary: title },
    },
    (defect) => ({
      id: defect.id,
      title: defect.summary,
      severity: defect.severity,
      status: 'open',
      scope: defect.assessmentVersionId,
      owner: 'Unassigned',
    }),
    201,
  );
}
