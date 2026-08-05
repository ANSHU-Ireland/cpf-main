import { can } from '@cpf/policy';
import { ORG_PERMISSIONS } from './permissions.js';
import type { Actor } from './types.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLUGIN_CODE_RE = /^[a-z0-9](?:[a-z0-9._-]{0,80}[a-z0-9])?$/;

export const ATTEMPT_STATUSES = [
  'created',
  'in_progress',
  'on_break',
  'submitted',
  'abandoned',
] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const ARTIFACT_KINDS = ['file', 'screen_recording', 'code', 'transcript'] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export const INCIDENT_TYPES = [
  'focus_loss',
  'network_drop',
  'device_change',
  'proctor_flag',
  'other',
] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export interface AttemptRecord {
  readonly id: string;
  readonly applicationId: string;
  readonly assessmentVersionId: string;
  readonly status: AttemptStatus;
  readonly startedAt: string | null;
  readonly submittedAt: string | null;
}

export interface AttemptResponseRecord {
  readonly attemptId: string;
  readonly itemId: string;
  readonly value: unknown;
  readonly savedAt: string;
}

export interface AttemptItemFlagRecord {
  readonly attemptId: string;
  readonly itemId: string;
  readonly flagged: boolean;
}

export interface AttemptArtifactRecord {
  readonly id: string;
  readonly attemptId: string;
  readonly kind: ArtifactKind;
  readonly uri: string;
  readonly createdAt: string;
}

export interface AttemptBreakRecord {
  readonly id: string;
  readonly attemptId: string;
  readonly reason: string;
  readonly startedAt: string;
}

export interface AttemptIncidentRecord {
  readonly id: string;
  readonly attemptId: string;
  readonly incidentType: IncidentType;
  readonly detail: string | null;
  readonly recordedAt: string;
}

export interface AttemptPrecheckRecord {
  readonly attemptId: string;
  readonly passed: boolean;
  readonly checks: Record<string, boolean>;
}

export interface AttemptAiMessageRecord {
  readonly id: string;
  readonly attemptId: string;
  readonly role: string;
  readonly content: string;
  readonly createdAt: string;
}

export interface AttemptPluginExecutionRecord {
  readonly id: string;
  readonly attemptId: string;
  readonly pluginCode: string;
  readonly status: string;
  readonly output: unknown;
}

export interface AttemptResponseInput {
  readonly value: unknown;
}

export interface AttemptItemFlagInput {
  readonly flagged: boolean;
}

export interface AttemptArtifactInput {
  readonly kind: ArtifactKind;
  readonly uri: string;
}

export interface AttemptBreakInput {
  readonly reason: string;
}

export interface AttemptIncidentInput {
  readonly incidentType: IncidentType;
  readonly detail?: string;
}

export interface AttemptPrecheckInput {
  readonly checks: Record<string, boolean>;
}

export interface AttemptAiMessageInput {
  readonly content: string;
}

export interface AttemptPluginExecuteInput {
  readonly input?: Record<string, unknown>;
}

export interface AttemptRepository {
  startAttempt(actor: Actor, attemptId: string): Promise<AttemptRecord | null>;
  submitAttempt(actor: Actor, attemptId: string): Promise<AttemptRecord | null>;
  saveResponse(
    actor: Actor,
    attemptId: string,
    itemId: string,
    input: AttemptResponseInput,
  ): Promise<AttemptResponseRecord | null>;
  flagItem(
    actor: Actor,
    attemptId: string,
    itemId: string,
    input: AttemptItemFlagInput,
  ): Promise<AttemptItemFlagRecord | null>;
  addPrecheck(
    actor: Actor,
    attemptId: string,
    input: AttemptPrecheckInput,
  ): Promise<AttemptPrecheckRecord | null>;
  startBreak(
    actor: Actor,
    attemptId: string,
    input: AttemptBreakInput,
  ): Promise<AttemptBreakRecord | null>;
  recordIncident(
    actor: Actor,
    attemptId: string,
    input: AttemptIncidentInput,
  ): Promise<AttemptIncidentRecord | null>;
  addArtifact(
    actor: Actor,
    attemptId: string,
    input: AttemptArtifactInput,
  ): Promise<AttemptArtifactRecord | null>;
  deleteArtifact(actor: Actor, attemptId: string, artifactId: string): Promise<boolean>;
  postAiMessage(
    actor: Actor,
    attemptId: string,
    input: AttemptAiMessageInput,
  ): Promise<AttemptAiMessageRecord | null>;
  resetAi(actor: Actor, attemptId: string): Promise<AttemptRecord | null>;
  executePlugin(
    actor: Actor,
    attemptId: string,
    pluginCode: string,
    input: AttemptPluginExecuteInput,
  ): Promise<AttemptPluginExecutionRecord | null>;
}

