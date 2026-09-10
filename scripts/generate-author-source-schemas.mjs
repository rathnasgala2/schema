import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { format, resolveConfig } from 'prettier';

import { runIfMain } from './run-if-main.mjs';

const DRAFT_2020_12 = 'https://json-schema.org/draft/2020-12/schema';
const SCHEMA_VERSION = '2.0.0';

const scalarDefinitions = {
  stableId: {
    type: 'string',
    pattern:
      '^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    description:
      'Lowercase canonical UUIDv7. Once published, it is immutable; its time ordering conveys neither chronology nor authority.',
  },
  slug: {
    type: 'string',
    minLength: 1,
    maxLength: 80,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  },
  repoRelativePath: {
    type: 'string',
    minLength: 1,
    maxLength: 512,
    pattern: '^(?!/)(?!.*\\\\)(?!.*\\u0000).+$',
    format: 'gala-repository-relative-path',
    'x-gala-utf8ByteLength': { maximum: 512 },
    description:
      'NFC UTF-8 repository-relative path using slash separators, with no leading slash, dot segment, NUL, backslash, or percent-decoded traversal.',
  },
  canonicalRoute: {
    type: 'string',
    minLength: 1,
    pattern: '^/(?!/)(?!.*//)(?!.*[?#]).*$',
    format: 'gala-canonical-route',
    description:
      'Absolute normalized route with no query, fragment, dot segment, double slash, or non-normalized percent encoding.',
  },
  gitObjectId: {
    type: 'string',
    pattern: '^(?:sha1:[0-9a-f]{40}|sha256:[0-9a-f]{64})$',
  },
  digest: {
    type: 'string',
    pattern: '^sha256:[0-9a-f]{64}$',
  },
  urlHttps: {
    type: 'string',
    format: 'uri',
    pattern: '^https://(?![^/?#]*@)',
    description: 'Absolute HTTPS URL without embedded credentials.',
  },
  bcp47: {
    type: 'string',
    format: 'gala-bcp47',
    description: 'Structurally valid canonical BCP-47 language tag.',
  },
  isoCountry: {
    type: 'string',
    pattern: '^[A-Z]{2}$',
    format: 'gala-iso-country',
    description:
      'ISO 3166-1 alpha-2 country code; admission remains subject to the active policy profile.',
  },
  plainLabel: {
    type: 'string',
    format: 'gala-plain-label',
    'x-gala-graphemeLength': { minimum: 1, maximum: 80 },
    description:
      'Normalized Unicode plain text without markup, controls, or bidi overrides.',
  },
  plainText: {
    type: 'string',
    format: 'gala-plain-text',
    description:
      'NFC Unicode text without disallowed C0/C1 controls or bidi override/isolate controls.',
  },
  rfc3339: {
    type: 'string',
    format: 'date-time',
    pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$',
  },
  semver: {
    type: 'string',
    pattern:
      '^(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)(?:-(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*))*)?$',
    description: 'Canonical SemVer 2.0.0 without build metadata.',
  },
  semverRange: {
    type: 'string',
    minLength: 1,
    pattern: '^\\S+$',
    format: 'gala-semver-range',
    description:
      'Whitespace-free npm-compatible exact, caret, or bounded comparator-set range; tags and URLs are invalid.',
  },
  packageRange: {
    type: 'string',
    minLength: 3,
    pattern:
      '^(?:@[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?/[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?|[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?)@\\S+$',
    format: 'gala-package-range',
    description:
      'Lowercase npm package identity and admitted semver range; Git, file, URL, and alias sources are invalid.',
  },
  packageExact: {
    type: 'string',
    minLength: 3,
    pattern:
      '^(?:@[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?/[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?|[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?)@\\S+$',
    format: 'gala-package-exact',
    description:
      'Lowercase npm package identity and exact canonical semantic version; aliases are invalid.',
  },
  urn: {
    type: 'string',
    minLength: 10,
    maxLength: 255,
    format: 'uri',
    pattern: '^urn:gala:[\\x21-\\x7E]+$',
    description: 'Absolute ASCII URN in the schema-declared Gala namespace.',
  },
  glob: {
    type: 'string',
    minLength: 1,
    maxLength: 256,
    format: 'gala-repository-glob',
    'x-gala-utf8ByteLength': { maximum: 256 },
    description:
      'Repository-relative POSIX glob using only star, globstar, and question-mark operators; braces, extglobs, negation, absolute paths, and parent traversal are invalid.',
  },
  passiveVisualToken: false,
  extensionKey: {
    type: 'string',
    format: 'gala-extension-key',
    description:
      'Reverse-DNS extension namespace that cannot shadow a core key.',
  },
};

