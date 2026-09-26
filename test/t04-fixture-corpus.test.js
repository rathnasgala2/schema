import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

import { Ajv2020 } from 'ajv/dist/2020.js';
import formatsPlugin from 'ajv-formats';

import { materializeFixture } from '../scripts/generate-fixture-corpus.mjs';
import {
  canonicalizeJcs,
  canonicalizeJcsBytes,
} from '../src/internal/canonical-jcs.js';
import { validateGalaFormat } from '../src/internal/format-validators.js';
import { graphemeLength17 } from '../src/internal/unicode17.js';

const T03_SCHEMA_HASHES = {
  'adapter-capability':
    // SCHEMA-2.10.0 LOCAL-62: x-gala-decision-phase annotations on every
    // capabilityDecision member plus the Pages required-set relaxation.
    // Review fix: the capabilityDecision description previously claimed
    // decisionDigest is "computed over the issuance-phase record only" with
    // deploy-phase members "never part of that digest input" -- false: the
    // reference projector (src/internal/digest-profiles.js) and the shipped
    // capability-decision-github-pages vector both include deploy-phase
    // members in the digest input when present. Corrected to state actual
    // behavior and flag LOCAL-62(b) (phase-scoped digest enforcement) as
    // still open, not silently closed by this annotation alone.
    //
    // 2026-09-25 code-discipline review, SCH-C3: destinationIdentity's
    // baseUrl gained the same 2048-byte cap the deployment-* roots already
    // had, positiveInt64/githubPositiveDecimal gained real upper bounds, and
    // githubRepositoryCoordinate was reconciled to the description-bearing,
    // ASCII-length-checked form -- see schemas:shared-defs:check.
    '6d722c1cae0a2d90427a9d21b79b9d49014e6b5f507cd70f983055eae12801df',
  appearance:
    // 2026-09-25 code-discipline review, SCH-C3: colorMode and
    // semanticTokens reconciled to the build-input root's wording/shape.
    '0bd3b9332b25deec625de3d4fb65bd0717a434502fe90b58a6081f7d43459ea9',
  'artifact-manifest':
    // SCHEMA-2.10.0: $comment updated to note the standalone build-provenance
    // root alongside the unchanged internal #/$defs/buildProvenance nesting.
    //
    // 2026-09-25 code-discipline review, SCH-C3: positiveInt64,
    // githubPositiveDecimal and githubRepositoryCoordinate reconciled (see
    // adapter-capability above); githubActionsArtifactId now delegates to
    // githubPositiveDecimal by $ref instead of repeating its body;
    // renderPolicyIdentity/reproducibleBuildRecord renamed to
    // manifestRenderPolicyIdentity/manifestReproducibleBuildRecord to
    // disambiguate from the deployment-* roots' record-shaped variants.
    '722ea75b9820ecadb5ee907e4c92fd560f9d1b298cab2824cbbcfa6fcf10b652',
  author: '86774ba476ba5a11b298bdca0d949d2584bd698d375e4b5dbeac6203d5133730',
  'build-input':
    // 2026-09-25 code-discipline review, SCH-C3: adapterIdentity renamed to
    // authoredAdapterIdentity (build-input's closed 3-adapter enum is
    // deliberately narrower than the open plainLabel the capability/record
    // roots use); colorMode, semanticTokens, navigationItem, navigationLeaf,
    // githubPositiveDecimal, positiveInt64 and renderPolicyIdentity
    // reconciled with their sibling roots (see adapter-capability and
    // artifact-manifest above).
    '0828f9658b0515f9608ca7b2482089eb4e411380002001cd87eeeaed21cf21bb',
  'content-frontmatter':
    'd033644fd188af7d55c596a7c910b2c9ca9a1c8d8d8b092860f04eec8a5273a0',
  'deployment-intent':
    // 2026-09-25 code-discipline review, SCH-C3: int64/nonNegativeInt64
    // description reconciled and positiveInt64 gained a real upper bound
    // (see artifact-manifest above); renderPolicyIdentity/
    // reproducibleBuildRecord renamed to recordRenderPolicyIdentity/
    // recordReproducibleBuildRecord to disambiguate from the manifest
    // roots' const-named-policy variants.
    '6442ef8a26a9ce0d103d4facbcd798bd97b80469427a2304407b8e65e526a3e3',
  'deployment-observation':
    // 2026-09-25 code-discipline review, SCH-C3: see deployment-intent above
    // (int64/nonNegativeInt64/positiveInt64/renderPolicyIdentity).
    '4ea49fda413a1c75fff63e85c6680be50963c03fe7b2e62c10e24ec4e23118b5',
  'deployment-receipt':
    // 2026-09-25 code-discipline review, SCH-C3: see deployment-intent above
    // (int64/nonNegativeInt64/positiveInt64/renderPolicyIdentity/
    // reproducibleBuildRecord).
    'f11b86ba0b0340eb8de421c16846bcc222cfa4263a3a7447894b71a827825ca1',
  lock: '52d7026ec8aaf8c600ba98bbd6384cd376fc127bdd517d0639b5df658b84b57e',
  navigation:
    // 2026-09-25 code-discipline review, SCH-C3: navigationItem/
    // navigationLeaf reconciled to build-input's leaner if/then/else form
    // and const-based empty-children shape (same validation outcome, one
    // fewer diagnostic-code path for the same violation).
    '41ceb495e2e9949a6d96b5ccaa47f6f9e7b35b7bf4f600da26bb7b2e838e0f8e',
  'public-generation-marker':
    'de1a21327cd07eb11af5d04a323f05025f29d200a6d11034ab37ede99dff2093',
  publication:
    '257401246e0de3b314003287da2f280c0be2e8286f7fdeb666179b95c9f93936',
  repository:
    'f641eac15252642b225e0ee58bea4f83d4cf7d706929dfff9148dfdaa0788486',
  'template-composition':
    '175eddf8b424fe6dfb8e2f79d23195b23333d5050acd02c6fbc17233214669f5',
  'theme-contract':
    // 2026-09-25 code-discipline review, SCH-C3: positiveInt64 gained a real
    // upper bound (see artifact-manifest above).
    '05eddb45e9faf95f28ab8a44a4f9dddba744292dbabe669d05f1816d66969bcd',
};

