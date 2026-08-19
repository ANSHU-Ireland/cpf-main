import { callPlatform, platformErrorResponse } from '../../../lib/platform-api.server';
import type {
  PlatformAdminSupportCase,
  PlatformJob,
  PlatformTenant,
} from '../../../lib/admin-api.server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request): Promise<Response> {
  try {
    const [tenants, jobs, support] = await Promise.all([
      callPlatform<{ items: readonly PlatformTenant[]; total: number }>({
        request,
        path: '/admin/tenants',
        method: 'GET',
      }),
      callPlatform<{ items: readonly PlatformJob[]; total: number }>({
        request,
        path: '/admin/jobs',
        method: 'GET',
      }),
      callPlatform<{ items: readonly PlatformAdminSupportCase[]; total: number }>({
        request,
        path: '/admin/support-cases',
        method: 'GET',
      }),
    ]);
    const failedJobs = jobs.data.items.filter((job) => job.status === 'failed');
    const urgentCases = support.data.items.filter(
      (item) => item.severity === 'critical' || item.severity === 'high',
    );
    return Response.json(
      {
        tenants: tenants.data.total,
        activeIncidents: null,
        failedJobs: failedJobs.length,
        openAccessGrants: null,
        alerts: [
          ...failedJobs.map((job) => ({
            id: `job-${job.id}`,
            severity: 'danger',
            message: `${job.type} failed after ${String(job.attemptCount ?? 0)} attempts.`,
          })),
          ...urgentCases.map((item) => ({
            id: `support-${item.id}`,
            severity: item.severity === 'critical' ? 'danger' : 'warning',
            message: `Support case requires attention: ${item.subject}`,
          })),
        ],
      },
      { headers: { 'x-correlation-id': tenants.correlationId } },
    );
  } catch (error) {
    const response = platformErrorResponse(error);
    if (response !== null) return response;
    throw error;
  }
}
