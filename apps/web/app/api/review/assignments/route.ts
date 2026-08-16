import { projectPlatform } from '../../../lib/platform-api.server';
import { reviewerAssignments, type PlatformReviewAssignment } from '../../../lib/review-api.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: PlatformReviewAssignment[]; total: number }, unknown>(
    { request, path: '/review-assignments?limit=100', method: 'GET' },
    reviewerAssignments,
  );
}
