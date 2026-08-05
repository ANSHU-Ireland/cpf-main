import {
  listSubmissionReports,
  createSubmissionReport,
  parseSubmissionReportCreate,
  parseSubmissionId,
  type SubmissionReportRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface SubmissionReportService {
  list(actor: Actor, submissionId: string): Promise<HttpResponse>;
  create(actor: Actor, submissionId: string, body: unknown): Promise<HttpResponse>;
}

export function createSubmissionReportService(deps: {
  repository: SubmissionReportRepository;
}): SubmissionReportService {
  return {
    list: async (actor, submissionId) => {
      const correlationId = ensureCorrelationId();
      const id = parseSubmissionId(submissionId);
      if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const r = await listSubmissionReports(deps, actor, id);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, { items: r.items, total: r.total }, correlationId);
    },
    create: async (actor, submissionId, body) => {
      const correlationId = ensureCorrelationId();
      const id = parseSubmissionId(submissionId);
      if (id === null) return problemResponse({ status: 422, title: 'Invalid ID', correlationId });
      const parsed = parseSubmissionReportCreate(body);
      if (!parsed.ok)
        return problemResponse({
          status: 422,
          title: 'Validation',
          correlationId,
          errors: parsed.errors.map((message) => ({ detail: message })),
        });
      const r = await createSubmissionReport(deps, actor, id, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.report, correlationId);
    },
  };
}

export async function handleListSubmissionReports(
  svc: SubmissionReportService,
  req: { actor: Actor; submissionId: string },
): Promise<HttpResponse> {
  return svc.list(req.actor, req.submissionId);
}

export async function handleCreateSubmissionReport(
  svc: SubmissionReportService,
  req: { actor: Actor; submissionId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.create(req.actor, req.submissionId, req.body);
}
