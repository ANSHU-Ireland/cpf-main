import {
  createAssessmentValidation,
  activateAssessmentVersion,
  previewAssessmentVersion,
  createAssessmentDefect,
  duplicateAssessmentVersion,
  suspendAssessmentVersion,
  createAssessmentVersionForAssessment,
  parseValidationCreate,
  parseAssessmentDefectCreate,
  parseVersionId,
} from '@cpf/org';
import type {
  Actor,
  AssessmentValidationCreate,
  AssessmentValidationRecord,
  AssessmentVersionRecord,
  AssessmentValidationRepository,
  AssessmentVersionRepository,
  AssessmentVersionPreview,
  AssessmentDefectCreate,
  AssessmentDefectRecord,
} from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

type ValResult =
  | { ok: true; validation: AssessmentValidationRecord }
  | { ok: false; status: number; reason: string };
type ActResult =
  { ok: true; version: AssessmentVersionRecord } | { ok: false; status: number; reason: string };
type PreviewResult =
  { ok: true; preview: AssessmentVersionPreview } | { ok: false; status: number; reason: string };
type DefectResult =
  { ok: true; defect: AssessmentDefectRecord } | { ok: false; status: number; reason: string };

export interface AssessmentVersionService {
  createVersionForAssessment(
    actor: Actor,
    assessmentId: string,
    rationale: string,
  ): Promise<ActResult>;
  createValidation(
    actor: Actor,
    versionId: string,
    input: AssessmentValidationCreate,
  ): Promise<ValResult>;
  activateVersion(actor: Actor, versionId: string): Promise<ActResult>;
  previewVersion(actor: Actor, versionId: string): Promise<PreviewResult>;
  createDefect(
    actor: Actor,
    versionId: string,
    input: AssessmentDefectCreate,
  ): Promise<DefectResult>;
  duplicateVersion(actor: Actor, versionId: string): Promise<ActResult>;
  suspendVersion(actor: Actor, versionId: string): Promise<ActResult>;
}

export function createAssessmentVersionService(deps: {
  validationRepository: AssessmentValidationRepository;
  versionRepository: AssessmentVersionRepository;
}): AssessmentVersionService {
  return {
    createVersionForAssessment: (actor, assessmentId, rationale) =>
      createAssessmentVersionForAssessment(
        { repository: deps.versionRepository },
        actor,
        assessmentId,
        rationale,
      ),
    createValidation: (actor, vId, input) =>
      createAssessmentValidation({ repository: deps.validationRepository }, actor, vId, input),
    activateVersion: (actor, vId) =>
      activateAssessmentVersion({ repository: deps.versionRepository }, actor, vId),
    previewVersion: (actor, vId) =>
      previewAssessmentVersion({ repository: deps.versionRepository }, actor, vId),
    createDefect: (actor, vId, input) =>
      createAssessmentDefect({ repository: deps.versionRepository }, actor, vId, input),
    duplicateVersion: (actor, vId) =>
      duplicateAssessmentVersion({ repository: deps.versionRepository }, actor, vId),
    suspendVersion: (actor, vId) =>
      suspendAssessmentVersion({ repository: deps.versionRepository }, actor, vId),
  };
}

export async function handlePostAssessmentVersion(
  svc: AssessmentVersionService,
  req: { actor: Actor; assessmentId: string; body: unknown },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  if (parseVersionId(req.assessmentId) === null) {
    return problemResponse({
      status: 422,
      title: 'Invalid assessment ID',
      correlationId,
      detail: 'assessmentId must be a UUID',
    });
  }
  if (req.body === null || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return problemResponse({
      status: 422,
      title: 'Validation',
      correlationId,
      detail: 'body must be an object',
    });
  }
  const body = req.body as Record<string, unknown>;
  const rationale = typeof body.rationale === 'string' ? body.rationale.trim() : '';
  if (rationale.length < 4) {
    return problemResponse({
      status: 422,
      title: 'Validation',
      correlationId,
      detail: 'a rationale of at least 4 characters is required',
    });
  }
  const result = await svc.createVersionForAssessment(req.actor, req.assessmentId, rationale);
  if (!result.ok) {
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  }
  return jsonResponse(201, result.version, correlationId);
}

export async function handlePostAssessmentValidation(
  svc: AssessmentVersionService,
  req: { actor: Actor; versionId: string; body: unknown },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const vId = parseVersionId(req.versionId);
  if (vId === null)
    return problemResponse({
      status: 422,
      title: 'Invalid version ID',
      correlationId,
      detail: 'bad uuid',
    });
  const parsed = parseValidationCreate(req.body);
  if (!parsed.ok)
    return problemResponse({
      status: 422,
      title: 'Validation',
      correlationId,
      detail: parsed.errors.join(', '),
    });
  const result = await svc.createValidation(req.actor, vId, parsed.value);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(201, result.validation, correlationId);
}

export async function handlePostActivateVersion(
  svc: AssessmentVersionService,
  req: { actor: Actor; versionId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const vId = parseVersionId(req.versionId);
  if (vId === null)
    return problemResponse({
      status: 422,
      title: 'Invalid version ID',
      correlationId,
      detail: 'bad uuid',
    });
  const result = await svc.activateVersion(req.actor, vId);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.version, correlationId);
}

export async function handleGetVersionPreview(
  svc: AssessmentVersionService,
  req: { actor: Actor; versionId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const vId = parseVersionId(req.versionId);
  if (vId === null)
    return problemResponse({
      status: 422,
      title: 'Invalid version ID',
      correlationId,
      detail: 'bad uuid',
    });
  const result = await svc.previewVersion(req.actor, vId);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.preview, correlationId);
}

export async function handlePostVersionDefect(
  svc: AssessmentVersionService,
  req: { actor: Actor; versionId: string; body: unknown },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const vId = parseVersionId(req.versionId);
  if (vId === null)
    return problemResponse({
      status: 422,
      title: 'Invalid version ID',
      correlationId,
      detail: 'bad uuid',
    });
  const parsed = parseAssessmentDefectCreate(req.body);
  if (!parsed.ok)
    return problemResponse({
      status: 422,
      title: 'Validation',
      correlationId,
      detail: parsed.errors.join(', '),
    });
  const result = await svc.createDefect(req.actor, vId, parsed.value);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(201, result.defect, correlationId);
}

export async function handlePostDuplicateVersion(
  svc: AssessmentVersionService,
  req: { actor: Actor; versionId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const vId = parseVersionId(req.versionId);
  if (vId === null)
    return problemResponse({
      status: 422,
      title: 'Invalid version ID',
      correlationId,
      detail: 'bad uuid',
    });
  const result = await svc.duplicateVersion(req.actor, vId);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(201, result.version, correlationId);
}

export async function handlePostSuspendVersion(
  svc: AssessmentVersionService,
  req: { actor: Actor; versionId: string },
): Promise<HttpResponse> {
  const correlationId = ensureCorrelationId();
  const vId = parseVersionId(req.versionId);
  if (vId === null)
    return problemResponse({
      status: 422,
      title: 'Invalid version ID',
      correlationId,
      detail: 'bad uuid',
    });
  const result = await svc.suspendVersion(req.actor, vId);
  if (!result.ok)
    return problemResponse({
      status: result.status,
      title: result.reason,
      correlationId,
      detail: result.reason,
    });
  return jsonResponse(200, result.version, correlationId);
}
