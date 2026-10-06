import {
  KEYWORD_ENUMS,
  MODE_VARIANT_TYPES,
  THEME_TOKEN_CATALOG,
  TOKEN_TYPES,
  TOKEN_VALUE_MAX_LENGTH,
  VALUE_PATTERNS,
} from './internal-semantics/theme-token-grammar.js';

const MANIFEST_MEDIA_TYPES = [
  'text/html; charset=utf-8',
  'text/css; charset=utf-8',
  'text/plain; charset=utf-8',
  'application/javascript; charset=utf-8',
  'application/json; charset=utf-8',
  'application/manifest+json; charset=utf-8',
  'application/atom+xml; charset=utf-8',
  'application/rss+xml; charset=utf-8',
  'application/xml; charset=utf-8',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/svg+xml',
  'font/woff2',
  'application/octet-stream',
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'video/mp4',
  'video/webm',
];

// SCHEMA-2.17.0: the closed media types an article body may refer to (cover
// image and in-text images/sound/video, pass-through, no derived formats).
// SVG stays refused (arbitrary script), so it is deliberately absent here
// even though MANIFEST_MEDIA_TYPES admits it for the theme's own built
// assets. Split by category (rather than a `pattern`-matched prefix) so the
// per-category byteLength bound below stays fixture-synthesizable.
const CONTENT_IMAGE_MEDIA_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/gif',
];
const CONTENT_AUDIO_MEDIA_TYPES = [
  'audio/mpeg',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
];
const CONTENT_VIDEO_MEDIA_TYPES = ['video/mp4', 'video/webm'];
const CONTENT_MEDIA_TYPES = [
  ...CONTENT_IMAGE_MEDIA_TYPES,
  ...CONTENT_AUDIO_MEDIA_TYPES,
  ...CONTENT_VIDEO_MEDIA_TYPES,
];

const THEME_PACKAGES = [
  '@rathnasgala2/theme-default',
  '@rathnasgala2/theme-amaze',
  '@rathnasgala2/theme-flashy',
  '@rathnasgala2/theme-minimal',
  '@rathnasgala2/theme-zebra',
];

const ADAPTER_PACKAGES = [
  '@rathnasgala2/adapter-local-directory',
  '@rathnasgala2/adapter-github-pages',
  '@rathnasgala2/adapter-do-spaces',
];

const OIDC_CLAIM_CATALOG = [
  'actor',
  'actor_id',
  'aud',
  'event_name',
  'iss',
  'job_workflow_ref',
  'job_workflow_sha',
  'jti',
  'ref',
  'repository',
  'repository_id',
  'repository_owner',
  'repository_owner_id',
  'run_attempt',
  'run_id',
  'run_number',
  'runner_environment',
  'sha',
  'sub',
  'workflow_ref',
  'workflow_sha',
];

/**
 * Create the five S0-T03 composition and build schemas.
 *
 * @param {object} language schema construction language
 * @param {Function} language.rootSchema root-schema constructor
 * @param {Function} language.ref local-definition reference constructor
 * @param {Function} language.arrayOf bounded-array constructor
 * @param {Function} language.closedObject closed-object constructor
 * @param {Function} language.graphemeBound grapheme-bound constructor
 * @returns {Record<string, Record<string, unknown>>} schemas by output filename
 */
