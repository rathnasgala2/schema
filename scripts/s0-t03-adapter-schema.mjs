/**
 * @typedef {Record<string, unknown>} Schema
 */

/**
 * @typedef {object} SchemaLanguage
 * @property {(contract: string, properties: Schema, required: string[], definitions: Schema, keywords?: Schema) => Schema} rootSchema Gala root-schema factory
 * @property {(name: string) => Schema} ref local-definition reference factory
 * @property {(items: Schema, minimum: number, maximum: number, uniqueItems?: boolean) => Schema} arrayOf bounded-array factory
 * @property {(properties: Schema, required: string[], keywords?: Schema) => Schema} closedObject closed-object factory
 * @property {(schema: Schema, minimum: number, maximum: number) => Schema} graphemeBound grapheme-bound factory
 */

/**
 * The adapter protocol's explicit "expect nothing served" activation-fence
 * sentinel. LOCAL-47: an absent or `null` expectation must never silently
 * disable the fence, so "nothing is served" is a value in the fence vocabulary
 * rather than the absence of one. The bytes cannot be confused with a
 * generation identity, which is always a lowercase UUIDv7. Publish's adapter
 * protocol 2.1.0 exports the same constant as `EXPECT_NOTHING_SERVED`.
 */
const EXPECT_NOTHING_SERVED = 'gala:expect-nothing-served';

/**
 * The generation-identity alternative of the fence, as an ECMA-262 pattern
 * body. `stableId`'s body is repeated here rather than referenced because the
 * fence is one string schema with one combined pattern (see
 * {@link generationFenceDefinition}); a test pins it against the `stableId`
 * definition so the two cannot drift. The sentinel alternative is
 * {@link EXPECT_NOTHING_SERVED} itself, whose bytes need no escaping.
 */
const STABLE_ID_BODY_PATTERN =
  '[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

/**
 * The activation fence vocabulary: a generation identity, or the explicit
 * "expect nothing served" sentinel. `null` is not a member of the vocabulary.
 * LOCAL-52: it is defined exactly once, in each carrying contract's `$defs`,
 * and referenced everywhere it is carried.
 *
 * @returns {Schema} the fence schema
 */
function generationFenceDefinition() {
  return {
    type: 'string',
    pattern: `^(?:${EXPECT_NOTHING_SERVED}|${STABLE_ID_BODY_PATTERN})$`,
    description:
      'Activation fence: a generation identity, or the explicit expect-nothing-served sentinel. Never null, and never absent as a way of saying "no expectation" (LOCAL-47). This is the write-side expectation a caller states before it mutates a destination, and it is deliberately asymmetric with the observation-side fields (`observedGenerationId`), which are simply absent -- and are modelled as nullable by the in-process adapter protocol -- when nothing is served (LOCAL-52). It is deliberately one string schema with one combined pattern rather than a two-member `oneOf` of two string schemas: the admitted value set is identical, and OpenAPI Generator 7.25 turns such a union into an empty marker interface that a caller cannot carry a value in.',
  };
}

/**
 * Reference the single `$defs/generationFence` vocabulary (LOCAL-52). Every
 * carrier of the write-side activation fence references this one definition so
 * the vocabulary cannot drift between carriers, and so a rejected value is
 * reported as `EXPECTED_GENERATION_FENCE_INVALID` rather than as a bare union
 * or constant failure.
 *
 * @param {(name: string) => Schema} ref local-definition reference factory
 * @returns {Schema} the fence reference
 */
function generationFence(ref) {
  return ref('generationFence');
}

const ADAPTER_OPERATIONS = [
  'activate',
  'cleanup-staged',
  'inspect',
  'observe',
  'rollback',
  'stage',
];

const PAGE_RESPONSE_PROFILES = [
  'pages-cancel-empty-v2',
  'pages-create-deployment-json-v2',
  'pages-deployment-status-json-v2',
  'pages-site-json-v2',
];

const SPACES_RESPONSE_PROFILES = [
  'spaces-abort-multipart-v2',
  'spaces-complete-multipart-v2',
  'spaces-create-multipart-v2',
  'spaces-delete-object-v2',
  'spaces-head-object-v2',
  'spaces-list-objects-v2',
  'spaces-put-object-v2',
  'spaces-upload-part-v2',
];

const SPACES_CONTROL_RESPONSE_PROFILES = [
  'spaces-website-configuration-v2',
  'spaces-website-absent-v2',
  'spaces-website-access-denied-v2',
];

const PROVIDER_RESPONSE_PROFILES = [
  ...PAGE_RESPONSE_PROFILES,
  ...SPACES_RESPONSE_PROFILES,
];

const PAGE_ONLY_LIMIT_FIELDS = [
  'pagesArtifactProfile',
  'maximumPagesArtifactBytes',
];

const SPACES_ONLY_LIMIT_FIELDS = [
  'spacesWebsiteConfigurationDigest',
  'spacesControlPlaneBindingDigest',
  'spacesControlPlaneRequestCatalogDigest',
  'spacesControlPlaneResponseCatalogDigest',
  'spacesControlPlaneTlsProfileDigest',
];

const PAGE_ONLY_BUDGET_FIELDS = [
  'pagesCarrierConstructionSeconds',
  'pagesArtifactUploadSeconds',
  'pagesArtifactVerificationSeconds',
];

const SPACE_ONLY_BUDGET_FIELDS = ['spacesControlPlaneVerificationSeconds'];

const MANAGED_FAILURE_CODES = [
  'TARGET_CAPABILITY_UNAVAILABLE',
  'ATOMIC_ACTIVATION_UNSUPPORTED',
  'REJECTED',
  'NOT_ATTEMPTED_RETRYABLE',
  'AUTHORIZATION_LOST',
  'RATE_LIMITED',
  'PROVIDER_CONTRACT_VIOLATION',
  'OUTCOME_UNKNOWN_RECONCILING',
  'PUBLIC_VERIFICATION_INCONCLUSIVE',
  'PUBLIC_INTEGRITY_MISMATCH',
];

/**
 * Create a schema that accepts one exact, canonically ordered set array.
 *
 * @param {readonly string[]} values exact array values
 * @returns {Schema} exact-array schema
 */
function exactStringArray(values) {
  return {
    type: 'array',
    const: [...values],
    minItems: values.length,
    maxItems: values.length,
    uniqueItems: true,
  };
}

/**
 * Forbid every named property when it occurs in an enclosing object.
 *
 * @param {readonly string[]} names property names
 * @returns {Schema} false schemas keyed by property name
 */
function forbiddenProperties(names) {
  return Object.fromEntries(names.map((name) => [name, false]));
}

/**
 * Constrain every request-template response ID to one adapter catalog and
 * require every catalog response ID to occur at least once.
 *
 * Exact request-template row equality and canonical member-JCS order are
 * enforced by the semantic validator against the release-bound catalog.
 *
 * @param {readonly string[]} responseProfiles adapter response-profile catalog
 * @param {(name: string) => Schema} ref local-definition reference factory
 * @returns {Schema} request-template array refinement
 */
function requestTemplateCatalogConstraint(responseProfiles, ref) {
  return {
    type: 'array',
    items: {
      allOf: [
        ref('providerRequestTemplate'),
        {
          properties: {
            responseProfile: { enum: [...responseProfiles] },
          },
          required: ['responseProfile'],
        },
      ],
    },
    allOf: responseProfiles.map((responseProfile) => ({
      contains: {
        type: 'object',
        properties: { responseProfile: { const: responseProfile } },
        required: ['responseProfile'],
      },
      minContains: 1,
    })),
  };
}

/**
 * Build an adapter-specific managed execution-budget refinement.
 *
 * Checked summation and decreasing-deadline predicates remain semantic because
 * JSON Schema cannot add sibling integer-string values.
 *
 * @param {'github-pages' | 'do-spaces'} adapterId adapter identity
 * @param {(name: string) => Schema} ref local-definition reference factory
 * @returns {Schema} managed-budget refinement
 */
function managedBudgetConstraint(adapterId, ref) {
  const isPages = adapterId === 'github-pages';
  const required = isPages ? PAGE_ONLY_BUDGET_FIELDS : SPACE_ONLY_BUDGET_FIELDS;
  const forbidden = isPages
    ? SPACE_ONLY_BUDGET_FIELDS
    : PAGE_ONLY_BUDGET_FIELDS;

  return {
    allOf: [
      ref('managedExecutionBudget'),
      {
        properties: forbiddenProperties(forbidden),
        required: [...required],
      },
    ],
  };
}

