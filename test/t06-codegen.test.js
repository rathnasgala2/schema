import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import { parse as parseYaml } from 'yaml';

import {
  GENERATED_SCHEMA_IDS,
  validateGeneratedDocument,
} from '../generated/typescript/index.js';
import { GALA_SCHEMA_IDS } from '../src/index.js';

const CONTRACTS = [
  'adapter-capability',
  'analytics-config',
  'appearance',
  'artifact-manifest',
  'author',
  'build-input',
  'build-provenance',
  'content-frontmatter',
  'deployment-intent',
  'deployment-observation',
  'deployment-receipt',
  'event-envelope',
  'interactions-config',
  'lock',
  'navigation',
  'problem',
  'public-generation-marker',
  'public-runtime-origins',
  'publication',
  'repository',
  'template-composition',
  'theme-contract',
];

test('generated TypeScript root set equals the twenty-two schemas', async () => {
  // GALA_SCHEMA_IDS is sorted by the identity string itself, so
  // build-provenance's urn:gala:metadata:... namespace (SCHEMA-2.10.0) sorts
  // before every urn:gala:schema:... identity; GENERATED_SCHEMA_IDS instead
  // preserves CONTRACTS' kebab-case insertion order. Same twenty-two-member set,
  // deliberately different order -- compare as sets.
  assert.deepEqual(
    [...GENERATED_SCHEMA_IDS].sort(),
    [...GALA_SCHEMA_IDS].sort(),
  );
  assert.equal(GENERATED_SCHEMA_IDS.length, 22);

  const typescriptFiles = await readdir('generated/typescript/contracts');
  assert.deepEqual(
    typescriptFiles.sort(),
    CONTRACTS.map((contract) => `${contract}.d.ts`).sort(),
  );
});

/**
 * Build a contract's exact immutable schema identity.
 *
 * @param {string} contract kebab-case contract name
 * @returns {string} schema identity
 */
function schemaIdForContract(contract) {
  return contract === 'build-provenance'
    ? 'urn:gala:metadata:build-provenance:2.0.0'
    : `urn:gala:schema:${contract}:2.0.0`;
}

test('generated API covers every canonical root and mirrors structuralValid to valid (SCH-M5)', async () => {
  for (const contract of CONTRACTS) {
    const schemaId = schemaIdForContract(contract);
    const value = JSON.parse(
      await readFile(`examples/valid/${contract}/canonical.json`, 'utf8'),
    );
    assert.deepEqual(validateGeneratedDocument(schemaId, value), {
      valid: true,
      structuralValid: true,
      diagnostics: [],
    });
    // generateGeneratedDocument no longer runs a second, weaker standalone
    // structural core alongside the exact validator (SCH-M5); structuralValid
    // is derived from the exact result and must always agree with it,
    // including on rejection.
    const rejected = validateGeneratedDocument(schemaId, {
      ...value,
      generatedUnknownField: true,
    });
    assert.equal(rejected.valid, false, contract);
    assert.equal(rejected.structuralValid, false, contract);
    assert.ok(rejected.diagnostics.length > 0, contract);
  }
});

test('schema inventory is exactly twenty-two roots plus OpenAPI', async () => {
  const [inventory, designManifest] = /** @type {[
    {sourceDesignRevision: string, contracts: Array<Record<string, unknown>>},
    {digest: string}
  ]} */ (
    await Promise.all([
      readFile('docs/catalogs/schema-inventory.json', 'utf8').then(JSON.parse),
      readFile('codegen/design-manifest.json', 'utf8').then(JSON.parse),
    ])
  );
  assert.equal(inventory.sourceDesignRevision, designManifest.digest);
  assert.equal(inventory.contracts.length, 23);
  assert.deepEqual(
    inventory.contracts
      .filter(({ artifactKind }) => artifactKind === 'JSON_SCHEMA')
      .map(({ contract }) => contract),
    CONTRACTS,
  );
  const openApiSource = await readFile('openapi/openapi.yaml', 'utf8');
  assert.deepEqual(inventory.contracts.at(-1), {
    contract: 'openapi',
    artifactKind: 'OPENAPI',
    id: 'urn:gala:schema:openapi:2.0.0',
    version: '2.0.0',
    path: 'openapi/openapi.yaml',
    materialized: true,
    sourceDigest: `sha256:${createHash('sha256').update(openApiSource).digest('hex')}`,
    typescriptRootType: null,
  });
  assert.equal(JSON.stringify(inventory).includes('buildProvenance'), false);
});

test('package exports the generated API and machine catalogs explicitly', async () => {
  const packageDefinition = JSON.parse(await readFile('package.json', 'utf8'));
  assert.deepEqual(packageDefinition.exports['./generated/typescript'], {
    types: './generated/typescript/index.d.ts',
    import: './generated/typescript/index.js',
  });
  assert.equal(
    packageDefinition.exports['./docs/catalogs/schema-inventory.json'],
    './docs/catalogs/schema-inventory.json',
  );
  assert.equal(
    packageDefinition.exports['./generated/buildProvenance'],
    undefined,
  );
  assert.equal(
    packageDefinition.exports['./compatibility/compatibility.json'],
    undefined,
  );
  assert.ok(packageDefinition.files.includes('generated/'));
  assert.ok(
    !packageDefinition.files.includes('compatibility/compatibility.json'),
  );
});

test('release workflow validates the gate, refuses version reuse and publishes with provenance', async () => {
  // Reviewed 2026-10-12: generation 4 had turned the release into a
  // source-only artifact upload; the registry is the only supply chain the
  // consumers (api, app, template, publish) pin against, so the release must
  // publish, and only after the complete gate and the version-reuse refusal.
  const source = await readFile('.github/workflows/release.yaml', 'utf8');
  const workflow = /** @type {{
    on: {push: {branches: string[], paths: string[]}, workflow_dispatch: unknown},
    permissions: Record<string, string>,
    jobs: {publish: {
      environment: string,
      permissions: Record<string, string>,
      steps: Array<{name: string, run?: string, uses?: string, if?: string}>
    }}
  }} */ (parseYaml(source));
  assert.deepEqual(workflow.on.push.branches, ['main']);
  assert.ok(workflow.on.push.paths.includes('generated/**'));
  assert.ok(workflow.on.push.paths.includes('LICENSE'));
  assert.ok(workflow.on.push.paths.includes('NOTICE'));
  assert.ok('workflow_dispatch' in workflow.on);
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.ok('publish' in workflow.jobs);
  assert.equal('package' in workflow.jobs, false);
  const publish = workflow.jobs.publish;
  assert.equal(publish.environment, 'npm');
  assert.deepEqual(publish.permissions, {
    contents: 'write',
    'id-token': 'write',
  });
  const names = publish.steps.map(({ name }) => name);
  const gateIndex = names.indexOf('Run the complete release gate');
  const reuseIndex = names.indexOf('Reject version reuse');
  const publishIndex = names.indexOf('Publish with trusted provenance');
  const tagIndex = names.indexOf('Tag the release');
  assert.ok(gateIndex >= 0 && reuseIndex > gateIndex);
  assert.ok(publishIndex > reuseIndex && tagIndex > publishIndex);
  assert.match(
    publish.steps[publishIndex]?.run ?? '',
    /npm publish --access public --provenance/u,
  );
  for (const index of [publishIndex, tagIndex]) {
    assert.match(publish.steps[index]?.if ?? '', /should_publish == 'true'/u);
  }
  assert.equal(/NODE_AUTH_TOKEN/u.test(source), false);
});
