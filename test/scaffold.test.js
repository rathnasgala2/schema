import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { ESLint } from 'eslint';

import { findDeclarationDrift } from '../scripts/check-declarations.mjs';
import { findUnpinnedActionReferences } from '../scripts/check-workflow-pins.mjs';
import { createLicenseInventory } from '../scripts/generate-license-inventory.mjs';
import * as runtime from '../src/index.js';

const lintEngine = new ESLint();

test('the scaffold exposes no provisional runtime contract', () => {
  assert.deepEqual(Object.keys(runtime), []);
});

test('package metadata pins the accepted runtime and package manager', async () => {
  const packageDefinition = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(packageDefinition.type, 'module');
  assert.deepEqual(packageDefinition.engines, {
    node: '24.18.0',
    npm: '11.16.0',
  });
  assert.equal(packageDefinition.packageManager, 'npm@11.16.0');
  assert.equal(packageDefinition.bin, undefined);
});

test('declaration output matches the intentionally empty runtime surface', async () => {
  assert.equal(await readFile('types/index.d.ts', 'utf8'), 'export {};\n');
});

test('declaration drift reports stale committed output', async () => {
  const temporaryDirectory = await mkdtemp(
    path.join(tmpdir(), 'gala-schema-declaration-test-'),
  );
  try {
    const committed = path.join(temporaryDirectory, 'committed');
    const emitted = path.join(temporaryDirectory, 'emitted');
    await Promise.all([mkdir(committed), mkdir(emitted)]);
    await Promise.all([
      writeFile(path.join(committed, 'index.d.ts'), 'export stale;\n', 'utf8'),
      writeFile(path.join(emitted, 'index.d.ts'), 'export fresh;\n', 'utf8'),
    ]);

    assert.deepEqual(await findDeclarationDrift(committed, emitted), [
      'stale committed declaration: index.d.ts',
    ]);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
});

test('lint rejects exported functions without JSDoc', async () => {
  const [result] = await lintEngine.lintText(
    'export function undocumented(value) { return value; }',
    { filePath: path.resolve('src/index.js') },
  );

  assert.ok(result);
  assert.ok(
    result.messages.some((message) => message.ruleId === 'jsdoc/require-jsdoc'),
  );
});

test('lint rejects exported JSDoc with missing parameter and return types', async () => {
  const source = `
/**
 * Return a value.
 * @param value input value
 * @returns output value
 */
export function missingTypes(value) { return value; }
`;
  const [result] = await lintEngine.lintText(source, {
    filePath: path.resolve('src/index.js'),
  });

  assert.ok(result);
  assert.ok(
    result.messages.some(
      (message) => message.ruleId === 'jsdoc/require-param-type',
    ),
  );
  assert.ok(
    result.messages.some(
      (message) => message.ruleId === 'jsdoc/require-returns-type',
    ),
  );
});

test('workflow pin validation rejects tags and accepts full SHAs', () => {
  const pinned =
    '    - uses: actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803';
  const floating = '    - uses: actions/checkout@v6';
  assert.deepEqual(findUnpinnedActionReferences(pinned, 'ci.yml'), []);
  assert.deepEqual(findUnpinnedActionReferences(floating, 'ci.yml'), [
    'ci.yml: actions/checkout@v6 is not pinned to a full commit SHA',
  ]);
});

test('license inventory rejects a non-v3 lockfile', () => {
  assert.throws(
    () => createLicenseInventory('{"lockfileVersion":2,"packages":{}}'),
    /requires npm package-lock v3/u,
  );
});
