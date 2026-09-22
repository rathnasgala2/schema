const STABLE_ID_PATTERN =
  '[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';

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
 * @returns {Record<string, unknown>} the fence schema
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
 * @param {Function} ref local-definition reference factory
 * @returns {Record<string, unknown>} the fence reference
 */
function generationFence(ref) {
  return ref('generationFence');
}

const VERIFICATION_TIERS = [
  'provider-complete-digest',
  'full-public-fetch',
  'deterministic-sample',
  'critical-only',
];

const OBSERVATION_CLASSES = [
  'request-not-started',
  'request-accepted',
  'provider-state',
  'public-state',
  'deadline-finalization',
  'supersession-finalization',
  'timeout',
  'provider-error',
];

const OBSERVATION_OUTCOMES = [
  'succeeded',
  'rejected',
  'not-attempted-retryable',
  'outcome-unknown-reconciling',
  'authorization-lost',
  'rate-limited',
  'provider-contract-violation',
];

const DESTINATION_CHANGE_VALUES = ['yes', 'no', 'unknown'];

const ATTEMPT_STAGES = [
  'staging',
  'activation',
  'public-verification',
  'managed-reconciliation',
  'cleanup',
];

const THEME_PACKAGES = [
  '@rathnasgala2/theme-default',
  '@rathnasgala2/theme-amaze',
  '@rathnasgala2/theme-flashy',
  '@rathnasgala2/theme-minimal',
  '@rathnasgala2/theme-zebra',
];

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

const FORBIDDEN_VERIFICATION_HEADERS = [
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'www-authenticate',
  'proxy-authenticate',
  'authentication-info',
  'proxy-authentication-info',
  'connection',
  'keep-alive',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'location',
  'content-length',
];

/**
 * Forbid every named member.
 *
 * @param {readonly string[]} fieldNames member names
 * @returns {Record<string, unknown>} schema fragment
 */
function forbidFields(fieldNames) {
  return {
    not: {
      anyOf: fieldNames.map((fieldName) => ({ required: [fieldName] })),
    },
  };
}

/**
 * Build one discriminator condition.
 *
 * @param {string} propertyName discriminator member
 * @param {string | readonly string[]} values accepted value or values
 * @returns {Record<string, unknown>} schema fragment
 */
function discriminatorSchema(propertyName, values) {
  return {
    properties: {
      [propertyName]: Array.isArray(values)
        ? { enum: values }
        : { const: values },
    },
    required: [propertyName],
  };
}

/**
 * Require a member set exactly for one discriminator branch.
 *
 * @param {string} propertyName discriminator member
 * @param {string | readonly string[]} values accepted value or values
 * @param {readonly string[]} fieldNames conditional members
 * @returns {Record<string, unknown>} schema fragment
 */
function requireExactlyWhen(propertyName, values, fieldNames) {
  return {
    if: discriminatorSchema(propertyName, values),
    then: { required: fieldNames },
    else: forbidFields(fieldNames),
  };
}

/**
 * Build one exact tuple branch.
 *
 * @param {Record<string, unknown>} properties tuple values
 * @param {readonly string[]} required required members
 * @returns {Record<string, unknown>} schema fragment
 */
function tupleBranch(properties, required = []) {
  return {
    properties: Object.fromEntries(
      Object.entries(properties).map(([name, value]) => [
        name,
        Array.isArray(value) ? { enum: value } : { const: value },
      ]),
    ),
    required,
  };
}

/** @typedef {[string, string, string, readonly string[], boolean, string]} FailureCatalogRow */
/** @type {FailureCatalogRow[]} */
const FAILURE_CATALOG = [
  ['staging', 'TARGET_CAPABILITY_UNAVAILABLE', 'failed', ['no'], false, 'none'],
  [
    'staging',
    'ATOMIC_ACTIVATION_UNSUPPORTED',
    'failed',
    ['no'],
    false,
    'manual-intervention',
  ],
  ['staging', 'REJECTED', 'failed', ['no'], false, 'none'],
  ['staging', 'NOT_ATTEMPTED_RETRYABLE', 'failed', ['no'], true, 'retry'],
  ['staging', 'AUTHORIZATION_LOST', 'failed', ['no'], false, 'reauthorize'],
  ['staging', 'RATE_LIMITED', 'failed', ['no'], true, 'retry'],
  [
    'staging',
    'PROVIDER_CONTRACT_VIOLATION',
    'failed',
    ['no'],
    false,
    'manual-intervention',
  ],
  [
    'staging',
    'OUTCOME_UNKNOWN_RECONCILING',
    'unknown',
    ['unknown', 'yes'],
    false,
    'observe',
  ],
  ['activation', 'REJECTED', 'failed', ['no'], false, 'none'],
  ['activation', 'NOT_ATTEMPTED_RETRYABLE', 'failed', ['no'], true, 'retry'],
  ['activation', 'AUTHORIZATION_LOST', 'failed', ['no'], false, 'reauthorize'],
  ['activation', 'RATE_LIMITED', 'failed', ['no'], true, 'retry'],
  [
    'activation',
    'PROVIDER_CONTRACT_VIOLATION',
    'failed',
    ['no'],
    false,
    'manual-intervention',
  ],
  [
    'activation',
    'OUTCOME_UNKNOWN_RECONCILING',
    'unknown',
    ['unknown', 'yes'],
    false,
    'observe',
  ],
  [
    'public-verification',
    'PUBLIC_VERIFICATION_INCONCLUSIVE',
    'unknown',
    ['unknown', 'yes'],
    false,
    'observe',
  ],
  [
    'public-verification',
    'PUBLIC_INTEGRITY_MISMATCH',
    'failed',
    ['unknown', 'yes'],
    false,
    'reconcile',
  ],
  ['managed-reconciliation', 'REJECTED', 'failed', ['no'], false, 'none'],
  [
    'managed-reconciliation',
    'NOT_ATTEMPTED_RETRYABLE',
    'unknown',
    ['unknown', 'yes'],
    true,
    'retry',
  ],
  [
    'managed-reconciliation',
    'AUTHORIZATION_LOST',
    'unknown',
    ['unknown', 'yes'],
    false,
    'reauthorize',
  ],
  [
    'managed-reconciliation',
    'RATE_LIMITED',
    'unknown',
    ['unknown', 'yes'],
    true,
    'retry',
  ],
  [
    'managed-reconciliation',
    'OUTCOME_UNKNOWN_RECONCILING',
    'unknown',
    ['unknown', 'yes'],
    false,
    'observe',
  ],
  [
    'managed-reconciliation',
    'PROVIDER_CONTRACT_VIOLATION',
    'failed',
    ['unknown', 'yes'],
    false,
    'reconcile',
  ],
  ['cleanup', 'REJECTED', 'failed', ['no', 'yes'], false, 'none'],
  [
    'cleanup',
    'NOT_ATTEMPTED_RETRYABLE',
    'failed',
    ['no', 'yes'],
    true,
    'retry',
  ],
  [
    'cleanup',
    'AUTHORIZATION_LOST',
    'failed',
    ['no', 'yes'],
    false,
    'reauthorize',
  ],
  ['cleanup', 'RATE_LIMITED', 'failed', ['no', 'yes'], true, 'retry'],
  [
    'cleanup',
    'OUTCOME_UNKNOWN_RECONCILING',
    'unknown',
    ['unknown', 'yes'],
    false,
    'observe',
  ],
  [
    'cleanup',
    'PROVIDER_CONTRACT_VIOLATION',
    'failed',
    ['no', 'yes'],
    false,
    'manual-intervention',
  ],
];

/**
 * Build one failure-catalog schema branch.
 *
 * @param {FailureCatalogRow} row catalog row
 * @param {boolean} includeRecovery whether this projection owns recovery
 * @param {string} [codeProperty] code member name
 * @returns {Record<string, unknown>} schema fragment
 */
function failureCatalogBranch(row, includeRecovery, codeProperty = 'code') {
  const [stage, code, outcome, destinationChanged, retryable, recovery] = row;
  return tupleBranch(
    {
      stage,
      [codeProperty]: code,
      ...(!includeRecovery && outcome ? { outcome } : {}),
      destinationChanged,
      retryable,
      ...(includeRecovery ? { recovery } : {}),
    },
    includeRecovery
      ? ['stage', codeProperty, 'destinationChanged', 'retryable', 'recovery']
      : ['stage', codeProperty, 'outcome', 'destinationChanged', 'retryable'],
  );
}

/**
 * Create the four S0-T03 deployment-side schema documents.
 *
 * @param {object} language schema-construction helpers
 * @param {Function} language.rootSchema Gala root-schema constructor
 * @param {Function} language.ref local-definition reference constructor
 * @param {Function} language.arrayOf bounded-array constructor
 * @param {Function} language.closedObject closed-object constructor
 * @param {Function} language.graphemeBound grapheme-bound constructor
 * @returns {Record<string, Record<string, unknown>>} file-name keyed schemas
 */
