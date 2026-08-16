import { projectPlatform } from '../../../lib/platform-api.server';
import type { PlatformAdminSupportCase } from '../../../lib/admin-api.server';
import { supportCase } from '../../../lib/support-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformAdminSupportCase[]; total: number }, unknown>(
    { request, path: '/admin/support-cases', method: 'GET' },
    (data) => ({ items: data.items.map(supportCase), total: data.total }),
  );
}
