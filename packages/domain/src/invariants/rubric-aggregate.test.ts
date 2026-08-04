import { describe, it, expect } from 'vitest';
import { computeRubricAggregate, type CriterionScore } from './rubric-aggregate.js';

const human = (criterionId: string, value: number, maxValue: number): CriterionScore => ({
  criterionId,
  value,
  maxValue,
  source: 'human',
});

describe('computeRubricAggregate', () => {
  it('rejects an empty score set', () => {
    const result = computeRubricAggregate([], 'v1.sum');
    expect(result).toEqual({ ok: false, error: 'No submitted human scores to aggregate.' });
  });

  it('rejects any AI-sourced score (core safety invariant)', () => {
    const scores: CriterionScore[] = [
      human('c1', 3, 5),
      { criterionId: 'c2', value: 4, maxValue: 5, source: 'ai' },
    ];
    const result = computeRubricAggregate(scores, 'v1.sum');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Non-human score source 'ai' is forbidden/);
    }
  });

  it('rejects a non-finite value', () => {
    const result = computeRubricAggregate([human('c1', Number.NaN, 5)], 'v1.sum');
    expect(result).toEqual({ ok: false, error: "Criterion 'c1' has a non-finite value." });
  });

  it('rejects a non-finite maxValue', () => {
    const result = computeRubricAggregate([human('c1', 1, Number.POSITIVE_INFINITY)], 'v1.sum');
    expect(result).toEqual({ ok: false, error: "Criterion 'c1' has a non-finite value." });
  });

  it('rejects a non-positive maxValue', () => {
    const result = computeRubricAggregate([human('c1', 0, 0)], 'v1.sum');
    expect(result).toEqual({ ok: false, error: "Criterion 'c1' has a non-positive maxValue." });
  });

  it('rejects a value below zero', () => {
    const result = computeRubricAggregate([human('c1', -1, 5)], 'v1.sum');
    expect(result).toEqual({ ok: false, error: "Criterion 'c1' value is out of range." });
  });

  it('rejects a value above its maximum', () => {
    const result = computeRubricAggregate([human('c1', 6, 5)], 'v1.sum');
    expect(result).toEqual({ ok: false, error: "Criterion 'c1' value is out of range." });
  });

  it('computes a deterministic v1.sum aggregate', () => {
    const scores = [human('c1', 3, 5), human('c2', 4, 5)];
    const result = computeRubricAggregate(scores, 'v1.sum');
    expect(result).toEqual({
      ok: true,
      formulaVersion: 'v1.sum',
      total: 7,
      max: 10,
      normalized: 0.7,
    });
    // Determinism: identical input yields identical output.
    expect(computeRubricAggregate(scores, 'v1.sum')).toEqual(result);
  });

  it('computes a deterministic v1.weighted-mean aggregate', () => {
    const scores = [human('c1', 3, 6), human('c2', 5, 5)];
    const result = computeRubricAggregate(scores, 'v1.weighted-mean');
    expect(result).toEqual({
      ok: true,
      formulaVersion: 'v1.weighted-mean',
      total: 1.5,
      max: 2,
      normalized: 0.75,
    });
  });
});
