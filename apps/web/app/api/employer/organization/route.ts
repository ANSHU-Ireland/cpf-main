import { callPlatform, platformErrorResponse } from '../../../lib/platform-api.server';
import { organizationProfile, type PlatformOrganization } from '../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

interface OrgBody {
  readonly displayName?: unknown;
  readonly legalName?: unknown;
  readonly defaultTimezone?: unknown;
  readonly supportEmail?: unknown;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const result = await callPlatform<PlatformOrganization>({
      request,
      path: '/organization',
      method: 'GET',
    });
    return Response.json(organizationProfile(result.data), {
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}

export async function PATCH(request: Request): Promise<Response> {
  let payload: OrgBody;
  try {
    payload = (await request.json()) as OrgBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  try {
    const current = await callPlatform<PlatformOrganization>({
      request,
      path: '/organization',
      method: 'GET',
    });
    if (
      typeof payload.legalName === 'string' &&
      payload.legalName.trim() !== current.data.legalName
    ) {
      return Response.json(
        {
          error:
            'The legal name is immutable on this surface; use the verified legal-change workflow.',
        },
        { status: 422 },
      );
    }
    const body: Record<string, unknown> = {};
    if (typeof payload.displayName === 'string') {
      const value = payload.displayName.trim();
      if (value.length < 2) {
        return Response.json({ error: 'Display name is too short.' }, { status: 422 });
      }
      body.displayName = value;
    }
    if (typeof payload.defaultTimezone === 'string' && payload.defaultTimezone.trim() !== '') {
      body.defaultTimezone = payload.defaultTimezone.trim();
    }
    if (typeof payload.supportEmail === 'string') {
      const supportEmail = payload.supportEmail.trim();
      if (!supportEmail.includes('@')) {
        return Response.json({ error: 'A valid support email is required.' }, { status: 422 });
      }
      body.settings = { ...current.data.settings, supportEmail };
    }
    if (Object.keys(body).length === 0) {
      return Response.json({ error: 'At least one editable field is required.' }, { status: 422 });
    }
    const result = await callPlatform<PlatformOrganization>({
      request,
      path: '/organization',
      method: 'PATCH',
      body,
      correlationId: current.correlationId,
    });
    return Response.json(organizationProfile(result.data), {
      headers: { 'x-correlation-id': result.correlationId },
    });
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