/**
 * Create a local definition reference.
 *
 * @param {string} name definition name
 * @returns {{ $ref: string }} JSON Schema reference
 */
function ref(name) {
  return { $ref: `#/$defs/${name}` };
}

/**
 * Add an exact grapheme-cluster bound to a string schema.
 *
 * @param {Record<string, unknown>} schema base string schema
 * @param {number} minimum minimum grapheme clusters
 * @param {number} maximum maximum grapheme clusters
 * @returns {Record<string, unknown>} bounded string schema
 */
function graphemeBound(schema, minimum, maximum) {
  return {
    ...schema,
    'x-gala-graphemeLength': { minimum, maximum },
  };
}

/**
 * Create a bounded array schema.
 *
 * @param {Record<string, unknown>} items item schema
 * @param {number} minimum minimum number of items
 * @param {number} maximum maximum number of items
 * @param {boolean} [uniqueItems] whether duplicate JSON values are rejected
 * @returns {Record<string, unknown>} array schema
 */
function arrayOf(items, minimum, maximum, uniqueItems = false) {
  return {
    type: 'array',
    items,
    minItems: minimum,
    maxItems: maximum,
    ...(uniqueItems ? { uniqueItems: true } : {}),
  };
}

/**
 * Create a closed object schema.
 *
 * @param {Record<string, unknown>} properties property schemas
 * @param {string[]} required required property names
 * @param {Record<string, unknown>} [keywords] additional schema keywords
 * @returns {Record<string, unknown>} object schema
 */
function closedObject(properties, required, keywords = {}) {
  return {
    type: 'object',
    required,
    properties,
    additionalProperties: false,
    ...keywords,
  };
}

const extensionMap = {
  type: 'object',
  maxProperties: 32,
  propertyNames: ref('extensionKey'),
  additionalProperties: {
    'x-gala-maxCanonicalBytes': 16_384,
  },
  'x-gala-maxCanonicalBytes': 131_072,
};

const socialLink = closedObject(
  {
    type: {
      enum: [
        'website',
        'email',
        'github',
        'linkedin',
        'mastodon',
        'bluesky',
        'x',
        'youtube',
        'other',
      ],
    },
    uri: { type: 'string', minLength: 1, maxLength: 2048 },
    label: ref('plainLabel'),
  },
  ['type', 'uri'],
  {
    allOf: [
      {
        if: {
          properties: { type: { const: 'email' } },
          required: ['type'],
        },
        then: {
          properties: {
            uri: { type: 'string', format: 'uri', pattern: '^mailto:' },
          },
        },
        else: { properties: { uri: ref('urlHttps') } },
      },
    ],
  },
);

const publicationProfile = closedObject(
  { route: ref('canonicalRoute'), body: ref('repoRelativePath') },
  ['route', 'body'],
);

const footerCard = closedObject(
  {
    enabled: { type: 'boolean' },
    heading: graphemeBound(ref('plainText'), 1, 120),
    body: ref('repoRelativePath'),
    authorIds: arrayOf(ref('stableId'), 1, 32),
  },
  ['enabled', 'heading', 'body', 'authorIds'],
);

const localizedAuthor = closedObject(
  {
    language: ref('bcp47'),
    displayName: graphemeBound(ref('plainText'), 1, 120),
    biography: graphemeBound(ref('plainText'), 0, 2000),
  },
  ['language', 'displayName', 'biography'],
);

