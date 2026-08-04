import { describe, it, expect } from 'vitest';
import {
  assertAiObservationSafe,
  findForbiddenAiOutputs,
  type AiOutputViolation,
} from './ai-output-guard.js';

describe('findForbiddenAiOutputs', () => {
  it('returns no violations for a safe AI observation payload', () => {
    const safe = {
      observationId: 'obs-1',
      evidenceRefs: ['ev-1', 'ev-2'],
      summary: 'Candidate referenced the requirement in their answer.',
      limitations: ['low signal'],
      provenance: { model: 'fake', promptVersion: 'p1' },
    };
    expect(findForbiddenAiOutputs(safe)).toEqual([]);
  });

  it.each([
    ['candidateScore', /score/],
    ['rank', /rank/],
    ['percentile', /rank or percentile/],
    ['performanceBand', /performance band/],
    ['tier', /performance band/],
    ['integrityVerdict', /verdict/],
    ['cheatingFlag', /verdict/],
    ['misconductLevel', /verdict/],
    ['recommendation', /recommendation/],
    ['hiringDecision', /hiring or progression decision/],
    ['shortlist', /hiring or progression decision/],
    ['passFail', /pass\/fail/],
  ])('flags forbidden key %s', (key, reasonMatch) => {
    const violations = findForbiddenAiOutputs({ [key]: 1 });
    expect(violations).toHaveLength(1);
    expect(violations[0]?.matchedKey).toBe(key);
    expect(violations[0]?.reason).toMatch(reasonMatch);
  });

  it('normalizes spaces and hyphens before matching', () => {
    const violations = findForbiddenAiOutputs({ 'pass-fail': true });
    expect(violations).toHaveLength(1);
    expect(violations[0]?.reason).toMatch(/pass\/fail/);
  });

  it('detects forbidden keys nested in objects and arrays with correct paths', () => {
    const payload = {
      observations: [{ note: 'ok' }, { candidateScore: 88 }],
      meta: { ranking: { value: 3 } },
    };
    const violations = findForbiddenAiOutputs(payload);
    const paths = violations.map((v: AiOutputViolation) => v.path).sort();
    expect(paths).toEqual(['$.meta.ranking', '$.observations[1].candidateScore']);
  });

  it('ignores primitive roots (string, number, null, undefined)', () => {
    expect(findForbiddenAiOutputs('score')).toEqual([]);
    expect(findForbiddenAiOutputs(42)).toEqual([]);
    expect(findForbiddenAiOutputs(null)).toEqual([]);
    expect(findForbiddenAiOutputs(undefined)).toEqual([]);
  });

  it('honours a custom base path', () => {
    const violations = findForbiddenAiOutputs({ score: 1 }, '$.root');
    expect(violations[0]?.path).toBe('$.root.score');
  });
});

describe('assertAiObservationSafe', () => {
  it('passes through a safe payload', () => {
    const payload = { observationId: 'obs-1', summary: 'ok' };
    const result = assertAiObservationSafe(payload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(payload);
    }
  });

  it('rejects a payload containing a forbidden field', () => {
    const result = assertAiObservationSafe({ candidateScore: 90 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0]?.matchedKey).toBe('candidateScore');
    }
  });
});
