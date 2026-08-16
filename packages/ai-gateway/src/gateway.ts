import { createHash, randomUUID } from 'node:crypto';
import { assertAiObservationSafe } from '@cpf/domain';

const FORBIDDEN_INPUT_KEYS = new Set([
  'accommodation',
  'accommodations',
  'access_token',
  'authorization',
  'cookie',
  'password',
  'refresh_token',
  'secret',
  'session',
]);

export interface GatewayActor {
  readonly tenantId: string;
  readonly userId: string;
  readonly allowedAttemptIds: readonly string[];
}

export interface AiGatewayRequest {
  readonly tenantId: string;
  readonly attemptId: string;
  readonly assessmentVersionId: string;
  readonly purpose: string;
  readonly modelVersion: string;
  readonly promptVersion: string;
  readonly policyVersion: string;
  readonly input: Readonly<Record<string, unknown>>;
  readonly sourceLinks: readonly string[];
  readonly maxOutputTokens: number;
  readonly timeoutMs: number;
}

export interface AiProviderResult {
  readonly output: unknown;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costMinorUnits: number;
}

export interface AiProvider {
  invoke(request: AiGatewayRequest, signal: AbortSignal): Promise<AiProviderResult>;
}

export interface AiLedgerEntry {
  readonly id: string;
  readonly tenantId: string;
  readonly actorId: string;
  readonly attemptId: string;
  readonly purpose: string;
  readonly modelVersion: string;
  readonly promptVersion: string;
  readonly policyVersion: string;
  readonly requestHash: string;
  readonly responseHash: string | null;
  readonly sourceLinks: readonly string[];
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly costMinorUnits: number;
  readonly latencyMs: number;
  readonly outcome: 'succeeded' | 'blocked' | 'failed';
  readonly reasonCode: string | null;
}

export interface AiLedger {
  write(entry: AiLedgerEntry): Promise<void>;
}

export interface AiGatewayConfig {
  readonly enabled: boolean;
  readonly approvedVersions: ReadonlySet<string>;
  readonly allowedPurposes: ReadonlySet<string>;
  readonly maxOutputTokens: number;
  readonly maxCostMinorUnits: number;
  readonly maxTimeoutMs: number;
  readonly now?: () => number;
}

export interface AiObservation {
  readonly kind: 'ai_observation';
  readonly value: unknown;
  readonly sourceLinks: readonly string[];
  readonly limitations: readonly string[];
  readonly modelVersion: string;
  readonly promptVersion: string;
  readonly policyVersion: string;
}

export class AiGatewayError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AiGatewayError';
  }
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, stableValue(nested)]),
    );
  }
  return value;
}

export function hashCanonical(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(stableValue(value)))
    .digest('hex');
}

function containsForbiddenInputKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsForbiddenInputKey);
  if (value === null || typeof value !== 'object') return false;
  return Object.entries(value as Record<string, unknown>).some(([key, nested]) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    const prohibited = [...FORBIDDEN_INPUT_KEYS].some((candidate) =>
      normalized.includes(candidate.replace(/[^a-z0-9]/g, '')),
    );
    return prohibited || containsForbiddenInputKey(nested);
  });
}

function versionKey(request: AiGatewayRequest): string {
  return `${request.modelVersion}:${request.promptVersion}:${request.policyVersion}`;
}

export class GovernedAiGateway {
  readonly #now: () => number;

  constructor(
    private readonly provider: AiProvider,
    private readonly ledger: AiLedger,
    private readonly config: AiGatewayConfig,
  ) {
    this.#now = config.now ?? Date.now;
  }

  async invoke(actor: GatewayActor, request: AiGatewayRequest): Promise<AiObservation> {
    const startedAt = this.#now();
    const requestHash = hashCanonical(request);
    let responseHash: string | null = null;
    let inputTokens = 0;
    let outputTokens = 0;
    let costMinorUnits = 0;

    const write = async (
      outcome: AiLedgerEntry['outcome'],
      reasonCode: string | null,
    ): Promise<void> => {
      await this.ledger.write({
        id: randomUUID(),
        tenantId: request.tenantId,
        actorId: actor.userId,
        attemptId: request.attemptId,
        purpose: request.purpose,
        modelVersion: request.modelVersion,
        promptVersion: request.promptVersion,
        policyVersion: request.policyVersion,
        requestHash,
        responseHash,
        sourceLinks: request.sourceLinks,
        inputTokens,
        outputTokens,
        costMinorUnits,
        latencyMs: Math.max(0, this.#now() - startedAt),
        outcome,
        reasonCode,
      });
    };

    const block = async (code: string, message: string): Promise<never> => {
      await write('blocked', code);
      throw new AiGatewayError(code, message);
    };

    if (!this.config.enabled) return block('gateway_disabled', 'AI gateway is disabled');
    if (
      request.tenantId !== actor.tenantId ||
      !actor.allowedAttemptIds.includes(request.attemptId)
    ) {
      return block('scope_denied', 'Tenant or attempt scope denied');
    }
    if (!this.config.allowedPurposes.has(request.purpose)) {
      return block('purpose_denied', 'Purpose is not approved');
    }
    if (!this.config.approvedVersions.has(versionKey(request))) {
      return block('version_unapproved', 'Model, prompt, or policy version is not approved');
    }
    if (
      request.maxOutputTokens < 1 ||
      request.maxOutputTokens > this.config.maxOutputTokens ||
      request.timeoutMs < 1 ||
      request.timeoutMs > this.config.maxTimeoutMs
    ) {
      return block('budget_denied', 'Token or timeout budget exceeds policy');
    }
    if (containsForbiddenInputKey(request.input)) {
      return block(
        'sensitive_input',
        'Authentication, accommodation, or secret data is prohibited',
      );
    }

    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutFailure = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        controller.abort();
        reject(new Error('provider timeout'));
      }, request.timeoutMs);
    });
    try {
      const result = await Promise.race([
        this.provider.invoke(request, controller.signal),
        timeoutFailure,
      ]);
      inputTokens = result.inputTokens;
      outputTokens = result.outputTokens;
      costMinorUnits = result.costMinorUnits;
      responseHash = hashCanonical(result.output);

      if (
        result.outputTokens > request.maxOutputTokens ||
        result.costMinorUnits > this.config.maxCostMinorUnits
      ) {
        return block('provider_budget_exceeded', 'Provider exceeded the approved budget');
      }
      if (!assertAiObservationSafe(result.output).ok) {
        return block(
          'prohibited_output',
          'AI output attempted a score, rank, verdict, or decision',
        );
      }

      await write('succeeded', null);
      return {
        kind: 'ai_observation',
        value: result.output,
        sourceLinks: request.sourceLinks,
        limitations: [
          'AI output is an observation only.',
          'A human reviewer must verify all evidence and retain decision authority.',
        ],
        modelVersion: request.modelVersion,
        promptVersion: request.promptVersion,
        policyVersion: request.policyVersion,
      };
    } catch (error) {
      if (error instanceof AiGatewayError) throw error;
      const reasonCode = controller.signal.aborted ? 'provider_timeout' : 'provider_failure';
      await write('failed', reasonCode);
      throw new AiGatewayError(reasonCode, 'Approved provider call failed safely');
    } finally {
      if (timeout !== undefined) clearTimeout(timeout);
    }
  }
}
