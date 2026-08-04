import { describe, it, expect } from 'vitest';
import {
  CORRELATION_HEADER,
  PROBLEM_CONTENT_TYPE,
  ensureCorrelationId,
  jsonResponse,
  problemResponse,
} from './index.js';

describe('ensureCorrelationId', () => {
  it('keeps a non-empty inbound id', () => {
    expect(ensureCorrelationId('abc-123')).toBe('abc-123');
  });

  it('generates one when absent or blank', () => {
    expect(ensureCorrelationId(undefined)).toMatch(/^[0-9a-f-]{36}$/);
    expect(ensureCorrelationId('  ')).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('jsonResponse', () => {
  it('echoes the correlation id in the header', () => {
    const res = jsonResponse(200, { ok: true }, 'cid-1');
    expect(res.status).toBe(200);
    expect(res.headers[CORRELATION_HEADER]).toBe('cid-1');
    expect(res.body).toEqual({ ok: true });
  });
});

describe('problemResponse', () => {
  it('produces problem+json with the correlation id in header and body', () => {
    const res = problemResponse({ status: 404, title: 'Not Found', correlationId: 'cid-2' });
    expect(res.status).toBe(404);
    expect(res.headers['Content-Type']).toBe(PROBLEM_CONTENT_TYPE);
    expect(res.headers[CORRELATION_HEADER]).toBe('cid-2');
    expect(res.body).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      correlationId: 'cid-2',
    });
  });

  it('includes optional detail when provided', () => {
    const res = problemResponse({
      status: 403,
      title: 'Forbidden',
      correlationId: 'cid-3',
      detail: 'no permission',
    });
    expect(res.body.detail).toBe('no permission');
  });
});
