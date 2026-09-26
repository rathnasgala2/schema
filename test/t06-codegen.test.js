import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import { parse as parseYaml } from 'yaml';

import {
  GENERATED_SCHEMA_IDS,
  validateGeneratedDocument,
} from '../generated/typescript/index.js';
import { GALA_SCHEMA_IDS } from '../src/index.js';

const require = createRequire(import.meta.url);
const structuralCore =
  /** @type {Record<string, (value: unknown) => boolean>} */ (
    require('../generated/typescript/validator-core.cjs')
  );

const CONTRACTS = [
  'adapter-capability',
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

/**
 * Convert one kebab-case contract name to its generated type stem.
 *
 * @param {string} value contract name
 * @returns {string} PascalCase name
 */
function pascalCase(value) {
  return value
    .split('-')
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join('');
}

test('generated TypeScript root set equals the twenty schemas', async () => {
  // GALA_SCHEMA_IDS is sorted by the identity string itself, so
  // build-provenance's urn:gala:metadata:... namespace (SCHEMA-2.10.0) sorts
  // before every urn:gala:schema:... identity; GENERATED_SCHEMA_IDS instead
  // preserves CONTRACTS' kebab-case insertion order. Same twenty-member set,
  // deliberately different order -- compare as sets.
  assert.deepEqual(
    [...GENERATED_SCHEMA_IDS].sort(),
    [...GALA_SCHEMA_IDS].sort(),
  );
  assert.equal(GENERATED_SCHEMA_IDS.length, 20);

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

test('generated strict API and structural core cover every canonical root', async () => {
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
    const structural = structuralCore[`validate${pascalCase(contract)}`];
    assert.equal(typeof structural, 'function');
    assert.equal(structural?.(value), true, contract);
    assert.equal(
      structural?.({ ...value, generatedUnknownField: true }),
      false,
      contract,
    );
    assert.equal(
      validateGeneratedDocument(schemaId, {
        ...value,
        generatedUnknownField: true,
      }).structuralValid,
      false,
      contract,
    );
  }
});

test('schema inventory is exactly twenty roots plus OpenAPI', async () => {
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
  assert.equal(inventory.contracts.length, 21);
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

test('release workflow is one pinned provenance publication run', async () => {
  const source = await readFile('.github/workflows/release.yaml', 'utf8');
  const workflow = /** @type {{
    on: {push: {branches: string[], paths: string[]}},
    permissions: Record<string, string>,
    jobs: {publish: {
      environment: string,
      permissions: Record<string, string>,
      steps: Array<{name: string, run?: string, uses?: string}>
    }}
  }} */ (parseYaml(source));
  assert.deepEqual(workflow.on.push.branches, ['main']);
  assert.ok(workflow.on.push.paths.includes('generated/**'));
  assert.ok(workflow.on.push.paths.includes('LICENSE'));
  assert.ok(workflow.on.push.paths.includes('NOTICE'));
  assert.deepEqual(workflow.permissions, { contents: 'read' });
  assert.equal(workflow.jobs.publish.environment, 'npm');
  assert.deepEqual(workflow.jobs.publish.permissions, {
    contents: 'write',
    'id-token': 'write',
  });
  const steps = workflow.jobs.publish.steps;
  assert.match(
    steps.find(({ name }) => name === 'Reject version reuse')?.run ?? '',
    /npm view/u,
  );
  assert.match(
    steps.find(
      ({ name }) =>
        name === 'Check the CHANGELOG has an entry for this version',
    )?.run ?? '',
    /CHANGELOG\.md/u,
  );
  assert.match(
    steps.find(({ name }) => name === 'Tag the release')?.run ?? '',
    /git push/u,
  );
  assert.equal(
    steps.find(({ name }) => name === 'Publish with trusted provenance')?.run,
    'npm publish --access public --provenance',
  );
  assert.equal(/NODE_AUTH_TOKEN|npm_[A-Za-z0-9]/u.test(source), false);
});
