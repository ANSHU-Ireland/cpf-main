import type { CampaignStatus } from '../../../../lib/types';
import { employerStore } from '../../../../lib/synthetic.server';
import { DemoPersistenceError, demoPersistence } from '../../../../lib/persistence.server';

export const dynamic = 'force-dynamic';

interface StatusBody {
  readonly status?: unknown;
}

const STATUSES: readonly CampaignStatus[] = [
  'draft',
  'blocked',
  'active',
  'paused',
  'closed',
  'archived',
];

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const persisted = await demoPersistence.getCampaign(params.id);
    const campaign = persisted ?? employerStore.getCampaign(params.id);
    if (campaign === null) {
      return Response.json({ error: 'Campaign not found.' }, { status: 404 });
    }
    return Response.json(campaign);
  } catch (error) {
    if (error instanceof DemoPersistenceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (!demoPersistence.enabled && employerStore.getCampaign(params.id) === null) {
    return Response.json({ error: 'Campaign not found.' }, { status: 404 });
  }
  let payload: StatusBody;
  try {
    payload = (await request.json()) as StatusBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const status = payload.status;
  if (typeof status !== 'string' || !STATUSES.includes(status as CampaignStatus)) {
    return Response.json({ error: 'A valid status is required.' }, { status: 422 });
  }
  if (demoPersistence.enabled) {
    try {
      const persisted = await demoPersistence.setCampaignStatus(
        params.id,
        status as CampaignStatus,
      );
      if (persisted === null) {
        return Response.json({ error: 'Campaign not found.' }, { status: 404 });
      }
      return Response.json(persisted);
    } catch (error) {
      if (error instanceof DemoPersistenceError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }
  }
  const updated = employerStore.setCampaignStatus(params.id, status as CampaignStatus);
  if (updated === null) {
    return Response.json({ error: 'Campaign not found.' }, { status: 404 });
  }
  // Activation is gated by open blockers; the store leaves status unchanged when blocked.
  if (status === 'active' && updated.status !== 'active') {
    return Response.json(
      { error: 'Resolve all preflight blockers before activating this campaign.' },
      { status: 409 },
    );
  }
  return Response.json(updated);
}
