import {
  getAttempt,
  getLatestAttemptPrecheck,
  getAttemptSubmissionPreview,
  startAttempt,
  submitAttempt,
  saveAttemptResponse,
  flagAttemptItem,
  addAttemptPrecheck,
  startAttemptBreak,
  recordAttemptIncident,
  addAttemptArtifact,
  deleteAttemptArtifact,
  postAttemptAiMessage,
  resetAttemptAi,
  executeAttemptPlugin,
  parseAttemptId,
  parseItemId,
  parseArtifactId,
  parsePluginCode,
  parseAttemptResponse,
  parseAttemptItemFlag,
  parseAttemptArtifact,
  parseAttemptBreak,
  parseAttemptIncident,
  parseAttemptPrecheck,
  parseAttemptAiMessage,
  parseAttemptPluginExecute,
  type AttemptRepository,
} from '@cpf/org';
import type { Actor } from '@cpf/org';
import { ensureCorrelationId, jsonResponse, problemResponse, type HttpResponse } from '@cpf/http';

export interface AttemptService {
  get(actor: Actor, attemptId: string): Promise<HttpResponse>;
  latestPrecheck(actor: Actor, attemptId: string): Promise<HttpResponse>;
  submissionPreview(actor: Actor, attemptId: string): Promise<HttpResponse>;
  start(actor: Actor, attemptId: string): Promise<HttpResponse>;
  submit(actor: Actor, attemptId: string): Promise<HttpResponse>;
  saveResponse(
    actor: Actor,
    attemptId: string,
    itemId: string,
    body: unknown,
  ): Promise<HttpResponse>;
  flagItem(actor: Actor, attemptId: string, itemId: string, body: unknown): Promise<HttpResponse>;
  precheck(actor: Actor, attemptId: string, body: unknown): Promise<HttpResponse>;
  startBreak(actor: Actor, attemptId: string, body: unknown): Promise<HttpResponse>;
  incident(actor: Actor, attemptId: string, body: unknown): Promise<HttpResponse>;
  addArtifact(actor: Actor, attemptId: string, body: unknown): Promise<HttpResponse>;
  deleteArtifact(actor: Actor, attemptId: string, artifactId: string): Promise<HttpResponse>;
  aiMessage(actor: Actor, attemptId: string, body: unknown): Promise<HttpResponse>;
  resetAi(actor: Actor, attemptId: string): Promise<HttpResponse>;
  executePlugin(
    actor: Actor,
    attemptId: string,
    pluginCode: string,
    body: unknown,
  ): Promise<HttpResponse>;
}

function validationProblem(correlationId: string, errors: string[]): HttpResponse {
  return problemResponse({
    status: 422,
    title: 'Validation',
    correlationId,
    errors: errors.map((message) => ({ detail: message })),
  });
}

function invalidId(correlationId: string, detail: string): HttpResponse {
  return problemResponse({ status: 422, title: 'Invalid ID', correlationId, detail });
}

