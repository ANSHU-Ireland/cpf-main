import { reviewStore } from '../../../lib/synthetic.server';

export const dynamic = 'force-dynamic';

interface ProfileBody {
  readonly displayName?: unknown;
  readonly disciplines?: unknown;
  readonly biography?: unknown;
}

export async function GET(): Promise<Response> {
  return Response.json(reviewStore.getProfile());
}

export async function PATCH(request: Request): Promise<Response> {
  let payload: ProfileBody;
  try {
    payload = (await request.json()) as ProfileBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  const patch: {
    displayName?: string;
    disciplines?: readonly string[];
    biography?: string;
  } = {};
  if (typeof payload.displayName === 'string') {
    if (payload.displayName.trim().length < 2) {
      return Response.json({ error: 'A display name is required.' }, { status: 422 });
    }
    patch.displayName = payload.displayName.trim();
  }
  if (Array.isArray(payload.disciplines)) {
    patch.disciplines = payload.disciplines.filter((d): d is string => typeof d === 'string');
  }
  if (typeof payload.biography === 'string') {
    patch.biography = payload.biography;
  }
  return Response.json(reviewStore.updateProfile(patch));
}
