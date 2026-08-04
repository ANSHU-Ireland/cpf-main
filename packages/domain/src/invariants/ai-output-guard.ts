/**
 * Invariant (Contract §3.2): AI must never create, predict, populate, preselect, store or
 * display a candidate numeric score, ordinal rank, performance band, integrity/cheating
 * verdict, progression recommendation, rejection recommendation or hiring decision.
 *
 * This guard is a deterministic, defence-in-depth check applied to any structured payload
 * emitted by, or derived from, an AI/model/tool provider before it is persisted or shown.
 * It inspects object keys recursively and reports every forbidden field.
 */

export interface AiOutputViolation {
  /** JSON-path-like location of the offending key. */
  readonly path: string;
  /** Why this key is prohibited. */
  readonly reason: string;
  /** The key that matched a forbidden pattern. */
  readonly matchedKey: string;
}

export type GuardResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly violations: readonly AiOutputViolation[] };

interface ForbiddenPattern {
  readonly pattern: RegExp;
  readonly reason: string;
}

const FORBIDDEN_KEY_PATTERNS: readonly ForbiddenPattern[] = [
  { pattern: /score/i, reason: 'AI must not produce a candidate score' },
  { pattern: /rank|percentile/i, reason: 'AI must not produce an ordinal rank or percentile' },
  {
    pattern: /performanceband|(?:^|_)band(?:$|_)|tier/i,
    reason: 'AI must not produce a performance band',
  },
  {
    pattern: /verdict|cheat|misconduct|integritydecision/i,
    reason: 'AI must not produce an integrity/cheating verdict',
  },
  {
    pattern: /recommend/i,
    reason: 'AI must not produce a progression or rejection recommendation',
  },
  {
    pattern: /hiringdecision|hiredecision|rejectdecision|shortlist|progressiondecision/i,
    reason: 'AI must not produce a hiring or progression decision',
  },
  { pattern: /passfail|pass_fail/i, reason: 'AI must not produce a pass/fail determination' },
];

function matchForbiddenKey(key: string): ForbiddenPattern | undefined {
  const normalized = key.replace(/[\s-]/g, '');
  for (const candidate of FORBIDDEN_KEY_PATTERNS) {
    if (candidate.pattern.test(normalized)) {
      return candidate;
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Recursively collect every forbidden AI-output key found in `value`. */
export function findForbiddenAiOutputs(value: unknown, basePath = '$'): AiOutputViolation[] {
  const violations: AiOutputViolation[] = [];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      violations.push(...findForbiddenAiOutputs(item, `${basePath}[${index}]`));
    });
    return violations;
  }

  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${basePath}.${key}`;
      const match = matchForbiddenKey(key);
      if (match) {
        violations.push({ path: childPath, reason: match.reason, matchedKey: key });
      }
      violations.push(...findForbiddenAiOutputs(child, childPath));
    }
  }

  return violations;
}

/**
 * Returns a successful result only if `payload` contains no prohibited AI-output fields.
 * Callers must treat a failed result as a hard stop: the AI output is discarded, never shown.
 */
export function assertAiObservationSafe<T>(payload: T): GuardResult<T> {
  const violations = findForbiddenAiOutputs(payload);
  if (violations.length > 0) {
    return { ok: false, violations };
  }
  return { ok: true, value: payload };
}