export function createCompositionBuildSchemas(language) {
  const { rootSchema, ref, arrayOf, closedObject, graphemeBound } = language;

  const npmPackageName = {
    type: 'string',
    minLength: 1,
    maxLength: 214,
    pattern:
      '^(?:[a-z0-9][a-z0-9._-]*|@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*)$',
    'x-gala-utf8ByteLength': { maximum: 214 },
  };

  const int64 = {
    type: 'string',
    pattern: '^(?:0|-?[1-9][0-9]*)$',
    format: 'gala-int64',
    description:
      'Canonical signed 64-bit decimal string; range is checked by the semantic validator.',
  };

  const nonNegativeInt64 = {
    type: 'string',
    pattern: '^(?:0|[1-9][0-9]*)$',
    format: 'gala-int64',
    description:
      'Canonical non-negative signed-64-bit decimal string; range is checked by the semantic validator.',
  };

  const positiveInt64 = {
    type: 'string',
    minLength: 1,
    maxLength: 19,
    pattern: '^[1-9][0-9]*$',
    format: 'gala-positive-int64',
    'x-gala-maximum': '9223372036854775807',
  };

  const spdxExpression = {
    type: 'string',
    minLength: 1,
    maxLength: 128,
    pattern: '^[\\x20-\\x7E]+$',
    format: 'gala-spdx-expression',
    'x-gala-utf8ByteLength': { minimum: 1, maximum: 128 },
  };

  const githubPositiveDecimal = {
    type: 'string',
    minLength: 1,
    maxLength: 20,
    pattern: '^[1-9][0-9]{0,19}$',
    format: 'gala-github-positive-uint64',
    'x-gala-maximum': '18446744073709551615',
  };

  const packageIdentity = closedObject(
    {
      package: ref('npmPackageName'),
      version: ref('semver'),
      integrity: ref('digest'),
      registry: ref('urlHttps'),
    },
    ['package', 'version', 'integrity', 'registry'],
  );

  const lockedPackage = closedObject(
    {
      package: ref('npmPackageName'),
      version: ref('semver'),
      integrity: ref('digest'),
      registry: ref('urlHttps'),
      contractVersion: ref('semver'),
      compatibleWith: ref('semverRange'),
    },
    [
      'package',
      'version',
      'integrity',
      'registry',
      'contractVersion',
      'compatibleWith',
    ],
  );

  const lockedTemplate = closedObject(
    {
      package: ref('npmPackageName'),
      version: ref('semver'),
      integrity: ref('digest'),
      registry: ref('urlHttps'),
      contractVersion: ref('semver'),
      compatibleWith: ref('semverRange'),
      templateModules: { const: [] },
    },
    [
      'package',
      'version',
      'integrity',
      'registry',
      'contractVersion',
      'compatibleWith',
      'templateModules',
    ],
  );

  const dependencyEdge = closedObject(
    { from: ref('packageExact'), to: ref('packageExact') },
    ['from', 'to'],
  );

  const selectedThemePackage = {
    allOf: [
      ref('packageIdentity'),
      { properties: { package: { enum: THEME_PACKAGES } } },
    ],
  };

  const selectedLockedThemePackage = {
    allOf: [
      ref('lockedPackage'),
      { properties: { package: { enum: THEME_PACKAGES } } },
    ],
  };

  const selectedAdapterPackage = {
    allOf: [
      ref('packageIdentity'),
      { properties: { package: { enum: ADAPTER_PACKAGES } } },
    ],
  };

  const selectedLockedAdapterPackage = {
    allOf: [
      ref('lockedPackage'),
      { properties: { package: { enum: ADAPTER_PACKAGES } } },
    ],
  };

  const publisherPackages = {
    type: 'array',
    prefixItems: [
      {
        allOf: [
          ref('packageIdentity'),
          {
            properties: {
              package: { const: '@rathnasgala2/publish-action' },
            },
          },
        ],
      },
      {
        allOf: [
          ref('packageIdentity'),
          {
            properties: {
              package: { const: '@rathnasgala2/publish-kernel' },
            },
          },
        ],
      },
      {
        allOf: [
          ref('packageIdentity'),
          {
            properties: {
              package: { const: '@rathnasgala2/adapter-protocol' },
            },
          },
        ],
      },
      selectedAdapterPackage,
    ],
    items: false,
    minItems: 4,
    maxItems: 4,
  };

  const lockedPublisherPackages = {
    type: 'array',
    prefixItems: [
      {
        allOf: [
          ref('lockedPackage'),
          {
            properties: {
              package: { const: '@rathnasgala2/publish-action' },
            },
          },
        ],
      },
      {
        allOf: [
          ref('lockedPackage'),
          {
            properties: {
              package: { const: '@rathnasgala2/publish-kernel' },
            },
          },
        ],
      },
      {
        allOf: [
          ref('lockedPackage'),
          {
            properties: {
              package: { const: '@rathnasgala2/adapter-protocol' },
            },
          },
        ],
      },
      selectedLockedAdapterPackage,
    ],
    items: false,
    minItems: 4,
    maxItems: 4,
  };

  /**
   * @param {string} type token value type
   * @param {string} pattern anchored grammar
   * @returns {Record<string, unknown>} conditional rule
   */
  const patternRule = (type, pattern) => ({
    if: { properties: { type: { const: type } }, required: ['type'] },
    then: {
      properties: { light: { pattern }, dark: { pattern } },
    },
  });
  const themeToken = closedObject(
    {
      key: { enum: THEME_TOKEN_CATALOG.map(([key]) => key) },
      type: { enum: [...TOKEN_TYPES] },
      light: { type: 'string', maxLength: TOKEN_VALUE_MAX_LENGTH },
      dark: { type: 'string', maxLength: TOKEN_VALUE_MAX_LENGTH },
    },
    ['key', 'type', 'light', 'dark'],
    {
      allOf: [
        ...Object.entries(VALUE_PATTERNS).map(([type, pattern]) =>
          patternRule(type, pattern),
        ),
      ],
      $comment: `Every value is checked against its type's allow-list grammar; keyword tokens carry a per-key enum on their tokens position. Only ${MODE_VARIANT_TYPES.join(', ')} tokens may differ between light and dark; every other type must be byte-equal in both modes (enforced by the semantic validator). Font-family components are each limited to 64 ASCII bytes.`,
    },
  );

  const themeTokens = {
    type: 'array',
    prefixItems: THEME_TOKEN_CATALOG.map(([key, type]) => ({
      allOf: [
        ref('themeToken'),
        {
          properties: {
            key: { const: key },
            type: { const: type },
            ...(type === 'keyword'
              ? {
                  light: { enum: [...(KEYWORD_ENUMS[key] ?? [])] },
                  dark: { enum: [...(KEYWORD_ENUMS[key] ?? [])] },
                }
              : {}),
          },
        },
      ],
    })),
    items: false,
    minItems: THEME_TOKEN_CATALOG.length,
    maxItems: THEME_TOKEN_CATALOG.length,
  };

  const passiveAsset = closedObject(
    {
      path: ref('repoRelativePath'),
      mediaType: {
        enum: [
          'text/css',
          'font/woff2',
          'image/png',
          'image/jpeg',
          'image/webp',
          'image/avif',
          'image/svg+xml',
        ],
      },
      byteLength: ref('nonNegativeInt64'),
      sha256: ref('digest'),
      license: ref('spdxExpression'),
    },
    ['path', 'mediaType', 'byteLength', 'sha256', 'license'],
  );

  const themeBudgets = closedObject(
    {
      maximumFileBytes: ref('positiveInt64'),
      maximumTotalBytes: ref('positiveInt64'),
      maximumFiles: { type: 'integer', minimum: 1, maximum: 512 },
    },
    ['maximumFileBytes', 'maximumTotalBytes', 'maximumFiles'],
  );

  const resolvedFile = closedObject(
    { path: ref('repoRelativePath'), sourceDigest: ref('digest') },
    ['path', 'sourceDigest'],
  );

  const manifestRenderPolicyIdentity = closedObject(
    {
      name: { const: 'gala-render-policy' },
      version: ref('semver'),
      digest: ref('digest'),
    },
    ['name', 'version', 'digest'],
  );

  const renderableBody = closedObject(
    {
      sourcePath: ref('repoRelativePath'),
      sourceDigest: ref('digest'),
      bodyMediaType: { const: 'text/html' },
      body: { type: 'string', minLength: 0, maxLength: 2_000_000 },
      bodyDigest: ref('digest'),
      renderPolicy: ref('manifestRenderPolicyIdentity'),
    },
    [
      'sourcePath',
      'sourceDigest',
      'bodyMediaType',
      'body',
      'bodyDigest',
      'renderPolicy',
    ],
  );

  const resolvedMedia = closedObject(
    {
      file: ref('resolvedFile'),
      alt: graphemeBound({ type: 'string' }, 0, 300),
      role: { enum: ['informative', 'decorative'] },
    },
    ['file', 'alt', 'role'],
    {
      allOf: [
        {
          if: {
            properties: { role: { const: 'decorative' } },
            required: ['role'],
          },
          then: { properties: { alt: { const: '' } } },
          else: { properties: { alt: { minLength: 1 } } },
        },
      ],
    },
  );

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

  const localizedAuthor = closedObject(
    {
      language: ref('bcp47'),
      displayName: graphemeBound(ref('plainText'), 1, 120),
      biography: graphemeBound(ref('plainText'), 0, 2000),
    },
    ['language', 'displayName', 'biography'],
  );

  const navigationConstraint = {
    allOf: [
      {
        if: {
          properties: { type: { const: 'internal' } },
          required: ['type'],
        },
        then: {
          required: ['route'],
          not: { required: ['url'] },
        },
        else: {
          required: ['url'],
          not: { required: ['route'] },
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
      children: { const: [] },
    },
    ['type', 'label', 'children'],
    navigationConstraint,
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
    navigationConstraint,
  );

  const colorMode = closedObject(
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
            allowed: { contains: { const: mode }, type: 'array' },
          },
        },
      })),
      $comment:
        'The semantic validator requires default to be a member of allowed, and enforces canonical set ordering for allowed.',
    },
  );

  const semanticTokens = closedObject({}, [], {
    maxProperties: 0,
    $comment:
      'Fail closed: only the documented empty object is accepted until the semantic-token catalog is accepted.',
  });

  const normalizedSource = {
    oneOf: [
      closedObject(
        {
          kind: { const: 'authored' },
          sourcePath: ref('repoRelativePath'),
          sourceDigest: ref('digest'),
        },
        ['kind', 'sourcePath', 'sourceDigest'],
      ),
      closedObject(
        {
          kind: { const: 'built-in-default' },
          defaultId: ref('urn'),
          defaultDigest: ref('digest'),
        },
        ['kind', 'defaultId', 'defaultDigest'],
      ),
    ],
  };

  const publicationNormalized = closedObject(
    {
      id: ref('stableId'),
      slug: ref('slug'),
      title: graphemeBound(ref('plainText'), 1, 200),
      description: graphemeBound(ref('plainText'), 1, 500),
      canonicalBase: ref('urlHttps'),
      defaultLanguage: ref('bcp47'),
      authorIds: arrayOf(ref('stableId'), 1, 32),
      contactAuthorId: ref('stableId'),
      socialLinks: arrayOf(ref('socialLink'), 0, 32),
      defaultImage: ref('resolvedFile'),
      profile: closedObject(
        { route: ref('canonicalRoute'), body: ref('renderableBody') },
        ['route', 'body'],
      ),
      footerCard: closedObject(
        {
          enabled: { type: 'boolean' },
          heading: graphemeBound(ref('plainText'), 1, 120),
          body: ref('renderableBody'),
          authorIds: arrayOf(ref('stableId'), 1, 32),
        },
        ['enabled', 'heading', 'body', 'authorIds'],
      ),
      newsletter: closedObject(
        {
          url: ref('urlHttps'),
          title: ref('plainLabel'),
          text: graphemeBound(ref('plainText'), 1, 300),
        },
        ['url', 'title', 'text'],
      ),
      sourcePath: ref('repoRelativePath'),
      sourceDigest: ref('digest'),
    },
    [
      'id',
      'slug',
      'title',
      'description',
      'canonicalBase',
      'defaultLanguage',
      'authorIds',
      'socialLinks',
      'sourcePath',
      'sourceDigest',
    ],
  );

  const authorNormalized = closedObject(
    {
      id: ref('stableId'),
      displayName: graphemeBound(ref('plainText'), 1, 120),
      biography: graphemeBound(ref('plainText'), 0, 2000),
      pronouns: graphemeBound(ref('plainText'), 1, 80),
      avatar: ref('resolvedFile'),
      links: arrayOf(ref('socialLink'), 0, 32),
      localized: arrayOf(ref('localizedAuthor'), 0, 32),
      sourcePath: ref('repoRelativePath'),
      sourceDigest: ref('digest'),
    },
    [
      'id',
      'displayName',
      'biography',
      'links',
      'localized',
      'sourcePath',
      'sourceDigest',
    ],
  );

  const navigationNormalized = closedObject(
    {
      items: arrayOf(ref('navigationItem'), 0, 100),
      footerItems: arrayOf(ref('navigationItem'), 0, 50),
      source: ref('normalizedSource'),
    },
    ['items', 'footerItems', 'source'],
  );

  const appearanceNormalized = closedObject(
    {
      theme: {
        allOf: [
          ref('packageExact'),
          {
            pattern:
              '^@rathnasgala2/theme-(?:default|amaze|flashy|minimal|zebra)@',
          },
        ],
      },
      colorMode: ref('colorMode'),
      brandMark: ref('resolvedFile'),
      wordmark: ref('resolvedFile'),
      headerComposition: {
        enum: ['mark-and-name', 'name-only', 'mark-only'],
      },
      footerComposition: { enum: ['profile', 'compact', 'minimal'] },
      typeScale: { enum: ['compact', 'standard', 'spacious'] },
      fontAssets: arrayOf(ref('resolvedFile'), 0, 8),
      tokens: ref('semanticTokens'),
      source: ref('normalizedSource'),
    },
    [
      'theme',
      'colorMode',
      'headerComposition',
      'footerComposition',
      'typeScale',
      'fontAssets',
      'tokens',
      'source',
    ],
  );

  const contentFrontmatterNormalized = closedObject(
    {
      id: ref('stableId'),
      kind: { enum: ['article', 'page'] },
      title: graphemeBound(ref('plainText'), 1, 200),
      description: graphemeBound(ref('plainText'), 0, 500),
      language: ref('bcp47'),
      authorIds: arrayOf(ref('stableId'), 1, 32),
      tags: arrayOf(ref('plainLabel'), 0, 32, true),
      series: ref('plainLabel'),
      seriesOrder: { type: 'integer', minimum: 1, maximum: 1_000_000 },
      status: { enum: ['published', 'unlisted'] },
      createdAt: ref('rfc3339'),
      publishedAt: ref('rfc3339'),
      updatedAt: ref('rfc3339'),
      slug: ref('slug'),
      route: ref('canonicalRoute'),
      hero: ref('resolvedMedia'),
      socialImage: ref('resolvedFile'),
      redirects: arrayOf(ref('canonicalRoute'), 0, 32, true),
    },
    [
      'id',
      'kind',
      'title',
      'language',
      'authorIds',
      'tags',
      'status',
      'createdAt',
      'publishedAt',
      'slug',
      'redirects',
    ],
    {
      dependentRequired: { seriesOrder: ['series'] },
      $comment:
        'Timestamp ordering, canonical set ordering, route derivation, and route/redirect collision rules are enforced semantically.',
    },
  );

  const contentBuildMediaFile = closedObject(
    {
      path: ref('repoRelativePath'),
      sourceDigest: ref('digest'),
      mediaType: { enum: CONTENT_MEDIA_TYPES },
      byteLength: { type: 'integer', minimum: 1 },
    },
    ['path', 'sourceDigest', 'mediaType', 'byteLength'],
    {
      allOf: [
        {
          if: {
            properties: { mediaType: { enum: CONTENT_IMAGE_MEDIA_TYPES } },
            required: ['mediaType'],
          },
          then: { properties: { byteLength: { maximum: 5_242_880 } } },
        },
        {
          if: {
            properties: { mediaType: { enum: CONTENT_AUDIO_MEDIA_TYPES } },
            required: ['mediaType'],
          },
          then: { properties: { byteLength: { maximum: 20_971_520 } } },
        },
        {
          if: {
            properties: { mediaType: { enum: CONTENT_VIDEO_MEDIA_TYPES } },
            required: ['mediaType'],
          },
          then: { properties: { byteLength: { maximum: 52_428_800 } } },
        },
      ],
      $comment:
        'Per-mediaType byteLength bound: image 5 MiB, audio 20 MiB, video 50 MiB, matching the OpenAPI contract’s declared per-file media limits.',
    },
  );

  const contentBuildRecord = closedObject(
    {
      frontmatter: ref('contentFrontmatterNormalized'),
      body: { type: 'string', minLength: 0, maxLength: 2_000_000 },
      bodyMediaType: { const: 'text/html' },
      bodyDigest: ref('digest'),
      renderPolicy: ref('manifestRenderPolicyIdentity'),
      sourcePath: ref('repoRelativePath'),
      sourceRevision: ref('gitObjectId'),
      sourceDigest: ref('digest'),
      resolvedAuthorIds: arrayOf(ref('stableId'), 1, 32),
      media: arrayOf(ref('contentBuildMediaFile'), 0, 200),
    },
    [
      'frontmatter',
      'body',
      'bodyMediaType',
      'bodyDigest',
      'renderPolicy',
      'sourcePath',
      'sourceRevision',
      'sourceDigest',
      'resolvedAuthorIds',
    ],
  );

  const repositorySnapshot = closedObject(
    {
      repositoryId: ref('githubPositiveDecimal'),
      repositoryOwnerId: ref('githubPositiveDecimal'),
      sourceRevision: ref('gitObjectId'),
      rootDigest: ref('digest'),
    },
    ['repositoryId', 'repositoryOwnerId', 'sourceRevision', 'rootDigest'],
  );

  const buildPackages = closedObject(
    {
      schemas: {
        allOf: [
          ref('packageIdentity'),
          {
            properties: {
              package: { const: '@rathnasgala2/schemas' },
            },
          },
        ],
      },
      template: {
        allOf: [
          ref('packageIdentity'),
          {
            properties: {
              package: { const: '@rathnasgala2/template' },
            },
          },
        ],
      },
      theme: selectedThemePackage,
      publisher: publisherPackages,
      dependencies: arrayOf(ref('packageIdentity'), 0, 512, true),
    },
    ['schemas', 'template', 'theme', 'publisher', 'dependencies'],
  );

  const authoredAdapterIdentity = closedObject(
    {
      adapterId: { enum: ['local-directory', 'github-pages', 'do-spaces'] },
      adapterVersion: ref('semver'),
      adapterDigest: ref('digest'),
    },
    ['adapterId', 'adapterVersion', 'adapterDigest'],
  );

  const destinationCapabilityProfile = closedObject(
    {
      adapter: ref('authoredAdapterIdentity'),
      baseUrl: ref('urlHttps'),
      capabilityDigest: ref('digest'),
    },
    ['adapter', 'baseUrl', 'capabilityDigest'],
  );

  const githubRepositoryCoordinate = {
    type: 'string',
    minLength: 3,
    maxLength: 140,
    pattern:
      '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?/(?!\\.{1,2}$)[A-Za-z0-9._-]{1,100}$',
    format: 'gala-github-repository-coordinate',
    'x-gala-asciiByteLength': { minimum: 3, maximum: 140 },
    description:
      'Exact GitHub owner/repository spelling; the repository component cannot be dot or dot-dot.',
  };

  const githubActorLogin = {
    type: 'string',
    minLength: 1,
    maxLength: 100,
    pattern:
      '^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,98}[A-Za-z0-9])?|[A-Za-z0-9](?:[A-Za-z0-9-]{0,92}[A-Za-z0-9])?\\[bot\\])$',
    'x-gala-utf8ByteLength': { minimum: 1, maximum: 100 },
  };

  const provenanceRef = {
    type: 'string',
    minLength: 1,
    maxLength: 512,
    pattern: '^[\\x20-\\x7E]+$',
    'x-gala-utf8ByteLength': { minimum: 1, maximum: 512 },
  };

  const githubActionCoordinate = {
    type: 'string',
    minLength: 44,
    maxLength: 512,
    pattern:
      '^[A-Za-z0-9][A-Za-z0-9-]*/[A-Za-z0-9._-]+(?:/[^@]+)?@[0-9a-f]{40}$',
    format: 'gala-github-action-coordinate',
    'x-gala-utf8ByteLength': { minimum: 44, maximum: 512 },
  };

  const manifestSourceIdentity = closedObject(
    {
      provider: { const: 'github' },
      repository: ref('githubRepositoryCoordinate'),
      repositoryId: ref('githubPositiveDecimal'),
      repositoryOwnerId: ref('githubPositiveDecimal'),
      commit: ref('gitObjectId'),
      treeDigest: ref('digest'),
    },
    [
      'provider',
      'repository',
      'repositoryId',
      'repositoryOwnerId',
      'commit',
      'treeDigest',
    ],
  );

  const manifestCompositionIdentity = closedObject(
    {
      schemas: {
        allOf: [
          ref('packageIdentity'),
          {
            properties: {
              package: { const: '@rathnasgala2/schemas' },
            },
          },
        ],
      },
      template: {
        allOf: [
          ref('packageIdentity'),
          {
            properties: {
              package: { const: '@rathnasgala2/template' },
            },
          },
        ],
      },
      theme: selectedThemePackage,
      publisher: publisherPackages,
      enabledModuleConfigurationDigests: { const: [] },
    },
    [
      'schemas',
      'template',
      'theme',
      'publisher',
      'enabledModuleConfigurationDigests',
    ],
  );

  const manifestRedirect = closedObject(
    {
      sourceRoute: ref('canonicalRoute'),
      targetRoute: ref('canonicalRoute'),
      status: { const: 200 },
      backingPath: ref('repoRelativePath'),
      sha256: ref('digest'),
    },
    ['sourceRoute', 'targetRoute', 'status', 'backingPath', 'sha256'],
  );

  const manifestIncludedSource = closedObject(
    {
      path: ref('repoRelativePath'),
      sha256: ref('digest'),
      sourceRevision: ref('gitObjectId'),
      role: {
        enum: [
          'publication',
          'author',
          'content',
          'navigation',
          'appearance',
          'asset',
        ],
      },
    },
    ['path', 'sha256', 'sourceRevision', 'role'],
  );

  const manifestExcludedInput = closedObject(
    {
      path: ref('repoRelativePath'),
      sha256: ref('digest'),
      ruleId: ref('plainLabel'),
      reason: {
        enum: [
          'not-referenced-by-build-input',
          'deferred-capability-absent',
          'non-artifact-source',
          'policy-excluded',
        ],
      },
    },
    ['path', 'sha256', 'ruleId', 'reason'],
  );

  const manifestValidationEvidence = closedObject(
    {
      profile: { const: 'gala-artifact-validation-v2' },
      version: { const: '2.0.0' },
      findingCount: { type: 'integer', minimum: 0, maximum: 10_000 },
      evidenceDigest: ref('digest'),
    },
    ['profile', 'version', 'findingCount', 'evidenceDigest'],
  );

  const buildToolIdentity = {
    oneOf: [
      closedObject(
        {
          kind: { const: 'runtime' },
          name: { enum: ['node', 'npm'] },
          version: ref('semver'),
          digest: ref('digest'),
        },
        ['kind', 'name', 'version', 'digest'],
      ),
      closedObject(
        {
          kind: { const: 'package' },
          package: ref('npmPackageName'),
          version: ref('semver'),
          digest: ref('digest'),
        },
        ['kind', 'package', 'version', 'digest'],
      ),
    ],
  };

  const manifestRoute = closedObject(
    {
      path: ref('repoRelativePath'),
      mediaType: { enum: MANIFEST_MEDIA_TYPES },
      byteLength: ref('nonNegativeInt64'),
      sha256: ref('digest'),
      routeClass: { enum: ['html', 'feed', 'sitemap', 'asset', 'error'] },
      stableContentId: ref('stableId'),
      sourceRevision: ref('gitObjectId'),
      interactionBearing: { const: false },
    },
    [
      'path',
      'mediaType',
      'byteLength',
      'sha256',
      'routeClass',
      'interactionBearing',
    ],
  );

  const manifestAsset = closedObject(
    {
      path: ref('repoRelativePath'),
      mediaType: { enum: MANIFEST_MEDIA_TYPES },
      byteLength: ref('nonNegativeInt64'),
      sha256: ref('digest'),
      immutable: { type: 'boolean' },
    },
    ['path', 'mediaType', 'byteLength', 'sha256', 'immutable'],
  );

  const finding = closedObject(
    {
      code: ref('plainLabel'),
      severity: { enum: ['error', 'warning', 'info'] },
      pointer: { type: 'string', minLength: 1, maxLength: 1024 },
      messageKey: ref('plainLabel'),
    },
    ['code', 'severity', 'pointer', 'messageKey'],
  );

  const measurement = closedObject(
    {
      name: ref('plainLabel'),
      unit: ref('plainLabel'),
      value: ref('int64'),
    },
    ['name', 'unit', 'value'],
  );

  const assertedWorkload = closedObject(
    {
      repository: ref('githubRepositoryCoordinate'),
      repositoryId: ref('githubPositiveDecimal'),
      repositoryOwner: ref('plainLabel'),
      repositoryOwnerId: ref('githubPositiveDecimal'),
      ref: ref('provenanceRef'),
      sourceCommit: ref('gitObjectId'),
      workflowTriggerCommit: ref('gitObjectId'),
      runId: ref('githubPositiveDecimal'),
      runNumber: ref('githubPositiveDecimal'),
      runAttempt: { type: 'integer', minimum: 1, maximum: 51 },
      eventName: { enum: ['create', 'workflow_dispatch'] },
      actor: ref('githubActorLogin'),
      actorId: ref('githubPositiveDecimal'),
      callerPath: { const: '.github/workflows/gala-publish-v2.yml' },
      verificationState: { const: 'pending-authorize-oidc' },
    },
    [
      'repository',
      'repositoryId',
      'repositoryOwner',
      'repositoryOwnerId',
      'ref',
      'sourceCommit',
      'workflowTriggerCommit',
      'runId',
      'runNumber',
      'runAttempt',
      'eventName',
      'actor',
      'actorId',
      'callerPath',
      'verificationState',
    ],
  );

  const workflowFileEvidence = closedObject(
    {
      role: { enum: ['author-caller', 'publish', 'authorize', 'report'] },
      repositoryId: ref('githubPositiveDecimal'),
      path: ref('repoRelativePath'),
      commit: ref('gitObjectId'),
      fileDigest: ref('digest'),
      identitySource: { enum: ['declared-graph', 'locked-release'] },
    },
    ['role', 'repositoryId', 'path', 'commit', 'fileDigest', 'identitySource'],
  );

  const workflowFiles = {
    type: 'array',
    prefixItems: [
      {
        allOf: [
          ref('workflowFileEvidence'),
          {
            properties: {
              role: { const: 'author-caller' },
              path: { const: '.github/workflows/gala-publish-v2.yml' },
              identitySource: { const: 'declared-graph' },
            },
          },
        ],
      },
      {
        allOf: [
          ref('workflowFileEvidence'),
          {
            properties: {
              role: { const: 'publish' },
              path: { const: '.github/workflows/publish-v2.yml' },
              identitySource: { const: 'locked-release' },
            },
          },
        ],
      },
      {
        allOf: [
          ref('workflowFileEvidence'),
          {
            properties: {
              role: { const: 'authorize' },
              path: { const: '.github/workflows/authorize-v2.yml' },
              identitySource: { const: 'locked-release' },
            },
          },
        ],
      },
      {
        allOf: [
          ref('workflowFileEvidence'),
          {
            properties: {
              role: { const: 'report' },
              path: { const: '.github/workflows/report-v2.yml' },
              identitySource: { const: 'locked-release' },
            },
          },
        ],
      },
    ],
    items: false,
    minItems: 4,
    maxItems: 4,
  };

  const actionPinEvidence = closedObject(
    {
      use: ref('githubActionCoordinate'),
      commit: ref('gitObjectId'),
      actionDefinitionDigest: ref('digest'),
    },
    ['use', 'commit', 'actionDefinitionDigest'],
  );

  const workflowCarrierEvidence = closedObject(
    {
      purpose: { enum: ['verified-inputs', 'unfrozen-output'] },
      artifactId: ref('githubActionsArtifactId'),
      name: ref('plainLabel'),
      byteCount: ref('nonNegativeInt64'),
      digest: ref('digest'),
      expiresAt: ref('rfc3339'),
    },
    ['purpose', 'artifactId', 'name', 'byteCount', 'digest', 'expiresAt'],
  );

  const artifactLicenseConclusion = closedObject(
    {
      artifactPath: ref('repoRelativePath'),
      licenseConcluded: { type: 'string', minLength: 1, maxLength: 128 },
      sourceKind: { enum: ['generated', 'theme-passive-asset'] },
      themeAssetPath: ref('repoRelativePath'),
    },
    ['artifactPath', 'licenseConcluded', 'sourceKind'],
    {
      allOf: [
        {
          if: {
            properties: { sourceKind: { const: 'generated' } },
            required: ['sourceKind'],
          },
          then: {
            properties: { licenseConcluded: { const: 'NOASSERTION' } },
            not: { required: ['themeAssetPath'] },
          },
          else: {
            properties: { licenseConcluded: ref('spdxExpression') },
            required: ['themeAssetPath'],
          },
        },
      ],
    },
  );

  const manifestReproducibleBuildRecord = closedObject(
    {
      repositoryId: ref('githubPositiveDecimal'),
      sourceCommit: ref('gitObjectId'),
      sourceTree: ref('gitObjectId'),
      repositoryRootDigest: ref('digest'),
      buildEpoch: ref('rfc3339'),
      contractVersion: { const: '2.0.0' },
      builder: {
        allOf: [
          ref('packageIdentity'),
          {
            properties: {
              package: { const: '@rathnasgala2/publish-action' },
            },
          },
        ],
      },
      schemas: {
        allOf: [
          ref('packageIdentity'),
          {
            properties: {
              package: { const: '@rathnasgala2/schemas' },
            },
          },
        ],
      },
      template: {
        allOf: [
          ref('packageIdentity'),
          {
            properties: {
              package: { const: '@rathnasgala2/template' },
            },
          },
        ],
      },
      theme: selectedThemePackage,
      dependencyLockDigest: ref('digest'),
      packageReleaseCatalogDigest: ref('digest'),
      buildInputDigest: ref('digest'),
      baseUrl: ref('urlHttps'),
      basePath: ref('canonicalRoute'),
      destinationCapabilityDigest: ref('digest'),
      policyReleaseId: ref('stableId'),
      buildPolicyDecisionDigest: ref('digest'),
      stylingContractDigest: ref('digest'),
      renderPolicy: ref('manifestRenderPolicyIdentity'),
      workflowIdentity: ref('digest'),
    },
    [
      'repositoryId',
      'sourceCommit',
      'sourceTree',
      'repositoryRootDigest',
      'buildEpoch',
      'contractVersion',
      'builder',
      'schemas',
      'template',
      'theme',
      'dependencyLockDigest',
      'packageReleaseCatalogDigest',
      'buildInputDigest',
      'baseUrl',
      'basePath',
      'destinationCapabilityDigest',
      'policyReleaseId',
      'buildPolicyDecisionDigest',
      'stylingContractDigest',
      'renderPolicy',
      'workflowIdentity',
    ],
  );

  const buildSandboxEvidence = closedObject(
    {
      runnerEnvironment: { const: 'github-hosted' },
      runnerImageRelease: ref('plainLabel'),
      runnerImageReleaseDigest: ref('digest'),
      nodeVersion: { const: '24.18.0' },
      nodeExecutableDigest: ref('digest'),
      npmVersion: { const: '11.16.0' },
      npmExecutableDigest: ref('digest'),
      locale: { const: 'C.UTF-8' },
      timezone: { const: 'UTC' },
      sourceDateEpoch: ref('rfc3339'),
      networkPolicyDigest: ref('digest'),
      filesystemPolicyDigest: ref('digest'),
    },
    [
      'runnerEnvironment',
      'runnerImageRelease',
      'runnerImageReleaseDigest',
      'nodeVersion',
      'nodeExecutableDigest',
      'npmVersion',
      'npmExecutableDigest',
      'locale',
      'timezone',
      'sourceDateEpoch',
      'networkPolicyDigest',
      'filesystemPolicyDigest',
    ],
  );

  const buildProvenance = closedObject(
    {
      schemaId: {
        const: 'urn:gala:metadata:build-provenance:2.0.0',
      },
      schemaVersion: { const: '2.0.0' },
      assertedWorkload: ref('assertedWorkload'),
      requiredOidcClaims: { const: OIDC_CLAIM_CATALOG },
      workflowFiles,
      actionPins: arrayOf(ref('actionPinEvidence'), 1, 32, true),
      verifiedInputHandoff: {
        allOf: [
          ref('workflowCarrierEvidence'),
          { properties: { purpose: { const: 'verified-inputs' } } },
        ],
      },
      unfrozenOutputHandoff: {
        allOf: [
          ref('workflowCarrierEvidence'),
          { properties: { purpose: { const: 'unfrozen-output' } } },
        ],
      },
      rebuildRecord: ref('manifestReproducibleBuildRecord'),
      lockDigest: ref('digest'),
      packageReleaseCatalogDigest: ref('digest'),
      buildInputDigest: ref('digest'),
      artifactId: ref('stableId'),
      artifactDigest: ref('digest'),
      manifestDigest: ref('digest'),
      sbomDigest: ref('digest'),
      spdxLicenseListVersion: ref('semver'),
      spdxLicenseListDigest: ref('digest'),
      spdx23JsonSchemaDigest: ref('digest'),
      artifactLicenseConclusions: arrayOf(
        ref('artifactLicenseConclusion'),
        1,
        200_000,
        true,
      ),
      policyReleaseId: ref('stableId'),
      buildPolicyDecisionDigest: ref('digest'),
      capabilityDecisionDigest: ref('digest'),
      stylingContractDigest: ref('digest'),
      renderPolicy: ref('manifestRenderPolicyIdentity'),
      sandbox: ref('buildSandboxEvidence'),
      secretInputs: { const: [] },
    },
    [
      'schemaId',
      'schemaVersion',
      'assertedWorkload',
      'requiredOidcClaims',
      'workflowFiles',
      'actionPins',
      'verifiedInputHandoff',
      'unfrozenOutputHandoff',
      'rebuildRecord',
      'lockDigest',
      'packageReleaseCatalogDigest',
      'buildInputDigest',
      'artifactId',
      'artifactDigest',
      'manifestDigest',
      'sbomDigest',
      'spdxLicenseListVersion',
      'spdxLicenseListDigest',
      'spdx23JsonSchemaDigest',
      'artifactLicenseConclusions',
      'policyReleaseId',
      'buildPolicyDecisionDigest',
      'capabilityDecisionDigest',
      'stylingContractDigest',
      'renderPolicy',
      'sandbox',
      'secretInputs',
    ],
    {
      $comment:
        'Cross-record identity equalities, exact action/workflow closure, digest preimages, carrier observations, license coverage, and byte-identical rebuild predicates are enforced by validateFrozenEnvelope.',
    },
  );

  // SCHEMA-2.10.0: the raw properties/required buildProvenance was built from,
  // reused verbatim (minus the schemaId/schemaVersion pair rootSchema always
  // prepends) so the standalone build-provenance.schema.json root below is
  // byte-for-byte the same closed shape as the nested #/$defs/buildProvenance
  // copy in artifact-manifest.schema.json, published under its own DEC-097
  // metadata identity.
  const buildProvenanceProperties = buildProvenance.properties;
  const buildProvenanceRequired = buildProvenance.required.filter(
    /**
     * @param {string} name required member name
     * @returns {boolean} whether the name stays required on the standalone root
     */
    (name) => name !== 'schemaId' && name !== 'schemaVersion',
  );

  // SCHEMA-2.10.0: the complete $defs set used by artifact-manifest, reused
  // as-is for build-provenance.schema.json so every local $ref it carries
  // (transitively, through assertedWorkload/actionPinEvidence/
  // workflowCarrierEvidence/manifestReproducibleBuildRecord/artifactLicenseConclusion/
  // manifestRenderPolicyIdentity/buildSandboxEvidence) resolves inside its own file.
  const manifestDefinitions = {
    npmPackageName,
    int64,
    nonNegativeInt64,
    positiveInt64,
    spdxExpression,
    githubPositiveDecimal,
    githubActionsArtifactId: ref('githubPositiveDecimal'),
    githubRepositoryCoordinate,
    githubActorLogin,
    provenanceRef,
    githubActionCoordinate,
    packageIdentity,
    manifestSourceIdentity,
    manifestCompositionIdentity,
    manifestRedirect,
    manifestIncludedSource,
    manifestExcludedInput,
    manifestValidationEvidence,
    buildToolIdentity,
    manifestRoute,
    manifestAsset,
    finding,
    measurement,
    manifestRenderPolicyIdentity,
    assertedWorkload,
    workflowFileEvidence,
    actionPinEvidence,
    workflowCarrierEvidence,
    artifactLicenseConclusion,
    manifestReproducibleBuildRecord,
    buildSandboxEvidence,
  };
  // artifact-manifest additionally nests the complete buildProvenance shape
  // at #/$defs/buildProvenance (unchanged, internal-only; SCHEMA-2.9.1/prior
  // behavior). The standalone build-provenance.schema.json root below does
  // NOT repeat this key in its own $defs: it IS that shape at its own top
  // level, and t03-schemas.test.js's "buildProvenance remains internal to
  // artifact-manifest" assertion is scoped to exactly this nesting.
  const artifactManifestDefinitions = {
    ...manifestDefinitions,
    buildProvenance,
  };

  return {
    'template-composition.schema.json': rootSchema(
      'template-composition',
      {},
      [],
      {},
      {
        $comment:
          'MVP composition is intentionally empty: deferred module properties and every unknown property reject.',
      },
    ),
    'theme-contract.schema.json': rootSchema(
      'theme-contract',
      {
        themeId: ref('slug'),
        package: {
          allOf: [
            ref('packageExact'),
            {
              pattern:
                '^@rathnasgala2/theme-(?:default|amaze|flashy|minimal|zebra)@',
            },
          ],
        },
        contractVersion: ref('semver'),
        templateRange: ref('semverRange'),
        stylesheets: arrayOf(ref('repoRelativePath'), 1, 16),
        cssLayers: arrayOf(ref('plainLabel'), 1, 16),
        slotHooks: arrayOf(ref('plainLabel'), 1, 256, true),
        tokens: themeTokens,
        modes: { const: ['dark', 'light', 'system'] },
        assets: arrayOf(ref('passiveAsset'), 0, 256),
        fixtures: arrayOf(ref('plainLabel'), 1, 64, true),
        browserPolicyRef: { const: 'gala-theme-css-v2-20211224' },
        integrity: ref('digest'),
        budgets: ref('themeBudgets'),
        fixtureDigest: ref('digest'),
        evidenceDigest: ref('digest'),
        stylingContractDigest: ref('digest'),
      },
      [
        'themeId',
        'package',
        'contractVersion',
        'templateRange',
        'stylesheets',
        'cssLayers',
        'slotHooks',
        'tokens',
        'modes',
        'assets',
        'fixtures',
        'browserPolicyRef',
        'integrity',
        'budgets',
        'fixtureDigest',
        'evidenceDigest',
        'stylingContractDigest',
      ],
      {
        positiveInt64,
        nonNegativeInt64,
        spdxExpression,
        themeToken,
        passiveAsset,
        themeBudgets,
      },
      {
        allOf: [
          {
            oneOf: THEME_PACKAGES.map((packageName) => ({
              properties: {
                themeId: {
                  const: packageName.slice('@rathnasgala2/theme-'.length),
                },
                package: { pattern: `^${packageName.replace('/', '\\/')}@` },
              },
            })),
          },
          {
            oneOf: [
              {
                properties: {
                  stylesheets: {
                    const: ['tokens.css', 'components.css', 'print.css'],
                  },
                  cssLayers: {
                    const: ['gala-tokens', 'gala-components', 'gala-print'],
                  },
                },
              },
              {
                properties: {
                  stylesheets: {
                    const: [
                      'tokens.css',
                      'components.css',
                      'utilities.css',
                      'print.css',
                    ],
                  },
                  cssLayers: {
                    const: [
                      'gala-tokens',
                      'gala-components',
                      'gala-utilities',
                      'gala-print',
                    ],
                  },
                },
              },
            ],
          },
        ],
        $comment:
          'The semantic validator enforces package/theme identity, slot/fixture catalogs, non-color palette equality, CSS/package admission, evidence, budgets, and every self-excluding digest.',
      },
    ),
    'lock.schema.json': rootSchema(
      'lock',
      {
        repositorySchemaVersion: ref('semver'),
        resolvedAt: ref('rfc3339'),
        resolver: {
          allOf: [
            ref('packageIdentity'),
            {
              properties: {
                package: { const: '@rathnasgala2/publish-action' },
              },
            },
          ],
        },
        schemas: {
          allOf: [
            ref('lockedPackage'),
            {
              properties: {
                package: { const: '@rathnasgala2/schemas' },
              },
            },
          ],
        },
        template: {
          allOf: [
            ref('lockedTemplate'),
            {
              properties: {
                package: { const: '@rathnasgala2/template' },
              },
            },
          ],
        },
        theme: selectedLockedThemePackage,
        publisher: lockedPublisherPackages,
        dependencies: arrayOf(ref('packageIdentity'), 0, 512, true),
        dependencyDag: arrayOf(ref('dependencyEdge'), 0, 512, true),
        lockDigest: ref('digest'),
      },
      [
        'repositorySchemaVersion',
        'resolvedAt',
        'resolver',
        'schemas',
        'template',
        'theme',
        'publisher',
        'dependencies',
        'dependencyDag',
        'lockDigest',
      ],
      {
        npmPackageName,
        packageIdentity,
        lockedPackage,
        lockedTemplate,
        dependencyEdge,
      },
      {
        $comment:
          'The semantic validator enforces role projection equality, the exact four-member publisher order, one-version dependency closure, DAG completeness/acyclicity, compatibility, artifact integrity, canonical set ordering, and the self-excluding lock digest.',
      },
    ),
    'build-input.schema.json': rootSchema(
      'build-input',
      {
        contractVersion: { const: '2.0.0' },
        repository: ref('repositorySnapshot'),
        sourceRevision: ref('gitObjectId'),
        packages: ref('buildPackages'),
        publication: ref('publicationNormalized'),
        authors: arrayOf(ref('authorNormalized'), 1, 32),
        content: arrayOf(ref('contentBuildRecord'), 1, 100_000),
        navigation: ref('navigationNormalized'),
        appearance: ref('appearanceNormalized'),
        modules: ref('moduleBuildSelection'),
        buildEpoch: ref('rfc3339'),
        baseUrl: ref('urlHttps'),
        basePath: ref('canonicalRoute'),
        destinationCapabilities: ref('destinationCapabilityProfile'),
        placements: { const: [] },
        inputDigest: ref('digest'),
      },
      [
        'contractVersion',
        'repository',
        'sourceRevision',
        'packages',
        'publication',
        'authors',
        'content',
        'navigation',
        'appearance',
        'modules',
        'buildEpoch',
        'baseUrl',
        'basePath',
        'destinationCapabilities',
        'placements',
        'inputDigest',
      ],
      {
        npmPackageName,
        githubPositiveDecimal,
        packageIdentity,
        buildPackages,
        repositorySnapshot,
        resolvedFile,
        manifestRenderPolicyIdentity,
        renderableBody,
        resolvedMedia,
        socialLink,
        localizedAuthor,
        publicationNormalized,
        authorNormalized,
        navigationLeaf,
        navigationItem,
        normalizedSource,
        navigationNormalized,
        colorMode,
        semanticTokens,
        appearanceNormalized,
        contentFrontmatterNormalized,
        contentBuildMediaFile,
        contentBuildRecord,
        moduleBuildSelection: closedObject({}, [], { maxProperties: 0 }),
        authoredAdapterIdentity,
        destinationCapabilityProfile,
      },
      {
        $comment:
          'The semantic validator enforces exact source projection, reference resolution, canonical array ordering, source/tree/digest equalities, one global render policy, package/lock equality, default-object digests, destination binding, directory-form basePath, and the self-excluding input digest.',
      },
    ),
    'artifact-manifest.schema.json': rootSchema(
      'artifact-manifest',
      {
        repositoryNodeId: ref('githubPositiveDecimal'),
        sourceCommit: ref('gitObjectId'),
        workflowIdentity: ref('digest'),
        buildToolVersions: arrayOf(ref('buildToolIdentity'), 9, 521, true),
        buildInputDigest: ref('digest'),
        artifactDigest: ref('digest'),
        routes: arrayOf(ref('manifestRoute'), 1, 100_000),
        assets: arrayOf(ref('manifestAsset'), 0, 100_000),
        findings: arrayOf(ref('finding'), 0, 10_000, true),
        measurements: arrayOf(ref('measurement'), 0, 256, true),
        policyResult: { enum: ['pass', 'pass-with-warnings', 'fail'] },
        generatedAt: ref('rfc3339'),
        reproducibilityClass: {
          enum: ['byte-identical', 'normalized-equivalent'],
        },
        artifactId: ref('stableId'),
        artifactFileCount: ref('positiveInt64'),
        artifactByteCount: ref('positiveInt64'),
        sourceIdentity: ref('manifestSourceIdentity'),
        builder: {
          allOf: [
            ref('packageIdentity'),
            {
              properties: {
                package: { const: '@rathnasgala2/publish-action' },
              },
            },
          ],
        },
        composition: ref('manifestCompositionIdentity'),
        buildInputContractVersion: { const: '2.0.0' },
        redirects: arrayOf(ref('manifestRedirect'), 0, 100_000, true),
        declarativeHeaders: { const: [] },
        includedSources: arrayOf(
          ref('manifestIncludedSource'),
          1,
          200_000,
          true,
        ),
        excludedInputs: arrayOf(ref('manifestExcludedInput'), 0, 200_000, true),
        sourceInventoryDigest: ref('digest'),
        validation: ref('manifestValidationEvidence'),
        manifestDigest: ref('digest'),
      },
      [
        'repositoryNodeId',
        'sourceCommit',
        'workflowIdentity',
        'buildToolVersions',
        'buildInputDigest',
        'artifactDigest',
        'routes',
        'assets',
        'findings',
        'measurements',
        'policyResult',
        'generatedAt',
        'reproducibilityClass',
        'artifactId',
        'artifactFileCount',
        'artifactByteCount',
        'sourceIdentity',
        'builder',
        'composition',
        'buildInputContractVersion',
        'redirects',
        'declarativeHeaders',
        'includedSources',
        'excludedInputs',
        'sourceInventoryDigest',
        'validation',
        'manifestDigest',
      ],
      artifactManifestDefinitions,
      {
        $comment:
          'The semantic validator derives totals, source partitioning, tool/workflow closure, result severity, normalized orders, route/asset uniqueness, build/lock/capability equalities, validation evidence, and all self-excluding digests. Only byte-identical manifests are deployable in the MVP. buildProvenance is also nested here (internal, validated at #/$defs/buildProvenance through the frozen-envelope fixture family) alongside its own standalone build-provenance.schema.json root (SCHEMA-2.10.0).',
      },
    ),
    // SCHEMA-2.10.0 (LOCAL-62 follow-up): buildProvenance is also published as
    // its own root. Its schemaId/schemaVersion consts use the DEC-097
    // metadata namespace (urn:gala:metadata:build-provenance:2.0.0), not the
    // urn:gala:schema:<contract>:2.0.0 pattern every other root's $id and
    // schemaId share, because it is a metadata record embedded in a build
    // envelope rather than an author-portable content contract; both the
    // $id override and the properties/required spread below carry that
    // divergence explicitly rather than relying on rootSchema's default.
    'build-provenance.schema.json': rootSchema(
      'build-provenance',
      buildProvenanceProperties,
      buildProvenanceRequired,
      manifestDefinitions,
      {
        $id: 'urn:gala:metadata:build-provenance:2.0.0',
        title: 'Gala build-provenance contract',
        $comment:
          'Exactly DEC-097 section "Build provenance and verified workload binding" (2198-2228). Cross-record identity equalities, exact action/workflow closure, digest preimages, carrier observations, license coverage, and byte-identical rebuild predicates are enforced by validateFrozenEnvelope, the same semantic validator that enforces the identical nested #/$defs/buildProvenance copy inside artifact-manifest.',
      },
    ),
  };
}
