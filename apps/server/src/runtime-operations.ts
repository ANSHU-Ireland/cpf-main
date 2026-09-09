import { OPERATIONS, type OperationRef } from '@cpf/contracts';

/** Reviewed additive routes; the generated 244-operation source baseline stays immutable. */
export const ADDITIVE_OPERATIONS: readonly OperationRef[] = [
  {
    operationId: 'get_applications_applicationId_decision_context',
    method: 'GET',
    path: '/applications/{applicationId}/decision-context',
  },
];

export const RUNTIME_OPERATIONS: readonly OperationRef[] = [...OPERATIONS, ...ADDITIVE_OPERATIONS];
