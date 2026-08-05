import { adminStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface SubscriptionBody {
  readonly plan?: unknown;
  readonly seatsLimit?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (adminStore.getTenant(params.id) === null) {
    return Response.json({ error: 'Tenant not found.' }, { status: 404 });
  }
  return Response.json(adminStore.getSubscription());
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (adminStore.getTenant(params.id) === null) {
    return Response.json({ error: 'Tenant not found.' }, { status: 404 });
  }
  let payload: SubscriptionBody;
  try {
    payload = (await request.json()) as SubscriptionBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const plan = typeof payload.plan === 'string' ? payload.plan.trim() : '';
  const seatsLimit = typeof payload.seatsLimit === 'number' ? payload.seatsLimit : NaN;
  if (plan.length < 2) {
    return Response.json({ error: 'A plan name is required.' }, { status: 422 });
  }
  if (!Number.isInteger(seatsLimit) || seatsLimit < 1) {
    return Response.json({ error: 'A seat limit of at least 1 is required.' }, { status: 422 });
  }
  return Response.json(adminStore.updateSubscription(plan, seatsLimit));
}
