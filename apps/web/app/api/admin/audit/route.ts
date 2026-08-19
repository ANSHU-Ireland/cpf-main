import { projectPlatform } from '../../../lib/platform-api.server';
import { auditEvent, type PlatformAuditEvent } from '../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

export function GET(request: Request): Promise<Response> {
  return projectPlatform<{ items: readonly PlatformAuditEvent[]; total: number }, unknown>(
    { request, path: '/admin/audit-events?limit=100', method: 'GET' },
    (data) => ({ items: data.items.map(auditEvent), total: data.total }),
  );
}
