import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface OrgBody {
  readonly displayName?: unknown;
  readonly legalName?: unknown;
  readonly defaultTimezone?: unknown;
  readonly supportEmail?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getOrg());
}

export async function PATCH(request: Request): Promise<Response> {
  let payload: OrgBody;
  try {
    payload = (await request.json()) as OrgBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const patch: Partial<{
    displayName: string;
    legalName: string;
    defaultTimezone: string;
    supportEmail: string;
  }> = {};
  if (typeof payload.displayName === 'string') {
    const v = payload.displayName.trim();
    if (v.length < 2) {
      return Response.json({ error: 'Display name is too short.' }, { status: 422 });
    }
    patch.displayName = v;
  }
  if (typeof payload.legalName === 'string') patch.legalName = payload.legalName.trim();
  if (typeof payload.defaultTimezone === 'string') {
    patch.defaultTimezone = payload.defaultTimezone.trim();
  }
  if (typeof payload.supportEmail === 'string') {
    const v = payload.supportEmail.trim();
    if (!v.includes('@')) {
      return Response.json({ error: 'A valid support email is required.' }, { status: 422 });
    }
    patch.supportEmail = v;
  }
  return Response.json(employerStore.updateOrg(patch));
}
