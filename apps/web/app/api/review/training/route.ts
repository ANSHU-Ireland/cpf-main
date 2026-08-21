import { projectPlatform } from '../../../lib/platform-api.server';
import { reviewerTraining, type PlatformTrainingRecord } from '../../../lib/review-api.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: PlatformTrainingRecord[]; total: number }, unknown>(
    { request, path: '/reviewer/training', method: 'GET' },
    reviewerTraining,
  );
}
