import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface InvitationBody {
  readonly email?: unknown;
  readonly campaignName?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getInvitations());
}

export async function POST(request: Request): Promise<Response> {
  let payload: InvitationBody;
  try {
    payload = (await request.json()) as InvitationBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const campaignName = typeof payload.campaignName === 'string' ? payload.campaignName.trim() : '';
  if (!email.includes('@')) {
    return Response.json({ error: 'A valid email is required.' }, { status: 422 });
  }
  if (campaignName.length < 2) {
    return Response.json({ error: 'A campaign is required.' }, { status: 422 });
  }
  return Response.json(employerStore.sendInvitation(email, campaignName), { status: 201 });
}
