import { employerStore } from '../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  const record = employerStore.getCandidate(params.id);
  if (record === null) {
    return Response.json({ error: 'Candidate not found.' }, { status: 404 });
  }
  return Response.json(record);
}
