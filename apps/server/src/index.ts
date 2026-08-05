import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { ensureCorrelationId, CORRELATION_HEADER } from '@cpf/http';
import { OPERATIONS } from '@cpf/contracts';
import { Store, type Record_ } from './store.js';
import { Router, classify } from './router.js';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '127.0.0.1';

const store = new Store();
const router = new Router();

/** Turns a collection key like 'campaigns/:id/reviewers' into a singular type label. */
function typeLabel(collectionKey: string): string {
  const literal = collectionKey.split('/').filter((s) => !s.startsWith(':'));
  const last = literal[literal.length - 1] ?? 'resource';
  return last.replace(/s$/, '');
}

function sampleRecord(collectionKey: string, i: number, id?: string): Record_ {
  const label = typeLabel(collectionKey);
  return {
    id: id ?? randomUUID(),
    type: label,
    name: `Sample ${label} ${i + 1}`,
    status: 'active',
    createdAt: new Date(Date.now() - i * 86_400_000).toISOString(),
  };
}

function readBody(req: IncomingMessage): Promise<Record_> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => {
      if (chunks.length === 0) return resolve({});
      try {
        const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(parsed !== null && typeof parsed === 'object' ? (parsed as Record_) : {});
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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
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
      name: 'CPF in-memory demo server',
      operations: OPERATIONS.length,
      note: 'All endpoints are backed by a generic in-memory store. Data does not persist across restarts.',
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
  const { kind, collectionKey, targetId } = classify(route, params);
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') ?? 20)));

  switch (kind) {
    case 'list': {
      const items = store.seed(collectionKey, 2, (i) => sampleRecord(collectionKey, i));
      return send(res, 200, correlationId, {
        items: items.slice(0, limit),
        total: items.length,
        limit,
      });
    }
    case 'item': {
      const id = targetId ?? '';
      const found = store.get(collectionKey, id) ?? sampleRecord(collectionKey, 0, id);
      return send(res, 200, correlationId, found);
    }
    case 'create': {
      const body = await readBody(req);
      const created = store.create(collectionKey, body);
      return send(res, 201, correlationId, created);
    }
    case 'update': {
      const body = await readBody(req);
      const id = targetId ?? '';
      const updated =
        store.update(collectionKey, id, body) ?? store.create(collectionKey, { ...body, id });
      return send(res, 200, correlationId, updated);
    }
    case 'delete': {
      store.remove(collectionKey, targetId ?? '');
      return send(res, 204, correlationId, '');
    }
    case 'action': {
      const body = await readBody(req);
      return send(res, 200, correlationId, {
        operationId: route.op.operationId,
        id: targetId,
        status: 'ok',
        appliedAt: new Date().toISOString(),
        input: body,
      });
    }
  }
}

server.listen(PORT, HOST, () => {
  process.stdout.write(
    `CPF demo server listening on http://${HOST}:${PORT} (${OPERATIONS.length} operations)\n` +
      `  health:  http://${HOST}:${PORT}/health\n` +
      `  routes:  http://${HOST}:${PORT}/__routes\n`,
  );
});