const ADVERSARIAL_CATEGORIES = [
  'active-content',
  'cyclic-references',
  'duplicate-keys',
  'oversized-fields',
  'oversized-files',
  'path-traversal',
  'reserved-extension-keys',
  'symlink-escape',
  'unicode-case-fold-collision',
  'unknown-module',
  'unknown-schema-major',
  'unsafe-urls',
  'yaml-aliases',
  'yaml-exponential-expansion',
];

const fixtureFiles = new Map();
const fixtureCasesById = new Map();

test('common format validators preserve baseline path and text semantics', () => {
  assert.equal(validateGalaFormat('gala-repository-relative-path', 'a.'), true);
  assert.equal(
    validateGalaFormat('gala-repository-relative-path', 'a%20b'),
    true,
  );
  assert.equal(
    validateGalaFormat('gala-repository-relative-path', 'a/%2e%2e/b'),
    false,
  );
  assert.equal(validateGalaFormat('gala-plain-text', 'a\nb'), true);
  assert.equal(validateGalaFormat('gala-plain-label', 'a\nb'), false);
});

/**
 * Resolve one local JSON Pointer.
 *
 * @param {unknown} root root document
 * @param {string} pointer local pointer
 * @returns {unknown} resolved value
 */
function resolvePointer(root, pointer) {
  if (pointer === '#') return root;
  return pointer
    .slice(2)
    .split('/')
    .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce(
      (value, token) => /** @type {Record<string, unknown>} */ (value)[token],
      root,
    );
}

/**
 * Collect custom Gala format names from a schema.
 *
 * @param {unknown} value schema node
 * @param {Set<string>} formats destination set
 * @returns {void}
 */
