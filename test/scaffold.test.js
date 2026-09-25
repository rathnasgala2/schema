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

test('the runtime exposes only the accepted validation surface', () => {
  assert.deepEqual(Object.keys(runtime), [
    'GALA_SCHEMA_IDS',
    'validateGalaDocument',
  ]);
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
  assert.ok(packageDefinition.files.includes('schemas/'));
  assert.ok(
    packageDefinition.files.includes('diagnostics/diagnostic-map.json'),
  );
  assert.ok(
    packageDefinition.files.includes(
      'diagnostics/diagnostic-map.public-runtime-origins.json',
    ),
  );
  // LOCAL-35 section 0.1 (i): `api` reads the reviewed internal-event catalog
  // source from the published tarball, so it must be shipped, not only its
  // generated projection.
  assert.ok(
    packageDefinition.files.includes(
      'catalog-sources/internal-event-actions.json',
    ),
  );
  assert.deepEqual(packageDefinition.dependencies, {
    ajv: '8.20.0',
    'ajv-formats': '3.0.1',
  });
  assert.equal(packageDefinition.devDependencies.yaml, '2.9.0');
  assert.deepEqual(packageDefinition.exports, {
    '.': {
      types: './types/index.d.ts',
      import: './src/index.js',
    },
    // SCHEMA-2.6.0: the narrow browser entry point, which carries only the
    // public runtime-origins validator (APP-TAILWIND-SHADCN-2a follow-up (1)).
    './runtime-origins': {
      types: './types/runtime-origins.d.ts',
      import: './src/runtime-origins.js',
    },
    // SCHEMA-2.8.1: the read-only digest-profile surface, so a consumer computes
    // contract digests through the profile instead of re-deriving the preimage
    // (PUBLISH-S4-4b).
    './digest-profiles': {
      types: './types/digest-profiles.d.ts',
      import: './src/digest-profiles.js',
    },
    // SCHEMA-2.9.1: the Node-only frozen-envelope validator, so publish stops
    // importing `src/internal/frozen-envelope.js` by file path.
    './frozen-envelope': {
      types: './types/frozen-envelope.d.ts',
      import: './src/frozen-envelope.js',
    },
    './schemas/adapter-capability.schema.json':
      './schemas/adapter-capability.schema.json',
    './schemas/appearance.schema.json': './schemas/appearance.schema.json',
    './schemas/artifact-manifest.schema.json':
      './schemas/artifact-manifest.schema.json',
    './schemas/author.schema.json': './schemas/author.schema.json',
    './schemas/build-input.schema.json': './schemas/build-input.schema.json',
    // SCHEMA-2.10.0 (LOCAL-62 follow-up): buildProvenance's own root, urn
    // namespace urn:gala:metadata:build-provenance:2.0.0 per DEC-097, added
    // alongside (not instead of) its existing internal nesting inside
    // artifact-manifest.schema.json's #/$defs/buildProvenance.
    './schemas/build-provenance.schema.json':
      './schemas/build-provenance.schema.json',
    './schemas/content-frontmatter.schema.json':
      './schemas/content-frontmatter.schema.json',
    './schemas/deployment-intent.schema.json':
      './schemas/deployment-intent.schema.json',
    './schemas/deployment-observation.schema.json':
      './schemas/deployment-observation.schema.json',
    './schemas/deployment-receipt.schema.json':
      './schemas/deployment-receipt.schema.json',
    './schemas/event-envelope.schema.json':
      './schemas/event-envelope.schema.json',
    './schemas/lock.schema.json': './schemas/lock.schema.json',
    './schemas/navigation.schema.json': './schemas/navigation.schema.json',
    './schemas/problem.schema.json': './schemas/problem.schema.json',
    './schemas/public-generation-marker.schema.json':
      './schemas/public-generation-marker.schema.json',
    './schemas/public-runtime-origins.schema.json':
      './schemas/public-runtime-origins.schema.json',
    './schemas/publication.schema.json': './schemas/publication.schema.json',
    './schemas/repository.schema.json': './schemas/repository.schema.json',
    './schemas/template-composition.schema.json':
      './schemas/template-composition.schema.json',
    './schemas/theme-contract.schema.json':
      './schemas/theme-contract.schema.json',
    './generated/typescript': {
      types: './generated/typescript/index.d.ts',
      import: './generated/typescript/index.js',
    },
    // SCHEMA-2.9.0: the DEC-097 record golden vectors the API's Java digest
    // implementation reproduces (LOCAL-60, packet API-INTENT-DERIVATION-1).
    './parity/digest-record-vectors.json':
      './parity/digest-record-vectors.json',
    './catalog-sources/internal-event-actions.json':
      './catalog-sources/internal-event-actions.json',
    './docs/catalogs/app-components.json':
      './docs/catalogs/app-components.json',
    './docs/catalogs/app-routes.json': './docs/catalogs/app-routes.json',
    './docs/catalogs/internal-event-actions.json':
      './docs/catalogs/internal-event-actions.json',
    './docs/catalogs/schema-inventory.json':
      './docs/catalogs/schema-inventory.json',
    './openapi/openapi.yaml': './openapi/openapi.yaml',
    './openapi/http-catalog.json': './openapi/http-catalog.json',
    './package.json': './package.json',
  });
});

test('declaration output exposes the accepted validation surface', async () => {
  const declaration = await readFile('types/index.d.ts', 'utf8');
  assert.match(declaration, /GALA_SCHEMA_IDS/u);
  assert.match(declaration, /validateGalaDocument/u);
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
