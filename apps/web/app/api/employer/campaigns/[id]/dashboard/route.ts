import { employerStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (employerStore.getCampaign(params.id) === null) {
    return Response.json({ error: 'Campaign not found.' }, { status: 404 });
  }
  return Response.json(employerStore.getCampaignOps(params.id));
}
