import {
  candidateNotices,
  type PlatformNoticeAcknowledgement,
} from '../../../lib/candidate-self-service.server';
import { projectPlatform } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ readonly items: readonly PlatformNoticeAcknowledgement[] }, object>(
    { request, path: '/candidate/notices', method: 'GET' },
    candidateNotices,
  );
}
