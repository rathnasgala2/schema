import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { findSchemaInventoryDrift } from '../scripts/generate-author-source-schemas.mjs';

const SCALAR_NAMES = [
  'stableId',
  'slug',
  'repoRelativePath',
  'canonicalRoute',
  'gitObjectId',
  'digest',
  'urlHttps',
  'bcp47',
  'isoCountry',
  'plainLabel',
  'plainText',
  'rfc3339',
  'semver',
  'semverRange',
  'packageRange',
  'packageExact',
  'urn',
  'glob',
  'passiveVisualToken',
  'extensionKey',
];

const ROOT_LEDGERS = {
  repository: {
    required: [
      'schemaId',
      'schemaVersion',
      'publicationId',
      'publication',
      'modules',
      'contentRoots',
      'assetRoots',
      'generatedSourceRoots',
      'defaultLanguage',
      'routeNormalizationProfile',
      'minimumToolVersion',
      'extensions',
    ],
    optional: ['appearance', 'navigation'],
  },
  publication: {
    required: [
      'schemaId',
      'schemaVersion',
      'id',
      'slug',
      'title',
      'description',
      'canonicalBase',
      'defaultLanguage',
      'authors',
      'socialLinks',
      'extensions',
    ],
    optional: ['contactRef', 'defaultImageRef', 'profile', 'footerCard'],
  },
  author: {
    required: [
      'schemaId',
      'schemaVersion',
      'id',
      'displayName',
      'biography',
      'links',
      'localized',
      'extensions',
    ],
    optional: ['pronouns', 'avatarRef'],
  },
  appearance: {
    required: [
      'schemaId',
      'schemaVersion',
      'theme',
      'colorMode',
      'headerComposition',
      'footerComposition',
      'typeScale',
      'fontAssetRefs',
      'tokens',
      'extensions',
    ],
    optional: ['brandMark', 'wordmark'],
  },
  navigation: {
    required: [
      'schemaId',
      'schemaVersion',
      'items',
      'footerItems',
      'extensions',
    ],
    optional: [],
  },
  'content-frontmatter': {
    required: [
      'schemaId',
      'schemaVersion',
      'id',
      'kind',
      'title',
      'language',
      'authors',
      'tags',
      'status',
      'createdAt',
      'slug',
      'redirects',
      'extensions',
    ],
    optional: [
      'description',
      'series',
      'seriesOrder',
      'publishedAt',
      'updatedAt',
      'route',
      'hero',
      'socialImageRef',
      'newsletter',
    ],
  },
};

/**
 * Read a committed JSON Schema.
 *
 * @param {string} contract contract file stem
 * @returns {Promise<any>} parsed schema
 */
async function readSchema(contract) {
  return JSON.parse(await readFile(`schemas/${contract}.schema.json`, 'utf8'));
}

test('the six schemas have immutable Draft 2020-12 identities', async () => {
  for (const contract of Object.keys(ROOT_LEDGERS)) {
    const schema = await readSchema(contract);
    assert.equal(
      schema.$schema,
      'https://json-schema.org/draft/2020-12/schema',
    );
    assert.equal(schema.$id, `urn:gala:schema:${contract}:2.0.0`);
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(schema.properties.schemaId, { const: schema.$id });
    assert.deepEqual(schema.properties.schemaVersion, { const: '2.0.0' });
  }
});

test('schema inventory drift rejects missing and unexpected entries', () => {
  assert.deepEqual(
    findSchemaInventoryDrift(
      ['author.schema.json', 'stray.schema.json'],
      ['author.schema.json', 'repository.schema.json'],
    ),
    {
      missing: ['repository.schema.json'],
      unexpected: ['stray.schema.json'],
    },
  );
});

test('every schema embeds the same complete 20-scalar library', async () => {
  /** @type {Record<string, unknown> | undefined} */
  let expectedScalars;
  for (const contract of Object.keys(ROOT_LEDGERS)) {
    const schema = await readSchema(contract);
    const scalars = Object.fromEntries(
      SCALAR_NAMES.map((name) => [name, schema.$defs[name]]),
    );
    assert.equal(
      Object.values(scalars).every((definition) => definition !== undefined),
      true,
      `${contract} is missing a scalar definition`,
    );
    expectedScalars ??= scalars;
    assert.deepEqual(scalars, expectedScalars);
  }
  assert.ok(expectedScalars);
  assert.equal(Object.keys(expectedScalars).length, 20);
});

test('the unresolved visual catalogs fail closed', async () => {
  const repository = await readSchema('repository');
  const appearance = await readSchema('appearance');
  assert.equal(repository.$defs.passiveVisualToken, false);
  assert.deepEqual(appearance.$defs.semanticTokens.properties, {});
  assert.deepEqual(appearance.$defs.semanticTokens.required, []);
  assert.equal(appearance.$defs.semanticTokens.maxProperties, 0);
  assert.equal(appearance.$defs.semanticTokens.additionalProperties, false);
});

