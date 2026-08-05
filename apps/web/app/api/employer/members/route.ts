import { employerStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface MemberBody {
  readonly email?: unknown;
  readonly role?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(employerStore.getMembers());
}

export async function POST(request: Request): Promise<Response> {
  let payload: MemberBody;
  try {
    payload = (await request.json()) as MemberBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';
  const role = typeof payload.role === 'string' ? payload.role.trim() : '';
  if (!email.includes('@')) {
    return Response.json({ error: 'A valid email is required.' }, { status: 422 });
  }
  if (role.length === 0) {
    return Response.json({ error: 'A role is required.' }, { status: 422 });
  }
  return Response.json(employerStore.inviteMember(email, role), { status: 201 });
}
