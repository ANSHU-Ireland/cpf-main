import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface CandidateBody {
  readonly displayName?: unknown;
  readonly campaignName?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getCandidates());
}

export async function POST(request: Request): Promise<Response> {
  let payload: CandidateBody;
  try {
    payload = (await request.json()) as CandidateBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const displayName = typeof payload.displayName === 'string' ? payload.displayName.trim() : '';
  const campaignName = typeof payload.campaignName === 'string' ? payload.campaignName.trim() : '';
  if (displayName.length < 2) {
    return Response.json({ error: 'A candidate name is required.' }, { status: 422 });
  }
  if (campaignName.length < 2) {
    return Response.json({ error: 'A campaign is required.' }, { status: 422 });
  }
  return Response.json(employerStore.addCandidate(displayName, campaignName), { status: 201 });
}
