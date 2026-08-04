// Generates a runtime manifest of OpenAPI operations from the immutable v2.0 baseline.
// Types are generated separately by openapi-typescript; this adds a runtime-enumerable list
// (operationId + method + path) used for route wiring, coverage and drift detection.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse } from 'yaml';

const here = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.resolve(
  here,
  '../../../docs/source-of-truth/originals/cpf_openapi_baseline_v2.0.yaml',
);
const outDir = path.resolve(here, '../src/generated');

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'options', 'head', 'trace'];

interface RawOperation {
  operationId?: unknown;
}
type RawPathItem = Record<string, RawOperation | undefined>;

const spec = parse(readFileSync(specPath, 'utf8')) as { paths?: Record<string, RawPathItem> };

const rows: { operationId: string; method: string; path: string }[] = [];
for (const [routePath, item] of Object.entries(spec.paths ?? {})) {
  for (const method of HTTP_METHODS) {
    const op = item[method];
    if (op && typeof op === 'object' && typeof op.operationId === 'string') {
      rows.push({ operationId: op.operationId, method: method.toUpperCase(), path: routePath });
    }
  }
}
rows.sort((a, b) => a.operationId.localeCompare(b.operationId));

const body = rows
  .map(
    (r) =>
      `  { operationId: ${JSON.stringify(r.operationId)}, method: ${JSON.stringify(r.method)}, path: ${JSON.stringify(r.path)} },`,
  )
  .join('\n');

const content = `// AUTO-GENERATED from cpf_openapi_baseline_v2.0.yaml. Do not edit by hand.
// Regenerate with: pnpm --filter @cpf/contracts run generate

export interface OperationRef {
  readonly operationId: string;
  readonly method: string;
  readonly path: string;
}

export const OPERATIONS: readonly OperationRef[] = [
${body}
];
`;

mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, 'operation-manifest.ts'), content);
process.stdout.write(`operation-manifest.ts written with ${rows.length} operations.\n`);
