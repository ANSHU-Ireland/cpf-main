import { callPlatform, platformErrorResponse } from '../../../../../lib/platform-api.server';
import type { SubscriptionView } from '../../../../../lib/types';
import type { PlatformTenant } from '../../../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

interface SubscriptionBody {
  readonly plan?: unknown;
}

interface PlatformPlan {
  readonly id: string;
  readonly code: string;
  readonly name: string;
}

function subscription(tenant: PlatformTenant): SubscriptionView {
  return {
    tenantId: tenant.id,
    plan: tenant.subscriptionPlanName ?? tenant.subscriptionPlanId ?? 'Unassigned',
    seatsLimit: tenant.seatsLimit ?? 0,
    effectiveFrom: tenant.subscriptionStartsAt ?? null,
    renewsAt: tenant.subscriptionEndsAt ?? null,
  };
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    const result = await callPlatform<PlatformTenant>({
      request,
      path: `/admin/tenants/${encodeURIComponent(params.id)}`,
      method: 'GET',
    });
    return Response.json(subscription(result.data), {
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  let payload: SubscriptionBody;
  try {
    payload = (await request.json()) as SubscriptionBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const requestedPlan = typeof payload.plan === 'string' ? payload.plan.trim().toLowerCase() : '';
  if (requestedPlan === '') {
    return Response.json({ error: 'A plan is required.' }, { status: 422 });
  }
  try {
    const plans = await callPlatform<{ items: readonly PlatformPlan[] }>({
      request,
      path: '/admin/plans',
      method: 'GET',
    });
    const plan = plans.data.items.find(
      (item) =>
        item.id.toLowerCase() === requestedPlan ||
        item.code.toLowerCase() === requestedPlan ||
        item.name.toLowerCase() === requestedPlan,
    );
    if (plan === undefined) {
      return Response.json({ error: 'Plan not found.' }, { status: 404 });
    }
    const result = await callPlatform<PlatformTenant>({
      request,
      path: `/admin/tenants/${encodeURIComponent(params.id)}/subscription`,
      method: 'PUT',
      body: { planId: plan.id },
      correlationId: plans.correlationId,
    });
    return Response.json(subscription(result.data), {
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
