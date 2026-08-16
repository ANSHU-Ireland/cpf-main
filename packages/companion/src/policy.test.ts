import { describe, expect, it } from 'vitest';
import {
  CompanionPolicyError,
  CompanionSession,
  validateEvent,
  type CompanionEvent,
  type CompanionPolicy,
} from './policy.js';

const policy: CompanionPolicy = {
  minimumVersion: '2.4.0',
  maximumVersion: '2.9.9',
  rawMediaApproved: false,
  allowedAttemptIds: new Set(['attempt-1']),
};

function event(type: CompanionEvent['type'], payload: CompanionEvent['payload']): CompanionEvent {
  return {
    type,
    attemptId: 'attempt-1',
    occurredAt: '2026-08-16T12:00:00.000Z',
    payload,
  };
}

function expectCode(action: () => void, code: string): void {
  expect(action).toThrowError(expect.objectContaining<Partial<CompanionPolicyError>>({ code }));
}

describe('desktop companion policy', () => {
  it('requires a signed, supported, disclosed build', () => {
    expectCode(
      () =>
        new CompanionSession({ version: '2.5.0', signatureVerified: false }, policy).start({
          attemptId: 'attempt-1',
          disclosureAccepted: true,
        }),
      'signature_invalid',
    );
    expectCode(
      () =>
        new CompanionSession({ version: '3.0.0', signatureVerified: true }, policy).start({
          attemptId: 'attempt-1',
          disclosureAccepted: true,
        }),
      'version_unsupported',
    );
    expectCode(
      () =>
        new CompanionSession({ version: '2.5.0', signatureVerified: true }, policy).start({
          attemptId: 'attempt-1',
          disclosureAccepted: false,
        }),
      'disclosure_required',
    );
  });

  it('is visibly active only during the disclosed attempt', () => {
    const session = new CompanionSession({ version: '2.5.0', signatureVerified: true }, policy);
    session.start({ attemptId: 'attempt-1', disclosureAccepted: true });
    expect(session.state).toMatchObject({ active: true, visiblyActive: true });
    session.stop();
    expect(session.state).toEqual({
      active: false,
      visiblyActive: false,
      attemptId: null,
      telemetryAvailable: true,
    });
  });

  it('rejects unrelated workspace and invasive telemetry', () => {
    expectCode(
      () =>
        validateEvent(
          event('workspace.focus_lost', { windowTitle: 'Private mail' }),
          policy,
          'attempt-1',
        ),
      'prohibited_telemetry',
    );
    expectCode(
      () =>
        validateEvent(
          { ...event('network.changed', { state: 'offline' }), attemptId: 'attempt-2' },
          policy,
          'attempt-1',
        ),
      'attempt_scope_denied',
    );
  });

  it('records telemetry loss as context without a score or verdict', () => {
    const session = new CompanionSession({ version: '2.5.0', signatureVerified: true }, policy);
    session.start({ attemptId: 'attempt-1', disclosureAccepted: true });
    session.accept(event('telemetry.unavailable', { channel: 'heartbeat', reason: 'network' }));
    expect(session.state.telemetryAvailable).toBe(false);
    expect(Object.keys(session.state)).not.toContain('score');
    expect(Object.keys(session.state)).not.toContain('verdict');
  });
});