/**
 * Build one HTTP adapter's limits refinement.
 *
 * @param {'github-pages' | 'do-spaces'} adapterId adapter identity
 * @param {(name: string) => Schema} ref local-definition reference factory
 * @returns {Schema} HTTP-limits refinement
 */
function httpLimitsConstraint(adapterId, ref) {
  const isPages = adapterId === 'github-pages';
  const required = isPages ? PAGE_ONLY_LIMIT_FIELDS : SPACES_ONLY_LIMIT_FIELDS;
  const forbidden = isPages ? SPACES_ONLY_LIMIT_FIELDS : PAGE_ONLY_LIMIT_FIELDS;
  const responseProfiles = isPages
    ? PAGE_RESPONSE_PROFILES
    : SPACES_RESPONSE_PROFILES;

  return {
    allOf: [
      ref('httpProviderLimits'),
      {
        properties: {
          ...forbiddenProperties(forbidden),
          requestTemplateProfile: {
            const: isPages
              ? 'gala-github-pages-http-v2'
              : 'gala-do-spaces-sigv4-v2',
          },
          requestTemplates: requestTemplateCatalogConstraint(
            responseProfiles,
            ref,
          ),
          managedExecutionBudget: managedBudgetConstraint(adapterId, ref),
          ...(isPages
            ? {}
            : {
                maximumProviderRequestBodyBytes: { const: '5242880' },
              }),
        },
        required: [...required],
      },
    ],
  };
}

/**
 * Create one exhaustive root adapter row.
 *
 * @param {object} row adapter row
 * @param {'local-directory' | 'github-pages' | 'do-spaces'} row.adapterId adapter identity
 * @param {'local-directory' | 'github-pages' | 'do-spaces'} row.destinationKind destination kind
 * @param {'unreachable-generation' | 'private'} row.staging staging model
 * @param {'pointer-swap' | 'provider-promotion' | 'replace-in-place'} row.activation activation model
 * @param {'expected-generation' | 'none' | 'best-effort'} row.concurrency concurrency model
 * @param {readonly string[]} row.verification exact verification set
 * @param {'complete-artifact-digest' | 'none'} row.providerInventoryAssurance inventory assurance
 * @param {boolean} row.notFoundBehavior provider-native not-found capability
 * @param {Schema} row.limits limits refinement
 * @param {boolean} row.requiresFilesystemEvidence filesystem evidence presence
 * @param {(name: string) => Schema} ref local-definition reference factory
 * @returns {Schema} exhaustive row constraint
 */
function adapterRow(row, ref) {
  const configuration = {
    redirects: false,
    headers: false,
    customDomains: false,
    notFoundBehavior: row.notFoundBehavior,
    immutableCaching: false,
  };

  return {
    properties: {
      adapter: {
        allOf: [
          ref('adapterIdentity'),
          {
            properties: { adapterId: { const: row.adapterId } },
            required: ['adapterId'],
          },
        ],
      },
      destinationKinds: exactStringArray([row.destinationKind]),
      operations: exactStringArray(ADAPTER_OPERATIONS),
      staging: { const: row.staging },
      activation: { const: row.activation },
      concurrency: { const: row.concurrency },
      idempotencyClass: { const: 'observable-identity' },
      rollback: { const: 'reupload' },
      verification: exactStringArray(row.verification),
      providerInventoryAssurance: {
        const: row.providerInventoryAssurance,
      },
      configuration: { const: configuration },
      cacheInvalidation: { const: 'none' },
      limits: row.limits,
      filesystemEvidenceDigest: row.requiresFilesystemEvidence
        ? ref('digest')
        : false,
    },
    required: row.requiresFilesystemEvidence
      ? ['filesystemEvidenceDigest']
      : [],
  };
}

/**
 * Create the accepted S0-T03 adapter-capability root schema.
 *
 * @param {SchemaLanguage} language shared schema-language helpers
 * @returns {Schema} `adapter-capability.schema.json`
 */