const mediaRef = closedObject(
  {
    path: ref('repoRelativePath'),
    alt: graphemeBound({ type: 'string' }, 0, 300),
    role: { enum: ['informative', 'decorative'] },
  },
  ['path', 'alt', 'role'],
  {
    allOf: [
      {
        if: {
          properties: { role: { const: 'decorative' } },
          required: ['role'],
        },
        then: { properties: { alt: { const: '' } } },
        else: { properties: { alt: { type: 'string', minLength: 1 } } },
      },
    ],
  },
);

const navigationLinkConstraint = {
  allOf: [
    {
      if: {
        properties: { type: { const: 'internal' } },
        required: ['type'],
      },
      then: {
        properties: { route: {} },
        required: ['route'],
        not: { properties: { url: {} }, required: ['url'] },
      },
      else: {
        properties: { url: {} },
        required: ['url'],
        not: { properties: { route: {} }, required: ['route'] },
      },
    },
  ],
};

const navigationLeaf = closedObject(
  {
    type: { enum: ['internal', 'external'] },
    label: ref('plainLabel'),
    route: ref('canonicalRoute'),
    url: ref('urlHttps'),
    children: arrayOf({}, 0, 0),
  },
  ['type', 'label', 'children'],
  navigationLinkConstraint,
);

const navigationItem = closedObject(
  {
    type: { enum: ['internal', 'external'] },
    label: ref('plainLabel'),
    route: ref('canonicalRoute'),
    url: ref('urlHttps'),
    children: arrayOf(ref('navigationLeaf'), 0, 20),
  },
  ['type', 'label', 'children'],
  navigationLinkConstraint,
);

/**
 * Create a Gala root schema.
 *
 * @param {string} contract contract name in the immutable URN
 * @param {Record<string, unknown>} properties contract property schemas
 * @param {string[]} required required contract properties
 * @param {Record<string, unknown>} definitions private nested definitions
 * @param {Record<string, unknown>} [keywords] additional root keywords
 * @returns {Record<string, unknown>} complete Draft 2020-12 schema
 */
function rootSchema(
  contract,
  properties,
  required,
  definitions,
  keywords = {},
) {
  const id = `urn:gala:schema:${contract}:${SCHEMA_VERSION}`;
  return {
    $schema: DRAFT_2020_12,
    $id: id,
    title: `Gala ${contract} contract`,
    type: 'object',
    required: ['schemaId', 'schemaVersion', ...required],
    properties: {
      schemaId: { const: id },
      schemaVersion: { const: SCHEMA_VERSION },
      ...properties,
    },
    additionalProperties: false,
    $defs: {
      ...scalarDefinitions,
      ...definitions,
    },
    ...keywords,
  };
}

