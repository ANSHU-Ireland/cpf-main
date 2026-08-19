import {
  candidatePractice,
  type PlatformPracticeModule,
} from '../../../lib/candidate-self-service.server';
import { projectPlatform } from '../../../lib/platform-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ readonly modules: readonly PlatformPracticeModule[] }, object>(
    { request, path: '/candidate/practice', method: 'GET' },
    candidatePractice,
  );
}
