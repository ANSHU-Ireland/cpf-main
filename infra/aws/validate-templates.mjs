import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parseDocument } from 'yaml';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const templateName of ['bootstrap.yaml', 'application.yaml']) {
  const source = await readFile(path.join(here, templateName), 'utf8');
  const document = parseDocument(source, { prettyErrors: true });
  if (document.errors.length > 0) {
    throw new Error(
      `${templateName}:\n${document.errors.map((error) => error.message).join('\n')}`,
    );
  }
  process.stdout.write(`${templateName}: YAML parsed\n`);
}
