/**
 * Invariant (Contract §3.3): A qualified human reviewer creates rubric scores from evidence.
 * Any aggregate is deterministic and derived only from submitted human-entered rubric values
 * under a versioned formula. No AI-sourced value may ever enter an aggregate.
 */

export type ScoreSource = 'human' | 'ai';

export interface CriterionScore {
  readonly criterionId: string;
  readonly value: number;
  readonly maxValue: number;
  /** Provenance of the value. Only `'human'` is permitted in an aggregate. */
  readonly source: ScoreSource;
}

export type AggregateFormulaVersion = 'v1.sum' | 'v1.weighted-mean';

export type AggregateResult =
  | {
      readonly ok: true;
      readonly formulaVersion: AggregateFormulaVersion;
      readonly total: number;
      readonly max: number;
      /** Normalized to [0, 1]; deterministic for a given input and formula version. */
      readonly normalized: number;
    }
  | { readonly ok: false; readonly error: string };

/**
 * Deterministically aggregates human-entered rubric criterion scores under a named formula.
 * Rejects empty input, any non-human source, and out-of-range/non-finite values.
 */
export function computeRubricAggregate(
  scores: readonly CriterionScore[],
  formulaVersion: AggregateFormulaVersion,
): AggregateResult {
  if (scores.length === 0) {
    return { ok: false, error: 'No submitted human scores to aggregate.' };
  }

  const nonHuman = scores.find((s) => s.source !== 'human');
  if (nonHuman !== undefined) {
    return {
      ok: false,
      error: `Non-human score source '${nonHuman.source}' is forbidden in aggregation.`,
    };
  }

  for (const s of scores) {
    if (!Number.isFinite(s.value) || !Number.isFinite(s.maxValue)) {
      return { ok: false, error: `Criterion '${s.criterionId}' has a non-finite value.` };
    }
    if (s.maxValue <= 0) {
      return { ok: false, error: `Criterion '${s.criterionId}' has a non-positive maxValue.` };
    }
    if (s.value < 0 || s.value > s.maxValue) {
      return { ok: false, error: `Criterion '${s.criterionId}' value is out of range.` };
    }
  }

  switch (formulaVersion) {
    case 'v1.sum': {
      const total = scores.reduce((acc, s) => acc + s.value, 0);
      const max = scores.reduce((acc, s) => acc + s.maxValue, 0);
      return { ok: true, formulaVersion, total, max, normalized: total / max };
    }
    case 'v1.weighted-mean': {
      const normalizedSum = scores.reduce((acc, s) => acc + s.value / s.maxValue, 0);
      return {
        ok: true,
        formulaVersion,
        total: normalizedSum,
        max: scores.length,
        normalized: normalizedSum / scores.length,
      };
    }
  }
}
