import { describe, expect, it, vi } from 'vitest';
import {
  AiGatewayError,
  GovernedAiGateway,
  type AiGatewayConfig,
  type AiGatewayRequest,
  type AiLedger,
  type AiProvider,
  type GatewayActor,
} from './gateway.js';

const actor: GatewayActor = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  allowedAttemptIds: ['attempt-1'],
};

const request: AiGatewayRequest = {
  tenantId: 'tenant-1',
  attemptId: 'attempt-1',
  assessmentVersionId: 'assessment-v1',
  purpose: 'candidate_clarification',
  modelVersion: 'model-v1',
  promptVersion: 'prompt-v1',
  policyVersion: 'policy-v1',
  input: { question: 'Explain the task instructions' },
  sourceLinks: ['assessment://task-1'],
  maxOutputTokens: 200,
  timeoutMs: 1_000,
};

function config(overrides: Partial<AiGatewayConfig> = {}): AiGatewayConfig {
  return {
    enabled: true,
    approvedVersions: new Set(['model-v1:prompt-v1:policy-v1']),
    allowedPurposes: new Set(['candidate_clarification']),
    maxOutputTokens: 500,
    maxCostMinorUnits: 100,
    maxTimeoutMs: 5_000,
    ...overrides,
  };
}

function ledger(): AiLedger & { write: ReturnType<typeof vi.fn> } {
  return { write: vi.fn().mockResolvedValue(undefined) };
}

function provider(output: unknown = { observation: 'Use the supplied source.' }): AiProvider {
  return {
    invoke: vi.fn().mockResolvedValue({
      output,
      inputTokens: 20,
      outputTokens: 30,
      costMinorUnits: 2,
    }),
  };
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  await expect(promise).rejects.toMatchObject({ code } satisfies Partial<AiGatewayError>);
}

describe('governed AI gateway', () => {
  it('is disabled by policy without calling a provider', async () => {
    const p = provider();
    const l = ledger();
    await expectCode(
      new GovernedAiGateway(p, l, config({ enabled: false })).invoke(actor, request),
      'gateway_disabled',
    );
    expect(p.invoke).not.toHaveBeenCalled();
    expect(l.write).toHaveBeenCalledWith(expect.objectContaining({ outcome: 'blocked' }));
  });

  it('enforces tenant and attempt scope', async () => {
    await expectCode(
      new GovernedAiGateway(provider(), ledger(), config()).invoke(actor, {
        ...request,
        attemptId: 'attempt-2',
      }),
      'scope_denied',
    );
  });

  it('rejects secret and accommodation fields recursively', async () => {
    await expectCode(
      new GovernedAiGateway(provider(), ledger(), config()).invoke(actor, {
        ...request,
        input: { context: { accessToken: 'Bearer secret' } },
      }),
      'sensitive_input',
    );
  });

  it('blocks score, rank, verdict, recommendation, and decision output', async () => {
    const l = ledger();
    await expectCode(
      new GovernedAiGateway(provider({ score: 92, recommendation: 'hire' }), l, config()).invoke(
        actor,
        request,
      ),
      'prohibited_output',
    );
    expect(l.write).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'blocked', responseHash: expect.any(String) }),
    );
  });

  it('returns a labelled observation and stores hashes instead of content', async () => {
    const l = ledger();
    const observation = await new GovernedAiGateway(provider(), l, config()).invoke(actor, request);

    expect(observation.kind).toBe('ai_observation');
    expect(observation.limitations.join(' ')).toContain('human reviewer');
    const entry = l.write.mock.calls[0]?.[0];
    expect(entry).toEqual(
      expect.objectContaining({
        outcome: 'succeeded',
        requestHash: expect.stringMatching(/^[0-9a-f]{64}$/),
        responseHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      }),
    );
    expect(JSON.stringify(entry)).not.toContain('Explain the task instructions');
  });

  it('fails safely without substituting a provider', async () => {
    const p: AiProvider = { invoke: vi.fn().mockRejectedValue(new Error('provider down')) };
    const l = ledger();
    await expectCode(
      new GovernedAiGateway(p, l, config()).invoke(actor, request),
      'provider_failure',
    );
    expect(p.invoke).toHaveBeenCalledTimes(1);
    expect(l.write).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failed', reasonCode: 'provider_failure' }),
    );
  });

  it('enforces the timeout even when a provider ignores cancellation', async () => {
    const p: AiProvider = { invoke: vi.fn(() => new Promise<never>(() => undefined)) };
    const l = ledger();
    await expectCode(
      new GovernedAiGateway(p, l, config()).invoke(actor, { ...request, timeoutMs: 5 }),
      'provider_timeout',
    );
    expect(l.write).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failed', reasonCode: 'provider_timeout' }),
    );
  });
});
