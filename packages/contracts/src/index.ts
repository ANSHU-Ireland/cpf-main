export type { paths, components, operations } from './generated/openapi.js';
export { OPERATIONS, type OperationRef } from './generated/operation-manifest.js';

import { OPERATIONS } from './generated/operation-manifest.js';

/** All operationIds from the OpenAPI baseline, in stable sorted order. */
export const OPERATION_IDS: readonly string[] = OPERATIONS.map((o) => o.operationId);