function collectCustomFormats(value, formats) {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectCustomFormats(entry, formats));
    return;
  }
  const record = /** @type {Record<string, unknown>} */ (value);
  if (typeof record.format === 'string' && record.format.startsWith('gala-')) {
    formats.add(record.format);
  }
  Object.values(record).forEach((entry) =>
    collectCustomFormats(entry, formats),
  );
}

/**
 * Audit a very large homogeneous array recipe without asking AJV to perform
 * quadratic uniqueItems comparisons across hundreds of thousands of objects.
 * Count constraints are checked exactly, representative elements are compiled
 * against their real item schemas, and unique recipes are fully materialized
 * once to prove their canonical identities are distinct.
 *
 * @param {Record<string, unknown>} fixture fixture case
 * @param {Record<string, unknown>} root owning root schema
 * @param {Ajv2020} ajv configured validator
 * @returns {boolean} whether the original array schema accepts the recipe
 */
function auditLargeArrayRecipe(fixture, root, ajv) {
  const recipe = /** @type {Record<string, unknown>} */ (fixture.recipe);
  const schemaPointer = String(recipe.schemaPointer);
  const schema = /** @type {Record<string, unknown>} */ (
    resolvePointer(root, schemaPointer)
  );
  const length = Number(recipe.length);
  if (
    (typeof schema.minItems === 'number' && length < schema.minItems) ||
    (typeof schema.maxItems === 'number' && length > schema.maxItems)
  ) {
    return false;
  }
  assert.equal(
    schema.contains,
    undefined,
    `${schemaPointer} is not homogeneous`,
  );
  const prefixItems = Array.isArray(schema.prefixItems)
    ? schema.prefixItems
    : [];
  let values;
  if (schema.uniqueItems === true) {
    values = /** @type {unknown[]} */ (materializeFixture(fixture, root));
    assert.equal(values.length, length);
    assert.equal(
      new Set(values.map((value) => canonicalizeJcs(value))).size,
      length,
      `${schemaPointer} recipe is not unique`,
    );
  } else {
    const sampleLength = Math.min(
      length,
      Math.max(prefixItems.length, Math.min(3, length)),
    );
    values = /** @type {unknown[]} */ (
      materializeFixture(
        {
          recipe: {
            kind: 'schema-array-count',
            schemaPointer,
            length: sampleLength,
          },
        },
        root,
      )
    );
  }
  const indexes = [0, Math.floor(values.length / 2), values.length - 1].filter(
    (value, index, all) => value >= 0 && all.indexOf(value) === index,
  );
  return indexes.every((index) => {
    const childPointer =
      index < prefixItems.length
        ? `${schemaPointer}/prefixItems/${index}`
        : `${schemaPointer}/items`;
    if (resolvePointer(root, childPointer) === false) return false;
    const validator = ajv.getSchema(`${root.$id}${childPointer}`);
    assert.ok(validator, `validator ${childPointer} is absent`);
    return validator(values[index]);
  });
}

/**
 * Parse a committed JSON file.
 *
 * @param {string} filePath repository-relative path
 * @returns {Promise<any>} parsed JSON
 */
async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

/**
 * Parse one committed JSON fixture at most once.
 *
 * @param {string} filePath repository-relative path
 * @returns {Promise<any>} parsed JSON
 */
async function readFixtureFile(filePath) {
  if (!fixtureFiles.has(filePath)) {
    fixtureFiles.set(filePath, await readJson(filePath));
  }
  return fixtureFiles.get(filePath);
}

/**
 * Resolve one fixture case through a per-file identity index.
 *
 * @param {string} filePath repository-relative path
 * @param {string} caseId fixture identity
 * @returns {Promise<any>} fixture case, or undefined
 */
async function findFixture(filePath, caseId) {
  if (!fixtureCasesById.has(filePath)) {
    const cases = await readFixtureFile(filePath);
    fixtureCasesById.set(
      filePath,
      new Map(
        cases.map((/** @type {any} */ fixture) => [fixture.caseId, fixture]),
      ),
    );
  }
  return fixtureCasesById.get(filePath).get(caseId);
}

