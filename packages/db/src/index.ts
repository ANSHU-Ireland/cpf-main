export * from './client.js';
export * from './apply-baseline.js';
export * from './tenant-context.js';

/** Application schemas defined by the v2.0 baseline. */
export const APP_SCHEMAS = [
  'tenant',
  'iam',
  'assessment',
  'hiring',
  'runtime',
  'evidence',
  'review',
  'governance',
  'integration',
  'audit',
  'support',
] as const;