test('the scalar library fixes its portable syntax and semantic formats', async () => {
  const schema = await readSchema('repository');
  const definitions = schema.$defs;
  assert.match(
    '019c0000-0000-7000-8000-000000000001',
    new RegExp(definitions.stableId.pattern, 'u'),
  );
  assert.doesNotMatch(
    '019c0000-0000-6000-8000-000000000001',
    new RegExp(definitions.stableId.pattern, 'u'),
  );
  assert.match('valid-slug', new RegExp(definitions.slug.pattern, 'u'));
  assert.doesNotMatch(
    'Invalid-Slug',
    new RegExp(definitions.slug.pattern, 'u'),
  );
  assert.match(
    'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    new RegExp(definitions.digest.pattern, 'u'),
  );
  assert.equal(
    definitions.repoRelativePath.format,
    'gala-repository-relative-path',
  );
  assert.equal(definitions.canonicalRoute.format, 'gala-canonical-route');
  assert.equal(definitions.bcp47.format, 'gala-bcp47');
  assert.equal(definitions.isoCountry.format, 'gala-iso-country');
  assert.equal(definitions.plainLabel.format, 'gala-plain-label');
  assert.equal(definitions.plainText.format, 'gala-plain-text');
  assert.equal(definitions.semverRange.format, 'gala-semver-range');
  assert.equal(definitions.packageRange.format, 'gala-package-range');
  assert.equal(definitions.packageExact.format, 'gala-package-exact');
  assert.equal(definitions.glob.format, 'gala-repository-glob');
  assert.equal(definitions.extensionKey.format, 'gala-extension-key');
});

test('root properties and requiredness exactly match the accepted ledger', async () => {
  for (const [contract, ledger] of Object.entries(ROOT_LEDGERS)) {
    const schema = await readSchema(contract);
    assert.deepEqual(
      Object.keys(schema.properties).sort(),
      [...ledger.required, ...ledger.optional].sort(),
    );
    assert.deepEqual(schema.required, ledger.required);
  }
});

test('all local references resolve to private definitions', async () => {
  for (const contract of Object.keys(ROOT_LEDGERS)) {
    const schema = await readSchema(contract);
    const serialized = JSON.stringify(schema);
    const references = [...serialized.matchAll(/#\/\$defs\/([^"\\]+)/gu)].map(
      (match) => match[1],
    );
    for (const reference of references) {
      assert.ok(reference);
      assert.notEqual(
        schema.$defs[reference],
        undefined,
        `${contract}: ${reference}`,
      );
    }
  }
});

test('content frontmatter encodes its portable cross-field conditions', async () => {
  const schema = await readSchema('content-frontmatter');
  assert.deepEqual(schema.dependentRequired, { seriesOrder: ['series'] });
  const [publicationTimestampConstraint] = schema.allOf;
  assert.ok(publicationTimestampConstraint);
  assert.deepEqual(publicationTimestampConstraint.if.properties.status.enum, [
    'published',
    'unlisted',
  ]);
  assert.deepEqual(publicationTimestampConstraint.if.required, ['status']);
  assert.deepEqual(publicationTimestampConstraint.then.required, [
    'publishedAt',
  ]);
  assert.deepEqual(publicationTimestampConstraint.else.not.required, [
    'publishedAt',
  ]);
});

test('navigation encodes exact target selection and a two-level tree', async () => {
  const schema = await readSchema('navigation');
  assert.deepEqual(schema.$defs.navigationItem.properties.children, {
    type: 'array',
    items: { $ref: '#/$defs/navigationLeaf' },
    minItems: 0,
    maxItems: 20,
  });
  assert.equal(schema.$defs.navigationLeaf.properties.children.maxItems, 0);
  assert.equal(schema.$defs.navigationItem.allOf.length, 1);
  assert.equal(schema.$defs.navigationLeaf.allOf.length, 1);
});

test('appearance requires the selected default mode to be allowed', async () => {
  const schema = await readSchema('appearance');
  const conditions = schema.$defs.colorMode.allOf;
  const modes = ['light', 'dark', 'system'];
  assert.equal(conditions.length, modes.length);
  for (const [index, mode] of modes.entries()) {
    const condition = conditions[index];
    assert.equal(condition.if.properties.default.const, mode);
    assert.equal(condition.then.properties.allowed.contains.const, mode);
  }
});

test('media alternatives encode informative and decorative behavior', async () => {
  const schema = await readSchema('content-frontmatter');
  const [alternativeConstraint] = schema.$defs.mediaRef.allOf;
  assert.ok(alternativeConstraint);
  assert.equal(alternativeConstraint.if.properties.role.const, 'decorative');
  assert.deepEqual(alternativeConstraint.if.required, ['role']);
  assert.equal(alternativeConstraint.then.properties.alt.const, '');
  assert.equal(alternativeConstraint.else.properties.alt.type, 'string');
  assert.equal(alternativeConstraint.else.properties.alt.minLength, 1);
});