test('fixture manifest covers exactly twenty roots and every rule class', async () => {
  const manifest = await readJson('fixtures/manifest.json');
  assert.equal(manifest.schemaVersion, '1.0.0');
  assert.equal(manifest.contractVersion, '2.0.0');
  assert.equal(manifest.fixtureRecipeVersion, '1.0.0');
  assert.equal(manifest.schemas.length, 20);
  assert.deepEqual(
    manifest.schemas.map((/** @type {any} */ entry) => entry.contract),
    [
      ...manifest.schemas.map((/** @type {any} */ entry) => entry.contract),
    ].sort(),
  );
  assert.equal(
    new Set(manifest.rules.map((/** @type {any} */ entry) => entry.ruleId))
      .size,
    manifest.rules.length,
  );
  assert.ok(manifest.rules.length > 1_000);

  const allowedNotApplicable = new Set([
    'FALSE_SCHEMA_ACCEPTS_NO_INSTANCE',
    'FINITE_UNIQUE_ITEM_DOMAIN_BELOW_BOUNDARY',
    'FORMAT_REDUNDANT_WITH_SIBLING_RULES',
    'STRING_DOMAIN_EXCLUDES_DECLARED_BOUNDARY',
    'ZERO_LOWER_BOUND_REJECTS_NO_INSTANCE',
  ]);
  for (const rule of manifest.rules) {
    for (const fixtureClass of [
      'valid',
      'boundary',
      'invalid',
      'unknownField',
    ]) {
      const coverage = rule[fixtureClass];
      assert.ok(coverage, `${rule.ruleId} lacks ${fixtureClass} coverage`);
      if (coverage.notApplicable !== undefined) {
        assert.equal(
          allowedNotApplicable.has(coverage.notApplicable),
          true,
          `${rule.ruleId} has an unrecognized non-applicability reason`,
        );
      } else {
        assert.equal(typeof coverage.file, 'string');
        assert.equal(typeof coverage.caseId, 'string');
        await access(coverage.file);
        const fixture = await findFixture(coverage.file, coverage.caseId);
        assert.ok(fixture, `${coverage.caseId} is absent`);
        assert.ok(
          fixture.coveredRuleIds.includes(rule.ruleId),
          `${coverage.caseId} does not name ${rule.ruleId}`,
        );
      }
    }
  }
});

test('invalid fixture files use the required schema and exact-code layout', async () => {
  const manifest = await readJson('fixtures/manifest.json');
  for (const rule of manifest.rules) {
    if (rule.invalid.notApplicable !== undefined) continue;
    assert.match(
      rule.invalid.file,
      new RegExp(
        `^fixtures/invalid/${rule.contract}/[A-Z][A-Z0-9_]+/cases\\.json$`,
        'u',
      ),
    );
    const fixture = await findFixture(rule.invalid.file, rule.invalid.caseId);
    assert.ok(fixture, `${rule.invalid.caseId} is absent`);
    assert.deepEqual(fixture.expectedCodes, [rule.invalid.expectedCode]);
  }
});

test('each root has committed full-document valid, boundary and unknown-field fixtures', async () => {
  const manifest = await readJson('fixtures/manifest.json');
  for (const schemaEntry of manifest.schemas) {
    assert.match(
      schemaEntry.validExample,
      new RegExp(
        `^examples/valid/${schemaEntry.contract}/canonical\\.json$`,
        'u',
      ),
    );
    await access(schemaEntry.validExample);
    await access(schemaEntry.boundaryFixture);
    await access(schemaEntry.unknownFieldFixture);
    const example = await readJson(schemaEntry.validExample);
    const schemaBytes = await readFile(
      `schemas/${schemaEntry.contract}.schema.json`,
    );
    assert.equal(example.schemaId, schemaEntry.schemaId);
    assert.equal(example.schemaVersion, '2.0.0');
    assert.equal(
      createHash('sha256').update(schemaBytes).digest('hex'),
      schemaEntry.schemaSha256,
    );
  }
});