export function createAdapterSchema(language) {
  const { rootSchema, ref, arrayOf, closedObject } = language;

  const positiveInt64 = {
    type: 'string',
    minLength: 1,
    maxLength: 19,
    pattern: '^[1-9][0-9]*$',
    format: 'gala-positive-int64',
    'x-gala-maximum': '9223372036854775807',
  };

  const nonnegativeInt64 = {
    type: 'string',
    minLength: 1,
    maxLength: 19,
    pattern: '^(?:0|[1-9][0-9]*)$',
    format: 'gala-nonnegative-int64',
    'x-gala-maximum': '9223372036854775807',
  };

  /**
   * Refine a positive int64 with a semantic upper bound.
   *
   * @param {string} maximum inclusive decimal maximum
   * @returns {Schema} bounded decimal-string schema
   */
  const boundedPositiveInt64 = (maximum) => ({
    ...positiveInt64,
    'x-gala-maximum': maximum,
  });

  const adapterIdentity = closedObject(
    {
      adapterId: ref('plainLabel'),
      adapterVersion: ref('semver'),
      adapterDigest: ref('digest'),
    },
    ['adapterId', 'adapterVersion', 'adapterDigest'],
  );

  // LOCAL-55 (2): the destination's provider-side coordinates, named rather
  // than only digested, so a reader can tell which repository or bucket a
  // generation was served from without resolving `targetDigest` against a
  // provider. Optional: a 2.7.x document that omits it is unchanged, and its
  // `targetDigest` is unchanged either way. The member set is closed and is
  // constrained per adapter by `destinationIdentity`'s conditional branches.
  const destinationProviderCoordinates = closedObject(
    {
      owner: {
        type: 'string',
        minLength: 1,
        maxLength: 39,
        pattern: '^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$',
        'x-gala-asciiByteLength': { minimum: 1, maximum: 39 },
        description: 'GitHub owner login, for `github-pages` destinations.',
      },
      repository: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: '^(?!\\.{1,2}$)[A-Za-z0-9._-]{1,100}$',
        'x-gala-asciiByteLength': { minimum: 1, maximum: 100 },
        description: 'GitHub repository name, for `github-pages` destinations.',
      },
      region: ref('spacesRegion'),
      servedBucket: ref('spacesBucket'),
      stagingBucket: ref('spacesBucket'),
    },
    [],
  );

  /**
   * Constrain `providerBinding` to exactly one adapter's coordinate set.
   *
   * @param {string} adapterId the adapter identity
   * @param {readonly string[]} required members that adapter must name
   * @param {readonly string[]} forbidden members that adapter must not name
   * @returns {Record<string, unknown>} one conditional branch
   */
  function providerBindingBranch(adapterId, required, forbidden) {
    return {
      if: {
        properties: { adapterId: { const: adapterId } },
        required: ['adapterId', 'providerBinding'],
      },
      then: {
        properties: {
          providerBinding: {
            required: [...required],
            properties: Object.fromEntries(
              forbidden.map((name) => [name, false]),
            ),
          },
        },
      },
    };
  }

  // SCHEMA-2.9.0 (LOCAL-60a): closed per-adapter `environment` vocabulary; the
  // same rule as the deployment roots' `destinationIdentity`.
  const destinationEnvironment = {
    type: 'string',
    enum: ['github-pages', 'do-spaces', 'local-directory'],
    description:
      'One constant per adapter (LOCAL-60a): `github-pages`, `do-spaces` or `local-directory`; it equals `adapterId` for each MVP adapter.',
  };
  /**
   * Pin `environment` to the adapter constant when `adapterId` names it.
   *
   * @param {string} adapterId the adapter identity
   * @returns {Record<string, unknown>} one conditional branch
   */
  function environmentBranch(adapterId) {
    return {
      if: {
        properties: { adapterId: { const: adapterId } },
        required: ['adapterId'],
      },
      then: { properties: { environment: { const: adapterId } } },
    };
  }

  const destinationIdentity = closedObject(
    {
      environment: destinationEnvironment,
      adapterId: ref('plainLabel'),
      adapterVersion: ref('semver'),
      targetDigest: ref('digest'),
      baseUrl: ref('urlHttps'),
      providerBinding: ref('destinationProviderCoordinates'),
    },
    ['environment', 'adapterId', 'adapterVersion', 'targetDigest', 'baseUrl'],
    {
      allOf: [
        ...destinationEnvironment.enum.map(environmentBranch),
        providerBindingBranch(
          'github-pages',
          ['owner', 'repository'],
          ['region', 'servedBucket', 'stagingBucket'],
        ),
        providerBindingBranch(
          'do-spaces',
          ['region', 'servedBucket', 'stagingBucket'],
          ['owner', 'repository'],
        ),
        {
          if: {
            properties: { adapterId: { const: 'local-directory' } },
            required: ['adapterId'],
          },
          then: { properties: { providerBinding: false } },
        },
      ],
    },
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

  const githubPositiveDecimal = {
    type: 'string',
    minLength: 1,
    maxLength: 20,
    pattern: '^[1-9][0-9]{0,19}$',
    format: 'gala-github-positive-uint64',
    'x-gala-maximum': '18446744073709551615',
  };

  const managedFailureCode = {
    type: 'string',
    minLength: 1,
    maxLength: 64,
    pattern: '^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$',
    enum: MANAGED_FAILURE_CODES,
  };

  const adapterConfigurationCapabilities = closedObject(
    {
      redirects: { type: 'boolean' },
      headers: { type: 'boolean' },
      customDomains: { type: 'boolean' },
      notFoundBehavior: { type: 'boolean' },
      immutableCaching: { type: 'boolean' },
    },
    [
      'redirects',
      'headers',
      'customDomains',
      'notFoundBehavior',
      'immutableCaching',
    ],
  );

  const providerFixedHeader = closedObject(
    {
      name: ref('providerHeaderName'),
      value: ref('providerHeaderValue'),
    },
    ['name', 'value'],
  );

  const providerDerivedHeaderPairs = [
    ['host', 'origin-authority'],
    ['content-length', 'request-body-byte-count'],
    ['content-type', 'deployment-object-media-type'],
    ['cache-control', 'deployment-object-cache-control'],
    ['x-amz-date', 'sigv4-basic-timestamp'],
    ['x-amz-content-sha256', 'request-body-sha256'],
    ['x-amz-meta-gala-sha256', 'deployment-object-untagged-sha256'],
  ];

  const providerDerivedHeader = closedObject(
    {
      name: {
        enum: providerDerivedHeaderPairs.map(([name]) => name),
      },
      source: {
        enum: providerDerivedHeaderPairs.map(([, source]) => source),
      },
    },
    ['name', 'source'],
    {
      oneOf: providerDerivedHeaderPairs.map(([name, source]) => ({
        properties: { name: { const: name }, source: { const: source } },
        required: ['name', 'source'],
      })),
    },
  );

  const providerCredentialHeaderProfiles = [
    {
      name: 'authorization',
      source: 'github-token',
      prefix: 'Bearer ',
      maximumSourceBytes: 4096,
      maximumRenderedValueBytes: 4103,
    },
    {
      name: 'authorization',
      source: 'spaces-authorization-value',
      prefix: '',
      maximumSourceBytes: 2048,
      maximumRenderedValueBytes: 2048,
    },
    {
      name: 'x-amz-security-token',
      source: 'spaces-session-token',
      prefix: '',
      maximumSourceBytes: 4096,
      maximumRenderedValueBytes: 4096,
    },
  ];

  const providerCredentialHeader = closedObject(
    {
      name: { enum: ['authorization', 'x-amz-security-token'] },
      source: {
        enum: [
          'github-token',
          'spaces-authorization-value',
          'spaces-session-token',
        ],
      },
      prefix: ref('providerHeaderPrefix'),
      maximumSourceBytes: {
        type: 'integer',
        minimum: 1,
        maximum: 8175,
      },
      maximumRenderedValueBytes: {
        type: 'integer',
        minimum: 1,
        maximum: 8175,
      },
    },
    [
      'name',
      'source',
      'prefix',
      'maximumSourceBytes',
      'maximumRenderedValueBytes',
    ],
    {
      oneOf: providerCredentialHeaderProfiles.map((profile) => ({
        properties: Object.fromEntries(
          Object.entries(profile).map(([name, value]) => [
            name,
            { const: value },
          ]),
        ),
        required: [
          'name',
          'source',
          'prefix',
          'maximumSourceBytes',
          'maximumRenderedValueBytes',
        ],
      })),
    },
  );

  const providerCallClassBinding = closedObject(
    {
      stage: {
        enum: [
          'inspect',
          'stage',
          'activate',
          'observe',
          'cleanup-staged',
          'rollback',
        ],
      },
      callClass: ref('plainLabel'),
      pagesDeploymentIdSource: {
        enum: [
          'none',
          'intent-pages-build-version',
          'recovery-prior-pages-build-version',
        ],
        description:
          'Which already-retained coordinate supplies the provider deployment identity this call class addresses. `none` means the call class addresses no existing deployment.',
      },
      recoveryOnly: {
        type: 'boolean',
        description:
          'Whether the row is admitted only while the adapter is in its provider-recovery mode.',
      },
    },
    ['stage', 'callClass', 'pagesDeploymentIdSource', 'recoveryOnly'],
  );

  const providerRequestTemplate = closedObject(
    {
      stage: {
        enum: [
          'inspect',
          'stage',
          'activate',
          'observe',
          'cleanup-staged',
          'rollback',
        ],
      },
      callClass: ref('plainLabel'),
      method: { enum: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'] },
      origin: ref('urlHttps'),
      requestTargetTemplate: {
        type: 'string',
        minLength: 1,
        maxLength: 8192,
        'x-gala-utf8ByteLength': { minimum: 1, maximum: 8192 },
      },
      canonicalQueryProfile: {
        enum: [
          'none',
          'spaces-list-v2',
          'spaces-multipart-create-v2',
          'spaces-multipart-part-v2',
          'spaces-upload-id-v2',
        ],
      },
      maximumRequestTargetBytes: {
        type: 'integer',
        minimum: 1,
        maximum: 8192,
      },
      fixedHeaders: arrayOf(ref('providerFixedHeader'), 0, 32, true),
      derivedHeaders: arrayOf(ref('providerDerivedHeader'), 0, 8, true),
      credentialHeaders: arrayOf(ref('providerCredentialHeader'), 0, 2, true),
      requestBodyProfile: {
        enum: [
          'empty',
          'gala-pages-create-deployment-jcs-v2',
          'spaces-object-slice-v2',
          'spaces-generation-marker-jcs-v2',
          'spaces-multipart-completion-xml-v2',
        ],
      },
      responseProfile: ref('providerResponseProfileId'),
    },
    [
      'stage',
      'callClass',
      'method',
      'origin',
      'requestTargetTemplate',
      'canonicalQueryProfile',
      'maximumRequestTargetBytes',
      'fixedHeaders',
      'derivedHeaders',
      'credentialHeaders',
      'requestBodyProfile',
      'responseProfile',
    ],
  );

  const managedExecutionBudget = closedObject(
    {
      verifiedHandoffSeconds: {
        type: 'integer',
        minimum: 1,
        maximum: 300,
      },
      pagesCarrierConstructionSeconds: {
        type: 'integer',
        minimum: 1,
        maximum: 600,
      },
      pagesArtifactUploadSeconds: {
        type: 'integer',
        minimum: 1,
        maximum: 900,
      },
      pagesArtifactVerificationSeconds: {
        type: 'integer',
        minimum: 1,
        maximum: 300,
      },
      spacesControlPlaneVerificationSeconds: {
        type: 'integer',
        minimum: 1,
        maximum: 300,
      },
      providerExecutionSeconds: {
        type: 'integer',
        minimum: 1,
        maximum: 1500,
      },
      journalHandoffSeconds: {
        type: 'integer',
        minimum: 1,
        maximum: 300,
      },
      totalSeconds: { type: 'integer', minimum: 1, maximum: 1500 },
    },
    [
      'verifiedHandoffSeconds',
      'providerExecutionSeconds',
      'journalHandoffSeconds',
      'totalSeconds',
    ],
  );

  const filesystemProviderLimits = closedObject(
    {
      transport: { const: 'filesystem' },
      filesystemProfile: {
        const: 'gala-local-directory-filesystem-v2',
      },
      filesystemAllowlistDigest: ref('digest'),
      maximumFiles: ref('positiveInt64'),
      maximumFileBytes: ref('positiveInt64'),
      maximumArtifactBytes: ref('positiveInt64'),
      maximumProviderCallSeconds: {
        type: 'integer',
        minimum: 1,
        maximum: 3600,
      },
      maximumPathBytes: { type: 'integer', minimum: 1, maximum: 512 },
      pathRuleProfile: { const: 'gala-portable-v2' },
    },
    [
      'transport',
      'filesystemProfile',
      'filesystemAllowlistDigest',
      'maximumFiles',
      'maximumFileBytes',
      'maximumArtifactBytes',
      'maximumProviderCallSeconds',
      'maximumPathBytes',
      'pathRuleProfile',
    ],
  );

  const httpProviderLimits = closedObject(
    {
      transport: { const: 'http' },
      maximumFiles: ref('positiveInt64'),
      maximumFileBytes: ref('positiveInt64'),
      maximumArtifactBytes: ref('positiveInt64'),
      maximumProviderCallSeconds: {
        type: 'integer',
        minimum: 1,
        maximum: 3600,
      },
      maximumPathBytes: { type: 'integer', minimum: 1, maximum: 512 },
      pathRuleProfile: { const: 'gala-portable-v2' },
      requestTemplateProfile: {
        enum: ['gala-github-pages-http-v2', 'gala-do-spaces-sigv4-v2'],
      },
      requestTemplateCatalogDigest: ref('digest'),
      requestTemplates: arrayOf(ref('providerRequestTemplate'), 1, 64, true),
      callClassBinding: arrayOf(ref('providerCallClassBinding'), 1, 64, true),
      callClassBindingDigest: ref('digest'),
      responseProfileCatalogDigest: ref('digest'),
      providerCompatibilityEvidenceDigest: ref('digest'),
      tlsProfileDigest: ref('digest'),
      credentialEgressProfileDigest: ref('digest'),
      managedExecutionBudget: ref('managedExecutionBudget'),
      pagesArtifactProfile: { const: 'gala-pages-artifact-v2' },
      maximumPagesArtifactBytes: {
        ...boundedPositiveInt64('1073741824'),
      },
      spacesWebsiteConfigurationDigest: ref('digest'),
      spacesControlPlaneBindingDigest: ref('digest'),
      spacesControlPlaneRequestCatalogDigest: ref('digest'),
      spacesControlPlaneResponseCatalogDigest: ref('digest'),
      spacesControlPlaneTlsProfileDigest: ref('digest'),
      maximumProviderRequestsPerStage: {
        type: 'integer',
        minimum: 1,
        maximum: 1_000_000,
      },
      maximumProviderStageRequestBytes: boundedPositiveInt64('10737418240'),
      maximumProviderStageResponseBytes: boundedPositiveInt64('10737418240'),
      maximumProviderStageResponseWireBytes:
        boundedPositiveInt64('10737418240'),
      maximumProviderRequestHeadBytes: {
        type: 'integer',
        minimum: 1,
        maximum: 32_768,
      },
      maximumProviderRequestBodyBytes: boundedPositiveInt64('10737418240'),
      maximumProviderResponseHeadBytes: {
        type: 'integer',
        minimum: 1,
        maximum: 65_536,
      },
      maximumProviderResponseBodyBytes: boundedPositiveInt64('1073741824'),
      maximumProviderResponseWireBodyBytes: boundedPositiveInt64('1073807360'),
    },
    [
      'transport',
      'maximumFiles',
      'maximumFileBytes',
      'maximumArtifactBytes',
      'maximumProviderCallSeconds',
      'maximumPathBytes',
      'pathRuleProfile',
      'requestTemplateProfile',
      'requestTemplateCatalogDigest',
      'requestTemplates',
      'responseProfileCatalogDigest',
      'providerCompatibilityEvidenceDigest',
      'tlsProfileDigest',
      'credentialEgressProfileDigest',
      'managedExecutionBudget',
      'maximumProviderRequestsPerStage',
      'maximumProviderStageRequestBytes',
      'maximumProviderStageResponseBytes',
      'maximumProviderStageResponseWireBytes',
      'maximumProviderRequestHeadBytes',
      'maximumProviderRequestBodyBytes',
      'maximumProviderResponseHeadBytes',
      'maximumProviderResponseBodyBytes',
      'maximumProviderResponseWireBodyBytes',
    ],
    {
      // LOCAL-52 (2): the optional `(stage, callClass)` binding table is
      // integrity-bound by its own digest rather than by
      // `requestTemplateCatalogDigest`, whose domain
      // (`GALA-PROVIDER-REQUEST-TEMPLATES-V2\0`) is closed by DEC-097 section
      // 8. Either member may be absent; declaring one requires the other.
      dependentRequired: {
        callClassBinding: ['callClassBindingDigest'],
        callClassBindingDigest: ['callClassBinding'],
      },
    },
  );

  const providerResponseCatalog = {
    oneOf: [
      closedObject(
        {
          profile: { const: 'gala-provider-response-catalog-v2' },
          adapter: {
            allOf: [
              ref('adapterIdentity'),
              {
                properties: { adapterId: { const: 'github-pages' } },
                required: ['adapterId'],
              },
            ],
          },
          responseProfiles: exactStringArray(PAGE_RESPONSE_PROFILES),
          catalogDigest: ref('digest'),
        },
        ['profile', 'adapter', 'responseProfiles', 'catalogDigest'],
      ),
      closedObject(
        {
          profile: { const: 'gala-provider-response-catalog-v2' },
          adapter: {
            allOf: [
              ref('adapterIdentity'),
              {
                properties: { adapterId: { const: 'do-spaces' } },
                required: ['adapterId'],
              },
            ],
          },
          responseProfiles: exactStringArray(SPACES_RESPONSE_PROFILES),
          catalogDigest: ref('digest'),
        },
        ['profile', 'adapter', 'responseProfiles', 'catalogDigest'],
      ),
    ],
  };

  const spacesControlPlaneResponseCatalog = closedObject(
    {
      profile: {
        const: 'gala-do-spaces-control-plane-responses-v2',
      },
      responseProfiles: exactStringArray(SPACES_CONTROL_RESPONSE_PROFILES),
      catalogDigest: ref('digest'),
    },
    ['profile', 'responseProfiles', 'catalogDigest'],
  );

  const spacesBucket = {
    type: 'string',
    minLength: 3,
    maxLength: 63,
    pattern: '^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$',
    'x-gala-asciiByteLength': { minimum: 3, maximum: 63 },
  };

  const spacesRegion = {
    type: 'string',
    pattern: '^[a-z]{3}[1-9][0-9]?$',
    'x-gala-asciiByteLength': { minimum: 4, maximum: 5 },
  };

  const destinationProviderBinding = {
    oneOf: [
      closedObject(
        {
          kind: { const: 'local-directory' },
          rootIdentityDigest: ref('digest'),
          mutationSurfaceDigest: ref('digest'),
        },
        ['kind', 'rootIdentityDigest', 'mutationSurfaceDigest'],
      ),
      closedObject(
        {
          kind: { const: 'github-pages' },
          repository: ref('githubRepositoryCoordinate'),
          repositoryId: ref('githubPositiveDecimal'),
          apiOrigin: { const: 'https://api.github.com' },
          environment: { const: 'github-pages' },
        },
        ['kind', 'repository', 'repositoryId', 'apiOrigin', 'environment'],
      ),
      closedObject(
        {
          kind: { const: 'do-spaces' },
          servedBucket: ref('spacesBucket'),
          stagingBucket: ref('spacesBucket'),
          region: ref('spacesRegion'),
          regionCatalogDigest: ref('digest'),
          servedApiOrigin: ref('urlHttps'),
          stagingApiOrigin: ref('urlHttps'),
          websiteOrigin: ref('urlHttps'),
          websiteConfigurationDigest: ref('digest'),
          controlPlaneBindingDigest: ref('digest'),
        },
        [
          'kind',
          'servedBucket',
          'stagingBucket',
          'region',
          'regionCatalogDigest',
          'servedApiOrigin',
          'stagingApiOrigin',
          'websiteOrigin',
          'websiteConfigurationDigest',
          'controlPlaneBindingDigest',
        ],
      ),
    ],
  };

  const spacesWebsiteConfiguration = closedObject(
    {
      profile: { const: 'gala-do-spaces-website-configuration-v2' },
      indexDocumentSuffix: { const: 'index.html' },
      errorDocumentKey: ref('repoRelativePath'),
      routingRules: { const: [] },
      configurationDigest: ref('digest'),
    },
    [
      'profile',
      'indexDocumentSuffix',
      'errorDocumentKey',
      'routingRules',
      'configurationDigest',
    ],
  );

  const spacesControlPlaneBinding = closedObject(
    {
      profile: { const: 'gala-do-spaces-control-plane-binding-v2' },
      servedBucket: ref('spacesBucket'),
      stagingBucket: ref('spacesBucket'),
      region: ref('spacesRegion'),
      websiteOrigin: ref('urlHttps'),
      websiteConfigurationDigest: ref('digest'),
      stagingWebsiteConfiguration: { const: 'absent' },
      deploymentCredentialWebsiteAccess: { const: 'denied' },
      bindingDigest: ref('digest'),
    },
    [
      'profile',
      'servedBucket',
      'stagingBucket',
      'region',
      'websiteOrigin',
      'websiteConfigurationDigest',
      'stagingWebsiteConfiguration',
      'deploymentCredentialWebsiteAccess',
      'bindingDigest',
    ],
  );

  const providerCredentialEgress = closedObject(
    {
      purpose: { const: 'provider-api' },
      origin: ref('urlHttps'),
      requestProfile: { const: 'provider-request-template-catalog' },
      requestTemplateCatalogDigest: ref('digest'),
      credentialSources: arrayOf(
        {
          enum: [
            'github-token',
            'spaces-authorization-value',
            'spaces-session-token',
          ],
        },
        1,
        2,
        true,
      ),
      credentialFormatProfileDigest: ref('digest'),
    },
    [
      'purpose',
      'origin',
      'requestProfile',
      'requestTemplateCatalogDigest',
      'credentialSources',
    ],
  );

  const pagesOidcCredentialEgress = closedObject(
    {
      purpose: { const: 'pages-oidc' },
      originProfile: {
        const: 'gala-github-actions-oidc-origin-catalog-v2',
      },
      originCatalogDigest: ref('digest'),
      method: { const: 'GET' },
      requestTargetProfile: {
        const: 'gala-github-actions-oidc-request-target-v2',
      },
      credentialHeader: {
        const: {
          name: 'authorization',
          source: 'actions-id-token-request-token',
          prefix: 'Bearer ',
        },
      },
      audienceQuery: { const: 'preserve-runner-default-no-addition' },
      responseProfile: { const: 'gala-pages-oidc-token-json-v2' },
    },
    [
      'purpose',
      'originProfile',
      'originCatalogDigest',
      'method',
      'requestTargetProfile',
      'credentialHeader',
      'audienceQuery',
      'responseProfile',
    ],
  );

  const pageProviderEgress = {
    allOf: [
      ref('providerCredentialEgress'),
      {
        properties: {
          credentialSources: exactStringArray(['github-token']),
          credentialFormatProfileDigest: false,
        },
      },
    ],
  };

  const spacesProviderEgress = {
    allOf: [
      ref('providerCredentialEgress'),
      {
        properties: {
          credentialSources: exactStringArray([
            'spaces-authorization-value',
            'spaces-session-token',
          ]),
        },
        required: ['credentialFormatProfileDigest'],
      },
    ],
  };

  const credentialEgressProfile = closedObject(
    {
      profile: { const: 'gala-provider-credential-egress-v2' },
      egress: arrayOf(ref('credentialEgress'), 1, 2),
      networkBoundaryProfileDigest: ref('digest'),
      tlsProfileDigest: ref('digest'),
      redirects: { const: 'reject' },
      ambientProxy: { const: 'disabled' },
      netrc: { const: 'disabled' },
      cookies: { const: 'disabled' },
      credentialForwarding: { const: 'same-origin-only' },
      profileDigest: ref('digest'),
    },
    [
      'profile',
      'egress',
      'networkBoundaryProfileDigest',
      'tlsProfileDigest',
      'redirects',
      'ambientProxy',
      'netrc',
      'cookies',
      'credentialForwarding',
      'profileDigest',
    ],
    {
      oneOf: [
        {
          properties: {
            egress: {
              type: 'array',
              prefixItems: [
                pageProviderEgress,
                ref('pagesOidcCredentialEgress'),
              ],
              items: false,
              minItems: 2,
              maxItems: 2,
            },
          },
          required: ['egress'],
        },
        {
          properties: {
            egress: {
              type: 'array',
              prefixItems: [spacesProviderEgress, spacesProviderEgress],
              items: false,
              minItems: 2,
              maxItems: 2,
            },
          },
          required: ['egress'],
        },
      ],
    },
  );

  const spacesControlPlaneRequest = closedObject(
    {
      credentialRole: { enum: ['full-control', 'limited-deployment'] },
      target: { enum: ['served', 'staging'] },
      method: { const: 'GET' },
      origin: ref('urlHttps'),
      requestTarget: { const: '/?website=' },
      responseProfile: {
        enum: SPACES_CONTROL_RESPONSE_PROFILES,
      },
    },
    [
      'credentialRole',
      'target',
      'method',
      'origin',
      'requestTarget',
      'responseProfile',
    ],
  );

  /**
   * Refine one semantically ordered Spaces control-plane request row.
   *
   * @param {'full-control' | 'limited-deployment'} credentialRole credential role
   * @param {'served' | 'staging'} target bucket role
   * @param {string} responseProfile expected response profile
   * @returns {Schema} exact row refinement
   */
  const controlPlaneRequestRow = (credentialRole, target, responseProfile) => ({
    allOf: [
      ref('spacesControlPlaneRequest'),
      {
        properties: {
          credentialRole: { const: credentialRole },
          target: { const: target },
          responseProfile: { const: responseProfile },
        },
        required: ['credentialRole', 'target', 'responseProfile'],
      },
    ],
  });

  const spacesControlPlaneRequestCatalog = closedObject(
    {
      profile: { const: 'gala-do-spaces-control-plane-http-v2' },
      bindingDigest: ref('digest'),
      requests: {
        type: 'array',
        prefixItems: [
          controlPlaneRequestRow(
            'full-control',
            'served',
            'spaces-website-configuration-v2',
          ),
          controlPlaneRequestRow(
            'full-control',
            'staging',
            'spaces-website-absent-v2',
          ),
          controlPlaneRequestRow(
            'limited-deployment',
            'served',
            'spaces-website-access-denied-v2',
          ),
          controlPlaneRequestRow(
            'limited-deployment',
            'staging',
            'spaces-website-access-denied-v2',
          ),
        ],
        items: false,
        minItems: 4,
        maxItems: 4,
      },
      credentialFormatProfileDigest: ref('digest'),
      networkBoundaryProfileDigest: ref('digest'),
      tlsProfileDigest: ref('digest'),
      responseCatalogDigest: ref('digest'),
      catalogDigest: ref('digest'),
    },
    [
      'profile',
      'bindingDigest',
      'requests',
      'credentialFormatProfileDigest',
      'networkBoundaryProfileDigest',
      'tlsProfileDigest',
      'responseCatalogDigest',
      'catalogDigest',
    ],
  );

  const githubActionsOidcOrigin = {
    type: 'string',
    minLength: 47,
    maxLength: 81,
    pattern:
      '^https://pipelines(?:gh[a-z0-9]{1,32})?\\.actions\\.githubusercontent\\.com$',
    format: 'uri',
    'x-gala-asciiByteLength': { minimum: 47, maximum: 81 },
  };

  const githubActionsOidcOriginCatalog = closedObject(
    {
      profile: { const: 'gala-github-actions-oidc-origin-catalog-v2' },
      origins: arrayOf(ref('githubActionsOidcOrigin'), 1, 64, true),
      fixtureDigest: ref('digest'),
      evidenceDigest: ref('digest'),
      catalogDigest: ref('digest'),
    },
    ['profile', 'origins', 'fixtureDigest', 'evidenceDigest', 'catalogDigest'],
  );

  const pageCapabilityDecisionFields = [
    'pagesActionsArtifactName',
    'pagesActionsArtifactByteCount',
    'pagesActionsArtifactDigest',
    'pagesBuildVersion',
  ];
  // LOCAL-62: pagesActionsArtifactByteCount/pagesActionsArtifactDigest are
  // deploy-phase evidence (the artifact is built after authorization), so
  // they stay optional on the github-pages branch even though the full field
  // list above stays forbidden on the other two branches.
  const pageRequiredCapabilityDecisionFields =
    pageCapabilityDecisionFields.filter(
      (name) =>
        name !== 'pagesActionsArtifactByteCount' &&
        name !== 'pagesActionsArtifactDigest',
    );
  const spacesCapabilityDecisionFields = [
    'spacesStagePrefix',
    ...SPACES_ONLY_LIMIT_FIELDS,
  ];

  // LOCAL-62: every capabilityDecision member is annotated with the decision
  // phase it belongs to. 'issuance' members are fixed at authorization time,
  // before any deploy job runs, and are exactly what the intent's
  // capabilityDecisionDigest commits to. 'deploy' members are evidence only a
  // deploy job can produce (the built Pages Actions artifact's byte count and
  // digest) and stay optional on this shared record shape.
  /**
   * @param {Record<string, unknown>} schema member subschema
   * @returns {Record<string, unknown>} the subschema annotated issuance-phase
   */
  const issuancePhase = (schema) => ({
    ...schema,
    'x-gala-decision-phase': 'issuance',
  });
  /**
   * @param {Record<string, unknown>} schema member subschema
   * @returns {Record<string, unknown>} the subschema annotated deploy-phase
   */
  const deployPhase = (schema) => ({
    ...schema,
    'x-gala-decision-phase': 'deploy',
  });

  const capabilityDecision = closedObject(
    {
      profile: issuancePhase({ const: 'gala-capability-decision-v2' }),
      artifactId: issuancePhase(ref('stableId')),
      artifactDigest: issuancePhase(ref('digest')),
      manifestDigest: issuancePhase(ref('digest')),
      destination: issuancePhase(ref('destinationIdentity')),
      adapter: issuancePhase(ref('adapterIdentity')),
      capabilityDigest: issuancePhase(ref('digest')),
      credentialEgressProfileDigest: issuancePhase(ref('digest')),
      pagesOidcOriginCatalogDigest: issuancePhase(ref('digest')),
      artifactFileCount: issuancePhase(ref('positiveInt64')),
      deploymentObjectCount: issuancePhase(ref('positiveInt64')),
      artifactByteCount: issuancePhase(ref('positiveInt64')),
      markerByteLength: issuancePhase(ref('positiveInt64')),
      deploymentByteCount: issuancePhase(ref('positiveInt64')),
      maximumFinalPathByteLength: issuancePhase(ref('positiveInt64')),
      maximumStageRequestCount: issuancePhase(ref('positiveInt64')),
      maximumStageRequestBytes: issuancePhase(ref('positiveInt64')),
      maximumStageResponseBytes: issuancePhase(ref('positiveInt64')),
      maximumStageResponseWireBytes: issuancePhase(ref('positiveInt64')),
      pagesActionsArtifactName: issuancePhase(ref('plainLabel')),
      pagesActionsArtifactByteCount: deployPhase(ref('positiveInt64')),
      pagesActionsArtifactDigest: deployPhase(ref('digest')),
      pagesBuildVersion: issuancePhase({
        type: 'string',
        minLength: 40,
        maxLength: 40,
        pattern: '^[0-9a-f]{40}$',
      }),
      spacesStagePrefix: issuancePhase({
        type: 'string',
        minLength: 1,
        maxLength: 512,
        'x-gala-utf8ByteLength': { minimum: 1, maximum: 512 },
      }),
      spacesWebsiteConfigurationDigest: issuancePhase(ref('digest')),
      spacesControlPlaneBindingDigest: issuancePhase(ref('digest')),
      spacesControlPlaneRequestCatalogDigest: issuancePhase(ref('digest')),
      spacesControlPlaneResponseCatalogDigest: issuancePhase(ref('digest')),
      spacesControlPlaneTlsProfileDigest: issuancePhase(ref('digest')),
      decisionDigest: issuancePhase(ref('digest')),
    },
    [
      'profile',
      'artifactId',
      'artifactDigest',
      'manifestDigest',
      'destination',
      'adapter',
      'capabilityDigest',
      'artifactFileCount',
      'deploymentObjectCount',
      'artifactByteCount',
      'markerByteLength',
      'deploymentByteCount',
      'maximumFinalPathByteLength',
      'maximumStageRequestCount',
      'maximumStageRequestBytes',
      'maximumStageResponseBytes',
      'maximumStageResponseWireBytes',
      'decisionDigest',
    ],
    {
      description:
        "Every member carries x-gala-decision-phase: 'issuance' (fixed at authorization/issuance time, before any deploy job runs) or 'deploy' (evidence only a deploy job can produce, such as the built Pages Actions artifact's byte count and digest). decisionDigest is computed over every member present in the record it is given (self-excluding only decisionDigest itself), so its value depends on whether deploy-phase members were included when the digest was taken. The intent's capabilityDecisionDigest is fixed at issuance time, when deploy-phase members are not yet known and are therefore absent from the record; a deploy job that later builds a record including deploy-phase evidence produces a different decisionDigest for the same underlying facts, and must compare against the intent's capabilityDecisionDigest using an issuance-phase-only projection of its own record (LOCAL-62 option (a)), not its full record. This projection is not yet a self-enforcing schema or code guarantee in this contract (LOCAL-62 (b), tracked open); callers must not assume decisionDigest equality across a record's phase boundary without performing that projection themselves.",
      oneOf: [
        {
          properties: {
            adapter: {
              properties: { adapterId: { const: 'local-directory' } },
              required: ['adapterId'],
            },
            credentialEgressProfileDigest: false,
            pagesOidcOriginCatalogDigest: false,
            ...forbiddenProperties(pageCapabilityDecisionFields),
            ...forbiddenProperties(spacesCapabilityDecisionFields),
          },
          required: ['adapter'],
        },
        {
          properties: {
            adapter: {
              properties: { adapterId: { const: 'github-pages' } },
              required: ['adapterId'],
            },
            ...forbiddenProperties(spacesCapabilityDecisionFields),
          },
          required: [
            'adapter',
            'credentialEgressProfileDigest',
            'pagesOidcOriginCatalogDigest',
            ...pageRequiredCapabilityDecisionFields,
          ],
        },
        {
          properties: {
            adapter: {
              properties: { adapterId: { const: 'do-spaces' } },
              required: ['adapterId'],
            },
            pagesOidcOriginCatalogDigest: false,
            ...forbiddenProperties(pageCapabilityDecisionFields),
          },
          required: [
            'adapter',
            'credentialEgressProfileDigest',
            ...spacesCapabilityDecisionFields,
          ],
        },
      ],
    },
  );

  const localFilesystemSurfaceIdentity = closedObject(
    {
      profile: { const: 'gala-local-surface-identity-v2' },
      surfaceId: {
        type: 'string',
        minLength: 43,
        maxLength: 43,
        pattern: '^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$',
        format: 'gala-base64url-32-byte',
      },
      recordDigest: ref('digest'),
    },
    ['profile', 'surfaceId', 'recordDigest'],
  );

  const localFilesystemControlRow = closedObject(
    {
      profile: { const: 'gala-local-directory-control-v2' },
      sequence: { type: 'integer', minimum: 1, maximum: 1000 },
      previousRowDigest: ref('digest'),
      operationId: ref('stableId'),
      attemptId: ref('stableId'),
      stagingStageAttemptId: ref('stableId'),
      eventStageAttemptId: ref('stableId'),
      stageToken: {
        type: 'string',
        minLength: 32,
        maxLength: 32,
        pattern: '^[0-9a-f]{32}$',
      },
      generationId: ref('stableId'),
      expectedGenerationId: generationFence(ref),
      artifactDigest: ref('digest'),
      markerDigest: ref('digest'),
      state: {
        enum: [
          'preflight-passed',
          'preflight-failed',
          'staging-started',
          'stage-durable',
          'staging-failed',
          'activation-prepared',
          'activation-renamed',
          'activation-durable',
          'activation-failed',
          'activation-ambiguous',
          'observed',
          'cleanup-started',
          'cleanup-finished',
          'cleanup-failed',
          'cleanup-ambiguous',
        ],
      },
      destinationChanged: { enum: ['yes', 'no', 'unknown'] },
      failureCode: ref('managedFailureCode'),
      failureEvidenceDigest: ref('digest'),
      rowDigest: ref('digest'),
    },
    [
      'profile',
      'sequence',
      'operationId',
      'attemptId',
      'stagingStageAttemptId',
      'eventStageAttemptId',
      'stageToken',
      'generationId',
      'artifactDigest',
      'markerDigest',
      'state',
      'destinationChanged',
      'rowDigest',
    ],
    {
      allOf: [
        {
          if: {
            properties: { sequence: { const: 1 } },
            required: ['sequence'],
          },
          then: { properties: { previousRowDigest: false } },
          else: { required: ['previousRowDigest'] },
        },
        {
          if: {
            properties: {
              state: {
                enum: [
                  'preflight-failed',
                  'staging-failed',
                  'activation-failed',
                  'activation-ambiguous',
                  'cleanup-failed',
                  'cleanup-ambiguous',
                ],
              },
            },
            required: ['state'],
          },
          then: { required: ['failureCode', 'failureEvidenceDigest'] },
          else: {
            properties: {
              failureCode: false,
              failureEvidenceDigest: false,
            },
          },
        },
      ],
    },
  );

  const localObservationFields = [
    'observedGenerationId',
    'observedArtifactDigest',
    'observedMarkerDigest',
    'observedFileCount',
    'observedByteCount',
  ];

  const localFilesystemObservationEvidence = closedObject(
    {
      profile: { const: 'gala-local-directory-observation-v2' },
      filesystemEvidenceDigest: ref('digest'),
      rootIdentityDigest: ref('digest'),
      operationId: ref('stableId'),
      attemptId: ref('stableId'),
      stageAttemptId: ref('stableId'),
      expectedGenerationId: generationFence(ref),
      observedCurrentState: {
        enum: ['absent', 'valid', 'malformed', 'unsafe'],
      },
      observedGenerationId: {
        ...ref('stableId'),
        description:
          'The generation the destination is observed to be serving. Unlike the write-side `expectedGenerationId` fence, this observation-side field is simply absent when nothing is served and may be carried as null by a consumer that models it nullably: an observation reports what is there, so "nothing" is a truthful reading, while an expectation of "nothing" must be stated as the explicit expect-nothing-served sentinel and can never be an omission (LOCAL-52).',
      },
      observedArtifactDigest: ref('digest'),
      observedMarkerDigest: ref('digest'),
      observedFileCount: ref('nonnegativeInt64'),
      observedByteCount: ref('nonnegativeInt64'),
      controlHeadDigest: ref('digest'),
      observedAt: ref('rfc3339'),
      evidenceDigest: ref('digest'),
    },
    [
      'profile',
      'filesystemEvidenceDigest',
      'rootIdentityDigest',
      'operationId',
      'attemptId',
      'stageAttemptId',
      'observedCurrentState',
      'controlHeadDigest',
      'observedAt',
      'evidenceDigest',
    ],
    {
      if: {
        properties: { observedCurrentState: { const: 'valid' } },
        required: ['observedCurrentState'],
      },
      then: { required: localObservationFields },
      else: { properties: forbiddenProperties(localObservationFields) },
    },
  );

  const localFilesystemFailureEvidence = closedObject(
    {
      profile: { const: 'gala-local-directory-failure-v2' },
      filesystemEvidenceDigest: ref('digest'),
      rootIdentityDigest: ref('digest'),
      operationId: ref('stableId'),
      attemptId: ref('stableId'),
      eventStageAttemptId: ref('stableId'),
      stageToken: {
        type: 'string',
        minLength: 32,
        maxLength: 32,
        pattern: '^[0-9a-f]{32}$',
      },
      boundary: {
        enum: [
          'preflight',
          'capacity',
          'stage-create',
          'stage-write',
          'file-fsync',
          'directory-fsync',
          'stage-rename',
          'inspect',
          'pointer-prepare',
          'pointer-rename',
          'post-rename-observe',
          'cleanup-unlink',
          'cleanup-rmdir',
        ],
      },
      errorClass: {
        enum: [
          'unsupported',
          'unsafe-node',
          'ownership',
          'permission',
          'cross-device',
          'collision',
          'capacity',
          'short-write',
          'exists',
          'not-found',
          'busy',
          'io',
          'timeout',
          'ambiguous',
          'tamper',
        ],
      },
      observedCurrentState: {
        enum: [
          'not-observed',
          'absent',
          'predecessor',
          'candidate',
          'other',
          'unsafe',
        ],
      },
      destinationChanged: { enum: ['yes', 'no', 'unknown'] },
      failureCode: ref('managedFailureCode'),
      evidenceDigest: ref('digest'),
    },
    [
      'profile',
      'filesystemEvidenceDigest',
      'rootIdentityDigest',
      'operationId',
      'attemptId',
      'eventStageAttemptId',
      'stageToken',
      'boundary',
      'errorClass',
      'observedCurrentState',
      'destinationChanged',
      'failureCode',
      'evidenceDigest',
    ],
  );

  const localFilesystemPlatform = closedObject(
    {
      os: { enum: ['linux', 'darwin'] },
      architecture: { enum: ['x86_64', 'aarch64'] },
      kernelRelease: ref('plainLabel'),
      filesystemType: ref('plainLabel'),
      mountFlags: arrayOf(ref('plainLabel'), 0, 32, true),
    },
    ['os', 'architecture', 'kernelRelease', 'filesystemType', 'mountFlags'],
  );

  const localFilesystemProbeSummary = closedObject(
    {
      sameRootAndReleaseDevice: { const: true },
      rootAndAncestorsNoFollow: { const: true },
      atomicSymlinkReplacement: { const: true },
      exclusiveControlPublication: { const: true },
      directoryFsync: { const: true },
      readerIterations: { const: 10_000 },
      replacementIterations: { const: 10_000 },
      unexpectedReaderOutcomes: { const: 0 },
      transcriptDigest: ref('digest'),
    },
    [
      'sameRootAndReleaseDevice',
      'rootAndAncestorsNoFollow',
      'atomicSymlinkReplacement',
      'exclusiveControlPublication',
      'directoryFsync',
      'readerIterations',
      'replacementIterations',
      'unexpectedReaderOutcomes',
      'transcriptDigest',
    ],
  );

  const unsignedDecimal = {
    type: 'string',
    minLength: 1,
    maxLength: 20,
    pattern: '^(?:0|[1-9][0-9]*)$',
    format: 'gala-unsigned-64-bit-decimal',
    'x-gala-maximum': '18446744073709551615',
  };

  const localFilesystemCapabilityEvidence = closedObject(
    {
      profile: { const: 'gala-local-directory-capability-evidence-v2' },
      adapter: {
        allOf: [
          ref('adapterIdentity'),
          {
            properties: { adapterId: { const: 'local-directory' } },
            required: ['adapterId'],
          },
        ],
      },
      rootIdentityDigest: ref('digest'),
      mutationSurfaceDigest: ref('digest'),
      surfaceIdentityDigest: ref('digest'),
      platform: ref('localFilesystemPlatform'),
      deviceId: ref('unsignedDecimal'),
      rootFileId: ref('unsignedDecimal'),
      effectiveUserId: ref('unsignedDecimal'),
      allowlistEntryId: ref('stableId'),
      allowlistDigest: ref('digest'),
      probe: ref('localFilesystemProbeSummary'),
      observedAt: ref('rfc3339'),
      evidenceDigest: ref('digest'),
    },
    [
      'profile',
      'adapter',
      'rootIdentityDigest',
      'mutationSurfaceDigest',
      'surfaceIdentityDigest',
      'platform',
      'deviceId',
      'rootFileId',
      'effectiveUserId',
      'allowlistEntryId',
      'allowlistDigest',
      'probe',
      'observedAt',
      'evidenceDigest',
    ],
  );

  const localFilesystemAllowlistEntry = closedObject(
    {
      platform: ref('localFilesystemPlatform'),
      allowlistEntryId: ref('stableId'),
      primitiveProfile: { const: 'gala-local-directory-filesystem-v2' },
      atomicReplacementMatrixDigest: ref('digest'),
      processCrashMatrixDigest: ref('digest'),
      powerLossMatrixDigest: ref('digest'),
      maliciousFilesystemMatrixDigest: ref('digest'),
    },
    [
      'platform',
      'allowlistEntryId',
      'primitiveProfile',
      'atomicReplacementMatrixDigest',
      'processCrashMatrixDigest',
      'powerLossMatrixDigest',
      'maliciousFilesystemMatrixDigest',
    ],
  );

  const localFilesystemAllowlist = closedObject(
    {
      profile: { const: 'gala-local-filesystem-allowlist-v2' },
      entries: {
        type: 'array',
        items: ref('localFilesystemAllowlistEntry'),
        uniqueItems: true,
      },
      catalogDigest: ref('digest'),
    },
    ['profile', 'entries', 'catalogDigest'],
  );

  const localFilesystemReplacement = closedObject(
    {
      operationNumber: { type: 'integer', minimum: 1, maximum: 10_000 },
      preparedTarget: { enum: ['target-a', 'target-b'] },
      renameResult: { const: 'success' },
      readerResult: { enum: ['target-a', 'target-b'] },
    },
    ['operationNumber', 'preparedTarget', 'renameResult', 'readerResult'],
  );

  const localFilesystemControlPublication = closedObject(
    {
      publisherSource: { const: 'control' },
      publicationResult: { const: 'success' },
      conflictingSource: { const: 'race-a' },
      conflictingResult: { const: 'EEXIST' },
      publishedInodeSource: { const: 'control' },
      publishedByteSource: { const: 'control' },
    },
    [
      'publisherSource',
      'publicationResult',
      'conflictingSource',
      'conflictingResult',
      'publishedInodeSource',
      'publishedByteSource',
    ],
  );

  /**
   * Create one exact no-overwrite race outcome.
   *
   * @param {'race-a' | 'race-b'} winner successful contender
   * @returns {Schema} exact race-publication variant
   */
  const racePublicationVariant = (winner) => {
    return closedObject(
      {
        contenders: {
          const: [
            {
              source: 'race-a',
              linkResult: winner === 'race-a' ? 'success' : 'EEXIST',
            },
            {
              source: 'race-b',
              linkResult: winner === 'race-b' ? 'success' : 'EEXIST',
            },
          ],
        },
        winner: { const: winner },
        publishedInodeSource: { const: winner },
        publishedByteSource: { const: winner },
      },
      ['contenders', 'winner', 'publishedInodeSource', 'publishedByteSource'],
    );
  };

  const localFilesystemRacePublication = {
    oneOf: [racePublicationVariant('race-a'), racePublicationVariant('race-b')],
  };

  const localFilesystemProbeTranscript = closedObject(
    {
      profile: { const: 'gala-local-filesystem-probe-transcript-v2' },
      initialTarget: { const: 'target-a' },
      replacements: arrayOf(
        ref('localFilesystemReplacement'),
        10_000,
        10_000,
        true,
      ),
      controlPublication: ref('localFilesystemControlPublication'),
      racePublication: ref('localFilesystemRacePublication'),
    },
    [
      'profile',
      'initialTarget',
      'replacements',
      'controlPublication',
      'racePublication',
    ],
  );

  const definitions = {
    generationFence: generationFenceDefinition(),
    positiveInt64,
    nonnegativeInt64,
    unsignedDecimal,
    adapterIdentity,
    destinationIdentity,
    destinationProviderCoordinates,
    githubRepositoryCoordinate,
    githubPositiveDecimal,
    managedFailureCode,
    adapterConfigurationCapabilities,
    filesystemProviderLimits,
    httpProviderLimits,
    adapterProviderLimits: {
      oneOf: [ref('filesystemProviderLimits'), ref('httpProviderLimits')],
    },
    providerRequestTemplate,
    providerCallClassBinding,
    managedExecutionBudget,
    providerFixedHeader,
    providerDerivedHeader,
    providerCredentialHeader,
    providerHeaderName: {
      type: 'string',
      minLength: 1,
      maxLength: 64,
      pattern: "^[!#$%&'*+.^_`|~0-9a-z-]+$",
      'x-gala-asciiByteLength': { minimum: 1, maximum: 64 },
    },
    providerHeaderValue: {
      type: 'string',
      minLength: 1,
      maxLength: 4096,
      pattern: '^[!-~](?:[ -~]{0,4094}[!-~])?$',
      'x-gala-asciiByteLength': { minimum: 1, maximum: 4096 },
    },
    providerHeaderPrefix: {
      type: 'string',
      minLength: 0,
      maxLength: 64,
      pattern: '^(?:|[!-~](?:[ -~]*[!-~])? ?)$',
      'x-gala-asciiByteLength': { minimum: 0, maximum: 64 },
    },
    providerResponseProfileId: { enum: PROVIDER_RESPONSE_PROFILES },
    providerResponseCatalog,
    spacesControlPlaneResponseCatalog,
    spacesBucket,
    spacesRegion,
    destinationProviderBinding,
    spacesWebsiteConfiguration,
    spacesControlPlaneBinding,
    providerCredentialEgress,
    pagesOidcCredentialEgress,
    credentialEgress: {
      oneOf: [
        ref('providerCredentialEgress'),
        ref('pagesOidcCredentialEgress'),
      ],
    },
    credentialEgressProfile,
    spacesControlPlaneRequest,
    spacesControlPlaneRequestCatalog,
    githubActionsOidcOrigin,
    githubActionsOidcOriginCatalog,
    capabilityDecision,
    localFilesystemSurfaceIdentity,
    localFilesystemControlRow,
    localFilesystemObservationEvidence,
    localFilesystemFailureEvidence,
    localFilesystemPlatform,
    localFilesystemProbeSummary,
    localFilesystemCapabilityEvidence,
    localFilesystemAllowlistEntry,
    localFilesystemAllowlist,
    localFilesystemReplacement,
    localFilesystemControlPublication,
    localFilesystemRacePublication,
    localFilesystemProbeTranscript,
  };

  const rootProperties = {
    adapter: ref('adapterIdentity'),
    contractVersion: ref('semver'),
    protocolRange: ref('semverRange'),
    destinationKinds: arrayOf(
      { enum: ['local-directory', 'github-pages', 'do-spaces'] },
      1,
      1,
      true,
    ),
    operations: arrayOf(
      {
        enum: [
          'inspect',
          'stage',
          'activate',
          'observe',
          'cleanup-staged',
          'rollback',
        ],
      },
      6,
      6,
      true,
    ),
    staging: {
      enum: ['none', 'private', 'preview', 'unreachable-generation'],
    },
    activation: {
      enum: [
        'replace-in-place',
        'pointer-swap',
        'provider-promotion',
        'branch-update',
      ],
    },
    concurrency: {
      enum: ['none', 'best-effort', 'expected-generation', 'provider-etag'],
    },
    idempotencyClass: {
      enum: ['provider-key', 'observable-identity', 'none'],
    },
    rollback: { const: 'reupload' },
    verification: arrayOf(
      {
        enum: [
          'provider-state',
          'origin-http',
          'public-http',
          'artifact-digest',
          'generation-marker',
        ],
      },
      1,
      5,
      true,
    ),
    providerInventoryAssurance: {
      enum: ['none', 'complete-artifact-digest'],
    },
    configuration: ref('adapterConfigurationCapabilities'),
    cacheInvalidation: { const: 'none' },
    limits: ref('adapterProviderLimits'),
    filesystemEvidenceDigest: ref('digest'),
    capabilityDigest: ref('digest'),
  };

  const required = [
    'adapter',
    'contractVersion',
    'protocolRange',
    'destinationKinds',
    'operations',
    'staging',
    'activation',
    'concurrency',
    'idempotencyClass',
    'rollback',
    'verification',
    'providerInventoryAssurance',
    'configuration',
    'cacheInvalidation',
    'limits',
    'capabilityDigest',
  ];

  return rootSchema(
    'adapter-capability',
    rootProperties,
    required,
    definitions,
    {
      oneOf: [
        adapterRow(
          {
            adapterId: 'local-directory',
            destinationKind: 'local-directory',
            staging: 'unreachable-generation',
            activation: 'pointer-swap',
            concurrency: 'expected-generation',
            verification: [
              'artifact-digest',
              'generation-marker',
              'provider-state',
            ],
            providerInventoryAssurance: 'complete-artifact-digest',
            notFoundBehavior: false,
            limits: ref('filesystemProviderLimits'),
            requiresFilesystemEvidence: true,
          },
          ref,
        ),
        adapterRow(
          {
            adapterId: 'github-pages',
            destinationKind: 'github-pages',
            staging: 'private',
            activation: 'provider-promotion',
            concurrency: 'none',
            verification: [
              'generation-marker',
              'provider-state',
              'public-http',
            ],
            providerInventoryAssurance: 'none',
            notFoundBehavior: false,
            limits: httpLimitsConstraint('github-pages', ref),
            requiresFilesystemEvidence: false,
          },
          ref,
        ),
        adapterRow(
          {
            adapterId: 'do-spaces',
            destinationKind: 'do-spaces',
            staging: 'private',
            activation: 'replace-in-place',
            concurrency: 'best-effort',
            verification: [
              'generation-marker',
              'provider-state',
              'public-http',
            ],
            providerInventoryAssurance: 'none',
            notFoundBehavior: true,
            limits: httpLimitsConstraint('do-spaces', ref),
            requiresFilesystemEvidence: false,
          },
          ref,
        ),
      ],
    },
  );
}
