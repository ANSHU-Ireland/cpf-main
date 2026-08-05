import { reviewStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (reviewStore.getAssignment(params.id) === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  return Response.json(reviewStore.getObservations());
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (reviewStore.getAssignment(params.id) === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  const result = reviewStore.revealObservations();
  if (result.revealState === 'concealed') {
    // The reveal gate blocked: independent scoring is not yet complete.
    return Response.json(
      { error: 'Complete your independent scoring before revealing AI observations.' },
      { status: 409 },
    );
  }
  return Response.json(result);
}