const VALID_KINDS: ReadonlySet<string> = new Set(ARTIFACT_KINDS);
const VALID_INCIDENTS: ReadonlySet<string> = new Set(INCIDENT_TYPES);

type Parsed<T> = { ok: true; value: T } | { ok: false; errors: string[] };

export function parseAttemptId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export function parseItemId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export function parseArtifactId(raw: string): string | null {
  return UUID_RE.test(raw) ? raw : null;
}

export function parsePluginCode(raw: string): string | null {
  return PLUGIN_CODE_RE.test(raw) ? raw : null;
}

export function parseAttemptResponse(raw: unknown): Parsed<AttemptResponseInput> {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  if (!('value' in obj)) return { ok: false, errors: ['value required'] };
  return { ok: true, value: { value: obj['value'] } };
}

export function parseAttemptItemFlag(raw: unknown): Parsed<AttemptItemFlagInput> {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  if (typeof obj['flagged'] !== 'boolean')
    return { ok: false, errors: ['flagged must be a boolean'] };
  return { ok: true, value: { flagged: obj['flagged'] } };
}

export function parseAttemptArtifact(raw: unknown): Parsed<AttemptArtifactInput> {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['kind'] !== 'string' || !VALID_KINDS.has(obj['kind'])) errors.push('kind invalid');
  if (typeof obj['uri'] !== 'string' || obj['uri'].length === 0) errors.push('uri required');
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, value: { kind: obj['kind'] as ArtifactKind, uri: obj['uri'] as string } };
}

export function parseAttemptBreak(raw: unknown): Parsed<AttemptBreakInput> {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  if (typeof obj['reason'] !== 'string' || obj['reason'].length === 0)
    return { ok: false, errors: ['reason required'] };
  return { ok: true, value: { reason: obj['reason'] } };
}

export function parseAttemptIncident(raw: unknown): Parsed<AttemptIncidentInput> {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof obj['incidentType'] !== 'string' || !VALID_INCIDENTS.has(obj['incidentType']))
    errors.push('incidentType invalid');
  if (obj['detail'] !== undefined && typeof obj['detail'] !== 'string')
    errors.push('detail must be a string');
  if (errors.length > 0) return { ok: false, errors };
  const value: { incidentType: IncidentType; detail?: string } = {
    incidentType: obj['incidentType'] as IncidentType,
  };
  if (typeof obj['detail'] === 'string') value.detail = obj['detail'];
  return { ok: true, value };
}

export function parseAttemptPrecheck(raw: unknown): Parsed<AttemptPrecheckInput> {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  const checksRaw = obj['checks'];
  if (checksRaw === null || typeof checksRaw !== 'object')
    return { ok: false, errors: ['checks must be an object'] };
  const checks: Record<string, boolean> = {};
  for (const [key, val] of Object.entries(checksRaw as Record<string, unknown>)) {
    if (typeof val !== 'boolean') return { ok: false, errors: ['each check must be a boolean'] };
    checks[key] = val;
  }
  return { ok: true, value: { checks } };
}

export function parseAttemptAiMessage(raw: unknown): Parsed<AttemptAiMessageInput> {
  if (raw === null || typeof raw !== 'object') return { ok: false, errors: ['body required'] };
  const obj = raw as Record<string, unknown>;
  if (typeof obj['content'] !== 'string' || obj['content'].length === 0)
    return { ok: false, errors: ['content required'] };
  return { ok: true, value: { content: obj['content'] } };
}

export function parseAttemptPluginExecute(raw: unknown): Parsed<AttemptPluginExecuteInput> {
  if (raw === undefined || raw === null) return { ok: true, value: {} };
  if (typeof raw !== 'object') return { ok: false, errors: ['body must be an object'] };
  const obj = raw as Record<string, unknown>;
  const value: { input?: Record<string, unknown> } = {};
  if (obj['input'] !== undefined) {
    if (typeof obj['input'] !== 'object' || obj['input'] === null)
      return { ok: false, errors: ['input must be an object'] };
    value.input = obj['input'] as Record<string, unknown>;
  }
  return { ok: true, value };
}

