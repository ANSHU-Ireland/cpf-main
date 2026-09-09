import 'server-only';

import type { DecisionContext } from '@cpf/org';
import type { DecisionApprovalView, DecisionDraftView } from './types';
import { callPlatform, type PlatformResult } from './platform-api.server';

export function readEmployerDecisionContext(
  request: Request,
  applicationId: string,
  correlationId?: string,
): Promise<PlatformResult<DecisionContext>> {
  return callPlatform<DecisionContext>({
    request,
    path: `/applications/${encodeURIComponent(applicationId)}/decision-context`,
    method: 'GET',
    ...(correlationId === undefined ? {} : { correlationId }),
  });
}

export function employerDecisionDraft(context: DecisionContext): DecisionDraftView {
  const decision = context.decision;
  const status: DecisionDraftView['status'] =
    decision === null
      ? 'draft'
      : decision.status === 'issued'
        ? 'issued'
        : context.approval?.status === 'rejected'
          ? 'returned'
          : context.approval?.status === 'pending' ||
              context.approval?.status === 'approved' ||
              decision.status === 'pending_approval'
            ? 'awaiting_approval'
            : 'draft';
  return {
    applicationId: context.applicationId,
    decisionId: decision?.id ?? null,
    candidateRef: context.candidateRef,
    campaignName: context.campaignName,
    outcome: decision?.decision ?? null,
    rationale: decision?.rationale ?? '',
    evidenceLinks: decision?.evidenceLinks ?? [],
    reviewComplete: context.reviewComplete,
    status,
  };
}

export function employerDecisionApproval(context: DecisionContext): DecisionApprovalView {
  const decision = context.decision;
  const status: DecisionApprovalView['status'] =
    decision === null
      ? 'awaiting_review'
      : decision.status === 'issued'
        ? 'issued'
        : context.approval?.status === 'rejected'
          ? 'returned'
          : context.approval?.status === 'approved'
            ? 'approved'
            : 'awaiting_approval';
  return {
    applicationId: context.applicationId,
    decisionId: decision?.id ?? null,
    candidateRef: context.candidateRef,
    campaignName: context.campaignName,
    outcome: decision?.decision ?? null,
    rationale: decision?.rationale ?? '',
    evidenceLinks: decision?.evidenceLinks ?? [],
    draftedBy: decision?.decidedByName ?? '',
    status,
    approver: decision?.secondApprovedByName ?? null,
    approvedAt: decision?.secondApprovedAt ?? null,
    issuedAt: decision?.issuedAt ?? null,
    returnRationale: context.approval?.status === 'rejected' ? context.approval.rationale : null,
  };
}

export function decisionContextResponse<T>(
  result: PlatformResult<DecisionContext>,
  project: (context: DecisionContext) => T,
): Response {
  return Response.json(project(result.data), {
    headers: { 'x-correlation-id': result.correlationId },
  });
}
