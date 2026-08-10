import { employerStore } from '../../../lib/synthetic.server';
import { DemoPersistenceError, demoPersistence } from '../../../lib/persistence.server';

export const dynamic = 'force-dynamic';

interface CampaignBody {
  readonly name?: unknown;
  readonly roleTitle?: unknown;
}

export async function GET(): Promise<Response> {
  try {
    const persisted = await demoPersistence.getCampaigns();
    return Response.json(persisted ?? employerStore.getCampaigns());
  } catch (error) {
    if (error instanceof DemoPersistenceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
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
  try {
    const persisted = await demoPersistence.createCampaign(name, roleTitle);
    return Response.json(persisted ?? employerStore.createCampaign(name, roleTitle), {
      status: 201,
    });
  } catch (error) {
    if (error instanceof DemoPersistenceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