export function createAttemptService(deps: { repository: AttemptRepository }): AttemptService {
  return {
    get: async (actor, attemptId) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const r = await getAttempt(deps, actor, aid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.attempt, correlationId);
    },
    latestPrecheck: async (actor, attemptId) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const r = await getLatestAttemptPrecheck(deps, actor, aid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.precheck, correlationId);
    },
    submissionPreview: async (actor, attemptId) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const r = await getAttemptSubmissionPreview(deps, actor, aid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.preview, correlationId);
    },
    start: async (actor, attemptId) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const r = await startAttempt(deps, actor, aid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.attempt, correlationId);
    },
    submit: async (actor, attemptId) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const r = await submitAttempt(deps, actor, aid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.attempt, correlationId);
    },
    saveResponse: async (actor, attemptId, itemId, body) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const iid = parseItemId(itemId);
      if (iid === null) return invalidId(correlationId, 'itemId must be a valid UUID.');
      const parsed = parseAttemptResponse(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await saveAttemptResponse(deps, actor, aid, iid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.response, correlationId);
    },
    flagItem: async (actor, attemptId, itemId, body) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const iid = parseItemId(itemId);
      if (iid === null) return invalidId(correlationId, 'itemId must be a valid UUID.');
      const parsed = parseAttemptItemFlag(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await flagAttemptItem(deps, actor, aid, iid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.flag, correlationId);
    },
    precheck: async (actor, attemptId, body) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const parsed = parseAttemptPrecheck(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await addAttemptPrecheck(deps, actor, aid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.precheck, correlationId);
    },
    startBreak: async (actor, attemptId, body) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const parsed = parseAttemptBreak(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await startAttemptBreak(deps, actor, aid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.break, correlationId);
    },
    incident: async (actor, attemptId, body) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const parsed = parseAttemptIncident(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await recordAttemptIncident(deps, actor, aid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.incident, correlationId);
    },
    addArtifact: async (actor, attemptId, body) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const parsed = parseAttemptArtifact(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await addAttemptArtifact(deps, actor, aid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.artifact, correlationId);
    },
    deleteArtifact: async (actor, attemptId, artifactId) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const artId = parseArtifactId(artifactId);
      if (artId === null) return invalidId(correlationId, 'artifactId must be a valid UUID.');
      const r = await deleteAttemptArtifact(deps, actor, aid, artId);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(204, {}, correlationId);
    },
    aiMessage: async (actor, attemptId, body) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const parsed = parseAttemptAiMessage(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await postAttemptAiMessage(deps, actor, aid, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(201, r.message, correlationId);
    },
    resetAi: async (actor, attemptId) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const r = await resetAttemptAi(deps, actor, aid);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.attempt, correlationId);
    },
    executePlugin: async (actor, attemptId, pluginCode, body) => {
      const correlationId = ensureCorrelationId();
      const aid = parseAttemptId(attemptId);
      if (aid === null) return invalidId(correlationId, 'attemptId must be a valid UUID.');
      const code = parsePluginCode(pluginCode);
      if (code === null) return invalidId(correlationId, 'pluginCode is invalid.');
      const parsed = parseAttemptPluginExecute(body);
      if (!parsed.ok) return validationProblem(correlationId, parsed.errors);
      const r = await executeAttemptPlugin(deps, actor, aid, code, parsed.value);
      if (!r.ok) return problemResponse({ status: r.status, title: r.reason, correlationId });
      return jsonResponse(200, r.execution, correlationId);
    },
  };
}

export async function handleGetAttempt(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string },
): Promise<HttpResponse> {
  return svc.get(req.actor, req.attemptId);
}

export async function handleGetLatestAttemptPrecheck(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string },
): Promise<HttpResponse> {
  return svc.latestPrecheck(req.actor, req.attemptId);
}

export async function handleGetAttemptSubmissionPreview(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string },
): Promise<HttpResponse> {
  return svc.submissionPreview(req.actor, req.attemptId);
}

export async function handleStartAttempt(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string },
): Promise<HttpResponse> {
  return svc.start(req.actor, req.attemptId);
}

export async function handleSubmitAttempt(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string },
): Promise<HttpResponse> {
  return svc.submit(req.actor, req.attemptId);
}

export async function handleSaveAttemptResponse(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string; itemId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.saveResponse(req.actor, req.attemptId, req.itemId, req.body);
}

export async function handleFlagAttemptItem(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string; itemId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.flagItem(req.actor, req.attemptId, req.itemId, req.body);
}

export async function handleAttemptPrecheck(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.precheck(req.actor, req.attemptId, req.body);
}

export async function handleAttemptBreak(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.startBreak(req.actor, req.attemptId, req.body);
}

export async function handleAttemptIncident(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.incident(req.actor, req.attemptId, req.body);
}

export async function handleAddAttemptArtifact(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.addArtifact(req.actor, req.attemptId, req.body);
}

export async function handleDeleteAttemptArtifact(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string; artifactId: string },
): Promise<HttpResponse> {
  return svc.deleteArtifact(req.actor, req.attemptId, req.artifactId);
}

export async function handleAttemptAiMessage(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string; body: unknown },
): Promise<HttpResponse> {
  return svc.aiMessage(req.actor, req.attemptId, req.body);
}

export async function handleAttemptAiReset(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string },
): Promise<HttpResponse> {
  return svc.resetAi(req.actor, req.attemptId);
}

export async function handleExecuteAttemptPlugin(
  svc: AttemptService,
  req: { actor: Actor; attemptId: string; pluginCode: string; body: unknown },
): Promise<HttpResponse> {
  return svc.executePlugin(req.actor, req.attemptId, req.pluginCode, req.body);
}
