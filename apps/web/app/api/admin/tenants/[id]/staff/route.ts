import { adminStore } from '../../../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface StaffBody {
  readonly email?: unknown;
  readonly role?: unknown;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (adminStore.getTenant(params.id) === null) {
    return Response.json({ error: 'Tenant not found.' }, { status: 404 });
  }
  return Response.json(adminStore.getStaff());
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  if (adminStore.getTenant(params.id) === null) {
    return Response.json({ error: 'Tenant not found.' }, { status: 404 });
  }
  let payload: StaffBody;
  try {
    payload = (await request.json()) as StaffBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const role = typeof payload.role === 'string' ? payload.role.trim() : '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return Response.json({ error: 'A valid email address is required.' }, { status: 422 });
  }
  if (role.length < 2) {
    return Response.json({ error: 'A role is required.' }, { status: 422 });
  }
  return Response.json(adminStore.inviteStaff(email, role), { status: 201 });
}
