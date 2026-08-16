import { projectPlatform } from '../../../lib/platform-api.server';
import { reviewerProfile, type PlatformReviewerProfile } from '../../../lib/review-api.server';

export const dynamic = 'force-dynamic';

interface ProfileBody {
  readonly displayName?: unknown;
  readonly disciplines?: unknown;
  readonly maxActiveReviews?: unknown;
}

export async function GET(request: Request): Promise<Response> {
  return projectPlatform<PlatformReviewerProfile, unknown>(
    { request, path: '/reviewer/profile', method: 'GET' },
    reviewerProfile,
  );
}

export async function PATCH(request: Request): Promise<Response> {
  let payload: ProfileBody;
  try {
    payload = (await request.json()) as ProfileBody;
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
  }
  return projectPlatform<PlatformReviewerProfile, unknown>(
    {
      request,
      path: '/reviewer/profile',
      method: 'PATCH',
      body: {
        ...(payload.displayName === undefined ? {} : { displayName: payload.displayName }),
        ...(payload.disciplines === undefined ? {} : { expertise: payload.disciplines }),
        ...(payload.maxActiveReviews === undefined
          ? {}
          : { maxActiveReviews: payload.maxActiveReviews }),
      },
    },
    reviewerProfile,
  );
}
