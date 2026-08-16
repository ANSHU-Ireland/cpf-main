import {
  candidatePrecheck,
  type PlatformPrecheck,
} from '../../../lib/candidate-self-service.server';
import { projectPlatform } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

const DEMO_ATTEMPT_ID = '11111111-0000-4000-8000-000000000300';

export function GET(request: Request): Promise<Response> {
  return projectPlatform<PlatformPrecheck, object>(
    { request, path: `/attempts/${DEMO_ATTEMPT_ID}/prechecks/latest`, method: 'GET' },
    candidatePrecheck,
  );
}

export function POST(request: Request): Promise<Response> {
  return projectPlatform<PlatformPrecheck, object>(
    {
      request,
      path: `/attempts/${DEMO_ATTEMPT_ID}/prechecks`,
      method: 'POST',
      body: { checks: { authenticatedSession: true, platformApi: true, desktopCompanion: false } },
    },
    candidatePrecheck,
  );
}