const schemas = {
  'repository.schema.json': rootSchema(
    'repository',
    {
      publicationId: ref('stableId'),
      publication: ref('repoRelativePath'),
      appearance: ref('repoRelativePath'),
      navigation: ref('repoRelativePath'),
      modules: ref('repoRelativePath'),
      contentRoots: arrayOf(ref('contentRoot'), 1, 32),
      assetRoots: arrayOf(ref('assetRoot'), 0, 16),
      generatedSourceRoots: arrayOf(ref('generatedRoot'), 0, 8),
      defaultLanguage: ref('bcp47'),
      routeNormalizationProfile: {
        enum: ['directory-index', 'explicit-file'],
      },
      minimumToolVersion: ref('semverRange'),
      extensions: ref('extensionMap'),
    },
    [
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
    {
      contentRoot: closedObject(
        {
          kind: { enum: ['article', 'page'] },
          path: ref('repoRelativePath'),
          include: arrayOf(ref('glob'), 1, 32),
          exclude: arrayOf(ref('glob'), 0, 32),
        },
        ['kind', 'path', 'include', 'exclude'],
      ),
      assetRoot: closedObject({ path: ref('repoRelativePath') }, ['path']),
      generatedRoot: closedObject(
        {
          kind: { const: 'prism-edition' },
          path: ref('repoRelativePath'),
          owner: { const: 'prism' },
        },
        ['kind', 'path', 'owner'],
      ),
      extensionMap,
    },
    {
      $comment:
        'Reference presence, path overlap, realpath containment, symlink escape, and Unicode/case-fold collision invariants are enforced by the repository graph validator.',
    },
  ),
  'publication.schema.json': rootSchema(
    'publication',
    {
      id: ref('stableId'),
      slug: ref('slug'),
      title: graphemeBound(ref('plainText'), 1, 200),
      description: graphemeBound(ref('plainText'), 1, 500),
      canonicalBase: ref('urlHttps'),
      defaultLanguage: ref('bcp47'),
      authors: arrayOf(ref('repoRelativePath'), 1, 32),
      contactRef: ref('repoRelativePath'),
      socialLinks: arrayOf(ref('socialLink'), 0, 32),
      defaultImageRef: ref('repoRelativePath'),
      profile: ref('publicationProfile'),
      footerCard: ref('footerCard'),
      extensions: ref('extensionMap'),
    },
    [
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
    { socialLink, publicationProfile, footerCard, extensionMap },
  ),
  'author.schema.json': rootSchema(
    'author',
    {
      id: ref('stableId'),
      displayName: graphemeBound(ref('plainText'), 1, 120),
      biography: graphemeBound(ref('plainText'), 0, 2000),
      pronouns: graphemeBound(ref('plainText'), 1, 80),
      avatarRef: ref('repoRelativePath'),
      links: arrayOf(ref('socialLink'), 0, 32),
      localized: arrayOf(ref('localizedAuthor'), 0, 32),
      extensions: ref('extensionMap'),
    },
    ['id', 'displayName', 'biography', 'links', 'localized', 'extensions'],
    { socialLink, localizedAuthor, extensionMap },
  ),
  'appearance.schema.json': rootSchema(
    'appearance',
    {
      theme: ref('packageRange'),
      colorMode: ref('colorMode'),
      brandMark: ref('repoRelativePath'),
      wordmark: ref('repoRelativePath'),
      headerComposition: {
        enum: ['mark-and-name', 'name-only', 'mark-only'],
      },
      footerComposition: { enum: ['profile', 'compact', 'minimal'] },
      typeScale: { enum: ['compact', 'standard', 'spacious'] },
      fontAssetRefs: arrayOf(ref('repoRelativePath'), 0, 8),
      tokens: ref('semanticTokens'),
      extensions: ref('extensionMap'),
    },
    [
      'theme',
      'colorMode',
      'headerComposition',
      'footerComposition',
      'typeScale',
      'fontAssetRefs',
      'tokens',
      'extensions',
    ],
    {
      colorMode: closedObject(
        {
          allowed: arrayOf({ enum: ['light', 'dark', 'system'] }, 1, 3, true),
          default: { enum: ['light', 'dark', 'system'] },
        },
        ['allowed', 'default'],
        {
          allOf: ['light', 'dark', 'system'].map((mode) => ({
            if: {
              properties: { default: { const: mode } },
              required: ['default'],
            },
            then: {
              properties: {
                allowed: { type: 'array', contains: { const: mode } },
              },
            },
          })),
          $comment:
            'The appearance validator requires default to be a member of allowed.',
        },
      ),
      semanticTokens: closedObject({}, [], {
        maxProperties: 0,
        $comment:
          'Fail closed: only the documented empty object is accepted until the semantic-token catalog is accepted.',
      }),
      extensionMap,
    },
  ),
  'navigation.schema.json': rootSchema(
    'navigation',
    {
      items: arrayOf(ref('navigationItem'), 0, 100),
      footerItems: arrayOf(ref('navigationItem'), 0, 50),
      extensions: ref('extensionMap'),
    },
    ['items', 'footerItems', 'extensions'],
    { navigationItem, navigationLeaf, extensionMap },
    {
      $comment:
        'The navigation graph validator rejects duplicate normalized internal routes within each collection.',
    },
  ),
  'content-frontmatter.schema.json': rootSchema(
    'content-frontmatter',
    {
      id: ref('stableId'),
      kind: { enum: ['article', 'page'] },
      title: graphemeBound(ref('plainText'), 1, 200),
      description: graphemeBound(ref('plainText'), 0, 500),
      language: ref('bcp47'),
      authors: arrayOf(ref('stableId'), 1, 32),
      tags: arrayOf(ref('plainLabel'), 0, 32, true),
      series: ref('plainLabel'),
      seriesOrder: { type: 'integer', minimum: 1, maximum: 1_000_000 },
      status: { enum: ['draft', 'published', 'unlisted', 'archived'] },
      createdAt: ref('rfc3339'),
      publishedAt: ref('rfc3339'),
      updatedAt: ref('rfc3339'),
      slug: ref('slug'),
      route: ref('canonicalRoute'),
      hero: ref('mediaRef'),
      socialImageRef: ref('repoRelativePath'),
      redirects: arrayOf(ref('canonicalRoute'), 0, 32, true),
      newsletter: { enum: ['ineligible', 'eligible'] },
      extensions: ref('extensionMap'),
    },
    [
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
    { mediaRef, extensionMap },
    {
      dependentRequired: { seriesOrder: ['series'] },
      allOf: [
        {
          if: {
            properties: {
              status: { enum: ['published', 'unlisted'] },
            },
            required: ['status'],
          },
          then: {
            properties: { publishedAt: {} },
            required: ['publishedAt'],
          },
          else: {
            not: {
              properties: { publishedAt: {} },
              required: ['publishedAt'],
            },
          },
        },
      ],
      $comment:
        'The content validator enforces canonical set ordering, timestamp ordering, root-kind agreement, and route/redirect collision checks.',
    },
  ),
};

/**
 * Compare the complete schema-directory inventory with the generated catalog.
 *
 * @param {string[]} actualNames sorted entries currently present
 * @param {string[]} expectedNames sorted generated file names
 * @returns {{ missing: string[], unexpected: string[] }} inventory drift
 */
export function findSchemaInventoryDrift(actualNames, expectedNames) {
  const actual = new Set(actualNames);
  const expected = new Set(expectedNames);
  return {
    missing: expectedNames.filter((name) => !actual.has(name)),
    unexpected: actualNames.filter((name) => !expected.has(name)),
  };
}

/**
 * Generate or verify the committed author-source schema files.
 *
 * @param {boolean} check verify files instead of writing them
 * @returns {Promise<void>} completion
 */
async function generateAuthorSourceSchemas(check) {
  const schemaDirectory = path.resolve('schemas');
  await mkdir(schemaDirectory, { recursive: true });
  const expectedFileNames = Object.keys(schemas).sort();
  const entries = await readdir(schemaDirectory, { withFileTypes: true });
  const actualEntries = entries
    .map((entry) => (entry.isFile() ? entry.name : `${entry.name}/`))
    .sort();
  const inventoryDrift = findSchemaInventoryDrift(
    actualEntries,
    expectedFileNames,
  );

  if (inventoryDrift.unexpected.length > 0) {
    throw new Error(
      `schemas/ contains unexpected entries: ${inventoryDrift.unexpected.join(', ')}`,
    );
  }
  if (check && inventoryDrift.missing.length > 0) {
    throw new Error(
      `schemas/ is missing generated files: ${inventoryDrift.missing.join(', ')}`,
    );
  }

  const prettierConfiguration = (await resolveConfig(schemaDirectory)) ?? {};

  for (const [fileName, schema] of Object.entries(schemas)) {
    const target = path.join(schemaDirectory, fileName);
    const expected = await format(JSON.stringify(schema), {
      ...prettierConfiguration,
      parser: 'json',
    });
    if (check) {
      const actual = await readFile(target, 'utf8');
      if (actual !== expected) {
        throw new Error(
          `${path.relative(process.cwd(), target)} is stale; run npm run schemas:generate`,
        );
      }
      continue;
    }
    await writeFile(target, expected, 'utf8');
  }

  process.stdout.write(
    check
      ? 'Committed author-source schemas match deterministic generation.\n'
      : 'Generated six author-source schemas.\n',
  );
}

await runIfMain(import.meta.url, async () => {
  await generateAuthorSourceSchemas(process.argv.includes('--check'));
});
