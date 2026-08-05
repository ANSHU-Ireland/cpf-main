import { reviewStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (reviewStore.getAssignment(params.id) === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  return Response.json(reviewStore.getSubmission());
}

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (reviewStore.getAssignment(params.id) === null) {
    return Response.json({ error: 'Assignment not found.' }, { status: 404 });
  }
  const after = reviewStore.submit();
  // If it did not transition to submitted and was not already submitted, the gate blocked it.
  if (after.submittedAt === null) {
    const reason = !after.allCriteriaScored
      ? 'Every criterion must be scored before you can submit.'
      : 'All integrity flags must be resolved before you can submit.';
    return Response.json({ error: reason }, { status: 409 });
  }
  return Response.json(after);
}
