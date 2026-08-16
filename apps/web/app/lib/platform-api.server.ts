import { randomUUID } from 'node:crypto';

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3300';
const DEFAULT_TIMEOUT_MS = 5_000;
const MAX_TIMEOUT_MS = 30_000;
const CORRELATION_HEADER = 'x-correlation-id';

export interface PlatformCallInput {
  readonly request: Request;
  readonly path: string;
  readonly method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly body?: unknown;
  readonly idempotencyKey?: string;
}

export interface PlatformResult<T> {
  readonly data: T;
  readonly status: number;
  readonly correlationId: string;
}

export class PlatformApiError extends Error {
  constructor(
    readonly status: number,
    readonly correlationId: string,
    readonly detail: string,
  ) {
    super(detail);
    this.name = 'PlatformApiError';
  }

  toResponse(): Response {
    return Response.json(
      {
        type: 'about:blank',
        title: statusTitle(this.status),
        status: this.status,
        correlationId: this.correlationId,
        detail: this.detail,
      },
      {
        status: this.status,
        headers: {
          'content-type': 'application/problem+json',
          [CORRELATION_HEADER]: this.correlationId,
        },
      },
    );
  }
}

function statusTitle(status: number): string {
  switch (status) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Unprocessable Content';
    case 429:
      return 'Too Many Requests';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    case 504:
      return 'Gateway Timeout';
    default:
      return status >= 500 ? 'Platform Service Error' : 'Request Failed';
  }
}

function correlationId(request: Request): string {
  return request.headers.get(CORRELATION_HEADER)?.trim() || randomUUID();
}

function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (cookieHeader === null) return null;
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    const value = part.slice(separator + 1).trim();
    if (value === '') return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  return null;
}

function bearerCredential(request: Request): string | null {
  const inbound = request.headers.get('authorization')?.trim();
  if (inbound?.toLowerCase().startsWith('bearer ') === true && inbound.slice(7).trim() !== '') {
    return inbound;
  }
  const cookieName = process.env.CPF_SESSION_COOKIE_NAME?.trim() || 'cpf_session';
  const token = cookieValue(request.headers.get('cookie'), cookieName);
  return token === null ? null : `Bearer ${token}`;
}

function timeoutMs(): number {
  const configured = Number(process.env.CPF_API_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(configured)) return DEFAULT_TIMEOUT_MS;
  return Math.max(250, Math.min(MAX_TIMEOUT_MS, Math.trunc(configured)));
}

function platformUrl(path: string): URL {
  const base = process.env.CPF_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;
  const url = new URL(path, base.endsWith('/') ? base : `${base}/`);
  const allowed = new URL(base);
  if (url.origin !== allowed.origin) throw new Error('Platform API path must remain same-origin');
  return url;
}

async function errorDetail(response: Response): Promise<string> {
  try {
    const problem = (await response.json()) as {
      readonly detail?: unknown;
      readonly title?: unknown;
    };
    if (typeof problem.detail === 'string' && problem.detail.trim() !== '') return problem.detail;
    if (typeof problem.title === 'string' && problem.title.trim() !== '') return problem.title;
  } catch {
    // A non-JSON upstream error is replaced with a content-free status message.
  }
  return `Platform request failed with status ${String(response.status)}.`;
}

export async function callPlatform<T>(input: PlatformCallInput): Promise<PlatformResult<T>> {
  const traceId = correlationId(input.request);
  const authorization = bearerCredential(input.request);
  if (authorization === null) {
    throw new PlatformApiError(401, traceId, 'An authenticated session is required.');
  }

  const headers = new Headers({
    authorization,
    [CORRELATION_HEADER]: traceId,
  });
  if (input.body !== undefined) headers.set('content-type', 'application/json');
  const idempotencyKey = input.idempotencyKey ?? input.request.headers.get('idempotency-key');
  if (idempotencyKey?.trim()) headers.set('idempotency-key', idempotencyKey.trim());

  let response: Response;
  try {
    response = await fetch(platformUrl(input.path), {
      method: input.method ?? input.request.method,
      headers,
      ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs()),
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError';
    throw new PlatformApiError(
      timedOut ? 504 : 503,
      traceId,
      timedOut ? 'The platform service timed out.' : 'The platform service is unavailable.',
    );
  }

  const upstreamTrace = response.headers.get(CORRELATION_HEADER)?.trim() || traceId;
  if (!response.ok) {
    throw new PlatformApiError(response.status, upstreamTrace, await errorDetail(response));
  }
  const data = response.status === 204 ? (null as T) : ((await response.json()) as T);
  return { data, status: response.status, correlationId: upstreamTrace };
}

export async function forwardPlatform(input: PlatformCallInput): Promise<Response> {
  try {
    const result = await callPlatform<unknown>(input);
    if (result.status === 204) {
      return new Response(null, {
        status: 204,
        headers: { [CORRELATION_HEADER]: result.correlationId },
      });
    }
    return Response.json(result.data, {
      status: result.status,
      headers: { [CORRELATION_HEADER]: result.correlationId },
    });
  } catch (error) {
    if (error instanceof PlatformApiError) return error.toResponse();
    throw error;
  }
}
