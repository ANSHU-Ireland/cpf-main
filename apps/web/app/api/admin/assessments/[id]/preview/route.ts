import { assessmentStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const preview = assessmentStore.getPreview(params.id);
  if (preview === null) {
    return Response.json({ error: 'Assessment not found.' }, { status: 404 });
  }
  return Response.json(preview);
}
