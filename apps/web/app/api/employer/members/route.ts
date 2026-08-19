import { projectPlatform } from '../../../lib/platform-api.server';
import { members, type PlatformMember } from '../../../lib/employer-api.server';

export const dynamic = 'force-dynamic';

interface MemberBody {
  readonly email?: unknown;
  readonly role?: unknown;
}

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformMember[]; total: number }, unknown>(
    { request, path: '/organization/members?limit=100', method: 'GET' },
    members,
  );
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
  if (!email.includes('@') || role === '') {
    return Response.json({ error: 'A valid email and role are required.' }, { status: 422 });
  }
  return projectPlatform<{ id: string; email: string; roles: readonly string[] }, PlatformMember>(
    {
      request,
      path: '/organization/member-invitations',
      method: 'POST',
      body: { email, roles: [role] },
    },
    (invitation) => ({
      id: invitation.id,
      email: invitation.email,
      displayName: invitation.email,
      roles: invitation.roles,
      status: 'invited',
    }),
    201,
  );
}
