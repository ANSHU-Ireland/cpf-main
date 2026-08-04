import { CORRELATION_HEADER } from './correlation.js';

export const JSON_CONTENT_TYPE = 'application/json';
export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

export interface HttpResponse<B = unknown> {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: B;
}

/** RFC 9457-style error body (OpenAPI `ProblemDetails`). */
export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly correlationId: string;
  readonly detail?: string;
  readonly errors?: readonly Record<string, unknown>[];
}

export interface ProblemInput {
  readonly status: number;
  readonly title: string;
  readonly correlationId: string;
  readonly type?: string;
  readonly detail?: string;
  readonly errors?: readonly Record<string, unknown>[];
}

/** Builds a ProblemDetails, omitting optional fields when absent (exactOptionalPropertyTypes). */
export function problemDetails(input: ProblemInput): ProblemDetails {
  return {
    type: input.type ?? 'about:blank',
    title: input.title,
    status: input.status,
    correlationId: input.correlationId,
    ...(input.detail !== undefined ? { detail: input.detail } : {}),
    ...(input.errors !== undefined ? { errors: input.errors } : {}),
  };
}

/** A successful JSON response with the correlation id echoed in the header. */
export function jsonResponse<B>(status: number, body: B, correlationId: string): HttpResponse<B> {
  return {
    status,
    headers: { 'Content-Type': JSON_CONTENT_TYPE, [CORRELATION_HEADER]: correlationId },
    body,
  };
}

/** A problem+json response; correlation id appears in both the header and the body. */
export function problemResponse(input: ProblemInput): HttpResponse<ProblemDetails> {
  const body = problemDetails(input);
  return {
    status: input.status,
    headers: { 'Content-Type': PROBLEM_CONTENT_TYPE, [CORRELATION_HEADER]: body.correlationId },
    body,
  };
}
