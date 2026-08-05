import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface CampaignBody {
  readonly name?: unknown;
  readonly roleTitle?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getCampaigns());
}

export async function POST(request: Request): Promise<Response> {
  let payload: CampaignBody;
  try {
    payload = (await request.json()) as CampaignBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  const roleTitle = typeof payload.roleTitle === 'string' ? payload.roleTitle.trim() : '';
  if (name.length < 2) {
    return Response.json({ error: 'A campaign name is required.' }, { status: 422 });
  }
  if (roleTitle.length < 2) {
    return Response.json({ error: 'A role title is required.' }, { status: 422 });
  }
  return Response.json(employerStore.createCampaign(name, roleTitle), { status: 201 });
}
