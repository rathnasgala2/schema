import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { walkImportGraph } from '../scripts/check-browser-safety.mjs';

/**
 * Run `walkImportGraph` against one synthetic entry module written to a
 * fresh temporary directory, and return its diagnostics.
 *
 * @param {string} source entry module source text
 * @returns {Promise<string[]>} diagnostics for the synthetic entry point
 */
async function diagnosticsFor(source) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'browser-safety-gate-'));
  try {
    const entry = 'entry.js';
    await writeFile(path.join(root, entry), source, 'utf8');
    const { diagnostics } = await walkImportGraph(root, entry);
    return diagnostics;
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('a browser-safe module reports zero diagnostics', async () => {
  assert.deepEqual(await diagnosticsFor('export const value = 1 + 1;\n'), []);
});

test('a bare "node:"-prefixed builtin import is reachable (SCH-H3)', async () => {
  assert.deepEqual(
    await diagnosticsFor("import { createHash } from 'node:crypto';\n"),
    ['entry.js: imports Node builtin "node:crypto"'],
  );
});

test('a bare unprefixed builtin import is reachable (SCH-H3)', async () => {
  assert.deepEqual(await diagnosticsFor("import path from 'path';\n"), [
    'entry.js: imports Node builtin "path"',
  ]);
});

test('an import path mentioned only inside a comment is not walked as a real edge (SCH-L3)', async () => {
  assert.deepEqual(
    await diagnosticsFor(
      "// import { createHash } from 'node:crypto';\nexport const value = 1;\n",
    ),
    [],
  );
});

test('eval() is detected (SCH-H4)', async () => {
  assert.deepEqual(
    await diagnosticsFor('export const run = () => eval("1");\n'),
    [
      "entry.js: calls eval(), Function(), or new Function(), which requires 'unsafe-eval' in a browser CSP",
    ],
  );
});

test('new Function(...) is detected (SCH-H4)', async () => {
  assert.deepEqual(
    await diagnosticsFor('export const run = new Function("a", "return a");\n'),
    [
      "entry.js: calls eval(), Function(), or new Function(), which requires 'unsafe-eval' in a browser CSP",
    ],
  );
});

test('a bare Function(...) call is detected but a same-named method call is not (SCH-H4)', async () => {
  assert.deepEqual(
    await diagnosticsFor('export const run = Function("return 1");\n'),
    [
      "entry.js: calls eval(), Function(), or new Function(), which requires 'unsafe-eval' in a browser CSP",
    ],
  );
  assert.deepEqual(
    await diagnosticsFor('function myFunction() {}\nmyFunction();\n'),
    [],
  );
});

test('a dynamic import() with a non-literal specifier is detected (SCH-H4)', async () => {
  assert.deepEqual(
    await diagnosticsFor('export const load = (name) => import(name);\n'),
    ['entry.js: dynamic import() with a non-literal specifier'],
  );
});

test('a dynamic import() with a string literal specifier is not flagged', async () => {
  assert.deepEqual(
    await diagnosticsFor("export const load = () => import('node:crypto');\n"),
    [],
  );
});

test('eval mentioned only inside a string literal is not a call and is not detected', async () => {
  assert.deepEqual(
    await diagnosticsFor(
      'export const message = "call eval(x) to run code";\n',
    ),
    [],
  );
});
