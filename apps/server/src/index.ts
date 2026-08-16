import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { ensureCorrelationId, CORRELATION_HEADER } from '@cpf/http';
import type { HttpResponse } from '@cpf/http';
import { OPERATIONS } from '@cpf/contracts';
import { createPool, isDatabaseConfigured } from '@cpf/db';
import { Router } from './router.js';
import { ConcreteDispatcher, isConcreteOperation } from './concrete-dispatch.js';
import { authorizeDemoOperation, DemoSessionResolver } from './demo-session.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';

const router = new Router();
const demoMode = process.env.CPF_DEMO_MODE === 'true';
const pool = demoMode && isDatabaseConfigured() ? createPool() : null;
const concreteDispatcher =
  pool === null
    ? null
    : new ConcreteDispatcher(pool, {
        role: process.env.CPF_DB_ROLE ?? 'cpf_app',
        importDataKey: process.env.CPF_DEMO_DATA_KEY ?? 'cpf-synthetic-demo-import-key-v1',
      });
const sessionResolver = pool === null ? null : new DemoSessionResolver(pool);
const allowedOrigin = process.env.CPF_ALLOWED_ORIGIN ?? 'http://127.0.0.1:4300';

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(
          parsed !== null && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {},
        );
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

function send(res: ServerResponse, status: number, correlationId: string, body: unknown): void {
  const payload = status === 204 ? '' : JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': status >= 400 ? 'application/problem+json' : 'application/json',
    [CORRELATION_HEADER]: correlationId,
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type, X-Correlation-Id, Idempotency-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  });
  res.end(payload);
}

function sendHttpResponse(res: ServerResponse, response: HttpResponse): void {
  const payload = response.status === 204 ? '' : JSON.stringify(response.body, null, 2);
  res.writeHead(response.status, {
    ...response.headers,
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers':
      'Authorization, Content-Type, X-Correlation-Id, Idempotency-Key',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  });
  res.end(payload);
}

const server = createServer((req, res) => {
  void handle(req, res);
});

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? HOST}`);
  const pathname = url.pathname;
  const correlationId = ensureCorrelationId(
    typeof req.headers['x-correlation-id'] === 'string'
      ? req.headers['x-correlation-id']
      : undefined,
  );

  if (method === 'OPTIONS') return send(res, 204, correlationId, '');

  // Meta endpoints (not part of the API contract).
  if (method === 'GET' && (pathname === '/health' || pathname === '/healthz')) {
    return send(res, 200, correlationId, { status: 'ok', operations: OPERATIONS.length });
  }
  if (method === 'GET' && pathname === '/') {
    return send(res, 200, correlationId, {
      name: 'CPF service',
      operations: OPERATIONS.length,
      concretePersistence: concreteDispatcher === null ? 'disabled' : 'postgresql-demo',
      note: 'Contract operations use authenticated PostgreSQL-backed handlers. Persistence fails closed when the controlled runtime is not configured.',
      routes: '/__routes',
      health: '/health',
    });
  }
  if (method === 'GET' && pathname === '/__routes') {
    return send(
      res,
      200,
      correlationId,
      OPERATIONS.map((o) => ({ operationId: o.operationId, method: o.method, path: o.path })),
    );
  }

  const matched = router.match(method, pathname);
  if (matched === null) {
    const status = router.pathExists(pathname) ? 405 : 404;
    return send(res, status, correlationId, {
      type: 'about:blank',
      title: status === 405 ? 'Method Not Allowed' : 'Not Found',
      status,
      correlationId,
      detail: `No operation matches ${method} ${pathname}`,
    });
  }

  const { route, params } = matched;
  if (isConcreteOperation(route.op.operationId)) {
    if (concreteDispatcher === null || sessionResolver === null) {
      return send(res, 503, correlationId, {
        type: 'about:blank',
        title: 'Concrete persistence disabled',
        status: 503,
        correlationId,
        detail: 'Set CPF_DEMO_MODE=true with DATABASE_URL for the isolated synthetic demo service.',
      });
    }
    try {
      const session = await sessionResolver.resolve(req.headers.authorization);
      if (session === null) {
        return send(res, 401, correlationId, {
          type: 'about:blank',
          title: 'Unauthorized',
          status: 401,
          correlationId,
          detail: 'A valid active demo session is required.',
        });
      }
      if (!authorizeDemoOperation(session, route.op.operationId, params)) {
        return send(res, 403, correlationId, {
          type: 'about:blank',
          title: 'Forbidden',
          status: 403,
          correlationId,
          detail: 'This session cannot access the requested demo resource.',
        });
      }
      const body = await readBody(req);
      const response = await concreteDispatcher.dispatch(
        route.op.operationId,
        session.actor,
        params,
        body,
        Object.fromEntries(url.searchParams.entries()),
        typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : '',
      );
      if (response !== null) return sendHttpResponse(res, response);
      return send(res, 501, correlationId, {
        type: 'about:blank',
        title: 'Operation not implemented',
        status: 501,
        correlationId,
        detail: `The concrete dispatcher did not handle ${route.op.operationId}.`,
      });
    } catch (error) {
      process.stderr.write(
        `Concrete operation ${route.op.operationId} failed: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      return send(res, 500, correlationId, {
        type: 'about:blank',
        title: 'Internal Server Error',
        status: 500,
        correlationId,
      });
    }
  }
  return send(res, 501, correlationId, {
    type: 'about:blank',
    title: 'Operation not implemented',
    status: 501,
    correlationId,
    detail: `No concrete implementation exists for ${route.op.operationId}.`,
  });
}

server.listen(PORT, HOST, () => {
  process.stdout.write(
    `CPF demo server listening on http://${HOST}:${PORT} (${OPERATIONS.length} operations)\n` +
      `  health:  http://${HOST}:${PORT}/health\n` +
      `  routes:  http://${HOST}:${PORT}/__routes\n`,
  );
});