export function createDeploymentSchemas(language) {
  const { rootSchema, ref, arrayOf, closedObject, graphemeBound } = language;

  const int64 = {
    type: 'string',
    pattern: '^(?:0|-?[1-9][0-9]*)$',
    format: 'gala-int64',
    description: 'Canonical signed 64-bit base-10 JSON string.',
  };
  const nonNegativeInt64 = {
    type: 'string',
    pattern: '^(?:0|[1-9][0-9]*)$',
    format: 'gala-int64',
  };
  const positiveInt64 = {
    type: 'string',
    pattern: '^[1-9][0-9]*$',
    format: 'gala-int64',
  };
  const npmPackageName = {
    type: 'string',
    minLength: 1,
    maxLength: 214,
    pattern:
      '^(?:[a-z0-9][a-z0-9._-]*|@[a-z0-9][a-z0-9._-]*/[a-z0-9][a-z0-9._-]*)$',
    'x-gala-utf8ByteLength': { maximum: 214 },
  };
  const githubPositiveDecimal = {
    type: 'string',
    minLength: 1,
    maxLength: 20,
    pattern: '^[1-9][0-9]{0,19}$',
    format: 'gala-github-positive-uint64',
  };
  const githubActionsArtifactId = ref('githubPositiveDecimal');
  const lowerHex40 = { type: 'string', pattern: '^[0-9a-f]{40}$' };
  const packageIdentity = closedObject(
    {
      package: ref('npmPackageName'),
      version: ref('semver'),
      integrity: ref('digest'),
      registry: ref('urlHttps'),
    },
    ['package', 'version', 'integrity', 'registry'],
  );
  const adapterIdentity = closedObject(
    {
      adapterId: ref('plainLabel'),
      adapterVersion: ref('semver'),
      adapterDigest: ref('digest'),
    },
    ['adapterId', 'adapterVersion', 'adapterDigest'],
  );
  const spacesRegion = {
    type: 'string',
    pattern: '^[a-z]{3}[1-9][0-9]?$',
    'x-gala-asciiByteLength': { minimum: 4, maximum: 5 },
  };

  const spacesBucket = {
    type: 'string',
    minLength: 3,
    maxLength: 63,
    pattern: '^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$',
    'x-gala-asciiByteLength': { minimum: 3, maximum: 63 },
  };

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

  // SCHEMA-2.9.0 (LOCAL-60a): `environment` is one constant per adapter. The
  // member was inherited from document 23 as a free `plainLabel`; DEC-097 pins
  // only the Pages binding's `environment: github-pages` (section 7) and gives
  // the other two adapters no vocabulary, so neither side could derive it. The
  // vocabulary is closed and, when `adapterId` names one of the three MVP
  // adapters, `environment` must be that adapter's constant.
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
      baseUrl: {
        allOf: [ref('urlHttps')],
        maxLength: 2_048,
        'x-gala-utf8ByteLength': { maximum: 2_048 },
      },
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
  const renderPolicyIdentity = closedObject(
    {
      name: ref('plainLabel'),
      version: ref('semver'),
      digest: ref('digest'),
    },
    ['name', 'version', 'digest'],
  );
  const selectedThemePackage = {
    allOf: [
      ref('packageIdentity'),
      { properties: { package: { enum: THEME_PACKAGES } } },
    ],
  };
  const reproducibleBuildRecord = closedObject(
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
            properties: { package: { const: '@rathnasgala2/schemas' } },
          },
        ],
      },
      template: {
        allOf: [
          ref('packageIdentity'),
          {
            properties: { package: { const: '@rathnasgala2/template' } },
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
      renderPolicy: ref('renderPolicyIdentity'),
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

  const verificationOrigin = {
    type: 'string',
    minLength: 9,
    maxLength: 2_048,
    pattern: '^https://[\\x21-\\x7e]+$',
    format: 'gala-verification-origin',
    'x-gala-utf8ByteLength': { maximum: 2_048 },
  };
  const verificationUrl = {
    type: 'string',
    minLength: 10,
    maxLength: 2_048,
    pattern: '^https://[\\x21-\\x7e]+$',
    format: 'gala-verification-url',
    'x-gala-utf8ByteLength': { maximum: 2_048 },
  };
  const observedRedirectLocation = {
    type: 'string',
    minLength: 1,
    maxLength: 2_048,
    pattern: '^https?://[\\x21-\\x7e]+$',
    format: 'gala-observed-redirect-location',
    'x-gala-utf8ByteLength': { maximum: 2_048 },
  };
  const probeRegion = {
    type: 'string',
    minLength: 1,
    maxLength: 32,
    pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$',
  };
  const verificationHeaderName = {
    type: 'string',
    minLength: 1,
    maxLength: 64,
    pattern: "^[!#$%&'*+.^_`|~0-9a-z-]{1,64}$",
    not: { enum: FORBIDDEN_VERIFICATION_HEADERS },
  };
  const verificationHeaderValue = {
    type: 'string',
    maxLength: 1_024,
    pattern: '^(?:$|[!-~](?:[ -~]{0,1022}[!-~])?)$',
    'x-gala-utf8ByteLength': { maximum: 1_024 },
  };
  const observedVerificationHeader = closedObject(
    {
      name: ref('verificationHeaderName'),
      state: { enum: ['present', 'absent', 'unsafe-omitted'] },
      value: ref('verificationHeaderValue'),
    },
    ['name', 'state'],
    {
      allOf: [requireExactlyWhen('state', 'present', ['value'])],
    },
  );

  const expectedRedirectHop = closedObject(
    {
      hopNumber: { type: 'integer', minimum: 0, maximum: 9 },
      requestUrl: ref('verificationUrl'),
      expectedStatus: { enum: [301, 302, 303, 307, 308] },
      expectedLocation: ref('verificationUrl'),
    },
    ['hopNumber', 'requestUrl', 'expectedStatus', 'expectedLocation'],
  );
  const verificationHeaderExpectation = closedObject(
    {
      name: ref('verificationHeaderName'),
      value: ref('verificationHeaderValue'),
    },
    ['name', 'value'],
  );
  const recognizedPriorRouteContract = closedObject(
    {
      generationId: ref('stableId'),
      redirectChain: arrayOf(ref('expectedRedirectHop'), 0, 10),
      terminalRequestUrl: ref('verificationUrl'),
      expectedTerminalStatus: { enum: [200, 404] },
      expectedByteLength: ref('nonNegativeInt64'),
      expectedHeaders: arrayOf(ref('verificationHeaderExpectation'), 0, 32),
      expectedDigest: ref('digest'),
    },
    [
      'generationId',
      'redirectChain',
      'terminalRequestUrl',
      'expectedTerminalStatus',
      'expectedByteLength',
      'expectedHeaders',
      'expectedDigest',
    ],
  );
  const verificationPlanTarget = closedObject(
    {
      targetId: { type: 'integer', minimum: 1, maximum: 900 },
      origin: ref('verificationOrigin'),
      route: ref('canonicalRoute'),
      requiredProbeRegions: arrayOf(ref('probeRegion'), 1, 8, true),
      redirectChain: arrayOf(ref('expectedRedirectHop'), 0, 10),
      terminalRequestUrl: ref('verificationUrl'),
      expectedTerminalStatus: { enum: [200, 404] },
      expectedByteLength: ref('nonNegativeInt64'),
      maximumResponseBytes: ref('nonNegativeInt64'),
      maximumResponseWireBytes: ref('positiveInt64'),
      requestTimeoutSeconds: { type: 'integer', minimum: 1, maximum: 30 },
      requestProfile: { const: 'gala-public-verifier-v2' },
      retryProfile: { const: 'gala-public-probe-retry-v2' },
      maximumAttempts: { type: 'integer', minimum: 1, maximum: 10 },
      maximumConcurrentStreams: {
        type: 'integer',
        minimum: 1,
        maximum: 32,
      },
      expectedHeaders: arrayOf(ref('verificationHeaderExpectation'), 0, 32),
      expectedCandidateDigest: ref('digest'),
      recognizedPriorContracts: arrayOf(
        ref('recognizedPriorRouteContract'),
        0,
        6,
      ),
    },
    [
      'targetId',
      'origin',
      'route',
      'requiredProbeRegions',
      'redirectChain',
      'terminalRequestUrl',
      'expectedTerminalStatus',
      'expectedByteLength',
      'maximumResponseBytes',
      'maximumResponseWireBytes',
      'requestTimeoutSeconds',
      'requestProfile',
      'retryProfile',
      'maximumAttempts',
      'maximumConcurrentStreams',
      'expectedHeaders',
      'expectedCandidateDigest',
      'recognizedPriorContracts',
    ],
  );

  const pagesInterveningRunAttempt = closedObject(
    {
      runAttempt: { type: 'integer', minimum: 2, maximum: 50 },
      authorityState: { const: 'closed-no-destination-authority' },
      decisionDigest: ref('digest'),
    },
    ['runAttempt', 'authorityState', 'decisionDigest'],
  );
  const pagesRunAttemptGapProof = closedObject(
    {
      profile: { const: 'gala-pages-run-attempt-gap-proof-v2' },
      runId: ref('githubPositiveDecimal'),
      priorRunAttempt: { type: 'integer', minimum: 1, maximum: 50 },
      claimingRunAttempt: { type: 'integer', minimum: 2, maximum: 51 },
      interveningAttempts: arrayOf(
        ref('pagesInterveningRunAttempt'),
        0,
        49,
        true,
      ),
      proofDigest: ref('digest'),
    },
    [
      'profile',
      'runId',
      'priorRunAttempt',
      'claimingRunAttempt',
      'interveningAttempts',
      'proofDigest',
    ],
  );
  const pagesReconciliationRecovery = closedObject(
    {
      profile: { const: 'gala-pages-reconciliation-recovery-v2' },
      reconcileCommandId: ref('stableId'),
      reconcileCommandDigest: ref('digest'),
      reconcileCommandExpiresAt: ref('rfc3339'),
      priorAttemptId: ref('stableId'),
      runAttemptGapProof: ref('pagesRunAttemptGapProof'),
      priorIntentDigest: ref('digest'),
      priorAuthorityEpoch: ref('positiveInt64'),
      priorAuthorityId: ref('stableId'),
      priorExpectedGenerationId: ref('stableId'),
      priorProposedGenerationId: ref('stableId'),
      priorPagesBuildVersion: ref('lowerHex40'),
      priorFenceEvidenceDigest: ref('digest'),
      recoveryDigest: ref('digest'),
    },
    [
      'profile',
      'reconcileCommandId',
      'reconcileCommandDigest',
      'reconcileCommandExpiresAt',
      'priorAttemptId',
      'runAttemptGapProof',
      'priorIntentDigest',
      'priorAuthorityEpoch',
      'priorAuthorityId',
      'priorProposedGenerationId',
      'priorPagesBuildVersion',
      'priorFenceEvidenceDigest',
      'recoveryDigest',
    ],
  );
  const pagesReconciliationCommand = closedObject(
    {
      profile: { const: 'gala-pages-reconciliation-command-v2' },
      reconcileCommandId: ref('stableId'),
      operationId: ref('stableId'),
      publicationId: ref('stableId'),
      generationId: ref('stableId'),
      actorPrincipalId: ref('stableId'),
      consequentialConfirmationId: ref('stableId'),
      runId: ref('githubPositiveDecimal'),
      priorRunAttempt: { type: 'integer', minimum: 1, maximum: 50 },
      priorAttemptId: ref('stableId'),
      priorIntentDigest: ref('digest'),
      priorAuthorityEpoch: ref('positiveInt64'),
      priorAuthorityId: ref('stableId'),
      priorFenceEvidenceDigest: ref('digest'),
      acceptedAt: ref('rfc3339'),
      expiresAt: ref('rfc3339'),
      commandDigest: ref('digest'),
    },
    [
      'profile',
      'reconcileCommandId',
      'operationId',
      'publicationId',
      'generationId',
      'actorPrincipalId',
      'consequentialConfirmationId',
      'runId',
      'priorRunAttempt',
      'priorAttemptId',
      'priorIntentDigest',
      'priorAuthorityEpoch',
      'priorAuthorityId',
      'priorFenceEvidenceDigest',
      'acceptedAt',
      'expiresAt',
      'commandDigest',
    ],
  );
  const destinationMutationAuthority = closedObject(
    {
      profile: { const: 'gala-destination-mutation-authority-v2' },
      mode: { enum: ['normal', 'pages-reconciliation-recovery'] },
      destination: ref('destinationIdentity'),
      destinationMutationKeyDigest: ref('digest'),
      epoch: ref('positiveInt64'),
      authorityId: ref('stableId'),
      operationId: ref('stableId'),
      attemptId: ref('stableId'),
      expectedGenerationId: generationFence(ref),
      proposedGenerationId: ref('stableId'),
      expiresAt: ref('rfc3339'),
      pagesRecovery: ref('pagesReconciliationRecovery'),
    },
    [
      'profile',
      'mode',
      'destination',
      'destinationMutationKeyDigest',
      'epoch',
      'authorityId',
      'operationId',
      'attemptId',
      'proposedGenerationId',
      'expiresAt',
    ],
    {
      allOf: [
        requireExactlyWhen('mode', 'pages-reconciliation-recovery', [
          'pagesRecovery',
        ]),
      ],
    },
  );

  const publicGenerationMarkerPayload = closedObject(
    {
      schemaId: {
        const: 'urn:gala:schema:public-generation-marker:2.0.0',
      },
      schemaVersion: { const: '2.0.0' },
      artifactId: ref('stableId'),
      artifactDigest: ref('digest'),
      generationId: ref('stableId'),
    },
    [
      'schemaId',
      'schemaVersion',
      'artifactId',
      'artifactDigest',
      'generationId',
    ],
  );

  const deploymentPolicyDecision = closedObject(
    {
      profile: { const: 'gala-deployment-policy-decision-v2' },
      policyReleaseId: ref('stableId'),
      policyProfile: ref('plainLabel'),
      policyVersion: ref('semver'),
      approvedOverrides: { const: [] },
      artifactId: ref('stableId'),
      artifactDigest: ref('digest'),
      manifestDigest: ref('digest'),
      buildPolicyDecisionDigest: ref('digest'),
      destination: ref('destinationIdentity'),
      capabilityDecisionDigest: ref('digest'),
      verificationTier: { enum: VERIFICATION_TIERS },
      verificationOrigins: arrayOf(ref('verificationOrigin'), 1, 8, true),
      verificationPlanDigest: ref('digest'),
      retryProfile: { const: 'gala-public-probe-retry-v2' },
      maximumAttemptsPerTarget: {
        type: 'integer',
        minimum: 1,
        maximum: 10,
      },
      maximumRedirectHops: { type: 'integer', minimum: 0, maximum: 10 },
      maximumConcurrentStreams: {
        type: 'integer',
        minimum: 1,
        maximum: 32,
      },
      maximumPublicResponseBytes: ref('positiveInt64'),
      requestTimeoutSeconds: { type: 'integer', minimum: 1, maximum: 30 },
      activationDetectionProfile: {
        const: 'gala-public-activation-detection-v2',
      },
      maximumActivationDetectionAttempts: { const: 91 },
      activationDetectionIntervalSeconds: { const: 60 },
      maximumPublicVerificationSeconds: {
        type: 'integer',
        minimum: 1,
        maximum: 3_600,
      },
      maximumFinalizationDelaySeconds: { const: 300 },
      networkBoundaryProfileDigest: ref('digest'),
      publicTlsProfileDigest: ref('digest'),
      publicTlsTrustStoreDigest: ref('digest'),
      publicTlsRevocationSetDigest: ref('digest'),
      decisionDigest: ref('digest'),
    },
    [
      'profile',
      'policyReleaseId',
      'policyProfile',
      'policyVersion',
      'approvedOverrides',
      'artifactId',
      'artifactDigest',
      'manifestDigest',
      'buildPolicyDecisionDigest',
      'destination',
      'capabilityDecisionDigest',
      'verificationTier',
      'verificationOrigins',
      'verificationPlanDigest',
      'retryProfile',
      'maximumAttemptsPerTarget',
      'maximumRedirectHops',
      'maximumConcurrentStreams',
      'maximumPublicResponseBytes',
      'requestTimeoutSeconds',
      'activationDetectionProfile',
      'maximumActivationDetectionAttempts',
      'activationDetectionIntervalSeconds',
      'maximumPublicVerificationSeconds',
      'maximumFinalizationDelaySeconds',
      'networkBoundaryProfileDigest',
      'publicTlsProfileDigest',
      'publicTlsTrustStoreDigest',
      'publicTlsRevocationSetDigest',
      'decisionDigest',
    ],
  );

  const activationDetectionPlan = closedObject(
    {
      profile: { const: 'gala-public-activation-detection-v2' },
      operationId: ref('stableId'),
      attemptId: ref('stableId'),
      artifactId: ref('stableId'),
      proposedGenerationId: ref('stableId'),
      target: ref('verificationPlanTarget'),
      probeRegion: ref('probeRegion'),
      firstEligibleAt: ref('rfc3339'),
      lastEligibleAt: ref('rfc3339'),
      maximumAttempts: { const: 91 },
      intervalSeconds: { const: 60 },
      requestTimeoutSeconds: { type: 'integer', minimum: 1, maximum: 30 },
      maximumRedirectHops: { type: 'integer', minimum: 0, maximum: 10 },
      reservedProbeSlots: {
        allOf: [ref('positiveInt64')],
        type: 'string',
        pattern: '^(?:[1-9]|[1-9][0-9]|[1-9][0-9]{2}|1000|1001)$',
      },
      planDigest: ref('digest'),
    },
    [
      'profile',
      'operationId',
      'attemptId',
      'artifactId',
      'proposedGenerationId',
      'target',
      'probeRegion',
      'firstEligibleAt',
      'lastEligibleAt',
      'maximumAttempts',
      'intervalSeconds',
      'requestTimeoutSeconds',
      'maximumRedirectHops',
      'reservedProbeSlots',
      'planDigest',
    ],
  );

  const activationBasis = closedObject(
    {
      source: {
        enum: ['kernel-provider-observation', 'gala-public-marker-detection'],
      },
      observedAt: ref('rfc3339'),
      evidenceDigest: ref('digest'),
    },
    ['source', 'observedAt', 'evidenceDigest'],
  );

  /**
   * Build one public-probe record schema.
   *
   * @param {{includeAttemptNumber: boolean, precedingField: string}} options schema options
   * @returns {Record<string, unknown>} probe schema
   */
  function createProbeSchema({ includeAttemptNumber, precedingField }) {
    const properties = {
      targetId: { type: 'integer', minimum: 1, maximum: 900 },
      ...(includeAttemptNumber
        ? {
            attemptNumber: {
              type: 'integer',
              minimum: 1,
              maximum: 10,
            },
          }
        : {}),
      hopNumber: { type: 'integer', minimum: 0, maximum: 10 },
      origin: ref('verificationOrigin'),
      route: ref('canonicalRoute'),
      requestUrl: ref('verificationUrl'),
      probeRegion: ref('probeRegion'),
      contractGenerationId: ref('stableId'),
      [precedingField]: ref('digest'),
      requestStartedAt: ref('rfc3339'),
      observedAt: ref('rfc3339'),
      expectedCandidateDigest: ref('digest'),
      responseHeadState: {
        enum: ['not-received', 'complete', 'limit-exceeded', 'malformed'],
      },
      observedStatus: { type: 'integer', minimum: 100, maximum: 599 },
      observedLocationState: {
        enum: ['absent', 'retained', 'unsafe-omitted', 'head-unavailable'],
      },
      observedLocation: ref('observedRedirectLocation'),
      observedHeaders: arrayOf(ref('observedVerificationHeader'), 0, 32),
      bodyState: {
        enum: [
          'not-read',
          'incomplete',
          'complete',
          'limit-exceeded',
          'encoding-rejected',
          'framing-rejected',
        ],
      },
      observedByteLength: ref('nonNegativeInt64'),
      observedDigest: ref('digest'),
      observedGenerationId: {
        ...ref('stableId'),
        description:
          'The generation the destination is observed to be serving. Unlike the write-side `expectedGenerationId` fence, this observation-side field is simply absent when nothing is served and may be carried as null by a consumer that models it nullably: an observation reports what is there, so "nothing" is a truthful reading, while an expectation of "nothing" must be stated as the explicit expect-nothing-served sentinel and can never be an omission (LOCAL-52).',
      },
      classification: {
        enum: [
          'redirect-match',
          'candidate',
          'recognized-prior',
          'integrity-mismatch',
          'inconclusive',
        ],
      },
      evidenceDigest: ref('digest'),
    };
    const required = [
      'targetId',
      ...(includeAttemptNumber ? ['attemptNumber'] : []),
      'hopNumber',
      'origin',
      'route',
      'requestUrl',
      'probeRegion',
      'requestStartedAt',
      'observedAt',
      'expectedCandidateDigest',
      'responseHeadState',
      'observedLocationState',
      'observedHeaders',
      'bodyState',
      'classification',
      'evidenceDigest',
    ];

    return closedObject(properties, required, {
      allOf: [
        {
          if: {
            properties: { hopNumber: { const: 0 } },
            required: ['hopNumber'],
          },
          then: forbidFields([precedingField]),
          else: { required: [precedingField] },
        },
        requireExactlyWhen('observedLocationState', 'retained', [
          'observedLocation',
        ]),
        requireExactlyWhen('bodyState', 'complete', [
          'observedByteLength',
          'observedDigest',
        ]),
        {
          if: discriminatorSchema('bodyState', 'complete'),
          else: forbidFields(['observedGenerationId']),
        },
        {
          if: discriminatorSchema('responseHeadState', 'complete'),
          then: { required: ['observedStatus'] },
        },
        {
          if: discriminatorSchema('responseHeadState', 'not-received'),
          then: {
            properties: {
              observedLocationState: { const: 'absent' },
              observedHeaders: { maxItems: 0 },
              bodyState: { const: 'not-read' },
              classification: { const: 'inconclusive' },
            },
            ...forbidFields([
              'contractGenerationId',
              'observedStatus',
              'observedLocation',
              'observedByteLength',
              'observedDigest',
              'observedGenerationId',
            ]),
          },
        },
        {
          if: discriminatorSchema('responseHeadState', [
            'limit-exceeded',
            'malformed',
          ]),
          then: {
            properties: {
              observedLocationState: { const: 'head-unavailable' },
              observedHeaders: { maxItems: 0 },
              bodyState: { const: 'not-read' },
              classification: { const: 'inconclusive' },
            },
            ...forbidFields([
              'contractGenerationId',
              'observedLocation',
              'observedByteLength',
              'observedDigest',
              'observedGenerationId',
            ]),
          },
        },
        {
          if: discriminatorSchema('observedLocationState', 'head-unavailable'),
          then: {
            properties: {
              responseHeadState: { enum: ['limit-exceeded', 'malformed'] },
            },
          },
        },
        {
          if: discriminatorSchema('bodyState', 'incomplete'),
          then: {
            properties: { classification: { const: 'inconclusive' } },
            ...forbidFields([
              'contractGenerationId',
              'observedByteLength',
              'observedDigest',
              'observedGenerationId',
            ]),
          },
        },
        {
          if: discriminatorSchema('classification', 'redirect-match'),
          then: {
            properties: {
              responseHeadState: { const: 'complete' },
              observedStatus: { enum: [301, 302, 303, 307, 308] },
              observedLocationState: { const: 'retained' },
              observedHeaders: { maxItems: 0 },
              bodyState: { const: 'not-read' },
            },
            required: [
              'contractGenerationId',
              'observedStatus',
              'observedLocation',
            ],
            ...forbidFields([
              'observedByteLength',
              'observedDigest',
              'observedGenerationId',
            ]),
          },
        },
        {
          if: discriminatorSchema('classification', [
            'candidate',
            'recognized-prior',
          ]),
          then: {
            properties: {
              responseHeadState: { const: 'complete' },
              observedLocationState: { const: 'absent' },
              observedHeaders: {
                minItems: 1,
                items: {
                  properties: { state: { const: 'present' } },
                  required: ['state'],
                },
              },
              bodyState: { const: 'complete' },
            },
            required: [
              'contractGenerationId',
              'observedStatus',
              'observedByteLength',
              'observedDigest',
            ],
          },
        },
        {
          if: discriminatorSchema('bodyState', [
            'limit-exceeded',
            'encoding-rejected',
            'framing-rejected',
          ]),
          then: {
            properties: { classification: { const: 'integrity-mismatch' } },
          },
        },
      ],
      $comment:
        'Plan equality, trusted timestamp order, redirect-chain selection, marker-specific generation presence, header-set equality, byte-count equality, and each evidence digest are enforced by the deployment semantic validator.',
    });
  }

  const publicProbeObservation = createProbeSchema({
    includeAttemptNumber: true,
    precedingField: 'precedingProbeEvidenceDigest',
  });
  const activationDetectionProbe = createProbeSchema({
    includeAttemptNumber: false,
    precedingField: 'precedingDetectionProbeEvidenceDigest',
  });
  const activationDetectionObservation = closedObject(
    {
      profile: { const: 'gala-public-activation-detection-observation-v2' },
      operationId: ref('stableId'),
      attemptId: ref('stableId'),
      planDigest: ref('digest'),
      detectionAttemptNumber: {
        type: 'integer',
        minimum: 1,
        maximum: 91,
      },
      eligibleAt: ref('rfc3339'),
      probes: arrayOf(ref('activationDetectionProbe'), 1, 11),
      receivedAt: ref('rfc3339'),
      evidenceDigest: ref('digest'),
    },
    [
      'profile',
      'operationId',
      'attemptId',
      'planDigest',
      'detectionAttemptNumber',
      'eligibleAt',
      'probes',
      'receivedAt',
      'evidenceDigest',
    ],
  );

  const deadlineFinalizationStream = closedObject(
    {
      targetId: { type: 'integer', minimum: 1, maximum: 900 },
      probeRegion: ref('probeRegion'),
      state: { enum: ['terminal', 'missing'] },
      observationId: ref('stableId'),
      evidenceDigest: ref('digest'),
    },
    ['targetId', 'probeRegion', 'state'],
    {
      allOf: [
        requireExactlyWhen('state', 'terminal', [
          'observationId',
          'evidenceDigest',
        ]),
      ],
    },
  );
  const deadlineFinalizationEvidence = closedObject(
    {
      profile: { const: 'gala-deadline-finalization-evidence-v2' },
      operationId: ref('stableId'),
      attemptId: ref('stableId'),
      intentDigest: ref('digest'),
      verificationPlanDigest: ref('digest'),
      verificationDeadlineAt: ref('rfc3339'),
      finalizationDeadlineAt: ref('rfc3339'),
      cutoffEvidenceJournalEntryCount: {
        type: 'integer',
        minimum: 0,
        maximum: 1_098,
      },
      cutoffEvidenceJournalHeadDigest: ref('digest'),
      finalizationKind: {
        enum: ['propagation-degraded', 'verification-inconclusive'],
      },
      selectedStreams: arrayOf(ref('deadlineFinalizationStream'), 1, 900, true),
      finalizedAt: ref('rfc3339'),
    },
    [
      'profile',
      'operationId',
      'attemptId',
      'intentDigest',
      'verificationPlanDigest',
      'verificationDeadlineAt',
      'finalizationDeadlineAt',
      'cutoffEvidenceJournalEntryCount',
      'cutoffEvidenceJournalHeadDigest',
      'finalizationKind',
      'selectedStreams',
      'finalizedAt',
    ],
    {
      allOf: [
        {
          if: discriminatorSchema(
            'finalizationKind',
            'verification-inconclusive',
          ),
          then: {
            properties: {
              selectedStreams: {
                contains: {
                  properties: { state: { const: 'missing' } },
                  required: ['state'],
                },
                minContains: 1,
              },
            },
          },
          else: {
            properties: {
              selectedStreams: {
                not: {
                  contains: {
                    properties: { state: { const: 'missing' } },
                    required: ['state'],
                  },
                },
              },
            },
          },
        },
      ],
    },
  );

  const supersessionFinalizationEvidence = closedObject(
    {
      profile: { const: 'gala-supersession-finalization-evidence-v2' },
      supersededOperationId: ref('stableId'),
      supersededAttemptId: ref('stableId'),
      supersededIntentDigest: ref('digest'),
      destinationKeyDigest: ref('digest'),
      authorityEpoch: ref('positiveInt64'),
      fenceTerminalState: {
        enum: ['terminal-no-change', 'terminal-candidate'],
      },
      fenceEvidenceDigest: ref('digest'),
      supersededByOperationId: ref('stableId'),
      supersededByGenerationId: ref('stableId'),
      finalizationOutcome: { enum: ['before-mutation', 'activated'] },
      activationDetectionObservationCount: {
        type: 'integer',
        minimum: 0,
        maximum: 91,
      },
      activationDetectionLastEvidenceDigest: ref('digest'),
      precedingEvidenceJournalEntryCount: {
        type: 'integer',
        minimum: 0,
        maximum: 1_098,
      },
      precedingEvidenceJournalHeadDigest: ref('digest'),
      finalizedAt: ref('rfc3339'),
    },
    [
      'profile',
      'supersededOperationId',
      'supersededAttemptId',
      'supersededIntentDigest',
      'destinationKeyDigest',
      'authorityEpoch',
      'fenceTerminalState',
      'fenceEvidenceDigest',
      'supersededByOperationId',
      'supersededByGenerationId',
      'finalizationOutcome',
      'activationDetectionObservationCount',
      'precedingEvidenceJournalEntryCount',
      'precedingEvidenceJournalHeadDigest',
      'finalizedAt',
    ],
    {
      allOf: [
        {
          if: {
            properties: {
              activationDetectionObservationCount: { const: 0 },
            },
            required: ['activationDetectionObservationCount'],
          },
          then: forbidFields(['activationDetectionLastEvidenceDigest']),
          else: { required: ['activationDetectionLastEvidenceDigest'] },
        },
        {
          oneOf: [
            tupleBranch(
              {
                fenceTerminalState: 'terminal-no-change',
                finalizationOutcome: 'before-mutation',
              },
              ['fenceTerminalState', 'finalizationOutcome'],
            ),
            tupleBranch(
              {
                fenceTerminalState: 'terminal-candidate',
                finalizationOutcome: 'activated',
              },
              ['fenceTerminalState', 'finalizationOutcome'],
            ),
          ],
        },
      ],
    },
  );

  const cancellationFinalizationEvidence = closedObject(
    {
      profile: { const: 'gala-cancellation-finalization-evidence-v2' },
      operationId: ref('stableId'),
      attemptId: ref('stableId'),
      intentDigest: ref('digest'),
      destinationKeyDigest: ref('digest'),
      authorityEpoch: ref('positiveInt64'),
      fenceEvidenceDigest: ref('digest'),
      cancellationCommandId: ref('stableId'),
      cancellationActorId: ref('stableId'),
      activationDetectionObservationCount: {
        type: 'integer',
        minimum: 0,
        maximum: 91,
      },
      activationDetectionLastEvidenceDigest: ref('digest'),
      precedingEvidenceJournalEntryCount: {
        type: 'integer',
        minimum: 0,
        maximum: 1_098,
      },
      precedingEvidenceJournalHeadDigest: ref('digest'),
      finalizedAt: ref('rfc3339'),
    },
    [
      'profile',
      'operationId',
      'attemptId',
      'intentDigest',
      'destinationKeyDigest',
      'authorityEpoch',
      'fenceEvidenceDigest',
      'cancellationCommandId',
      'cancellationActorId',
      'activationDetectionObservationCount',
      'precedingEvidenceJournalEntryCount',
      'precedingEvidenceJournalHeadDigest',
      'finalizedAt',
    ],
    {
      allOf: [
        {
          if: {
            properties: {
              activationDetectionObservationCount: { const: 0 },
            },
            required: ['activationDetectionObservationCount'],
          },
          then: forbidFields(['activationDetectionLastEvidenceDigest']),
          else: { required: ['activationDetectionLastEvidenceDigest'] },
        },
      ],
    },
  );

  const observationTupleMatrix = [
    tupleBranch({
      observationClass: 'request-not-started',
      outcome: [
        'rejected',
        'not-attempted-retryable',
        'authorization-lost',
        'rate-limited',
        'provider-contract-violation',
      ],
      destinationChanged: ['no', 'yes'],
    }),
    tupleBranch({
      observationClass: 'request-accepted',
      outcome: 'outcome-unknown-reconciling',
      destinationChanged: ['unknown', 'yes'],
    }),
    tupleBranch({
      observationClass: 'provider-state',
      outcome: 'succeeded',
      destinationChanged: ['no', 'yes'],
    }),
    tupleBranch({
      observationClass: 'provider-state',
      outcome: 'rejected',
      destinationChanged: 'no',
    }),
    tupleBranch({
      observationClass: 'provider-state',
      outcome: 'outcome-unknown-reconciling',
      destinationChanged: ['unknown', 'yes'],
    }),
    tupleBranch({
      observationClass: 'provider-state',
      outcome: 'provider-contract-violation',
      destinationChanged: DESTINATION_CHANGE_VALUES,
    }),
    tupleBranch({
      observationClass: 'public-state',
      outcome: 'succeeded',
      destinationChanged: 'yes',
    }),
    tupleBranch({
      observationClass: 'public-state',
      outcome: ['outcome-unknown-reconciling', 'provider-contract-violation'],
      destinationChanged: ['unknown', 'yes'],
    }),
    tupleBranch({
      observationClass: 'deadline-finalization',
      outcome: ['succeeded', 'outcome-unknown-reconciling'],
      destinationChanged: 'yes',
    }),
    tupleBranch({
      observationClass: 'supersession-finalization',
      outcome: 'rejected',
      destinationChanged: 'no',
    }),
    tupleBranch({
      observationClass: 'supersession-finalization',
      outcome: 'succeeded',
      destinationChanged: 'yes',
    }),
    tupleBranch({
      observationClass: 'timeout',
      outcome: 'outcome-unknown-reconciling',
      destinationChanged: ['unknown', 'yes'],
    }),
    tupleBranch({
      observationClass: 'provider-error',
      outcome: [
        'rejected',
        'not-attempted-retryable',
        'authorization-lost',
        'rate-limited',
        'provider-contract-violation',
      ],
      destinationChanged: ['no', 'yes'],
    }),
    tupleBranch({
      observationClass: 'provider-error',
      outcome: 'outcome-unknown-reconciling',
      destinationChanged: ['unknown', 'yes'],
    }),
  ];

  const deploymentObservationProperties = {
    observationId: ref('stableId'),
    operationId: ref('stableId'),
    attemptId: ref('stableId'),
    stageAttemptId: ref('stableId'),
    sequence: { type: 'integer', minimum: 1, maximum: 1_000 },
    intentDigest: ref('digest'),
    artifactId: ref('stableId'),
    artifactDigest: ref('digest'),
    adapter: ref('adapterIdentity'),
    destination: ref('destinationIdentity'),
    generationId: ref('stableId'),
    providerObjectIdDigest: ref('digest'),
    providerVersion: ref('plainLabel'),
    observedArtifactDigest: ref('digest'),
    observationClass: { enum: OBSERVATION_CLASSES },
    outcome: { enum: OBSERVATION_OUTCOMES },
    destinationChanged: { enum: DESTINATION_CHANGE_VALUES },
    observedAt: ref('rfc3339'),
    receivedAt: ref('rfc3339'),
    evidenceDigest: ref('digest'),
    probes: arrayOf(ref('publicProbeObservation'), 0, 16),
  };
  const deploymentObservationRequired = [
    'observationId',
    'operationId',
    'attemptId',
    'stageAttemptId',
    'sequence',
    'intentDigest',
    'artifactId',
    'artifactDigest',
    'adapter',
    'destination',
    'observationClass',
    'outcome',
    'destinationChanged',
    'observedAt',
    'receivedAt',
    'evidenceDigest',
    'probes',
  ];
  const deploymentObservationKeywords = {
    allOf: [
      { oneOf: observationTupleMatrix },
      {
        if: discriminatorSchema('observationClass', 'public-state'),
        then: { properties: { probes: { minItems: 1, maxItems: 16 } } },
        else: { properties: { probes: { maxItems: 0 } } },
      },
      {
        if: discriminatorSchema('observationClass', 'provider-state'),
        else: forbidFields(['generationId', 'observedArtifactDigest']),
      },
      {
        if: discriminatorSchema('observationClass', [
          'request-accepted',
          'provider-state',
          'provider-error',
        ]),
        else: forbidFields(['providerObjectIdDigest', 'providerVersion']),
      },
      {
        if: {
          properties: {
            probes: {
              contains: {
                properties: { classification: { const: 'candidate' } },
                required: ['classification'],
              },
            },
          },
          required: ['probes'],
        },
        then: {
          properties: { destinationChanged: { const: 'yes' } },
        },
      },
    ],
    $comment:
      'Sequence continuity, timestamp order, intent identity equalities, cumulative change proof, source-record validation, canonical probe order, and evidence-digest equality are enforced by the deployment semantic validator.',
  };
  const deploymentObservation = closedObject(
    deploymentObservationProperties,
    deploymentObservationRequired,
    deploymentObservationKeywords,
  );

  const managedFailureCode = {
    type: 'string',
    minLength: 1,
    maxLength: 64,
    pattern: '^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$',
    enum: MANAGED_FAILURE_CODES,
  };
  const deploymentFailure = closedObject(
    {
      stage: { enum: ATTEMPT_STAGES },
      code: ref('managedFailureCode'),
      retryable: { type: 'boolean' },
      destinationChanged: { enum: DESTINATION_CHANGE_VALUES },
      recovery: {
        enum: [
          'retry',
          'observe',
          'reconcile',
          'reauthorize',
          'manual-intervention',
          'none',
        ],
      },
    },
    ['stage', 'code', 'retryable', 'destinationChanged', 'recovery'],
    {
      oneOf: FAILURE_CATALOG.map((row) => failureCatalogBranch(row, true)),
    },
  );

  const deploymentAttemptProperties = {
    attemptId: ref('stableId'),
    stageAttemptId: ref('stableId'),
    causationId: ref('stableId'),
    stage: { enum: ATTEMPT_STAGES },
    sequence: { type: 'integer', minimum: 1, maximum: 100 },
    outcome: {
      enum: [
        'not-started',
        'running',
        'succeeded',
        'failed',
        'skipped',
        'unknown',
      ],
    },
    destinationChanged: { enum: DESTINATION_CHANGE_VALUES },
    inputDigest: ref('digest'),
    resultDigest: ref('digest'),
    failureCode: ref('managedFailureCode'),
    retryable: { type: 'boolean' },
    evidenceDigest: ref('digest'),
    startedAt: ref('rfc3339'),
    completedAt: ref('rfc3339'),
  };
  const deploymentAttemptRequired = [
    'attemptId',
    'stageAttemptId',
    'causationId',
    'stage',
    'sequence',
    'outcome',
    'destinationChanged',
    'inputDigest',
    'retryable',
    'evidenceDigest',
  ];
  const nonFailureAttemptBranches = [
    {
      ...tupleBranch({
        outcome: 'not-started',
        destinationChanged: 'no',
        retryable: false,
      }),
      ...forbidFields([
        'resultDigest',
        'failureCode',
        'startedAt',
        'completedAt',
      ]),
    },
    {
      ...tupleBranch({
        outcome: 'running',
        destinationChanged: DESTINATION_CHANGE_VALUES,
        retryable: false,
      }),
      required: ['startedAt'],
      ...forbidFields(['resultDigest', 'failureCode', 'completedAt']),
    },
    {
      ...tupleBranch({
        outcome: 'skipped',
        destinationChanged: 'no',
        retryable: false,
      }),
      required: ['resultDigest'],
      ...forbidFields(['failureCode', 'startedAt', 'completedAt']),
    },
    {
      ...tupleBranch({
        outcome: 'succeeded',
        destinationChanged: ['no', 'yes'],
        retryable: false,
      }),
      required: ['resultDigest', 'startedAt', 'completedAt'],
      ...forbidFields(['failureCode']),
    },
  ];
  const failedAttemptBranches = FAILURE_CATALOG.map((row) => ({
    allOf: [
      failureCatalogBranch(row, false, 'failureCode'),
      { required: ['resultDigest', 'failureCode', 'startedAt', 'completedAt'] },
    ],
  }));
  const deploymentAttempt = closedObject(
    deploymentAttemptProperties,
    deploymentAttemptRequired,
    {
      oneOf: [...nonFailureAttemptBranches, ...failedAttemptBranches],
      $comment:
        'Attempt/authority identity, causation, sequence continuity, timestamps, observation linkage, and all digest equalities are enforced by the deployment semantic validator.',
    },
  );

  const deploymentStageObservationEvidenceReference = closedObject(
    {
      observationId: ref('stableId'),
      evidenceDigest: ref('digest'),
    },
    ['observationId', 'evidenceDigest'],
  );
  const deploymentStageInput = closedObject(
    {
      profile: { const: 'gala-deployment-stage-input-v2' },
      intentDigest: ref('digest'),
      destinationMutationAuthority: ref('destinationMutationAuthority'),
      stageAttemptId: ref('stableId'),
      causationId: ref('stableId'),
      stage: { enum: ATTEMPT_STAGES },
    },
    [
      'profile',
      'intentDigest',
      'destinationMutationAuthority',
      'stageAttemptId',
      'causationId',
      'stage',
    ],
  );
  const deploymentStageResult = closedObject(
    {
      profile: { const: 'gala-deployment-stage-result-v2' },
      stageInput: ref('deploymentStageInput'),
      inputDigest: ref('digest'),
      outcome: { enum: ['succeeded', 'failed', 'skipped', 'unknown'] },
      destinationChanged: { enum: DESTINATION_CHANGE_VALUES },
      failureCode: ref('managedFailureCode'),
      retryable: { type: 'boolean' },
      startedAt: ref('rfc3339'),
      completedAt: ref('rfc3339'),
      finalizationObservation: ref(
        'deploymentStageObservationEvidenceReference',
      ),
    },
    [
      'profile',
      'stageInput',
      'inputDigest',
      'outcome',
      'destinationChanged',
      'retryable',
      'finalizationObservation',
    ],
    {
      oneOf: [
        {
          ...tupleBranch({
            outcome: 'skipped',
            destinationChanged: 'no',
            retryable: false,
          }),
          ...forbidFields(['failureCode', 'startedAt', 'completedAt']),
        },
        {
          ...tupleBranch({
            outcome: 'succeeded',
            destinationChanged: ['no', 'yes'],
            retryable: false,
          }),
          required: ['startedAt', 'completedAt'],
          ...forbidFields(['failureCode']),
        },
        ...FAILURE_CATALOG.map((row) => ({
          allOf: [
            {
              properties: {
                stageInput: {
                  properties: { stage: { const: row[0] } },
                  required: ['stage'],
                },
                failureCode: { const: row[1] },
                outcome: { const: row[2] },
                destinationChanged: { enum: row[3] },
                retryable: { const: row[4] },
              },
            },
            { required: ['failureCode', 'startedAt', 'completedAt'] },
          ],
        })),
      ],
    },
  );
  const deploymentStageEvidence = closedObject(
    {
      profile: { const: 'gala-deployment-stage-evidence-v2' },
      stageInput: ref('deploymentStageInput'),
      inputDigest: ref('digest'),
      outcome: {
        enum: [
          'not-started',
          'running',
          'succeeded',
          'failed',
          'skipped',
          'unknown',
        ],
      },
      destinationChanged: { enum: DESTINATION_CHANGE_VALUES },
      failureCode: ref('managedFailureCode'),
      retryable: { type: 'boolean' },
      startedAt: ref('rfc3339'),
      completedAt: ref('rfc3339'),
      observationEvidence: arrayOf(
        ref('deploymentStageObservationEvidenceReference'),
        0,
        1_000,
        true,
      ),
      stageResult: ref('deploymentStageResult'),
      resultDigest: ref('digest'),
      evidenceDigest: ref('digest'),
    },
    [
      'profile',
      'stageInput',
      'inputDigest',
      'outcome',
      'destinationChanged',
      'retryable',
      'observationEvidence',
      'evidenceDigest',
    ],
    {
      allOf: [
        {
          if: discriminatorSchema('outcome', 'not-started'),
          then: {
            properties: {
              destinationChanged: { const: 'no' },
              retryable: { const: false },
              observationEvidence: { maxItems: 0 },
            },
            ...forbidFields([
              'failureCode',
              'startedAt',
              'completedAt',
              'stageResult',
              'resultDigest',
            ]),
          },
        },
        {
          if: discriminatorSchema('outcome', 'running'),
          then: {
            properties: { retryable: { const: false } },
            required: ['startedAt'],
            ...forbidFields([
              'failureCode',
              'completedAt',
              'stageResult',
              'resultDigest',
            ]),
          },
        },
        {
          if: discriminatorSchema('outcome', [
            'succeeded',
            'failed',
            'skipped',
            'unknown',
          ]),
          then: {
            properties: { observationEvidence: { minItems: 1 } },
            required: ['stageResult', 'resultDigest'],
          },
        },
        {
          if: discriminatorSchema('outcome', 'skipped'),
          then: {
            properties: {
              destinationChanged: { const: 'no' },
              retryable: { const: false },
            },
            ...forbidFields(['failureCode', 'startedAt', 'completedAt']),
          },
        },
        {
          if: discriminatorSchema('outcome', 'succeeded'),
          then: {
            properties: {
              destinationChanged: { enum: ['no', 'yes'] },
              retryable: { const: false },
            },
            required: ['startedAt', 'completedAt'],
            ...forbidFields(['failureCode']),
          },
        },
        {
          if: discriminatorSchema('outcome', ['failed', 'unknown']),
          then: { required: ['failureCode', 'startedAt', 'completedAt'] },
        },
        {
          if: discriminatorSchema('outcome', 'unknown'),
          then: {
            properties: {
              destinationChanged: { enum: ['unknown', 'yes'] },
            },
          },
        },
        {
          if: discriminatorSchema('outcome', ['failed', 'unknown']),
          then: {
            oneOf: FAILURE_CATALOG.map((row) => ({
              properties: {
                stageInput: {
                  properties: { stage: { const: row[0] } },
                  required: ['stage'],
                },
                failureCode: { const: row[1] },
                outcome: { const: row[2] },
                destinationChanged: { enum: row[3] },
                retryable: { const: row[4] },
              },
              required: [
                'stageInput',
                'failureCode',
                'outcome',
                'destinationChanged',
                'retryable',
              ],
            })),
          },
        },
      ],
      $comment:
        'The semantic validator enforces byte-identical input/result copies, catalog-derived failure semantics, observation-set closure and ordering, finalization membership, digest projections, and enclosing attempt equality.',
    },
  );

  const finding = closedObject(
    {
      code: ref('plainLabel'),
      severity: { enum: ['error', 'warning', 'info'] },
      pointer: { type: 'string', minLength: 1, maxLength: 1_024 },
      messageKey: ref('plainLabel'),
    },
    ['code', 'severity', 'pointer', 'messageKey'],
  );
  const deploymentWarning = {
    oneOf: [
      {
        allOf: [
          ref('finding'),
          {
            properties: {
              code: { const: 'PUBLIC_PROPAGATION_DEADLINE' },
              severity: { const: 'warning' },
              pointer: { const: '/observations' },
              messageKey: {
                const: 'deployment.public-propagation-deadline',
              },
            },
          },
        ],
      },
      {
        allOf: [
          ref('finding'),
          {
            properties: {
              code: { const: 'CLEANUP_FAILED' },
              severity: { const: 'warning' },
              pointer: { const: '/attempts' },
              messageKey: { const: 'deployment.cleanup-failed' },
            },
          },
        ],
      },
    ],
  };

  const githubWorkflowRef = {
    type: 'string',
    minLength: 1,
    maxLength: 512,
    pattern: `^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?/(?!\\.{1,2}/)[A-Za-z0-9._-]{1,100}/\\.github/workflows/gala-publish-v2\\.yml@refs/heads/gala/publish/${STABLE_ID_PATTERN}$`,
    'x-gala-utf8ByteLength': { maximum: 512 },
  };

  /**
   * Constrain all receipt observations by a field tuple.
   *
   * @param {Record<string, unknown>} properties tuple values
   * @returns {Record<string, unknown>} schema fragment
   */
  const receiptObservationConstraint = (properties) => ({
    properties: {
      observations: {
        items: {
          properties: Object.fromEntries(
            Object.entries(properties).map(([name, value]) => [
              name,
              Array.isArray(value) ? { enum: value } : { const: value },
            ]),
          ),
        },
      },
    },
  });
  /**
   * Require one receipt attempt matching a field tuple.
   *
   * @param {Record<string, unknown>} properties tuple values
   * @returns {Record<string, unknown>} schema fragment
   */
  const receiptAttemptConstraint = (properties) => ({
    properties: {
      attempts: {
        contains: {
          properties: Object.fromEntries(
            Object.entries(properties).map(([name, value]) => [
              name,
              Array.isArray(value) ? { enum: value } : { const: value },
            ]),
          ),
        },
        minContains: 1,
      },
    },
  });
  const cleanupOnlyWarnings = {
    properties: {
      warnings: {
        maxItems: 1,
        items: {
          properties: { code: { const: 'CLEANUP_FAILED' } },
          required: ['code'],
        },
      },
    },
  };
  const noWarnings = { properties: { warnings: { maxItems: 0 } } };
  const receiptOutcomeBranches = [
    {
      ...tupleBranch({ outcome: 'succeeded' }),
      required: ['destinationGenerationId'],
      allOf: [
        noWarnings,
        receiptObservationConstraint({
          outcome: 'succeeded',
          destinationChanged: 'yes',
        }),
        receiptAttemptConstraint({
          outcome: 'succeeded',
          destinationChanged: 'yes',
        }),
      ],
      ...forbidFields(['failure', 'verificationDeadlineAt']),
    },
    {
      ...tupleBranch({ outcome: 'succeeded-with-warnings' }),
      required: ['destinationGenerationId'],
      properties: {
        outcome: { const: 'succeeded-with-warnings' },
        warnings: {
          minItems: 1,
          maxItems: 1,
          items: {
            properties: { code: { const: 'CLEANUP_FAILED' } },
            required: ['code'],
          },
        },
      },
      allOf: [
        receiptObservationConstraint({
          outcome: 'succeeded',
          destinationChanged: 'yes',
        }),
        receiptAttemptConstraint({
          outcome: 'succeeded',
          destinationChanged: 'yes',
        }),
      ],
      ...forbidFields(['failure', 'verificationDeadlineAt']),
    },
    {
      ...tupleBranch({ outcome: 'activated-degraded' }),
      required: ['destinationGenerationId', 'verificationDeadlineAt'],
      properties: {
        outcome: { const: 'activated-degraded' },
        warnings: {
          minItems: 1,
          contains: {
            properties: {
              code: { const: 'PUBLIC_PROPAGATION_DEADLINE' },
            },
            required: ['code'],
          },
          minContains: 1,
          maxContains: 1,
        },
      },
      allOf: [
        receiptObservationConstraint({
          observationClass: 'deadline-finalization',
          outcome: 'succeeded',
          destinationChanged: 'yes',
        }),
        receiptAttemptConstraint({
          stage: 'public-verification',
          outcome: 'succeeded',
          destinationChanged: 'yes',
        }),
      ],
      ...forbidFields(['failure']),
    },
    {
      ...tupleBranch({ outcome: 'failed-no-destination-change' }),
      required: ['failure'],
      allOf: [
        cleanupOnlyWarnings,
        receiptObservationConstraint({
          outcome: [
            'rejected',
            'not-attempted-retryable',
            'authorization-lost',
            'rate-limited',
            'provider-contract-violation',
          ],
          destinationChanged: 'no',
        }),
        receiptAttemptConstraint({
          outcome: 'failed',
          destinationChanged: 'no',
        }),
      ],
      ...forbidFields(['destinationGenerationId', 'verificationDeadlineAt']),
    },
    {
      ...tupleBranch({ outcome: 'cancelled-no-destination-change' }),
      allOf: [
        cleanupOnlyWarnings,
        receiptObservationConstraint({
          observationClass: 'request-not-started',
          outcome: 'rejected',
          destinationChanged: 'no',
        }),
        receiptAttemptConstraint({
          stage: 'managed-reconciliation',
          outcome: 'skipped',
          destinationChanged: 'no',
        }),
      ],
      ...forbidFields([
        'destinationGenerationId',
        'verificationDeadlineAt',
        'failure',
      ]),
    },
    {
      ...tupleBranch({ outcome: 'superseded' }),
      required: ['supersededByOperationId', 'supersededByGenerationId'],
      allOf: [
        cleanupOnlyWarnings,
        {
          if: { required: ['destinationGenerationId'] },
          then: {
            allOf: [
              receiptObservationConstraint({
                observationClass: 'supersession-finalization',
                outcome: 'succeeded',
                destinationChanged: 'yes',
              }),
              receiptAttemptConstraint({
                stage: 'managed-reconciliation',
                outcome: 'succeeded',
                destinationChanged: 'yes',
              }),
            ],
          },
          else: {
            allOf: [
              receiptObservationConstraint({
                observationClass: 'supersession-finalization',
                outcome: 'rejected',
                destinationChanged: 'no',
              }),
              receiptAttemptConstraint({
                stage: 'managed-reconciliation',
                outcome: 'skipped',
                destinationChanged: 'no',
              }),
            ],
          },
        },
      ],
      ...forbidFields(['verificationDeadlineAt', 'failure']),
    },
    {
      ...tupleBranch({ outcome: 'unknown-reconciling' }),
      required: ['failure'],
      allOf: [
        {
          if: { required: ['destinationGenerationId'] },
          then: {
            allOf: [
              cleanupOnlyWarnings,
              receiptObservationConstraint({
                outcome: [
                  'outcome-unknown-reconciling',
                  'provider-contract-violation',
                ],
                destinationChanged: 'yes',
              }),
              receiptAttemptConstraint({
                outcome: ['unknown', 'failed'],
                destinationChanged: 'yes',
              }),
            ],
          },
          else: {
            allOf: [
              noWarnings,
              receiptObservationConstraint({
                outcome: [
                  'outcome-unknown-reconciling',
                  'provider-contract-violation',
                ],
                destinationChanged: 'unknown',
              }),
              receiptAttemptConstraint({
                outcome: ['unknown', 'failed'],
                destinationChanged: 'unknown',
              }),
            ],
          },
        },
      ],
      ...forbidFields(['verificationDeadlineAt']),
    },
    {
      ...tupleBranch({ outcome: 'rolled-back' }),
      required: [
        'destinationGenerationId',
        'rollbackOfOperationId',
        'rollbackOfGenerationId',
        'rollbackOfReceiptDigest',
        'rollbackActorId',
        'rollbackReason',
      ],
      allOf: [
        cleanupOnlyWarnings,
        receiptObservationConstraint({
          outcome: 'succeeded',
          destinationChanged: 'yes',
        }),
        receiptAttemptConstraint({
          outcome: 'succeeded',
          destinationChanged: 'yes',
        }),
      ],
      ...forbidFields(['verificationDeadlineAt', 'failure']),
    },
  ];

  const intentProperties = {
    operationId: ref('stableId'),
    attemptId: ref('stableId'),
    idempotencyKey: ref('stableId'),
    sourceCommit: ref('gitObjectId'),
    workflowTriggerCommit: ref('gitObjectId'),
    artifactId: ref('stableId'),
    artifactDigest: ref('digest'),
    manifestDigest: ref('digest'),
    artifactByteCount: ref('positiveInt64'),
    artifactFileCount: ref('positiveInt64'),
    provenanceDigest: ref('digest'),
    sbomDigest: ref('digest'),
    frozenHandoffArtifactId: ref('githubActionsArtifactId'),
    frozenHandoffName: ref('plainLabel'),
    frozenEnvelopeDigest: ref('digest'),
    frozenEnvelopeByteCount: ref('positiveInt64'),
    requestedArtifactRetentionDays: {
      type: 'integer',
      minimum: 1,
      maximum: 7,
    },
    effectiveArtifactExpiresAt: ref('rfc3339'),
    maximumReportRequestByteCount: ref('positiveInt64'),
    lockDigest: ref('digest'),
    rebuildRecord: ref('reproducibleBuildRecord'),
    publisher: {
      allOf: [
        ref('packageIdentity'),
        {
          properties: {
            package: { const: '@rathnasgala2/publish-action' },
          },
          required: ['package'],
        },
      ],
    },
    adapter: ref('adapterIdentity'),
    destination: ref('destinationIdentity'),
    destinationMutationAuthority: ref('destinationMutationAuthority'),
    expectedGenerationId: generationFence(ref),
    proposedGenerationId: ref('stableId'),
    pagesBuildVersion: ref('lowerHex40'),
    spacesStagePrefix: {
      type: 'string',
      minLength: 1,
      maxLength: 512,
      pattern: `^_gala/staged/v2/${STABLE_ID_PATTERN}/${STABLE_ID_PATTERN}/${STABLE_ID_PATTERN}/$`,
      'x-gala-utf8ByteLength': { maximum: 512 },
    },
    capabilityDecisionDigest: ref('digest'),
    policyReleaseId: ref('stableId'),
    policyProfile: ref('plainLabel'),
    policyVersion: ref('semver'),
    approvedOverrides: { const: [] },
    policyDecisionDigest: ref('digest'),
    networkBoundaryProfileDigest: ref('digest'),
    publicTlsProfileDigest: ref('digest'),
    publicTlsTrustStoreDigest: ref('digest'),
    publicTlsRevocationSetDigest: ref('digest'),
    workloadBindingDigest: ref('digest'),
    activationDetectionProfile: {
      const: 'gala-public-activation-detection-v2',
    },
    activationDetectionPlanDigest: ref('digest'),
    maximumActivationDetectionAttempts: { const: 91 },
    activationDetectionIntervalSeconds: { const: 60 },
    verificationTier: { enum: VERIFICATION_TIERS },
    verificationOrigins: arrayOf(ref('verificationOrigin'), 1, 8, true),
    verificationPlanDigest: ref('digest'),
    maximumPublicVerificationSeconds: {
      type: 'integer',
      minimum: 1,
      maximum: 3_600,
    },
    verificationDeadlineLimit: ref('rfc3339'),
    maximumFinalizationDelaySeconds: { const: 300 },
    finalizationDeadlineLimit: ref('rfc3339'),
    marker: ref('publicGenerationMarkerPayload'),
    issuer: ref('urlHttps'),
    subject: ref('urn'),
    audience: { const: 'urn:gala:deployment-kernel:v2' },
    capability: { const: 'deploy' },
    authorizedAt: ref('rfc3339'),
    expiresAt: ref('rfc3339'),
    operationDeadline: ref('rfc3339'),
    intentDigest: ref('digest'),
  };
  const intentRequired = [
    'operationId',
    'attemptId',
    'idempotencyKey',
    'sourceCommit',
    'workflowTriggerCommit',
    'artifactId',
    'artifactDigest',
    'manifestDigest',
    'artifactByteCount',
    'artifactFileCount',
    'provenanceDigest',
    'sbomDigest',
    'frozenHandoffArtifactId',
    'frozenHandoffName',
    'frozenEnvelopeDigest',
    'frozenEnvelopeByteCount',
    'requestedArtifactRetentionDays',
    'effectiveArtifactExpiresAt',
    'maximumReportRequestByteCount',
    'lockDigest',
    'rebuildRecord',
    'publisher',
    'adapter',
    'destination',
    'destinationMutationAuthority',
    'proposedGenerationId',
    'capabilityDecisionDigest',
    'policyReleaseId',
    'policyProfile',
    'policyVersion',
    'approvedOverrides',
    'policyDecisionDigest',
    'networkBoundaryProfileDigest',
    'publicTlsProfileDigest',
    'publicTlsTrustStoreDigest',
    'publicTlsRevocationSetDigest',
    'workloadBindingDigest',
    'activationDetectionProfile',
    'activationDetectionPlanDigest',
    'maximumActivationDetectionAttempts',
    'activationDetectionIntervalSeconds',
    'verificationTier',
    'verificationOrigins',
    'verificationPlanDigest',
    'maximumPublicVerificationSeconds',
    'verificationDeadlineLimit',
    'maximumFinalizationDelaySeconds',
    'finalizationDeadlineLimit',
    'marker',
    'issuer',
    'subject',
    'audience',
    'capability',
    'authorizedAt',
    'expiresAt',
    'operationDeadline',
    'intentDigest',
  ];

  const receiptProperties = {
    receiptId: ref('stableId'),
    snapshotSequence: { type: 'integer', minimum: 1, maximum: 1_000 },
    attemptSnapshotSequence: {
      type: 'integer',
      minimum: 1,
      maximum: 1_000,
    },
    supersedesReceiptId: ref('stableId'),
    operationId: ref('stableId'),
    organizationId: ref('stableId'),
    issuer: ref('urlHttps'),
    repositoryId: ref('plainLabel'),
    repositoryOwnerId: ref('plainLabel'),
    sourceCommit: ref('gitObjectId'),
    workflowRef: ref('githubWorkflowRef'),
    workflowSha: ref('gitObjectId'),
    runId: ref('plainLabel'),
    runAttempt: { type: 'integer', minimum: 1, maximum: 51 },
    artifactId: ref('stableId'),
    artifactDigest: ref('digest'),
    artifactManifestDigest: ref('digest'),
    artifactByteCount: ref('positiveInt64'),
    artifactFileCount: ref('positiveInt64'),
    requestedArtifactRetentionDays: {
      type: 'integer',
      minimum: 1,
      maximum: 7,
    },
    effectiveArtifactExpiresAt: ref('rfc3339'),
    publisher: {
      allOf: [
        ref('packageIdentity'),
        {
          properties: {
            package: { const: '@rathnasgala2/publish-action' },
          },
          required: ['package'],
        },
      ],
    },
    intentDigest: ref('digest'),
    submissionEvidenceDigest: ref('digest'),
    evidenceJournalEntryCount: {
      type: 'integer',
      minimum: 1,
      maximum: 1_100,
    },
    evidenceJournalHeadDigest: ref('digest'),
    adapter: ref('adapterIdentity'),
    destination: ref('destinationIdentity'),
    destinationGenerationId: ref('stableId'),
    destinationReceiptDigest: ref('digest'),
    attempts: arrayOf(ref('deploymentAttempt'), 0, 100, true),
    observations: arrayOf(ref('deploymentObservation'), 1, 1),
    verificationTier: { enum: VERIFICATION_TIERS },
    verificationDeadlineAt: ref('rfc3339'),
    outcome: {
      enum: [
        'succeeded',
        'succeeded-with-warnings',
        'activated-degraded',
        'failed-no-destination-change',
        'cancelled-no-destination-change',
        'superseded',
        'unknown-reconciling',
        'rolled-back',
      ],
    },
    warnings: arrayOf(ref('deploymentWarning'), 0, 2, true),
    failure: ref('deploymentFailure'),
    rollbackOfOperationId: ref('stableId'),
    rollbackOfGenerationId: ref('stableId'),
    rollbackOfReceiptDigest: ref('digest'),
    rollbackActorId: ref('stableId'),
    rollbackReason: graphemeBound(ref('plainText'), 1, 500),
    supersededByOperationId: ref('stableId'),
    supersededByGenerationId: ref('stableId'),
    provenanceDigest: ref('digest'),
    sbomDigest: ref('digest'),
    startedAt: ref('rfc3339'),
    completedAt: ref('rfc3339'),
    receiptDigest: ref('digest'),
  };
  const receiptRequired = [
    'receiptId',
    'snapshotSequence',
    'attemptSnapshotSequence',
    'operationId',
    'organizationId',
    'issuer',
    'repositoryId',
    'repositoryOwnerId',
    'sourceCommit',
    'workflowRef',
    'workflowSha',
    'runId',
    'runAttempt',
    'artifactId',
    'artifactDigest',
    'artifactManifestDigest',
    'artifactByteCount',
    'artifactFileCount',
    'requestedArtifactRetentionDays',
    'effectiveArtifactExpiresAt',
    'publisher',
    'intentDigest',
    'submissionEvidenceDigest',
    'evidenceJournalEntryCount',
    'evidenceJournalHeadDigest',
    'adapter',
    'destination',
    'attempts',
    'observations',
    'verificationTier',
    'outcome',
    'warnings',
    'provenanceDigest',
    'sbomDigest',
    'startedAt',
    'completedAt',
    'receiptDigest',
  ];

  const commonIdentityDefinitions = {
    npmPackageName,
    int64,
    nonNegativeInt64,
    positiveInt64,
    githubPositiveDecimal,
    githubActionsArtifactId,
    lowerHex40,
    packageIdentity,
    adapterIdentity,
    destinationIdentity,
    destinationProviderCoordinates,
    spacesBucket,
    spacesRegion,
    renderPolicyIdentity,
    verificationOrigin,
    verificationUrl,
    observedRedirectLocation,
    probeRegion,
    verificationHeaderName,
    verificationHeaderValue,
    observedVerificationHeader,
  };
  const publicProbeDefinitions = {
    ...commonIdentityDefinitions,
    expectedRedirectHop,
    verificationHeaderExpectation,
    recognizedPriorRouteContract,
    verificationPlanTarget,
    publicProbeObservation,
    activationDetectionProbe,
    activationDetectionObservation,
    deadlineFinalizationStream,
    deadlineFinalizationEvidence,
    supersessionFinalizationEvidence,
    cancellationFinalizationEvidence,
  };
  const authorityDefinitions = {
    ...publicProbeDefinitions,
    generationFence: generationFenceDefinition(),
    reproducibleBuildRecord,
    pagesInterveningRunAttempt,
    pagesRunAttemptGapProof,
    pagesReconciliationRecovery,
    pagesReconciliationCommand,
    destinationMutationAuthority,
    publicGenerationMarkerPayload,
    deploymentPolicyDecision,
    activationDetectionPlan,
    activationBasis,
  };

  return {
    'deployment-intent.schema.json': rootSchema(
      'deployment-intent',
      intentProperties,
      intentRequired,
      authorityDefinitions,
      {
        allOf: [
          {
            if: {
              properties: {
                adapter: {
                  properties: { adapterId: { const: 'github-pages' } },
                  required: ['adapterId'],
                },
              },
              required: ['adapter'],
            },
            then: { required: ['pagesBuildVersion'] },
            else: forbidFields(['pagesBuildVersion']),
          },
          {
            if: {
              properties: {
                adapter: {
                  properties: { adapterId: { const: 'do-spaces' } },
                  required: ['adapterId'],
                },
              },
              required: ['adapter'],
            },
            then: { required: ['spacesStagePrefix'] },
            else: forbidFields(['spacesStagePrefix']),
          },
          {
            if: {
              properties: {
                destinationMutationAuthority: {
                  properties: {
                    mode: { const: 'pages-reconciliation-recovery' },
                  },
                  required: ['mode'],
                },
              },
              required: ['destinationMutationAuthority'],
            },
            then: {
              properties: {
                adapter: {
                  properties: { adapterId: { const: 'github-pages' } },
                  required: ['adapterId'],
                },
                destination: {
                  properties: { adapterId: { const: 'github-pages' } },
                  required: ['adapterId'],
                },
              },
            },
          },
          {
            if: { required: ['expectedGenerationId'] },
            then: {
              properties: {
                destinationMutationAuthority: {
                  required: ['expectedGenerationId'],
                },
              },
            },
            else: {
              properties: {
                destinationMutationAuthority: forbidFields([
                  'expectedGenerationId',
                ]),
              },
            },
          },
        ],
        $comment:
          'Every duplicate identity, marker member, authority coordinate, release/policy value, timestamp relation and digest is checked for byte equality or recomputed by the deployment-intent semantic validator.',
      },
    ),
    'deployment-observation.schema.json': rootSchema(
      'deployment-observation',
      deploymentObservationProperties,
      deploymentObservationRequired,
      publicProbeDefinitions,
      deploymentObservationKeywords,
    ),
    'deployment-receipt.schema.json': rootSchema(
      'deployment-receipt',
      receiptProperties,
      receiptRequired,
      {
        ...authorityDefinitions,
        managedFailureCode,
        deploymentFailure,
        deploymentAttempt,
        deploymentStageObservationEvidenceReference,
        deploymentStageInput,
        deploymentStageResult,
        deploymentStageEvidence,
        finding,
        deploymentWarning,
        githubWorkflowRef,
        deploymentObservation,
      },
      {
        allOf: [
          { oneOf: receiptOutcomeBranches },
          {
            if: {
              properties: { attemptSnapshotSequence: { const: 1 } },
              required: ['attemptSnapshotSequence'],
            },
            then: forbidFields(['supersedesReceiptId']),
            else: { required: ['supersedesReceiptId'] },
          },
          requireExactlyWhen('outcome', 'rolled-back', [
            'rollbackOfOperationId',
            'rollbackOfGenerationId',
            'rollbackOfReceiptDigest',
            'rollbackActorId',
            'rollbackReason',
          ]),
          requireExactlyWhen('outcome', 'superseded', [
            'supersededByOperationId',
            'supersededByGenerationId',
          ]),
          {
            properties: {
              attempts: {
                items: {
                  properties: {
                    outcome: {
                      enum: ['succeeded', 'failed', 'skipped', 'unknown'],
                    },
                  },
                  required: ['outcome'],
                },
              },
            },
          },
        ],
        $comment:
          'Snapshot ancestry, authenticated journal closure, exact outcome-witness selection, all cross-record equalities, canonical ordering, temporal closure, warning causation and receipt digest are enforced by the managed-receipt semantic validator.',
      },
    ),
    'public-generation-marker.schema.json': rootSchema(
      'public-generation-marker',
      {
        artifactId: ref('stableId'),
        artifactDigest: ref('digest'),
        generationId: ref('stableId'),
      },
      ['artifactId', 'artifactDigest', 'generationId'],
      {},
      {
        $comment:
          'The complete marker is compared with the retained deployment intent; it has no self-digest and does not self-certify.',
      },
    ),
  };
}
