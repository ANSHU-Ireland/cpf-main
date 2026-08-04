import { describe, it, expect } from 'vitest';
import { OPERATIONS, OPERATION_IDS } from './index.js';

describe('OpenAPI operation manifest', () => {
  it('contains exactly 244 operations (matches the v2.0 baseline)', () => {
    expect(OPERATIONS.length).toBe(244);
  });

  it('has unique operationIds', () => {
    expect(new Set(OPERATION_IDS).size).toBe(OPERATION_IDS.length);
  });

  it('every operation has a valid HTTP method and a rooted path', () => {
    for (const op of OPERATIONS) {
      expect(op.method).toMatch(/^(GET|PUT|POST|DELETE|PATCH|OPTIONS|HEAD|TRACE)$/);
      expect(op.path.startsWith('/')).toBe(true);
    }
  });
});