type Result<T> = ({ ok: true } & T) | { ok: false; status: number; reason: string };

function authorize(actor: Actor, action: 'read' | 'write'): boolean {
  return can(
    { userId: actor.userId, tenantId: actor.tenantId, roles: actor.roles },
    action,
    { type: 'attempt', tenantId: actor.tenantId },
    ORG_PERMISSIONS,
  ).allowed;
}

export async function startAttempt(
  deps: { repository: AttemptRepository },
  actor: Actor,
  attemptId: string,
): Promise<Result<{ attempt: AttemptRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.startAttempt(actor, attemptId);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, attempt: r };
}

export async function submitAttempt(
  deps: { repository: AttemptRepository },
  actor: Actor,
  attemptId: string,
): Promise<Result<{ attempt: AttemptRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.submitAttempt(actor, attemptId);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, attempt: r };
}

export async function saveAttemptResponse(
  deps: { repository: AttemptRepository },
  actor: Actor,
  attemptId: string,
  itemId: string,
  input: AttemptResponseInput,
): Promise<Result<{ response: AttemptResponseRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.saveResponse(actor, attemptId, itemId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, response: r };
}

export async function flagAttemptItem(
  deps: { repository: AttemptRepository },
  actor: Actor,
  attemptId: string,
  itemId: string,
  input: AttemptItemFlagInput,
): Promise<Result<{ flag: AttemptItemFlagRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.flagItem(actor, attemptId, itemId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, flag: r };
}

export async function addAttemptPrecheck(
  deps: { repository: AttemptRepository },
  actor: Actor,
  attemptId: string,
  input: AttemptPrecheckInput,
): Promise<Result<{ precheck: AttemptPrecheckRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.addPrecheck(actor, attemptId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, precheck: r };
}

export async function startAttemptBreak(
  deps: { repository: AttemptRepository },
  actor: Actor,
  attemptId: string,
  input: AttemptBreakInput,
): Promise<Result<{ break: AttemptBreakRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.startBreak(actor, attemptId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, break: r };
}

export async function recordAttemptIncident(
  deps: { repository: AttemptRepository },
  actor: Actor,
  attemptId: string,
  input: AttemptIncidentInput,
): Promise<Result<{ incident: AttemptIncidentRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.recordIncident(actor, attemptId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, incident: r };
}

export async function addAttemptArtifact(
  deps: { repository: AttemptRepository },
  actor: Actor,
  attemptId: string,
  input: AttemptArtifactInput,
): Promise<Result<{ artifact: AttemptArtifactRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.addArtifact(actor, attemptId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, artifact: r };
}

export async function deleteAttemptArtifact(
  deps: { repository: AttemptRepository },
  actor: Actor,
  attemptId: string,
  artifactId: string,
): Promise<Result<Record<string, never>>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const removed = await deps.repository.deleteArtifact(actor, attemptId, artifactId);
  if (!removed) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true } as Result<Record<string, never>>;
}

export async function postAttemptAiMessage(
  deps: { repository: AttemptRepository },
  actor: Actor,
  attemptId: string,
  input: AttemptAiMessageInput,
): Promise<Result<{ message: AttemptAiMessageRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.postAiMessage(actor, attemptId, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, message: r };
}

export async function resetAttemptAi(
  deps: { repository: AttemptRepository },
  actor: Actor,
  attemptId: string,
): Promise<Result<{ attempt: AttemptRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.resetAi(actor, attemptId);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, attempt: r };
}

export async function executeAttemptPlugin(
  deps: { repository: AttemptRepository },
  actor: Actor,
  attemptId: string,
  pluginCode: string,
  input: AttemptPluginExecuteInput,
): Promise<Result<{ execution: AttemptPluginExecutionRecord }>> {
  if (!authorize(actor, 'write')) return { ok: false, status: 403, reason: 'forbidden' };
  const r = await deps.repository.executePlugin(actor, attemptId, pluginCode, input);
  if (r === null) return { ok: false, status: 404, reason: 'not_found' };
  return { ok: true, execution: r };
}
