const EVENT_FIELDS = {
  'companion.started': new Set(['buildVersion']),
  'companion.stopped': new Set(['reason']),
  'device.check': new Set(['cameraAvailable', 'microphoneAvailable', 'networkQuality']),
  'network.changed': new Set(['state']),
  'telemetry.unavailable': new Set(['channel', 'reason']),
  'workspace.focus_lost': new Set(['durationBucket']),
  'workspace.focus_restored': new Set(['durationBucket']),
} as const;

export type CompanionEventType = keyof typeof EVENT_FIELDS;

const PROHIBITED_FIELDS = new Set([
  'clipboard',
  'emotion',
  'face',
  'guilt',
  'keystrokes',
  'password',
  'personality',
  'rawAudio',
  'rawMedia',
  'rawVideo',
  'screenContent',
  'sensitiveTrait',
  'windowTitle',
]);

export interface CompanionPolicy {
  readonly minimumVersion: string;
  readonly maximumVersion: string;
  readonly rawMediaApproved: boolean;
  readonly allowedAttemptIds: ReadonlySet<string>;
}

export interface CompanionBuild {
  readonly version: string;
  readonly signatureVerified: boolean;
}

export interface CompanionEvent {
  readonly type: CompanionEventType;
  readonly attemptId: string;
  readonly occurredAt: string;
  readonly payload: Readonly<Record<string, string | number | boolean | null>>;
}

export interface CompanionSessionState {
  readonly active: boolean;
  readonly visiblyActive: boolean;
  readonly attemptId: string | null;
  readonly telemetryAvailable: boolean;
}

export class CompanionPolicyError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'CompanionPolicyError';
  }
}

function parseVersion(value: string): readonly [number, number, number] | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value);
  if (match === null) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersion(left: string, right: string): number | null {
  const l = parseVersion(left);
  const r = parseVersion(right);
  if (l === null || r === null) return null;
  for (let index = 0; index < 3; index += 1) {
    const difference = (l[index] ?? 0) - (r[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

export function validateEvent(
  event: CompanionEvent,
  policy: CompanionPolicy,
  activeAttemptId: string,
): void {
  if (event.attemptId !== activeAttemptId || !policy.allowedAttemptIds.has(event.attemptId)) {
    throw new CompanionPolicyError('attempt_scope_denied');
  }
  const allowed = EVENT_FIELDS[event.type];
  for (const key of Object.keys(event.payload)) {
    if (PROHIBITED_FIELDS.has(key)) throw new CompanionPolicyError('prohibited_telemetry');
    if (!allowed.has(key as never)) throw new CompanionPolicyError('telemetry_field_not_allowed');
  }
  if (!policy.rawMediaApproved && Object.keys(event.payload).some((key) => key.startsWith('raw'))) {
    throw new CompanionPolicyError('raw_media_not_approved');
  }
}

export class CompanionSession {
  #state: CompanionSessionState = {
    active: false,
    visiblyActive: false,
    attemptId: null,
    telemetryAvailable: true,
  };

  constructor(
    private readonly build: CompanionBuild,
    private readonly policy: CompanionPolicy,
  ) {}

  get state(): CompanionSessionState {
    return this.#state;
  }

  start(input: { readonly attemptId: string; readonly disclosureAccepted: boolean }): void {
    if (!this.build.signatureVerified) throw new CompanionPolicyError('signature_invalid');
    const minimum = compareVersion(this.build.version, this.policy.minimumVersion);
    const maximum = compareVersion(this.build.version, this.policy.maximumVersion);
    if (minimum === null || maximum === null || minimum < 0 || maximum > 0) {
      throw new CompanionPolicyError('version_unsupported');
    }
    if (!input.disclosureAccepted) throw new CompanionPolicyError('disclosure_required');
    if (!this.policy.allowedAttemptIds.has(input.attemptId)) {
      throw new CompanionPolicyError('attempt_scope_denied');
    }
    this.#state = {
      active: true,
      visiblyActive: true,
      attemptId: input.attemptId,
      telemetryAvailable: true,
    };
  }

  accept(event: CompanionEvent): void {
    if (!this.#state.active || this.#state.attemptId === null) {
      throw new CompanionPolicyError('session_inactive');
    }
    validateEvent(event, this.policy, this.#state.attemptId);
    if (event.type === 'telemetry.unavailable') {
      this.#state = { ...this.#state, telemetryAvailable: false };
    }
  }

  stop(): void {
    this.#state = {
      active: false,
      visiblyActive: false,
      attemptId: null,
      telemetryAvailable: true,
    };
  }
}
