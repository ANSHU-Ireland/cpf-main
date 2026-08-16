import 'server-only';

import type { PlatformAdminSupportCase } from './admin-api.server';
import type { SupportCase } from './types';

function supportStatus(item: PlatformAdminSupportCase): SupportCase['status'] {
  if (item.status === 'resolved' || item.status === 'closed') return 'resolved';
  if (item.status === 'escalated') return 'escalated';
  if (item.status === 'open' && item.assigneeId === null) return 'new';
  if (item.status === 'open') return 'assigned';
  return 'in_progress';
}

function age(createdAt: string | undefined): string {
  if (createdAt === undefined) return 'Unknown';
  const milliseconds = Date.now() - Date.parse(createdAt);
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return 'Unknown';
  const hours = Math.floor(milliseconds / 3_600_000);
  if (hours < 24) return `${String(hours)}h`;
  return `${String(Math.floor(hours / 24))}d`;
}

export function supportCase(item: PlatformAdminSupportCase): SupportCase {
  return {
    id: item.id,
    ticketNumber: item.caseReference ?? item.id,
    subject: item.subject,
    requester: item.requesterUserId ?? item.tenantName ?? 'Unknown requester',
    priority:
      item.severity === 'critical' || item.severity === 'high' || item.severity === 'medium'
        ? item.severity
        : 'low',
    status: supportStatus(item),
    category: item.category ?? 'support',
    age: age(item.createdAt),
    ...(item.assigneeId === null ? {} : { assignedTo: item.assigneeId }),
  };
}
