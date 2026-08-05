import { reviewStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const assignment = reviewStore.getAssignment(params.id);
  if (assignment === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  return Response.json(assignment);
}
