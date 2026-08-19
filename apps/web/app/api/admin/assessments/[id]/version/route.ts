import { projectPlatform } from '../../../../../lib/platform-api.server';
import {
  assessmentVersion,
  type PlatformAssessmentVersion,
} from '../../../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface SaveBody {
  readonly label?: unknown;
  readonly rationale?: unknown;
}

interface StatusBody {
  readonly versionId?: unknown;
  readonly status?: unknown;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: SaveBody;
  try {
    payload = (await request.json()) as SaveBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const rationale = typeof payload.rationale === 'string' ? payload.rationale.trim() : '';
  if (typeof payload.label !== 'string' || payload.label.trim() === '' || rationale.length < 4) {
    return Response.json({ error: 'A version label and rationale are required.' }, { status: 422 });
  }
  return projectPlatform<PlatformAssessmentVersion, unknown>(
    {
      request,
      path: `/assessments/${encodeURIComponent(params.id)}/versions`,
      method: 'POST',
      body: { label: payload.label.trim(), rationale },
    },
    assessmentVersion,
    201,
  );
}

export async function PATCH(request: Request): Promise<Response> {
  let payload: StatusBody;
  try {
    payload = (await request.json()) as StatusBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const versionId = typeof payload.versionId === 'string' ? payload.versionId : '';
  const action =
    payload.status === 'active' ? 'activate' : payload.status === 'suspended' ? 'suspend' : null;
  if (versionId === '' || action === null) {
    return Response.json(
      { error: 'A version and active or suspended lifecycle status are required.' },
      { status: 422 },
    );
  }
  return projectPlatform<PlatformAssessmentVersion, unknown>(
    {
      request,
      path: `/assessment-versions/${encodeURIComponent(versionId)}/${action}`,
      method: 'POST',
    },
    assessmentVersion,
  );
}
