import type { PlatformCandidateProfile } from '../../../lib/candidate-api.server';
import { projectPlatform } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return projectPlatform<PlatformCandidateProfile, object>(
    { request, path: '/candidate/profile', method: 'GET' },
    (profile) => ({ fullName: profile.displayName, email: profile.email }),
  );
}
