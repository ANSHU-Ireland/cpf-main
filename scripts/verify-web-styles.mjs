import assert from 'node:assert/strict';
import process from 'node:process';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, URL } from 'node:url';
import postcssConfig from '../apps/web/postcss.config.mjs';

// Run from the monorepo root, as deployment/CI do: relative Tailwind configuration once yielded
// an apparently successful build with no grid, spacing, or input-border utility styles.
const requireWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
const postcss = requireWeb('postcss');
const tailwind = requireWeb('tailwindcss');
const built = process.argv.includes('--built');
let result;
if (built) {
  const directory = fileURLToPath(new URL('../apps/web/.next/static/css/', import.meta.url));
  const files = (await readdir(directory)).filter((file) => file.endsWith('.css'));
  assert.ok(files.length > 0, 'No production stylesheets were emitted.');
  const css = (
    await Promise.all(files.map((file) => readFile(path.join(directory, file), 'utf8')))
  ).join('\n');
  result = await postcss([]).process(css, { from: undefined });
} else {
  result = await postcss([tailwind(postcssConfig.plugins.tailwindcss)]).process(
    '@tailwind utilities;',
    { from: fileURLToPath(new URL('../apps/web/app/globals.css', import.meta.url)) },
  );
}
const selectors = new Set();
result.root.walkRules((rule) => selectors.add(rule.selector));
for (const selector of ['.grid', '.border-line', '.w-full', '.rounded-md', '.md\\:grid-cols-2']) {
  assert.ok(selectors.has(selector), `Missing required web style: ${selector}`);
}
process.stdout.write(
  `${built ? 'Production CSS' : 'Generated CSS'}: layout, input borders and responsive utility styles are present.\n`,
);
