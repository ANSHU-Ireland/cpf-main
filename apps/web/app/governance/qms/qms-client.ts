import { ApiError } from '../../lib/api-client';
import type { Collection } from '../../lib/types';
import type { QmsCreateInput, QmsDocument } from './qms-contract';

async function request<T>(body?: QmsCreateInput): Promise<T> {
  let response: Response;
  try {
    response = await fetch('/api/governance/qms', {
      method: body ? 'POST' : 'GET',
      cache: 'no-store',
      ...(body
        ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
        : {}),
    });
  } catch {
    throw new ApiError(0, 'Network unavailable. Your entries have been kept.');
  }
  if (!response.ok) {
    let message =
      response.status === 409
        ? 'That document code and version already exist. Choose a new version number.'
        : `The QMS request failed (${response.status}).`;
    if (response.status !== 409) {
      try {
        const problem = (await response.json()) as { detail?: string; title?: string };
        message = problem.detail ?? problem.title ?? message;
      } catch {
        /* retain the status message */
      }
    }
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

export const qmsClient = {
  list: () => request<Collection<QmsDocument>>(),
  create: (input: QmsCreateInput) => request<QmsDocument>(input),
};