test('the required adversarial corpus is exact, closed and physically present', async () => {
  const manifest = await readJson('fixtures/manifest.json');
  assert.deepEqual(
    manifest.adversarial.map((/** @type {any} */ entry) => entry.category),
    ADVERSARIAL_CATEGORIES,
  );
  assert.equal(
    new Set(
      manifest.adversarial.map((/** @type {any} */ entry) => entry.category),
    ).size,
    ADVERSARIAL_CATEGORIES.length,
  );
  for (const fixture of manifest.adversarial) {
    assert.equal(typeof fixture.expectedCode, 'string');
    assert.match(fixture.expectedCode, /^[A-Z][A-Z0-9_]+$/u);
    await access(fixture.file);
  }
});

test('all preexisting schema bytes match their reviewed locks', async () => {
  for (const [contract, expectedHash] of Object.entries(T03_SCHEMA_HASHES)) {
    const bytes = await readFile(`schemas/${contract}.schema.json`);
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      expectedHash,
    );
  }
});

test('every materialized fixture has its declared structural truth', async () => {
  const manifest = await readJson('fixtures/manifest.json');
  const schemas = new Map();
  const customFormats = new Set();
  for (const schemaEntry of manifest.schemas) {
    const schema = await readJson(
      `schemas/${schemaEntry.contract}.schema.json`,
    );
    schemas.set(schemaEntry.contract, schema);
    collectCustomFormats(schema, customFormats);
  }
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  /** @type {import('ajv-formats').default} */ (
    /** @type {unknown} */ (formatsPlugin)
  )(ajv);
  /**
   * @param {number} value measured value
   * @param {{minimum?: number, maximum?: number}} bounds inclusive bounds
   * @returns {boolean} whether the value is in range
   */
  const withinBounds = (value, bounds) =>
    (bounds.minimum === undefined || value >= bounds.minimum) &&
    (bounds.maximum === undefined || value <= bounds.maximum);
  ajv.addKeyword({
    keyword: 'x-gala-asciiByteLength',
    schemaType: 'object',
    type: 'string',
    validate: (
      /** @type {{minimum?: number, maximum?: number}} */ bounds,
      /** @type {string} */ value,
    ) =>
      [...value].every((character) => character.charCodeAt(0) <= 0x7f) &&
      withinBounds(value.length, bounds),
  });
  ajv.addKeyword({
    keyword: 'x-gala-utf8ByteLength',
    schemaType: 'object',
    type: 'string',
    validate: (
      /** @type {{minimum?: number, maximum?: number}} */ bounds,
      /** @type {string} */ value,
    ) => withinBounds(Buffer.byteLength(value, 'utf8'), bounds),
  });
  ajv.addKeyword({
    keyword: 'x-gala-graphemeLength',
    schemaType: 'object',
    type: 'string',
    validate: (
      /** @type {{minimum?: number, maximum?: number}} */ bounds,
      /** @type {string} */ value,
    ) => withinBounds(graphemeLength17(value), bounds),
  });
  ajv.addKeyword({
    keyword: 'x-gala-maxCanonicalBytes',
    schemaType: 'number',
    validate: (/** @type {number} */ maximum, /** @type {unknown} */ value) =>
      canonicalizeJcsBytes(value).byteLength <= maximum,
  });
  ajv.addKeyword({
    keyword: 'x-gala-maximum',
    schemaType: ['number', 'string'],
    validate: (
      /** @type {number | string} */ maximum,
      /** @type {unknown} */ value,
    ) => {
      try {
        if (
          typeof value !== 'string' &&
          typeof value !== 'number' &&
          typeof value !== 'bigint' &&
          typeof value !== 'boolean'
        ) {
          return false;
        }
        return BigInt(value) <= BigInt(maximum);
      } catch {
        return false;
      }
    },
  });
  for (const formatName of customFormats) {
    ajv.addFormat(formatName, {
      type: 'string',
      validate: (value) => validateGalaFormat(formatName, value),
    });
  }
  for (const root of schemas.values()) ajv.addSchema(root);
  const validators = new Map();
  for (const [contract, root] of schemas) {
    const pointers = new Set();
    for (const rule of manifest.rules) {
      if (rule.contract !== contract) continue;
      for (const fixtureClass of [
        'valid',
        'boundary',
        'invalid',
        'unknownField',
      ]) {
        const coverage = rule[fixtureClass];
        if (coverage.notApplicable !== undefined) continue;
        const fixture = await findFixture(coverage.file, coverage.caseId);
        assert.ok(fixture, `${coverage.caseId} is absent`);
        pointers.add(fixture.validationPointer ?? fixture.schemaPointer);
      }
    }
    for (const pointer of [...pointers].sort()) {
      const validator = ajv.getSchema(`${root.$id}${pointer}`);
      assert.ok(validator, `validator ${contract}:${pointer} is absent`);
      validators.set(`${contract}:${pointer}`, validator);
    }
  }
  const failures = [];
  const auditedCases = new Set();
  for (const rule of manifest.rules) {
    const root = schemas.get(rule.contract);
    assert.ok(root, `schema ${rule.contract} is absent`);
    for (const fixtureClass of [
      'valid',
      'boundary',
      'invalid',
      'unknownField',
    ]) {
      const coverage = rule[fixtureClass];
      if (coverage.notApplicable !== undefined) continue;
      const fixture = await findFixture(coverage.file, coverage.caseId);
      assert.ok(fixture, `${coverage.caseId} is absent`);
      const pointer = fixture.validationPointer ?? fixture.schemaPointer;
      const validator = validators.get(`${rule.contract}:${pointer}`);
      assert.ok(validator, `validator ${rule.contract}:${pointer} is absent`);
      const expected = fixtureClass === 'valid' || fixtureClass === 'boundary';
      const auditKey = `${rule.contract}:${coverage.file}:${coverage.caseId}:${expected}`;
      if (auditedCases.has(auditKey)) continue;
      auditedCases.add(auditKey);
      const largeArrayRecipe =
        Number(fixture.recipe?.length ?? 0) > 1_000 &&
        (fixture.recipe?.kind === 'schema-array-boundary' ||
          fixture.recipe?.kind === 'schema-array-count');
      let accepted;
      if (largeArrayRecipe) {
        accepted = auditLargeArrayRecipe(fixture, root, ajv);
      } else {
        const instance = materializeFixture(fixture, root);
        if (
          fixtureClass === 'boundary' &&
          (fixture.recipe?.kind === 'schema-array-boundary' ||
            fixture.recipe?.kind === 'schema-string-boundary')
        ) {
          const materializedLength =
            typeof instance === 'string' || Array.isArray(instance)
              ? instance.length
              : undefined;
          assert.equal(
            materializedLength,
            fixture.recipe.length,
            `${fixture.caseId} does not exercise its declared boundary`,
          );
        }
        accepted = validator(instance);
      }
      if (fixtureClass === 'invalid' && rule.keyword === 'format') {
        assert.equal(accepted, false, `${fixture.caseId} must reject`);
        assert.ok(
          validator.errors?.every(
            (/** @type {any} */ error) => error.keyword === 'format',
          ),
          `${fixture.caseId} does not isolate its format rule`,
        );
      }
      if (accepted !== expected && failures.length < 40) {
        failures.push({
          ruleId: rule.ruleId,
          fixtureClass,
          caseId: fixture.caseId,
          expected,
          errors: validator.errors
            ?.slice(0, 3)
            .map((/** @type {any} */ error) => ({
              instancePath: error.instancePath,
              keyword: error.keyword,
              schemaPath: error.schemaPath,
            })),
        });
      }
    }
  }
  assert.deepEqual(failures, []);
});
