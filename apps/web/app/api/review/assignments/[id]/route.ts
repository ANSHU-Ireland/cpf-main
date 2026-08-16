import { projectPlatform } from '../../../../lib/platform-api.server';
import {
  reviewerAssignment,
  type PlatformReviewAssignment,
} from '../../../../lib/review-api.server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } },
): Promise<Response> {
  return projectPlatform<PlatformReviewAssignment, unknown>(
    {
      request,
      path: `/review-assignments/${encodeURIComponent(params.id)}`,
      method: 'GET',
    },
    reviewerAssignment,
  );
}
