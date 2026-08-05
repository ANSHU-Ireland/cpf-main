import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SUBMISSION_REPORT_FORMATS = ['pdf', 'json', 'csv'] as const;
export type SubmissionReportFormat = (typeof SUBMISSION_REPORT_FORMATS)[number];

export interface SubmissionReportRecord {
  readonly id: string;
  readonly submissionId: string;
  readonly format: SubmissionReportFormat;
  readonly status: string;
  readonly requestedAt: string;
}

export interface SubmissionReportCreate {
  readonly format: SubmissionReportFormat;
}

export interface SubmissionReportRepository {
  listReports(
    actor: Actor,
    submissionId: string,
  ): Promise<{ items: readonly SubmissionReportRecord[]; total: number } | null>;
  createReport(
    actor: Actor,
    submissionId: string,
    input: SubmissionReportCreate,
  ): Promise<SubmissionReportRecord | null>;
}

export function parseSubmissionReportCreate(
  raw: unknown,
): { ok: true; value: SubmissionReportCreate } | { ok: false; errors: string[] } {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const format = obj.format;
  if (
    typeof format !== 'string' ||
    !SUBMISSION_REPORT_FORMATS.includes(format as SubmissionReportFormat)
  ) {
    return { ok: false, errors: ['format must be one of pdf, json, csv'] };
  }
  return { ok: true, value: { format: format as SubmissionReportFormat } };
}

export function parseSubmissionId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

export async function listSubmissionReports(
  deps: { repository: SubmissionReportRepository },
  actor: Actor,
  submissionId: string,
): Promise<Result<{ items: readonly SubmissionReportRecord[]; total: number }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'read',
    { type: 'submission_report', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.listReports(actor, submissionId);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, items: r.items, total: r.total };
}

export async function createSubmissionReport(
  deps: { repository: SubmissionReportRepository },
  actor: Actor,
  submissionId: string,
  input: SubmissionReportCreate,
): Promise<Result<{ report: SubmissionReportRecord }>> {
  const d = can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    'write',
    { type: 'submission_report', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  );
  if (!d.allowed) return { ok: false, status: 403, reason: d.reason };
  const r = await deps.repository.createReport(actor, submissionId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, report: r };
}
