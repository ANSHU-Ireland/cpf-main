import {
  candidateApplicationView,
  type PlatformCandidateProfile,
} from '../../../lib/candidate-api.server';
import { projectPlatform } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return projectPlatform<PlatformCandidateProfile, object>(
    { request, path: '/candidate/profile', method: 'GET' },
    (profile) => ({
      items: profile.applications.map(candidateApplicationView),
      total: profile.applications.length,
    }),
  );
}
