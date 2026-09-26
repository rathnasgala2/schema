import { canonicalizeJcs } from '../../src/internal/canonical-jcs.js';
import {
  ACTIVE_DIGEST_PROFILES,
  derivePagesBuildVersion,
  digestManagedEvidenceGenesis,
} from '../../src/internal/digest-profiles.js';
import {
  validateDeploymentStageRecords,
  validateLocalFilesystemObservationEvidence,
} from './deployment-stage-semantics.js';
import { validateManagedEvidenceJournal } from './managed-evidence-journal.js';
import { validateRfc3339 } from '../../src/internal/portable-scalars.js';
import {
  validatePublicActivationDetectionObservation,
  validatePublicActivationDetectionPlan,
  validatePublicProbeAttempt,
  validateVerificationPlan,
} from '../../src/internal/public-verification-semantics.js';
import { SemanticValidationError } from '../../src/internal/semver.js';

const INT64_MAXIMUM = 9_223_372_036_854_775_807n;
const UINT64_MAXIMUM = 18_446_744_073_709_551_615n;
const POSITIVE_INT64_PATTERN = /^[1-9][0-9]*$/u;
const POSITIVE_DECIMAL_PATTERN = /^[1-9][0-9]*$/u;
const LOWER_HEX_40_PATTERN = /^[0-9a-f]{40}$/u;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const STABLE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const GIT_OBJECT_ID_PATTERN = /^(?:sha1:[0-9a-f]{40}|sha256:[0-9a-f]{64})$/u;

const VERIFIED_WORKLOAD_BINDING_FIELDS = [
  'issuer',
  'audience',
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
  'callerWorkflow',
  'publishWorkflow',
  'authorizeWorkflow',
  'oidcVerificationProfileDigest',
  'issuerKeySetDigest',
  'issuerKeySetObservedAt',
  'verifiedAt',
  'workloadBindingDigest',
];

const POLICY_DECISION_OWNER_FIELDS = [
  'policyReleaseId',
  'policyProfile',
  'policyVersion',
  'approvedOverrides',
  'verificationTier',
  'verificationOrigins',
  'verificationPlanDigest',
  'networkBoundaryProfileDigest',
  'publicTlsProfileDigest',
  'publicTlsTrustStoreDigest',
  'publicTlsRevocationSetDigest',
  'activationDetectionProfile',
  'maximumActivationDetectionAttempts',
  'activationDetectionIntervalSeconds',
  'maximumPublicVerificationSeconds',
  'maximumFinalizationDelaySeconds',
];

const POLICY_LIMIT_FIELDS = [
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
];

const OPERATION_VERIFICATION_AUTHORITY_FIELDS = [
  ...new Set([...POLICY_DECISION_OWNER_FIELDS, ...POLICY_LIMIT_FIELDS]),
];

const INTENT_AUTHORITY_FIELDS = [
  'operationId',
  'attemptId',
  'expectedGenerationId',
  'proposedGenerationId',
  'expiresAt',
];

const RECEIPT_INTENT_FIELD_MAP = Object.freeze({
  operationId: 'operationId',
  sourceCommit: 'sourceCommit',
  artifactId: 'artifactId',
  artifactDigest: 'artifactDigest',
  artifactManifestDigest: 'manifestDigest',
  artifactByteCount: 'artifactByteCount',
  artifactFileCount: 'artifactFileCount',
  requestedArtifactRetentionDays: 'requestedArtifactRetentionDays',
  effectiveArtifactExpiresAt: 'effectiveArtifactExpiresAt',
  publisher: 'publisher',
  intentDigest: 'intentDigest',
  adapter: 'adapter',
  destination: 'destination',
  verificationTier: 'verificationTier',
  provenanceDigest: 'provenanceDigest',
  sbomDigest: 'sbomDigest',
  issuer: 'issuer',
});

const OBSERVATION_INTENT_FIELDS = [
  'operationId',
  'attemptId',
  'artifactId',
  'artifactDigest',
  'adapter',
  'destination',
];

/** @type {Readonly<Record<string, Readonly<Record<string, string>>>>} */
const WARNING_CATALOG = Object.freeze({
  CLEANUP_FAILED: Object.freeze({
    code: 'CLEANUP_FAILED',
    severity: 'warning',
    pointer: '/attempts',
    messageKey: 'deployment.cleanup-failed',
  }),
  PUBLIC_PROPAGATION_DEADLINE: Object.freeze({
    code: 'PUBLIC_PROPAGATION_DEADLINE',
    severity: 'warning',
    pointer: '/observations',
    messageKey: 'deployment.public-propagation-deadline',
  }),
});

/** @type {readonly FailureCatalogRow[]} */
const FAILURE_CATALOG = Object.freeze([
  [
    'staging',
    'TARGET_CAPABILITY_UNAVAILABLE',
    'failed',
    'rejected',
    ['no'],
    false,
    'none',
  ],
  [
    'staging',
    'ATOMIC_ACTIVATION_UNSUPPORTED',
    'failed',
    'rejected',
    ['no'],
    false,
    'manual-intervention',
  ],
  ['staging', 'REJECTED', 'failed', 'rejected', ['no'], false, 'none'],
  [
    'staging',
    'NOT_ATTEMPTED_RETRYABLE',
    'failed',
    'not-attempted-retryable',
    ['no'],
    true,
    'retry',
  ],
  [
    'staging',
    'AUTHORIZATION_LOST',
    'failed',
    'authorization-lost',
    ['no'],
    false,
    'reauthorize',
  ],
  ['staging', 'RATE_LIMITED', 'failed', 'rate-limited', ['no'], true, 'retry'],
  [
    'staging',
    'PROVIDER_CONTRACT_VIOLATION',
    'failed',
    'provider-contract-violation',
    ['no'],
    false,
    'manual-intervention',
  ],
  [
    'staging',
    'OUTCOME_UNKNOWN_RECONCILING',
    'unknown',
    'outcome-unknown-reconciling',
    ['unknown', 'yes'],
    false,
    'observe',
  ],
  ['activation', 'REJECTED', 'failed', 'rejected', ['no'], false, 'none'],
  [
    'activation',
    'NOT_ATTEMPTED_RETRYABLE',
    'failed',
    'not-attempted-retryable',
    ['no'],
    true,
    'retry',
  ],
  [
    'activation',
    'AUTHORIZATION_LOST',
    'failed',
    'authorization-lost',
    ['no'],
    false,
    'reauthorize',
  ],
  [
    'activation',
    'RATE_LIMITED',
    'failed',
    'rate-limited',
    ['no'],
    true,
    'retry',
  ],
  [
    'activation',
    'PROVIDER_CONTRACT_VIOLATION',
    'failed',
    'provider-contract-violation',
    ['no'],
    false,
    'manual-intervention',
  ],
  [
    'activation',
    'OUTCOME_UNKNOWN_RECONCILING',
    'unknown',
    'outcome-unknown-reconciling',
    ['unknown', 'yes'],
    false,
    'observe',
  ],
  [
    'public-verification',
    'PUBLIC_VERIFICATION_INCONCLUSIVE',
    'unknown',
    'outcome-unknown-reconciling',
    ['unknown', 'yes'],
    false,
    'observe',
  ],
  [
    'public-verification',
    'PUBLIC_INTEGRITY_MISMATCH',
    'failed',
    'provider-contract-violation',
    ['unknown', 'yes'],
    false,
    'reconcile',
  ],
  [
    'managed-reconciliation',
    'REJECTED',
    'failed',
    'rejected',
    ['no'],
    false,
    'none',
  ],
  [
    'managed-reconciliation',
    'NOT_ATTEMPTED_RETRYABLE',
    'unknown',
    'outcome-unknown-reconciling',
    ['unknown', 'yes'],
    true,
    'retry',
  ],
  [
    'managed-reconciliation',
    'AUTHORIZATION_LOST',
    'unknown',
    'outcome-unknown-reconciling',
    ['unknown', 'yes'],
    false,
    'reauthorize',
  ],
  [
    'managed-reconciliation',
    'RATE_LIMITED',
    'unknown',
    'outcome-unknown-reconciling',
    ['unknown', 'yes'],
    true,
    'retry',
  ],
  [
    'managed-reconciliation',
    'OUTCOME_UNKNOWN_RECONCILING',
    'unknown',
    'outcome-unknown-reconciling',
    ['unknown', 'yes'],
    false,
    'observe',
  ],
  [
    'managed-reconciliation',
    'PROVIDER_CONTRACT_VIOLATION',
    'failed',
    'provider-contract-violation',
    ['unknown', 'yes'],
    false,
    'reconcile',
  ],
  ['cleanup', 'REJECTED', 'failed', 'rejected', ['no', 'yes'], false, 'none'],
  [
    'cleanup',
    'NOT_ATTEMPTED_RETRYABLE',
    'failed',
    'not-attempted-retryable',
    ['no', 'yes'],
    true,
    'retry',
  ],
  [
    'cleanup',
    'AUTHORIZATION_LOST',
    'failed',
    'authorization-lost',
    ['no', 'yes'],
    false,
    'reauthorize',
  ],
  [
    'cleanup',
    'RATE_LIMITED',
    'failed',
    'rate-limited',
    ['no', 'yes'],
    true,
    'retry',
  ],
  [
    'cleanup',
    'OUTCOME_UNKNOWN_RECONCILING',
    'unknown',
    'outcome-unknown-reconciling',
    ['unknown', 'yes'],
    false,
    'observe',
  ],
  [
    'cleanup',
    'PROVIDER_CONTRACT_VIOLATION',
    'failed',
    'provider-contract-violation',
    ['no', 'yes'],
    false,
    'manual-intervention',
  ],
]);

/**
 * @typedef {readonly [string, string, string, string, readonly string[], boolean, string]} FailureCatalogRow
 */

/**
 * Raise one stable semantic diagnostic.
 *
 * @param {string} code diagnostic code
 * @returns {never}
 */
function invalid(code) {
  throw new SemanticValidationError(code);
}

/**
 * Require a plain JSON object.
 *
 * @param {unknown} value candidate object
 * @param {string} code diagnostic code
 * @returns {Record<string, unknown>} object
 */
function asObject(value, code) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return invalid(code);
  }
  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * Require byte-equivalent JSON values.
 *
 * @param {unknown} actual actual value
 * @param {unknown} expected expected value
 * @param {string} code diagnostic code
 * @returns {void}
 */
function requireEqual(actual, expected, code) {
  if (canonicalizeJcs(actual) !== canonicalizeJcs(expected)) invalid(code);
}

/**
 * Require joint presence and equality for an owner/reference field.
 *
 * @param {Record<string, unknown>} reference referencing object
 * @param {Record<string, unknown>} owner owning object
 * @param {string} referenceField reference field
 * @param {string} [ownerField] owner field
 * @param {string} [code] diagnostic code
 * @returns {void}
 */
function requireOwnerField(
  reference,
  owner,
  referenceField,
  ownerField = referenceField,
  code = 'DEPLOYMENT_OWNER_MISMATCH',
) {
  const referencePresent = Object.hasOwn(reference, referenceField);
  const ownerPresent = Object.hasOwn(owner, ownerField);
  if (referencePresent !== ownerPresent) invalid(code);
  if (referencePresent) {
    requireEqual(reference[referenceField], owner[ownerField], code);
  }
}

/**
 * Parse one canonical UTC-millisecond timestamp.
 *
 * @param {unknown} value candidate timestamp
 * @param {string} code diagnostic code
 * @returns {number} Unix milliseconds
 */
function timestamp(value, code) {
  if (typeof value !== 'string') return invalid(code);
  try {
    validateRfc3339(value);
  } catch {
    return invalid(code);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return invalid(code);
  return milliseconds;
}

/**
 * Require one canonical positive int64 spelling.
 *
 * @param {unknown} value candidate spelling
 * @param {string} code diagnostic code
 * @returns {bigint} parsed value
 */
function positiveInt64(value, code) {
  if (typeof value !== 'string' || !POSITIVE_INT64_PATTERN.test(value)) {
    return invalid(code);
  }
  const parsed = BigInt(value);
  if (parsed > INT64_MAXIMUM) return invalid(code);
  return parsed;
}

/**
 * Compare strings by unsigned UTF-8 bytes.
 *
 * @param {string} left left string
 * @param {string} right right string
 * @returns {number} ordering
 */
function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

/**
 * Compare two public-probe coordinates by the required mixed numeric/ASCII key.
 *
 * @param {readonly [number, string, number, number]} left left coordinate
 * @param {readonly [number, string, number, number]} right right coordinate
 * @returns {number} ordering
 */
function compareProbeCoordinate(left, right) {
  return (
    left[0] - right[0] ||
    compareUtf8(left[1], right[1]) ||
    left[2] - right[2] ||
    left[3] - right[3]
  );
}

/**
 * Return a named digest, normalizing profile errors to a stable diagnostic.
 *
 * @param {keyof typeof ACTIVE_DIGEST_PROFILES} profile profile name
 * @param {unknown} value value to digest
 * @param {string} code diagnostic code
 * @returns {string} tagged digest
 */
function digest(profile, value, code) {
  try {
    const selectedProfile = ACTIVE_DIGEST_PROFILES[profile];
    if (!selectedProfile) return invalid(code);
    return selectedProfile.digest(value);
  } catch {
    return invalid(code);
  }
}

/**
 * Require one exact object member set.
 *
 * @param {Record<string, unknown>} value candidate object
 * @param {readonly string[]} required required members
 * @param {readonly string[]} [optional] optional members
 * @param {string} [code] diagnostic code
 * @returns {void}
 */
function requireKeys(
  value,
  required,
  optional = [],
  code = 'DEPLOYMENT_CONTEXT_INVALID',
) {
  const admitted = new Set([...required, ...optional]);
  const actual = Object.keys(value);
  if (
    required.some((field) => !Object.hasOwn(value, field)) ||
    actual.some((field) => !admitted.has(field))
  ) {
    invalid(code);
  }
}

/**
 * Require one stable identifier.
 *
 * @param {unknown} value candidate identifier
 * @param {string} code diagnostic code
 * @returns {string} validated identifier
 */
function stableId(value, code) {
  if (typeof value !== 'string' || !STABLE_ID_PATTERN.test(value)) {
    return invalid(code);
  }
  return value;
}

/**
 * Validate one exact GitHub owner/repository coordinate.
 *
 * @param {unknown} value candidate coordinate
 * @param {string} code diagnostic code
 * @returns {{coordinate: string, owner: string, repository: string}} parts
 */
function githubRepositoryCoordinate(value, code) {
  if (typeof value !== 'string') return invalid(code);
  const parts = value.split('/');
  const owner = parts[0];
  const repository = parts[1];
  if (
    parts.length !== 2 ||
    owner === undefined ||
    repository === undefined ||
    !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u.test(owner) ||
    !/^[A-Za-z0-9._-]{1,100}$/u.test(repository) ||
    repository === '.' ||
    repository === '..' ||
    Buffer.byteLength(value, 'ascii') !== Buffer.byteLength(value, 'utf8') ||
    Buffer.byteLength(value, 'ascii') < 3 ||
    Buffer.byteLength(value, 'ascii') > 140
  ) {
    return invalid(code);
  }
  return { coordinate: value, owner, repository };
}

/**
 * Return the lowercase hexadecimal payload of one portable SHA-256 digest.
 *
 * @param {unknown} value tagged digest
 * @param {string} code diagnostic code
 * @returns {string} 64-byte hexadecimal payload
 */
function sha256Payload(value, code) {
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) {
    return invalid(code);
  }
  return value.slice('sha256:'.length);
}

/**
 * Return the hexadecimal transport payload of one portable Git object ID.
 *
 * @param {unknown} value portable Git object identifier
 * @param {string} code diagnostic code
 * @returns {string} untagged hexadecimal payload
 */
function gitObjectPayload(value, code) {
  if (typeof value !== 'string' || !GIT_OBJECT_ID_PATTERN.test(value)) {
    return invalid(code);
  }
  return value.slice(value.indexOf(':') + 1);
}

/**
 * Validate and authenticate the closed verified-workload binding retained by
 * authorization.
 *
 * @param {unknown} value candidate binding
 * @param {string} [code] diagnostic code
 * @returns {Record<string, unknown>} validated binding
 */
function validateVerifiedWorkloadBinding(
  value,
  code = 'DEPLOYMENT_INTENT_WORKLOAD_MISMATCH',
) {
  const binding = asObject(value, code);
  requireKeys(binding, VERIFIED_WORKLOAD_BINDING_FIELDS, [], code);
  const repository = githubRepositoryCoordinate(binding.repository, code);
  if (
    binding.issuer !== 'https://token.actions.githubusercontent.com' ||
    binding.audience !== 'urn:gala:workload:deployment-intent:v2' ||
    !['create', 'workflow_dispatch'].includes(String(binding.eventName)) ||
    typeof binding.repositoryOwner !== 'string' ||
    binding.repositoryOwner !== repository.owner ||
    typeof binding.ref !== 'string' ||
    binding.ref.length === 0 ||
    typeof binding.actor !== 'string' ||
    binding.actor.length === 0 ||
    !GIT_OBJECT_ID_PATTERN.test(String(binding.sourceCommit)) ||
    !GIT_OBJECT_ID_PATTERN.test(String(binding.workflowTriggerCommit)) ||
    !Number.isInteger(binding.runAttempt) ||
    Number(binding.runAttempt) < 1 ||
    Number(binding.runAttempt) > 51
  ) {
    return invalid(code);
  }
  for (const field of [
    'repositoryId',
    'repositoryOwnerId',
    'runId',
    'runNumber',
    'actorId',
  ]) {
    const candidate = binding[field];
    if (
      typeof candidate !== 'string' ||
      !POSITIVE_DECIMAL_PATTERN.test(candidate) ||
      BigInt(candidate) > UINT64_MAXIMUM
    ) {
      return invalid(code);
    }
  }
  for (const field of [
    'callerWorkflow',
    'publishWorkflow',
    'authorizeWorkflow',
  ]) {
    asObject(binding[field], code);
  }
  for (const field of ['oidcVerificationProfileDigest', 'issuerKeySetDigest']) {
    if (
      typeof binding[field] !== 'string' ||
      !DIGEST_PATTERN.test(/** @type {string} */ (binding[field]))
    ) {
      return invalid(code);
    }
  }
  timestamp(binding.issuerKeySetObservedAt, code);
  timestamp(binding.verifiedAt, code);
  if (
    binding.workloadBindingDigest !==
    digest('verifiedWorkloadBinding', binding, code)
  ) {
    return invalid(code);
  }
  return binding;
}

/**
 * Validate the server-owned physical provider binding.
 *
 * @param {unknown} value provider binding
 * @returns {Record<string, unknown>} validated binding
 */
function validateDestinationProviderBinding(value) {
  const binding = asObject(value, 'DESTINATION_PROVIDER_BINDING_INVALID');
  if (binding.kind === 'local-directory') {
    requireKeys(
      binding,
      ['kind', 'rootIdentityDigest', 'mutationSurfaceDigest'],
      [],
      'DESTINATION_PROVIDER_BINDING_INVALID',
    );
    if (
      typeof binding.rootIdentityDigest !== 'string' ||
      !DIGEST_PATTERN.test(binding.rootIdentityDigest) ||
      typeof binding.mutationSurfaceDigest !== 'string' ||
      !DIGEST_PATTERN.test(binding.mutationSurfaceDigest)
    ) {
      return invalid('DESTINATION_PROVIDER_BINDING_INVALID');
    }
  } else if (binding.kind === 'github-pages') {
    requireKeys(
      binding,
      ['kind', 'repository', 'repositoryId', 'apiOrigin', 'environment'],
      [],
      'DESTINATION_PROVIDER_BINDING_INVALID',
    );
    githubRepositoryCoordinate(
      binding.repository,
      'DESTINATION_PROVIDER_BINDING_INVALID',
    );
    if (
      typeof binding.repositoryId !== 'string' ||
      !POSITIVE_DECIMAL_PATTERN.test(binding.repositoryId) ||
      BigInt(binding.repositoryId) > UINT64_MAXIMUM ||
      binding.apiOrigin !== 'https://api.github.com' ||
      binding.environment !== 'github-pages'
    ) {
      return invalid('DESTINATION_PROVIDER_BINDING_INVALID');
    }
  } else if (binding.kind === 'do-spaces') {
    requireKeys(
      binding,
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
      [],
      'DESTINATION_PROVIDER_BINDING_INVALID',
    );
    const bucketPattern = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/u;
    if (
      typeof binding.servedBucket !== 'string' ||
      !bucketPattern.test(binding.servedBucket) ||
      typeof binding.stagingBucket !== 'string' ||
      !bucketPattern.test(binding.stagingBucket) ||
      binding.servedBucket === binding.stagingBucket ||
      typeof binding.region !== 'string' ||
      !/^[a-z]{3}[1-9][0-9]?$/u.test(binding.region) ||
      [
        'regionCatalogDigest',
        'websiteConfigurationDigest',
        'controlPlaneBindingDigest',
      ].some(
        (field) =>
          typeof binding[field] !== 'string' ||
          !DIGEST_PATTERN.test(/** @type {string} */ (binding[field])),
      ) ||
      ['servedApiOrigin', 'stagingApiOrigin', 'websiteOrigin'].some(
        (field) =>
          typeof binding[field] !== 'string' ||
          !(/** @type {string} */ (binding[field]).startsWith('https://')),
      )
    ) {
      return invalid('DESTINATION_PROVIDER_BINDING_INVALID');
    }
  } else {
    return invalid('DESTINATION_PROVIDER_BINDING_INVALID');
  }
  return binding;
}

/**
 * Validate the capability-authorized GitHub Actions OIDC origin catalog.
 *
 * @param {unknown} value retained catalog
 * @param {unknown} expectedDigest capability-selected catalog digest
 * @returns {Record<string, unknown>} validated catalog
 */
function validatePagesOidcOriginCatalog(value, expectedDigest) {
  const code = 'PAGES_OIDC_ORIGIN_CATALOG_INVALID';
  const catalog = asObject(value, code);
  requireKeys(
    catalog,
    ['profile', 'origins', 'fixtureDigest', 'evidenceDigest', 'catalogDigest'],
    [],
    code,
  );
  const origins = Array.isArray(catalog.origins)
    ? catalog.origins
    : invalid(code);
  if (
    catalog.profile !== 'gala-github-actions-oidc-origin-catalog-v2' ||
    origins.length < 1 ||
    origins.length > 64 ||
    typeof catalog.fixtureDigest !== 'string' ||
    !DIGEST_PATTERN.test(catalog.fixtureDigest) ||
    typeof catalog.evidenceDigest !== 'string' ||
    !DIGEST_PATTERN.test(catalog.evidenceDigest) ||
    catalog.catalogDigest !== expectedDigest ||
    catalog.catalogDigest !==
      digest('githubActionsOidcOriginCatalog', catalog, code)
  ) {
    return invalid(code);
  }
  let priorOrigin;
  for (const origin of origins) {
    if (
      typeof origin !== 'string' ||
      !/^https:\/\/pipelines(?:gh[a-z0-9]{1,32})?\.actions\.githubusercontent\.com$/u.test(
        origin,
      ) ||
      (priorOrigin !== undefined && compareUtf8(priorOrigin, origin) >= 0)
    ) {
      return invalid(code);
    }
    priorOrigin = origin;
  }
  return catalog;
}

/**
 * Derive the only physical mutation-key material admitted by a provider binding.
 *
 * @param {unknown} value provider binding
 * @returns {Record<string, unknown>} exact mutation-key material
 */
function deriveDestinationMutationKeyMaterial(value) {
  const binding = validateDestinationProviderBinding(value);
  if (binding.kind === 'local-directory') {
    return {
      kind: binding.kind,
      mutationSurfaceDigest: binding.mutationSurfaceDigest,
    };
  }
  if (binding.kind === 'github-pages') {
    return { kind: binding.kind, repositoryId: binding.repositoryId };
  }
  return {
    kind: binding.kind,
    servedBucket: binding.servedBucket,
    region: binding.region,
  };
}

/**
 * Compute the digest that binds a destination identity to its physical provider.
 *
 * @param {unknown} binding exact provider binding
 * @returns {string} tagged digest
 */
export function computeDestinationProviderBindingDigest(binding) {
  return digest(
    'destinationProviderBinding',
    validateDestinationProviderBinding(binding),
    'DESTINATION_PROVIDER_BINDING_INVALID',
  );
}

/**
 * Validate a physical destination mutation-key material record.
 *
 * @param {unknown} value key material
 * @returns {Record<string, unknown>} validated material
 */
export function validateDestinationMutationKeyMaterial(value) {
  const material = asObject(value, 'DESTINATION_MUTATION_KEY_INVALID');
  const fieldSets = {
    'local-directory': ['kind', 'mutationSurfaceDigest'],
    'github-pages': ['kind', 'repositoryId'],
    'do-spaces': ['kind', 'servedBucket', 'region'],
  };
  const kind = material.kind;
  if (typeof kind !== 'string' || !Object.hasOwn(fieldSets, kind)) {
    return invalid('DESTINATION_MUTATION_KEY_INVALID');
  }
  const expected = /** @type {Record<string, string[]>} */ (fieldSets)[kind];
  if (!expected) return invalid('DESTINATION_MUTATION_KEY_INVALID');
  const actual = Object.keys(material).sort();
  if (
    actual.length !== expected.length ||
    actual.some((field, index) => field !== [...expected].sort()[index])
  ) {
    return invalid('DESTINATION_MUTATION_KEY_INVALID');
  }
  if (
    (kind === 'local-directory' &&
      (typeof material.mutationSurfaceDigest !== 'string' ||
        !DIGEST_PATTERN.test(material.mutationSurfaceDigest))) ||
    (kind === 'github-pages' &&
      (typeof material.repositoryId !== 'string' ||
        !POSITIVE_DECIMAL_PATTERN.test(material.repositoryId) ||
        BigInt(material.repositoryId) > UINT64_MAXIMUM)) ||
    (kind === 'do-spaces' &&
      (typeof material.servedBucket !== 'string' ||
        !/^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/u.test(material.servedBucket) ||
        typeof material.region !== 'string' ||
        !/^[a-z]{3}[1-9][0-9]?$/u.test(material.region)))
  ) {
    return invalid('DESTINATION_MUTATION_KEY_INVALID');
  }
  return material;
}

/**
 * Compute the physical destination single-writer key digest.
 *
 * @param {unknown} material exact mutation-key material
 * @returns {string} tagged digest
 */
export function computeDestinationMutationKeyDigest(material) {
  return digest(
    'destinationMutationKey',
    validateDestinationMutationKeyMaterial(material),
    'DESTINATION_MUTATION_KEY_INVALID',
  );
}

/**
 * Compute a deployment-policy decision digest.
 *
 * @param {unknown} decision complete decision
 * @returns {string} tagged digest
 */
export function computeDeploymentPolicyDecisionDigest(decision) {
  return digest(
    'deploymentPolicyDecision',
    decision,
    'DEPLOYMENT_POLICY_DECISION_INVALID',
  );
}

/**
 * Compute an activation-detection plan digest.
 *
 * @param {unknown} plan complete plan
 * @returns {string} tagged digest
 */
export function computeActivationDetectionPlanDigest(plan) {
  return digest(
    'publicActivationDetectionPlan',
    plan,
    'ACTIVATION_DETECTION_PLAN_INVALID',
  );
}

/**
 * Compute a Pages reconciliation-command digest.
 *
 * @param {unknown} command complete command
 * @returns {string} tagged digest
 */
export function computePagesReconciliationCommandDigest(command) {
  return digest(
    'pagesReconciliationCommand',
    command,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
}

/**
 * Compute a Pages run-attempt gap-proof digest.
 *
 * @param {unknown} proof complete proof
 * @returns {string} tagged digest
 */
export function computePagesRunAttemptGapProofDigest(proof) {
  return digest(
    'pagesRunAttemptGapProof',
    proof,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
}

/**
 * Compute a permanent Pages no-authority tombstone digest.
 *
 * @param {unknown} coordinates repository/run/attempt/authority coordinates
 * @returns {string} tagged digest
 */
export function computePagesNoAuthorityRunAttemptDigest(coordinates) {
  return digest(
    'pagesNoAuthorityRunAttempt',
    coordinates,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
}

/**
 * Compute a Pages reconciliation-recovery digest.
 *
 * @param {unknown} recovery complete recovery
 * @returns {string} tagged digest
 */
export function computePagesReconciliationRecoveryDigest(recovery) {
  return digest(
    'pagesReconciliationRecovery',
    recovery,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
}

/**
 * Compute a deadline-finalization evidence digest.
 *
 * @param {unknown} evidence complete evidence
 * @returns {string} tagged digest
 */
export function computeDeadlineFinalizationEvidenceDigest(evidence) {
  return digest(
    'deadlineFinalizationEvidence',
    evidence,
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
}

/**
 * Compute a supersession-finalization evidence digest.
 *
 * @param {unknown} evidence complete evidence
 * @returns {string} tagged digest
 */
export function computeSupersessionFinalizationEvidenceDigest(evidence) {
  return digest(
    'supersessionFinalizationEvidence',
    evidence,
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
}

/**
 * Compute a cancellation-finalization evidence digest.
 *
 * @param {unknown} evidence complete evidence
 * @returns {string} tagged digest
 */
export function computeCancellationFinalizationEvidenceDigest(evidence) {
  return digest(
    'cancellationFinalizationEvidence',
    evidence,
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
}

/**
 * Compute the digest of the complete ordered verification plan.
 *
 * @param {unknown} plan complete ordered target array
 * @returns {string} tagged digest
 */
export function computeVerificationPlanDigest(plan) {
  return digest(
    'verificationPlan',
    plan,
    'DEPLOYMENT_INTENT_VERIFICATION_PLAN_INVALID',
  );
}

/**
 * Compute a deployment-intent digest.
 *
 * @param {unknown} intent complete intent
 * @returns {string} tagged digest
 */
export function computeDeploymentIntentDigest(intent) {
  return digest('deploymentIntent', intent, 'DEPLOYMENT_INTENT_INVALID');
}

/**
 * Validate the closed policy decision and its owner equalities.
 *
 * @param {unknown} value decision
 * @param {{intent: Record<string, unknown>, acceptedPolicy: unknown, buildPolicyDecisionDigest: string, capabilityDecisionDigest: string}} context owning context
 * @returns {Record<string, unknown>} validated decision
 */
export function validateDeploymentPolicyDecision(value, context) {
  const decision = asObject(value, 'DEPLOYMENT_POLICY_DECISION_INVALID');
  const policy = asObject(
    context.acceptedPolicy,
    'DEPLOYMENT_POLICY_DECISION_INVALID',
  );
  const intent = context.intent;
  if (
    decision.profile !== 'gala-deployment-policy-decision-v2' ||
    decision.retryProfile !== 'gala-public-probe-retry-v2' ||
    decision.activationDetectionProfile !==
      'gala-public-activation-detection-v2' ||
    decision.maximumActivationDetectionAttempts !== 91 ||
    decision.activationDetectionIntervalSeconds !== 60 ||
    decision.maximumFinalizationDelaySeconds !== 300 ||
    canonicalizeJcs(decision.approvedOverrides) !== '[]'
  ) {
    return invalid('DEPLOYMENT_POLICY_DECISION_INVALID');
  }
  for (const field of POLICY_DECISION_OWNER_FIELDS) {
    requireOwnerField(
      intent,
      decision,
      field,
      field,
      'DEPLOYMENT_POLICY_DECISION_MISMATCH',
    );
  }
  for (const field of [
    ...POLICY_DECISION_OWNER_FIELDS,
    ...POLICY_LIMIT_FIELDS,
  ]) {
    if (Object.hasOwn(policy, field)) {
      requireOwnerField(
        decision,
        policy,
        field,
        field,
        'DEPLOYMENT_POLICY_DECISION_MISMATCH',
      );
    }
  }
  const directOwners = {
    artifactId: intent.artifactId,
    artifactDigest: intent.artifactDigest,
    manifestDigest: intent.manifestDigest,
    buildPolicyDecisionDigest: context.buildPolicyDecisionDigest,
    destination: intent.destination,
    capabilityDecisionDigest: context.capabilityDecisionDigest,
  };
  for (const [field, owner] of Object.entries(directOwners)) {
    requireEqual(decision[field], owner, 'DEPLOYMENT_POLICY_DECISION_MISMATCH');
  }
  if (
    decision.decisionDigest !==
      computeDeploymentPolicyDecisionDigest(decision) ||
    intent.policyDecisionDigest !== decision.decisionDigest
  ) {
    return invalid('DEPLOYMENT_POLICY_DECISION_DIGEST_MISMATCH');
  }
  return decision;
}

/**
 * Validate a retained marker-watch plan.
 *
 * @param {unknown} value marker-watch plan
 * @param {{intent: Record<string, unknown>, verificationPlan: unknown[], verificationPlanContext: Parameters<typeof validateVerificationPlan>[1]}} context owning context
 * @returns {Record<string, unknown>} validated plan
 */
export function validateActivationDetectionPlan(value, context) {
  try {
    return validatePublicActivationDetectionPlan(value, {
      intent: context.intent,
      verificationPlan: context.verificationPlan,
      verificationPlanContext: context.verificationPlanContext,
    });
  } catch {
    return invalid('ACTIVATION_DETECTION_PLAN_INVALID');
  }
}

/**
 * Validate one retained verification plan/context pair against the enclosing
 * deployment intent rather than only against itself.
 *
 * @param {Record<string, unknown>} intent retained intent
 * @param {unknown} plan retained plan
 * @param {unknown} contextValue retained immutable plan authority
 * @returns {Record<string, unknown>} validated plan context
 */
function validateIntentVerificationPlan(intent, plan, contextValue) {
  const context = asObject(
    contextValue,
    'DEPLOYMENT_INTENT_VERIFICATION_PLAN_INVALID',
  );
  let planDigest;
  try {
    planDigest = validateVerificationPlan(
      plan,
      /** @type {Parameters<typeof validateVerificationPlan>[1]} */ (context),
    );
  } catch {
    return invalid('DEPLOYMENT_INTENT_VERIFICATION_PLAN_INVALID');
  }
  const markerAuthority = asObject(
    context.marker,
    'DEPLOYMENT_INTENT_VERIFICATION_PLAN_INVALID',
  );
  if (
    planDigest !== intent.verificationPlanDigest ||
    canonicalizeJcs(context.verificationOrigins) !==
      canonicalizeJcs(intent.verificationOrigins)
  ) {
    return invalid('DEPLOYMENT_INTENT_VERIFICATION_PLAN_INVALID');
  }
  requireEqual(
    markerAuthority.value,
    intent.marker,
    'DEPLOYMENT_INTENT_MARKER_MISMATCH',
  );
  return context;
}

/**
 * Derive the effective immutable verification-plan authority from the intent's
 * accepted deployment policy rather than accepting duplicate limit values.
 *
 * @param {Record<string, unknown>} intent retained intent
 * @param {Record<string, unknown>} intentContext retained intent owners
 * @returns {Record<string, unknown>} effective plan authority
 */
function deriveIntentVerificationPlanContext(intent, intentContext) {
  const policyDecision = asObject(
    intentContext.deploymentPolicyDecision,
    'DEPLOYMENT_INTENT_INVALID',
  );
  const base = asObject(
    intentContext.verificationPlanContext,
    'DEPLOYMENT_INTENT_VERIFICATION_PLAN_INVALID',
  );
  return {
    ...base,
    verificationOrigins: /** @type {string[]} */ (intent.verificationOrigins),
    verificationPlanDigest: String(intent.verificationPlanDigest),
    maximumRedirectHops: /** @type {number} */ (
      policyDecision.maximumRedirectHops
    ),
    maximumAttemptsPerTarget: /** @type {number} */ (
      policyDecision.maximumAttemptsPerTarget
    ),
    maximumConcurrentStreams: /** @type {number} */ (
      policyDecision.maximumConcurrentStreams
    ),
    maximumPublicResponseBytes: /** @type {string} */ (
      policyDecision.maximumPublicResponseBytes
    ),
    requestTimeoutSeconds: /** @type {number} */ (
      policyDecision.requestTimeoutSeconds
    ),
  };
}

/**
 * Validate the immutable operation-ledger reservation committed before intent
 * issuance. The enclosing transaction is an execution concern; this function
 * derives and binds every retained reservation value.
 *
 * @param {unknown} value retained reservation
 * @param {{intent: Record<string, unknown>, operation: Record<string, unknown>, workload: Record<string, unknown>, verificationPlan: unknown[], deploymentPolicyDecision: Record<string, unknown>, reservationTransition: unknown}} context owning facts
 * @returns {Record<string, unknown>} validated reservation
 */
function validatePublicProbeReservation(value, context) {
  const code = 'DEPLOYMENT_INTENT_VERIFICATION_RESERVATION_INVALID';
  const reservation = asObject(value, code);
  requireKeys(
    reservation,
    [
      'operationId',
      'attemptId',
      'runAttempt',
      'baseProbeStreamCount',
      'lifetimeConsumedAttemptsByStream',
      'requiredProbeSlots',
      'operationProbeSlotsConsumed',
      'operationProbeSlotsRemainingBeforeReservation',
      'reservationCommitted',
    ],
    [],
    code,
  );
  const transition = asObject(context.reservationTransition, code);
  requireKeys(
    transition,
    ['profile', 'priorOperationObservations', 'before', 'after'],
    [],
    code,
  );
  const plan = Array.isArray(context.verificationPlan)
    ? context.verificationPlan.map((target) => asObject(target, code))
    : invalid(code);
  const streams = deriveRequiredVerificationStreams(plan);
  const runAttempt = context.workload.runAttempt;
  if (
    typeof runAttempt !== 'number' ||
    !Number.isInteger(runAttempt) ||
    runAttempt < 1 ||
    runAttempt > 51
  ) {
    return invalid(code);
  }
  const streamKeys = new Set(
    streams.map(({ targetId, probeRegion }) => `${targetId}\0${probeRegion}`),
  );
  const priorObservations = Array.isArray(transition.priorOperationObservations)
    ? transition.priorOperationObservations.map((observation) =>
        asObject(observation, code),
      )
    : invalid(code);
  /** @type {Map<string, Set<number>>} */
  const consumedAttemptNumbersByStream = new Map(
    streams.map(({ targetId, probeRegion }) => [
      `${targetId}\0${probeRegion}`,
      new Set(),
    ]),
  );
  let derivedConsumedProbeSlots = 0;
  for (const observation of priorObservations) {
    if (observation.operationId !== context.intent.operationId) {
      return invalid(code);
    }
    if (observation.observationClass !== 'public-state') continue;
    const probes = Array.isArray(observation.probes)
      ? observation.probes.map((probe) => asObject(probe, code))
      : invalid(code);
    derivedConsumedProbeSlots += probes.length;
    for (const probe of probes) {
      const targetId = probe.targetId;
      const probeRegion = probe.probeRegion;
      const attemptNumber = probe.attemptNumber;
      const streamKey = `${targetId}\0${probeRegion}`;
      if (
        typeof targetId !== 'number' ||
        !Number.isInteger(targetId) ||
        typeof probeRegion !== 'string' ||
        typeof attemptNumber !== 'number' ||
        !Number.isInteger(attemptNumber) ||
        attemptNumber < 1 ||
        !streamKeys.has(streamKey)
      ) {
        return invalid(code);
      }
      consumedAttemptNumbersByStream.get(streamKey)?.add(attemptNumber);
    }
  }
  const rows = Array.isArray(reservation.lifetimeConsumedAttemptsByStream)
    ? reservation.lifetimeConsumedAttemptsByStream.map((row) =>
        asObject(row, code),
      )
    : invalid(code);
  const maximumAttempts =
    context.deploymentPolicyDecision.maximumAttemptsPerTarget;
  const maximumRedirectHops =
    context.deploymentPolicyDecision.maximumRedirectHops;
  if (
    typeof maximumAttempts !== 'number' ||
    !Number.isInteger(maximumAttempts) ||
    typeof maximumRedirectHops !== 'number' ||
    !Number.isInteger(maximumRedirectHops) ||
    rows.length !== streams.length
  ) {
    return invalid(code);
  }
  let remainingAttemptCount = 0;
  for (let index = 0; index < streams.length; index += 1) {
    const stream = streams[index];
    const row = rows[index];
    if (!stream || !row) return invalid(code);
    requireKeys(
      row,
      ['targetId', 'probeRegion', 'lifetimeConsumedAttempts'],
      [],
      code,
    );
    const consumedAttempts = row.lifetimeConsumedAttempts;
    const streamKey = `${stream.targetId}\0${stream.probeRegion}`;
    const consumedAttemptNumbers = [
      ...(consumedAttemptNumbersByStream.get(streamKey) ?? []),
    ].sort((left, right) => left - right);
    const derivedConsumedAttempts = consumedAttemptNumbers.length;
    if (
      row.targetId !== stream.targetId ||
      row.probeRegion !== stream.probeRegion ||
      typeof consumedAttempts !== 'number' ||
      !Number.isInteger(consumedAttempts) ||
      consumedAttempts < 0 ||
      consumedAttempts !== derivedConsumedAttempts ||
      consumedAttemptNumbers.some(
        (attemptNumber, attemptIndex) => attemptNumber !== attemptIndex + 1,
      ) ||
      consumedAttempts >= maximumAttempts ||
      (runAttempt === 1 && consumedAttempts !== 0)
    ) {
      return invalid(code);
    }
    remainingAttemptCount += maximumAttempts - consumedAttempts;
  }
  const requiredProbeSlots = remainingAttemptCount * (1 + maximumRedirectHops);
  const consumedProbeSlots = reservation.operationProbeSlotsConsumed;
  const remainingProbeSlots =
    reservation.operationProbeSlotsRemainingBeforeReservation;
  if (
    reservation.operationId !== context.intent.operationId ||
    reservation.operationId !== context.operation.operationId ||
    reservation.attemptId !== context.intent.attemptId ||
    reservation.attemptId !== context.operation.attemptId ||
    reservation.runAttempt !== runAttempt ||
    reservation.baseProbeStreamCount !== streams.length ||
    reservation.requiredProbeSlots !== requiredProbeSlots ||
    reservation.reservationCommitted !== true ||
    typeof consumedProbeSlots !== 'number' ||
    !Number.isInteger(consumedProbeSlots) ||
    consumedProbeSlots < 0 ||
    consumedProbeSlots > 900 ||
    consumedProbeSlots !== derivedConsumedProbeSlots ||
    (runAttempt === 1 && consumedProbeSlots !== 0) ||
    typeof remainingProbeSlots !== 'number' ||
    !Number.isInteger(remainingProbeSlots) ||
    remainingProbeSlots !== 900 - consumedProbeSlots ||
    requiredProbeSlots < 1 ||
    requiredProbeSlots > remainingProbeSlots
  ) {
    return invalid(code);
  }
  const before = asObject(transition.before, code);
  const after = asObject(transition.after, code);
  requireKeys(
    before,
    [
      'operationId',
      'state',
      'operationProbeSlotsConsumed',
      'lifetimeConsumedAttemptsByStream',
    ],
    ['priorRunClosure'],
    code,
  );
  requireKeys(
    after,
    [
      'operationId',
      'state',
      'attemptId',
      'runAttempt',
      'operationProbeSlotsConsumed',
      'lifetimeConsumedAttemptsByStream',
      'reservedProbeSlots',
    ],
    [],
    code,
  );
  if (
    transition.profile !== 'gala-public-probe-reservation-transition-v2' ||
    before.operationId !== reservation.operationId ||
    before.state !== 'available' ||
    before.operationProbeSlotsConsumed !== consumedProbeSlots ||
    canonicalizeJcs(before.lifetimeConsumedAttemptsByStream) !==
      canonicalizeJcs(rows) ||
    after.operationId !== reservation.operationId ||
    after.state !== 'reserved' ||
    after.attemptId !== reservation.attemptId ||
    after.runAttempt !== reservation.runAttempt ||
    after.operationProbeSlotsConsumed !== consumedProbeSlots ||
    canonicalizeJcs(after.lifetimeConsumedAttemptsByStream) !==
      canonicalizeJcs(rows) ||
    after.reservedProbeSlots !== requiredProbeSlots
  ) {
    return invalid(code);
  }
  const hasPriorClosure = Object.hasOwn(before, 'priorRunClosure');
  if (runAttempt === 1) {
    if (hasPriorClosure || priorObservations.length !== 0) return invalid(code);
  } else {
    const retainedClosure = asObject(before.priorRunClosure, code);
    requireKeys(
      retainedClosure,
      ['runAttempt', 'intentDigest', 'attempt', 'observation'],
      [],
      code,
    );
    const priorAttempt = asObject(retainedClosure.attempt, code);
    const priorObservation = asObject(retainedClosure.observation, code);
    const failureClose = Boolean(
      findFailureRow(priorAttempt, priorObservation),
    );
    const cancellationClose =
      priorAttempt.stage === 'managed-reconciliation' &&
      priorAttempt.outcome === 'skipped' &&
      priorObservation.observationClass === 'request-not-started' &&
      priorObservation.outcome === 'rejected';
    if (
      !hasPriorClosure ||
      typeof retainedClosure.runAttempt !== 'number' ||
      !Number.isInteger(retainedClosure.runAttempt) ||
      retainedClosure.runAttempt !== runAttempt - 1 ||
      retainedClosure.intentDigest !== priorObservation.intentDigest ||
      priorAttempt.attemptId !== priorObservation.attemptId ||
      priorAttempt.stageAttemptId !== priorObservation.stageAttemptId ||
      priorAttempt.destinationChanged !== 'no' ||
      priorObservation.destinationChanged !== 'no' ||
      (!failureClose && !cancellationClose) ||
      !priorObservations.some(
        (candidate) =>
          canonicalizeJcs(candidate) === canonicalizeJcs(priorObservation),
      )
    ) {
      return invalid(code);
    }
  }
  return reservation;
}

/**
 * Validate one destination-mutation authority against its enclosing intent.
 *
 * @param {unknown} value authority
 * @param {{intent: Record<string, unknown>, destinationProviderBinding: unknown, destinationFence: unknown, recovery?: unknown}} context owning context
 * @returns {Record<string, unknown>} validated authority
 */
export function validateDestinationMutationAuthority(value, context) {
  const authority = asObject(value, 'DESTINATION_MUTATION_AUTHORITY_INVALID');
  const intent = context.intent;
  if (
    authority.profile !== 'gala-destination-mutation-authority-v2' ||
    (authority.mode !== 'normal' &&
      authority.mode !== 'pages-reconciliation-recovery') ||
    positiveInt64(authority.epoch, 'DESTINATION_MUTATION_AUTHORITY_INVALID') <
      1n
  ) {
    return invalid('DESTINATION_MUTATION_AUTHORITY_INVALID');
  }
  requireEqual(
    authority.destination,
    intent.destination,
    'DESTINATION_MUTATION_AUTHORITY_MISMATCH',
  );
  for (const field of INTENT_AUTHORITY_FIELDS) {
    requireOwnerField(
      authority,
      intent,
      field,
      field,
      'DESTINATION_MUTATION_AUTHORITY_MISMATCH',
    );
  }
  const binding = validateDestinationProviderBinding(
    context.destinationProviderBinding,
  );
  const expectedKeyDigest = computeDestinationMutationKeyDigest(
    deriveDestinationMutationKeyMaterial(binding),
  );
  if (authority.destinationMutationKeyDigest !== expectedKeyDigest) {
    return invalid('DESTINATION_MUTATION_AUTHORITY_MISMATCH');
  }
  const destination = asObject(
    intent.destination,
    'DESTINATION_MUTATION_AUTHORITY_INVALID',
  );
  const adapter = asObject(
    intent.adapter,
    'DESTINATION_MUTATION_AUTHORITY_INVALID',
  );
  if (
    destination.targetDigest !==
      computeDestinationProviderBindingDigest(binding) ||
    destination.adapterId !== adapter.adapterId ||
    destination.adapterVersion !== adapter.adapterVersion ||
    binding.kind !== adapter.adapterId
  ) {
    return invalid('DESTINATION_MUTATION_AUTHORITY_MISMATCH');
  }
  const fence = asObject(
    context.destinationFence,
    'DESTINATION_MUTATION_AUTHORITY_INVALID',
  );
  requireKeys(
    fence,
    [
      'profile',
      'mode',
      'destinationKeyDigest',
      'destination',
      'epoch',
      'authorityId',
      'operationId',
      'attemptId',
      'proposedGenerationId',
      'authorityExpiresAt',
      'state',
      'rowVersion',
    ],
    ['expectedGenerationId', 'pagesRecoveryDigest'],
    'DESTINATION_MUTATION_AUTHORITY_INVALID',
  );
  const expectedFenceState =
    authority.mode === 'normal' ? 'active' : 'pages-recovery-active';
  if (
    fence.profile !== 'gala-destination-mutation-fence-v2' ||
    fence.mode !== authority.mode ||
    fence.destinationKeyDigest !== expectedKeyDigest ||
    fence.state !== expectedFenceState ||
    positiveInt64(fence.epoch, 'DESTINATION_MUTATION_AUTHORITY_INVALID') < 1n ||
    positiveInt64(fence.rowVersion, 'DESTINATION_MUTATION_AUTHORITY_INVALID') <
      1n
  ) {
    return invalid('DESTINATION_MUTATION_AUTHORITY_MISMATCH');
  }
  /** @type {readonly (readonly [string, string])[]} */
  const fenceOwnerFields = [
    ['destination', 'destination'],
    ['epoch', 'epoch'],
    ['authorityId', 'authorityId'],
    ['operationId', 'operationId'],
    ['attemptId', 'attemptId'],
    ['expectedGenerationId', 'expectedGenerationId'],
    ['proposedGenerationId', 'proposedGenerationId'],
    ['expiresAt', 'authorityExpiresAt'],
  ];
  for (const [authorityField, fenceField] of fenceOwnerFields) {
    requireOwnerField(
      authority,
      fence,
      authorityField,
      fenceField,
      'DESTINATION_MUTATION_AUTHORITY_MISMATCH',
    );
  }
  if (authority.mode === 'normal') {
    if (
      Object.hasOwn(authority, 'pagesRecovery') ||
      Object.hasOwn(fence, 'pagesRecoveryDigest')
    ) {
      return invalid('DESTINATION_MUTATION_AUTHORITY_INVALID');
    }
  } else {
    if (
      asObject(intent.adapter, 'DESTINATION_MUTATION_AUTHORITY_INVALID')
        .adapterId !== 'github-pages' ||
      !Object.hasOwn(authority, 'pagesRecovery') ||
      context.recovery === undefined
    ) {
      return invalid('DESTINATION_MUTATION_AUTHORITY_INVALID');
    }
    validatePagesReconciliationRecovery(authority.pagesRecovery, {
      intent,
      authority,
      recovery: context.recovery,
    });
    const pagesRecovery = asObject(
      authority.pagesRecovery,
      'DESTINATION_MUTATION_AUTHORITY_INVALID',
    );
    if (fence.pagesRecoveryDigest !== pagesRecovery.recoveryDigest) {
      return invalid('DESTINATION_MUTATION_AUTHORITY_MISMATCH');
    }
  }
  return authority;
}

/**
 * Validate Pages recovery command, gap proof and prior-fence closure.
 *
 * @param {unknown} value recovery record
 * @param {{intent: Record<string, unknown>, authority: Record<string, unknown>, recovery: unknown}} context owning context
 * @returns {Record<string, unknown>} validated recovery
 */
export function validatePagesReconciliationRecovery(value, context) {
  const recovery = asObject(value, 'PAGES_RECONCILIATION_RECOVERY_INVALID');
  const owners = asObject(
    context.recovery,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
  const command = asObject(
    owners.command,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
  const priorIntent = asObject(
    owners.priorIntent,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
  const fence = asObject(owners.fence, 'PAGES_RECONCILIATION_RECOVERY_INVALID');
  const oidc = asObject(owners.oidc, 'PAGES_RECONCILIATION_RECOVERY_INVALID');
  const priorWorkload = asObject(
    owners.priorWorkload,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
  const currentWorkload = asObject(
    owners.currentWorkload,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
  const publication = asObject(
    owners.publication,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
  const commandAuthorization = asObject(
    owners.commandAuthorization,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
  const commandFence = asObject(
    owners.commandFence,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
  const destinationProviderBinding = validateDestinationProviderBinding(
    owners.destinationProviderBinding,
  );
  const authorityPagesRecovery = asObject(
    context.authority.pagesRecovery,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
  if (
    recovery.profile !== 'gala-pages-reconciliation-recovery-v2' ||
    command.profile !== 'gala-pages-reconciliation-command-v2' ||
    command.commandDigest !==
      computePagesReconciliationCommandDigest(command) ||
    recovery.recoveryDigest !==
      computePagesReconciliationRecoveryDigest(recovery)
  ) {
    return invalid('PAGES_RECONCILIATION_RECOVERY_INVALID');
  }
  requireKeys(
    commandFence,
    ['reconcileCommandId', 'commandDigest', 'state', 'boundAttemptId'],
    [],
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
  if (
    commandFence.state !== 'bound' ||
    commandFence.reconcileCommandId !== command.reconcileCommandId ||
    commandFence.commandDigest !== command.commandDigest ||
    commandFence.boundAttemptId !== context.intent.attemptId ||
    commandAuthorization.reconcileCommandId !== command.reconcileCommandId ||
    commandAuthorization.actorPrincipalId !== command.actorPrincipalId ||
    commandAuthorization.consequentialConfirmationId !==
      command.consequentialConfirmationId
  ) {
    return invalid('PAGES_RECONCILIATION_RECOVERY_MISMATCH');
  }
  if (
    priorIntent.intentDigest !== computeDeploymentIntentDigest(priorIntent) ||
    context.intent.intentDigest !==
      computeDeploymentIntentDigest(context.intent) ||
    recovery.recoveryDigest !== authorityPagesRecovery.recoveryDigest
  ) {
    return invalid('PAGES_RECONCILIATION_RECOVERY_MISMATCH');
  }
  const continuityFields = [
    'operationId',
    'sourceCommit',
    'workflowTriggerCommit',
    'artifactId',
    'artifactDigest',
    'manifestDigest',
    'artifactByteCount',
    'artifactFileCount',
    'provenanceDigest',
    'sbomDigest',
    'lockDigest',
    'rebuildRecord',
    'publisher',
    'adapter',
    'destination',
    'expectedGenerationId',
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
    'verificationTier',
    'verificationOrigins',
    'verificationPlanDigest',
    'maximumPublicVerificationSeconds',
    'maximumFinalizationDelaySeconds',
    'marker',
  ];
  for (const field of continuityFields) {
    requireOwnerField(
      context.intent,
      priorIntent,
      field,
      field,
      'PAGES_RECONCILIATION_RECOVERY_MISMATCH',
    );
  }
  if (
    command.operationId !== context.intent.operationId ||
    command.operationId !== priorIntent.operationId ||
    command.publicationId !== publication.publicationId ||
    command.actorPrincipalId !== commandAuthorization.actorPrincipalId ||
    command.consequentialConfirmationId !==
      commandAuthorization.consequentialConfirmationId ||
    command.generationId !== context.intent.proposedGenerationId ||
    command.priorAttemptId !== priorIntent.attemptId ||
    command.priorIntentDigest !== priorIntent.intentDigest ||
    command.priorAuthorityEpoch !== fence.epoch ||
    command.priorAuthorityId !== fence.authorityId ||
    command.priorFenceEvidenceDigest !== fence.evidenceDigest ||
    !Number.isInteger(command.priorRunAttempt) ||
    Number(command.priorRunAttempt) < 1 ||
    Number(command.priorRunAttempt) > 50 ||
    timestamp(command.expiresAt, 'PAGES_RECONCILIATION_RECOVERY_INVALID') !==
      timestamp(command.acceptedAt, 'PAGES_RECONCILIATION_RECOVERY_INVALID') +
        86_400_000 ||
    timestamp(
      context.intent.authorizedAt,
      'PAGES_RECONCILIATION_RECOVERY_INVALID',
    ) <
      timestamp(command.acceptedAt, 'PAGES_RECONCILIATION_RECOVERY_INVALID') ||
    timestamp(
      context.intent.authorizedAt,
      'PAGES_RECONCILIATION_RECOVERY_INVALID',
    ) >= timestamp(command.expiresAt, 'PAGES_RECONCILIATION_RECOVERY_INVALID')
  ) {
    return invalid('PAGES_RECONCILIATION_RECOVERY_MISMATCH');
  }
  const commandMap = {
    reconcileCommandId: 'reconcileCommandId',
    reconcileCommandDigest: 'commandDigest',
    reconcileCommandExpiresAt: 'expiresAt',
  };
  for (const [field, ownerField] of Object.entries(commandMap)) {
    requireOwnerField(
      recovery,
      command,
      field,
      ownerField,
      'PAGES_RECONCILIATION_RECOVERY_MISMATCH',
    );
  }
  const priorMap = {
    priorAttemptId: 'attemptId',
    priorIntentDigest: 'intentDigest',
    priorExpectedGenerationId: 'expectedGenerationId',
    priorProposedGenerationId: 'proposedGenerationId',
    priorPagesBuildVersion: 'pagesBuildVersion',
  };
  for (const [field, ownerField] of Object.entries(priorMap)) {
    requireOwnerField(
      recovery,
      priorIntent,
      field,
      ownerField,
      'PAGES_RECONCILIATION_RECOVERY_MISMATCH',
    );
  }
  const fenceMap = {
    priorAuthorityEpoch: 'epoch',
    priorAuthorityId: 'authorityId',
    priorFenceEvidenceDigest: 'evidenceDigest',
  };
  for (const [field, ownerField] of Object.entries(fenceMap)) {
    requireOwnerField(
      recovery,
      fence,
      field,
      ownerField,
      'PAGES_RECONCILIATION_RECOVERY_MISMATCH',
    );
  }
  if (
    fence.profile !== 'gala-destination-mutation-fence-v2' ||
    (fence.mode !== 'normal' &&
      fence.mode !== 'pages-reconciliation-recovery') ||
    fence.state !== 'reconciliation-required' ||
    recovery.priorProposedGenerationId !==
      context.intent.proposedGenerationId ||
    fence.destinationKeyDigest !==
      asObject(
        priorIntent.destinationMutationAuthority,
        'PAGES_RECONCILIATION_RECOVERY_INVALID',
      ).destinationMutationKeyDigest ||
    fence.operationId !== priorIntent.operationId ||
    fence.attemptId !== priorIntent.attemptId ||
    fence.proposedGenerationId !== priorIntent.proposedGenerationId ||
    fence.authorityExpiresAt !==
      asObject(
        priorIntent.destinationMutationAuthority,
        'PAGES_RECONCILIATION_RECOVERY_INVALID',
      ).expiresAt ||
    typeof fence.evidenceDigest !== 'string' ||
    !DIGEST_PATTERN.test(fence.evidenceDigest) ||
    positiveInt64(fence.rowVersion, 'PAGES_RECONCILIATION_RECOVERY_INVALID') <
      1n
  ) {
    return invalid('PAGES_RECONCILIATION_RECOVERY_MISMATCH');
  }
  requireEqual(
    fence.destination,
    priorIntent.destination,
    'PAGES_RECONCILIATION_RECOVERY_MISMATCH',
  );
  requireOwnerField(
    context.intent,
    recovery,
    'expectedGenerationId',
    'priorExpectedGenerationId',
    'PAGES_RECONCILIATION_RECOVERY_MISMATCH',
  );
  const proof = asObject(
    recovery.runAttemptGapProof,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
  if (
    proof.profile !== 'gala-pages-run-attempt-gap-proof-v2' ||
    proof.runId !== oidc.runId ||
    proof.claimingRunAttempt !== oidc.runAttempt ||
    proof.runId !== command.runId ||
    proof.runId !== priorWorkload.runId ||
    proof.runId !== currentWorkload.runId ||
    proof.priorRunAttempt !== command.priorRunAttempt ||
    proof.priorRunAttempt !== priorWorkload.runAttempt ||
    proof.claimingRunAttempt !== currentWorkload.runAttempt ||
    oidc.runId !== currentWorkload.runId ||
    oidc.runAttempt !== currentWorkload.runAttempt ||
    currentWorkload.repositoryId !== priorWorkload.repositoryId ||
    currentWorkload.repository !== priorWorkload.repository ||
    currentWorkload.ref !== priorWorkload.ref ||
    currentWorkload.workflowTriggerCommit !==
      priorWorkload.workflowTriggerCommit ||
    currentWorkload.sourceCommit !== priorWorkload.sourceCommit ||
    currentWorkload.workloadBindingDigest !==
      context.intent.workloadBindingDigest ||
    priorWorkload.workloadBindingDigest !== priorIntent.workloadBindingDigest ||
    !Number.isInteger(proof.priorRunAttempt) ||
    !Number.isInteger(proof.claimingRunAttempt) ||
    Number(proof.priorRunAttempt) < 1 ||
    Number(proof.priorRunAttempt) > 50 ||
    Number(proof.claimingRunAttempt) < 2 ||
    Number(proof.claimingRunAttempt) > 51 ||
    Number(proof.claimingRunAttempt) <= Number(proof.priorRunAttempt) ||
    proof.proofDigest !== computePagesRunAttemptGapProofDigest(proof)
  ) {
    return invalid('PAGES_RECONCILIATION_RECOVERY_INVALID');
  }
  validateVerifiedWorkloadBinding(
    priorWorkload,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
  validateVerifiedWorkloadBinding(
    currentWorkload,
    'PAGES_RECONCILIATION_RECOVERY_INVALID',
  );
  const repositoryId = currentWorkload.repositoryId;
  if (
    typeof repositoryId !== 'string' ||
    destinationProviderBinding.kind !== 'github-pages' ||
    destinationProviderBinding.repositoryId !== repositoryId ||
    destinationProviderBinding.repository !== currentWorkload.repository ||
    computeDestinationProviderBindingDigest(destinationProviderBinding) !==
      asObject(
        context.intent.destination,
        'PAGES_RECONCILIATION_RECOVERY_INVALID',
      ).targetDigest ||
    computeDestinationProviderBindingDigest(destinationProviderBinding) !==
      asObject(priorIntent.destination, 'PAGES_RECONCILIATION_RECOVERY_INVALID')
        .targetDigest ||
    context.authority.mode !== 'pages-reconciliation-recovery' ||
    positiveInt64(
      context.authority.epoch,
      'PAGES_RECONCILIATION_RECOVERY_INVALID',
    ) !==
      positiveInt64(fence.epoch, 'PAGES_RECONCILIATION_RECOVERY_INVALID') +
        1n ||
    context.authority.authorityId === fence.authorityId ||
    context.authority.operationId !== context.intent.operationId ||
    context.authority.attemptId !== context.intent.attemptId ||
    context.authority.expectedGenerationId !==
      priorIntent.expectedGenerationId ||
    context.authority.proposedGenerationId !==
      priorIntent.proposedGenerationId ||
    context.intent.attemptId === priorIntent.attemptId ||
    context.intent.pagesBuildVersion !==
      derivePagesBuildVersion({
        repositoryId,
        operationId: context.intent.operationId,
        attemptId: context.intent.attemptId,
        runId: currentWorkload.runId,
        runAttempt: currentWorkload.runAttempt,
        artifactId: context.intent.artifactId,
        artifactDigest: context.intent.artifactDigest,
        proposedGenerationId: context.intent.proposedGenerationId,
      }) ||
    priorIntent.pagesBuildVersion !==
      derivePagesBuildVersion({
        repositoryId,
        operationId: priorIntent.operationId,
        attemptId: priorIntent.attemptId,
        runId: priorWorkload.runId,
        runAttempt: priorWorkload.runAttempt,
        artifactId: priorIntent.artifactId,
        artifactDigest: priorIntent.artifactDigest,
        proposedGenerationId: priorIntent.proposedGenerationId,
      })
  ) {
    return invalid('PAGES_RECONCILIATION_RECOVERY_MISMATCH');
  }
  const rows = Array.isArray(proof.interveningAttempts)
    ? proof.interveningAttempts
    : invalid('PAGES_RECONCILIATION_RECOVERY_INVALID');
  const expectedRows = Array.isArray(owners.interveningAttempts)
    ? owners.interveningAttempts
    : invalid('PAGES_RECONCILIATION_RECOVERY_INVALID');
  requireEqual(rows, expectedRows, 'PAGES_RECONCILIATION_RECOVERY_MISMATCH');
  const expectedCount =
    Number(proof.claimingRunAttempt) - Number(proof.priorRunAttempt) - 1;
  if (rows.length !== expectedCount) {
    return invalid('PAGES_RECONCILIATION_RECOVERY_MISMATCH');
  }
  rows.forEach((candidate, index) => {
    const row = asObject(candidate, 'PAGES_RECONCILIATION_RECOVERY_INVALID');
    if (
      row.runAttempt !== Number(proof.priorRunAttempt) + index + 1 ||
      row.authorityState !== 'closed-no-destination-authority'
    ) {
      invalid('PAGES_RECONCILIATION_RECOVERY_MISMATCH');
    }
    const expectedDecisionDigest = computePagesNoAuthorityRunAttemptDigest({
      repositoryId,
      runId: proof.runId,
      runAttempt: row.runAttempt,
      authorityState: row.authorityState,
    });
    if (row.decisionDigest !== expectedDecisionDigest) {
      invalid('PAGES_RECONCILIATION_RECOVERY_MISMATCH');
    }
  });
  return recovery;
}

/**
 * Validate a deployment intent against all retained owning records.
 *
 * Structural JSON Schema validation must run before this semantic function.
 *
 * @param {unknown} value deployment intent
 * @param {{
 *   artifactManifest: unknown,
 *   buildProvenance: unknown,
 *   buildInput: unknown,
 *   frozenHandoff: unknown,
 *   lock: unknown,
 *   capabilityDecision: unknown,
 *   buildPolicyDecisionDigest: string,
 *   deploymentPolicyDecision: unknown,
 *   acceptedPolicy: unknown,
 *   activationDetectionPlan: unknown,
 *   verificationPlan: unknown[],
 *   verificationPlanContext: Parameters<typeof validateVerificationPlan>[1],
 *   publicProbeReservation: unknown,
 *   destinationProviderBinding: unknown,
 *   pagesOidcOriginCatalog?: unknown,
 *   destinationFence: unknown,
 *   workloadBinding: unknown,
 *   operation: unknown,
 *   providerLimits: {requestTimeoutMillis: number, maximumProviderCallSeconds: number, providerExecutionSeconds: number},
 *   issuer: string,
 *   recovery?: unknown
 * }} context retained authorities
 * @returns {Record<string, unknown>} validated intent
 */
export function validateDeploymentIntentSemantics(value, context) {
  const intent = asObject(value, 'DEPLOYMENT_INTENT_INVALID');
  const manifest = asObject(
    context.artifactManifest,
    'DEPLOYMENT_INTENT_INVALID',
  );
  const provenance = asObject(
    context.buildProvenance,
    'DEPLOYMENT_INTENT_INVALID',
  );
  const buildInput = asObject(context.buildInput, 'DEPLOYMENT_INTENT_INVALID');
  const handoff = asObject(context.frozenHandoff, 'DEPLOYMENT_INTENT_INVALID');
  const lock = asObject(context.lock, 'DEPLOYMENT_INTENT_INVALID');
  const capability = asObject(
    context.capabilityDecision,
    'DEPLOYMENT_INTENT_INVALID',
  );
  const workload = asObject(
    context.workloadBinding,
    'DEPLOYMENT_INTENT_INVALID',
  );
  const operation = asObject(context.operation, 'DEPLOYMENT_INTENT_INVALID');
  validateVerifiedWorkloadBinding(workload);
  const runAttempt = workload.runAttempt;
  const reservationTransitions = asObject(
    operation.publicProbeReservationTransitionsByRunAttempt,
    'DEPLOYMENT_INTENT_VERIFICATION_RESERVATION_INVALID',
  );
  if (
    typeof runAttempt !== 'number' ||
    !Number.isInteger(runAttempt) ||
    runAttempt < 1 ||
    runAttempt > 51 ||
    Object.keys(reservationTransitions).length !== runAttempt ||
    Array.from({ length: runAttempt }, (_, index) => String(index + 1)).some(
      (key) => !Object.hasOwn(reservationTransitions, key),
    )
  ) {
    return invalid('DEPLOYMENT_INTENT_VERIFICATION_RESERVATION_INVALID');
  }
  const reservationTransition = reservationTransitions[String(runAttempt)];
  if (reservationTransition === undefined) {
    return invalid('DEPLOYMENT_INTENT_VERIFICATION_RESERVATION_INVALID');
  }
  if (
    capability.profile !== 'gala-capability-decision-v2' ||
    capability.decisionDigest !==
      digest(
        'capabilityDecision',
        capability,
        'DEPLOYMENT_INTENT_CAPABILITY_MISMATCH',
      )
  ) {
    return invalid('DEPLOYMENT_INTENT_CAPABILITY_MISMATCH');
  }
  const subject = `urn:gala:workload:github:${String(workload.repositoryId)}:${String(workload.runId)}:${String(workload.runAttempt)}`;
  if (
    intent.schemaId !== 'urn:gala:schema:deployment-intent:2.0.0' ||
    intent.schemaVersion !== '2.0.0' ||
    intent.activationDetectionProfile !==
      'gala-public-activation-detection-v2' ||
    intent.maximumActivationDetectionAttempts !== 91 ||
    intent.activationDetectionIntervalSeconds !== 60 ||
    intent.maximumFinalizationDelaySeconds !== 300 ||
    canonicalizeJcs(intent.approvedOverrides) !== '[]' ||
    intent.audience !== 'urn:gala:deployment-kernel:v2' ||
    intent.capability !== 'deploy' ||
    intent.issuer !== context.issuer ||
    intent.subject !== subject ||
    intent.operationId !== operation.operationId ||
    intent.attemptId !== operation.attemptId ||
    intent.idempotencyKey !== operation.idempotencyKey ||
    intent.operationDeadline !== operation.operationDeadline ||
    intent.sourceCommit !== operation.sourceCommit ||
    intent.workflowTriggerCommit !== operation.workflowTriggerCommit ||
    !['publish', 'rollback'].includes(String(operation.kind)) ||
    (operation.kind === 'publish' &&
      intent.sourceCommit !== intent.workflowTriggerCommit)
  ) {
    return invalid('DEPLOYMENT_INTENT_INVALID');
  }
  const manifestFields = [
    'artifactId',
    'artifactDigest',
    'manifestDigest',
    'artifactByteCount',
    'artifactFileCount',
  ];
  for (const field of manifestFields) {
    requireOwnerField(
      intent,
      manifest,
      field,
      field,
      'DEPLOYMENT_INTENT_ARTIFACT_MISMATCH',
    );
  }
  if (
    buildInput.inputDigest !==
      digest('buildInput', buildInput, 'DEPLOYMENT_INTENT_ARTIFACT_MISMATCH') ||
    manifest.buildInputDigest !== buildInput.inputDigest
  ) {
    return invalid('DEPLOYMENT_INTENT_ARTIFACT_MISMATCH');
  }
  const provenanceFields = [
    'sourceCommit',
    'workflowTriggerCommit',
    'provenanceDigest',
    'sbomDigest',
    'rebuildRecord',
  ];
  for (const field of provenanceFields) {
    requireOwnerField(
      intent,
      provenance,
      field,
      field,
      'DEPLOYMENT_INTENT_PROVENANCE_MISMATCH',
    );
  }
  const handoffFields = [
    'frozenHandoffArtifactId',
    'frozenHandoffName',
    'frozenEnvelopeDigest',
    'frozenEnvelopeByteCount',
    'requestedArtifactRetentionDays',
    'effectiveArtifactExpiresAt',
    'maximumReportRequestByteCount',
  ];
  for (const field of handoffFields) {
    requireOwnerField(
      intent,
      handoff,
      field,
      field,
      'DEPLOYMENT_INTENT_HANDOFF_MISMATCH',
    );
  }
  requireOwnerField(
    intent,
    lock,
    'lockDigest',
    'lockDigest',
    'DEPLOYMENT_INTENT_LOCK_MISMATCH',
  );
  const publisher = asObject(intent.publisher, 'DEPLOYMENT_INTENT_INVALID');
  if (publisher.package !== '@rathnasgala2/publish-action') {
    return invalid('DEPLOYMENT_INTENT_LOCK_MISMATCH');
  }
  const lockedPublishers = Array.isArray(lock.publisher)
    ? lock.publisher.map((candidate) =>
        asObject(candidate, 'DEPLOYMENT_INTENT_LOCK_MISMATCH'),
      )
    : invalid('DEPLOYMENT_INTENT_LOCK_MISMATCH');
  const lockedPublisher = lockedPublishers.find(
    (candidate) => candidate.package === '@rathnasgala2/publish-action',
  );
  if (!lockedPublisher) return invalid('DEPLOYMENT_INTENT_LOCK_MISMATCH');
  requireEqual(publisher, lockedPublisher, 'DEPLOYMENT_INTENT_LOCK_MISMATCH');
  requireOwnerField(
    intent,
    capability,
    'capabilityDecisionDigest',
    'decisionDigest',
    'DEPLOYMENT_INTENT_CAPABILITY_MISMATCH',
  );
  for (const field of [
    'adapter',
    'destination',
    'pagesBuildVersion',
    'spacesStagePrefix',
  ]) {
    if (Object.hasOwn(capability, field)) {
      requireOwnerField(
        intent,
        capability,
        field,
        field,
        'DEPLOYMENT_INTENT_CAPABILITY_MISMATCH',
      );
    }
  }
  /** @type {readonly (readonly [string, string])[]} */
  const workloadOwnerFields = [
    ['workloadBindingDigest', 'workloadBindingDigest'],
    ['sourceCommit', 'sourceCommit'],
    ['workflowTriggerCommit', 'workflowTriggerCommit'],
  ];
  for (const [intentField, workloadField] of workloadOwnerFields) {
    requireOwnerField(
      intent,
      workload,
      intentField,
      workloadField,
      'DEPLOYMENT_INTENT_WORKLOAD_MISMATCH',
    );
  }
  const adapter = asObject(intent.adapter, 'DEPLOYMENT_INTENT_INVALID');
  const destination = asObject(intent.destination, 'DEPLOYMENT_INTENT_INVALID');
  const pagesCapabilityFields = [
    'pagesOidcOriginCatalogDigest',
    'pagesActionsArtifactName',
    'pagesActionsArtifactByteCount',
    'pagesActionsArtifactDigest',
    'pagesBuildVersion',
  ];
  const spacesCapabilityFields = [
    'spacesStagePrefix',
    'spacesWebsiteConfigurationDigest',
    'spacesControlPlaneBindingDigest',
    'spacesControlPlaneRequestCatalogDigest',
    'spacesControlPlaneResponseCatalogDigest',
    'spacesControlPlaneTlsProfileDigest',
  ];
  const destinationProviderBinding = validateDestinationProviderBinding(
    context.destinationProviderBinding,
  );
  if (
    (adapter.adapterId === 'github-pages') !==
      Object.hasOwn(intent, 'pagesBuildVersion') ||
    (adapter.adapterId === 'do-spaces') !==
      Object.hasOwn(intent, 'spacesStagePrefix') ||
    (Object.hasOwn(intent, 'pagesBuildVersion') &&
      (typeof intent.pagesBuildVersion !== 'string' ||
        !LOWER_HEX_40_PATTERN.test(intent.pagesBuildVersion))) ||
    destination.targetDigest !==
      computeDestinationProviderBindingDigest(destinationProviderBinding) ||
    destination.adapterId !== adapter.adapterId ||
    destination.adapterVersion !== adapter.adapterVersion ||
    destinationProviderBinding.kind !== adapter.adapterId ||
    (adapter.adapterId === 'github-pages' &&
      pagesCapabilityFields.some(
        (field) => !Object.hasOwn(capability, field),
      )) ||
    (adapter.adapterId !== 'github-pages' &&
      pagesCapabilityFields.some((field) =>
        Object.hasOwn(capability, field),
      )) ||
    (adapter.adapterId === 'do-spaces' &&
      spacesCapabilityFields.some(
        (field) => !Object.hasOwn(capability, field),
      )) ||
    (adapter.adapterId !== 'do-spaces' &&
      spacesCapabilityFields.some((field) =>
        Object.hasOwn(capability, field),
      )) ||
    (adapter.adapterId === 'local-directory') ===
      Object.hasOwn(capability, 'credentialEgressProfileDigest') ||
    (adapter.adapterId === 'github-pages' &&
      (destinationProviderBinding.repository !== workload.repository ||
        destinationProviderBinding.repositoryId !== workload.repositoryId))
  ) {
    return invalid('DEPLOYMENT_INTENT_ADAPTER_CONDITIONAL_INVALID');
  }
  if (adapter.adapterId === 'github-pages') {
    validatePagesOidcOriginCatalog(
      context.pagesOidcOriginCatalog,
      capability.pagesOidcOriginCatalogDigest,
    );
  } else if (
    Object.hasOwn(capability, 'pagesOidcOriginCatalogDigest') ||
    context.pagesOidcOriginCatalog !== undefined
  ) {
    return invalid('DEPLOYMENT_INTENT_ADAPTER_CONDITIONAL_INVALID');
  }
  if (
    adapter.adapterId === 'github-pages' &&
    intent.pagesBuildVersion !==
      derivePagesBuildVersion({
        repositoryId: workload.repositoryId,
        operationId: intent.operationId,
        attemptId: intent.attemptId,
        runId: workload.runId,
        runAttempt: workload.runAttempt,
        artifactId: intent.artifactId,
        artifactDigest: intent.artifactDigest,
        proposedGenerationId: intent.proposedGenerationId,
      })
  ) {
    return invalid('DEPLOYMENT_INTENT_ADAPTER_CONDITIONAL_INVALID');
  }
  if (
    adapter.adapterId === 'do-spaces' &&
    intent.spacesStagePrefix !==
      `_gala/staged/v2/${String(intent.operationId)}/${String(intent.attemptId)}/${String(intent.proposedGenerationId)}/`
  ) {
    return invalid('DEPLOYMENT_INTENT_ADAPTER_CONDITIONAL_INVALID');
  }
  if (context.recovery !== undefined) {
    const recoveryOwners = asObject(
      context.recovery,
      'PAGES_RECONCILIATION_RECOVERY_INVALID',
    );
    requireEqual(
      recoveryOwners.currentWorkload,
      workload,
      'PAGES_RECONCILIATION_RECOVERY_MISMATCH',
    );
    requireEqual(
      recoveryOwners.destinationProviderBinding,
      destinationProviderBinding,
      'PAGES_RECONCILIATION_RECOVERY_MISMATCH',
    );
  }
  validateDestinationMutationAuthority(intent.destinationMutationAuthority, {
    intent,
    destinationProviderBinding,
    destinationFence: context.destinationFence,
    ...(context.recovery === undefined ? {} : { recovery: context.recovery }),
  });
  const deploymentPolicyDecision = validateDeploymentPolicyDecision(
    context.deploymentPolicyDecision,
    {
      intent,
      acceptedPolicy: context.acceptedPolicy,
      buildPolicyDecisionDigest: context.buildPolicyDecisionDigest,
      capabilityDecisionDigest: String(capability.decisionDigest),
    },
  );
  const expectedPlanDigest = computeVerificationPlanDigest(
    context.verificationPlan,
  );
  if (intent.verificationPlanDigest !== expectedPlanDigest) {
    return invalid('DEPLOYMENT_INTENT_VERIFICATION_PLAN_INVALID');
  }
  const verificationPlanContext = deriveIntentVerificationPlanContext(
    intent,
    /** @type {Record<string, unknown>} */ (context),
  );
  const markerAuthority = asObject(
    verificationPlanContext.marker,
    'DEPLOYMENT_INTENT_VERIFICATION_PLAN_INVALID',
  );
  if (
    markerAuthority.basePath !== buildInput.basePath ||
    markerAuthority.origin !== buildInput.baseUrl ||
    destination.baseUrl !==
      `${String(buildInput.baseUrl)}${String(buildInput.basePath)}`
  ) {
    return invalid('DEPLOYMENT_INTENT_VERIFICATION_PLAN_INVALID');
  }
  requireEqual(
    markerAuthority.value,
    intent.marker,
    'DEPLOYMENT_INTENT_MARKER_MISMATCH',
  );
  validateIntentVerificationPlan(
    intent,
    context.verificationPlan,
    verificationPlanContext,
  );
  validatePublicProbeReservation(context.publicProbeReservation, {
    intent,
    operation,
    workload,
    verificationPlan: context.verificationPlan,
    deploymentPolicyDecision,
    reservationTransition,
  });
  validateActivationDetectionPlan(context.activationDetectionPlan, {
    intent,
    verificationPlan: context.verificationPlan,
    verificationPlanContext:
      /** @type {Parameters<typeof validateVerificationPlan>[1]} */ (
        verificationPlanContext
      ),
  });
  const marker = asObject(intent.marker, 'DEPLOYMENT_INTENT_INVALID');
  /** @type {readonly (readonly [string, string])[]} */
  const markerFields = [
    ['artifactId', 'artifactId'],
    ['artifactDigest', 'artifactDigest'],
    ['generationId', 'proposedGenerationId'],
  ];
  for (const [markerField, intentField] of markerFields) {
    requireOwnerField(
      marker,
      intent,
      markerField,
      intentField,
      'DEPLOYMENT_INTENT_MARKER_MISMATCH',
    );
  }
  const authorizedAt = timestamp(
    intent.authorizedAt,
    'DEPLOYMENT_INTENT_TIME_INVALID',
  );
  const expiresAt = timestamp(
    intent.expiresAt,
    'DEPLOYMENT_INTENT_TIME_INVALID',
  );
  const verificationLimit = timestamp(
    intent.verificationDeadlineLimit,
    'DEPLOYMENT_INTENT_TIME_INVALID',
  );
  const finalizationLimit = timestamp(
    intent.finalizationDeadlineLimit,
    'DEPLOYMENT_INTENT_TIME_INVALID',
  );
  const operationDeadline = timestamp(
    intent.operationDeadline,
    'DEPLOYMENT_INTENT_TIME_INVALID',
  );
  const artifactExpiresAt = timestamp(
    intent.effectiveArtifactExpiresAt,
    'DEPLOYMENT_INTENT_TIME_INVALID',
  );
  const publicSeconds = Number(intent.maximumPublicVerificationSeconds);
  const limits = context.providerLimits;
  if (
    !Number.isInteger(publicSeconds) ||
    publicSeconds < 1 ||
    publicSeconds > 3_600 ||
    !Number.isInteger(limits.maximumProviderCallSeconds) ||
    !Number.isInteger(limits.providerExecutionSeconds) ||
    !Number.isInteger(limits.requestTimeoutMillis) ||
    limits.maximumProviderCallSeconds < 1 ||
    limits.maximumProviderCallSeconds > limits.providerExecutionSeconds ||
    limits.providerExecutionSeconds > 1_500 ||
    limits.maximumProviderCallSeconds * 1_000 > limits.requestTimeoutMillis ||
    limits.requestTimeoutMillis > 30_000 ||
    workload.verifiedAt !== intent.authorizedAt ||
    artifactExpiresAt <= authorizedAt ||
    intent.frozenHandoffName !==
      `gala-r${String(workload.runId)}-a${String(workload.runAttempt)}-frozen-envelope-v2.bin` ||
    expiresAt !== authorizedAt + 1_800_000 ||
    verificationLimit !== expiresAt + publicSeconds * 1_000 ||
    finalizationLimit !== verificationLimit + 300_000 ||
    operationDeadline !==
      expiresAt +
        Math.max(limits.maximumProviderCallSeconds, publicSeconds + 300) * 1_000
  ) {
    return invalid('DEPLOYMENT_INTENT_TIME_INVALID');
  }
  if (intent.intentDigest !== computeDeploymentIntentDigest(intent)) {
    return invalid('DEPLOYMENT_INTENT_DIGEST_MISMATCH');
  }
  return intent;
}

/** @type {Readonly<Record<string, Readonly<Record<string, readonly string[]>>>>} */
const OBSERVATION_MATRIX = Object.freeze({
  'request-not-started': Object.freeze({
    rejected: ['no', 'yes'],
    'not-attempted-retryable': ['no', 'yes'],
    'authorization-lost': ['no', 'yes'],
    'rate-limited': ['no', 'yes'],
    'provider-contract-violation': ['no', 'yes'],
  }),
  'request-accepted': Object.freeze({
    'outcome-unknown-reconciling': ['unknown', 'yes'],
  }),
  'provider-state': Object.freeze({
    succeeded: ['no', 'yes'],
    rejected: ['no'],
    'outcome-unknown-reconciling': ['unknown', 'yes'],
    'provider-contract-violation': ['no', 'unknown', 'yes'],
  }),
  'public-state': Object.freeze({
    succeeded: ['yes'],
    'outcome-unknown-reconciling': ['unknown', 'yes'],
    'provider-contract-violation': ['unknown', 'yes'],
  }),
  'deadline-finalization': Object.freeze({
    succeeded: ['yes'],
    'outcome-unknown-reconciling': ['yes'],
  }),
  'supersession-finalization': Object.freeze({
    rejected: ['no'],
    succeeded: ['yes'],
  }),
  timeout: Object.freeze({
    'outcome-unknown-reconciling': ['unknown', 'yes'],
  }),
  'provider-error': Object.freeze({
    rejected: ['no', 'yes'],
    'not-attempted-retryable': ['no', 'yes'],
    'authorization-lost': ['no', 'yes'],
    'rate-limited': ['no', 'yes'],
    'provider-contract-violation': ['no', 'yes'],
    'outcome-unknown-reconciling': ['unknown', 'yes'],
  }),
});

/**
 * Compute a deployment-receipt digest.
 *
 * @param {unknown} receipt complete receipt
 * @returns {string} tagged digest
 */
export function computeDeploymentReceiptDigest(receipt) {
  return digest('deploymentReceipt', receipt, 'DEPLOYMENT_RECEIPT_INVALID');
}

/**
 * Compute the digest of the exact accepted extended managed-report submission.
 *
 * @param {unknown} submission validated extended submission
 * @returns {string} tagged digest
 */
export function computeManagedReceiptSubmissionDigest(submission) {
  return digest(
    'managedReceiptSubmission',
    submission,
    'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
  );
}

/**
 * Compute a public-probe observation digest.
 *
 * @param {unknown} probe complete probe
 * @returns {string} tagged digest
 */
export function computePublicProbeObservationDigest(probe) {
  return digest(
    'publicProbeObservation',
    probe,
    'PUBLIC_PROBE_OBSERVATION_INVALID',
  );
}

/**
 * Validate the closed durable verification-controller projection.
 *
 * A cutoff prefix is retained from `cutoff-pending` through every later sealed
 * state reached from that cutoff. Direct pre-cutoff closes have no cutoff
 * prefix.
 *
 * @param {unknown} value controller projection
 * @param {Record<string, unknown>} intent retained intent
 * @returns {Record<string, unknown>} validated controller
 */
function validateVerificationController(value, intent) {
  const code = 'DEPLOYMENT_VERIFICATION_CONTROLLER_INVALID';
  const controller = asObject(value, code);
  requireKeys(
    controller,
    [
      'operationId',
      'attemptId',
      'verificationPlanDigest',
      'verificationDeadlineAt',
      'finalizationDeadlineAt',
      'state',
    ],
    [
      'closeReason',
      'cutoffEvidenceJournalEntryCount',
      'cutoffEvidenceJournalHeadDigest',
      'cancellationCommandId',
      'cancellationActorId',
      'supersededByOperationId',
      'supersededByGenerationId',
    ],
    code,
  );
  stableId(controller.operationId, code);
  stableId(controller.attemptId, code);
  if (
    typeof controller.verificationPlanDigest !== 'string' ||
    !DIGEST_PATTERN.test(controller.verificationPlanDigest) ||
    controller.operationId !== intent.operationId ||
    controller.attemptId !== intent.attemptId ||
    controller.verificationPlanDigest !== intent.verificationPlanDigest
  ) {
    return invalid(code);
  }
  const verificationDeadline = timestamp(
    controller.verificationDeadlineAt,
    code,
  );
  const finalizationDeadline = timestamp(
    controller.finalizationDeadlineAt,
    code,
  );
  if (verificationDeadline > finalizationDeadline) return invalid(code);
  const hasCloseReason = Object.hasOwn(controller, 'closeReason');
  const hasCutoffCount = Object.hasOwn(
    controller,
    'cutoffEvidenceJournalEntryCount',
  );
  const hasCutoffHead = Object.hasOwn(
    controller,
    'cutoffEvidenceJournalHeadDigest',
  );
  const hasCancellationCommand = Object.hasOwn(
    controller,
    'cancellationCommandId',
  );
  const hasCancellationActor = Object.hasOwn(controller, 'cancellationActorId');
  const hasSupersedingOperation = Object.hasOwn(
    controller,
    'supersededByOperationId',
  );
  const hasSupersedingGeneration = Object.hasOwn(
    controller,
    'supersededByGenerationId',
  );
  if (hasCutoffCount !== hasCutoffHead) return invalid(code);
  if (
    hasCancellationCommand !== hasCancellationActor ||
    hasSupersedingOperation !== hasSupersedingGeneration
  ) {
    return invalid(code);
  }
  if (hasCancellationCommand) {
    stableId(controller.cancellationCommandId, code);
    stableId(controller.cancellationActorId, code);
  }
  if (hasSupersedingOperation) {
    stableId(controller.supersededByOperationId, code);
    stableId(controller.supersededByGenerationId, code);
  }
  if (hasCutoffCount) {
    if (
      typeof controller.cutoffEvidenceJournalEntryCount !== 'number' ||
      !Number.isInteger(controller.cutoffEvidenceJournalEntryCount) ||
      controller.cutoffEvidenceJournalEntryCount < 0 ||
      controller.cutoffEvidenceJournalEntryCount > 1_099 ||
      typeof controller.cutoffEvidenceJournalHeadDigest !== 'string' ||
      !DIGEST_PATTERN.test(controller.cutoffEvidenceJournalHeadDigest)
    ) {
      return invalid(code);
    }
  }
  const state = controller.state;
  const closeReason = controller.closeReason;
  if (
    (hasCancellationCommand &&
      !(
        state === 'cancellation-closing' ||
        (state === 'sealed' && closeReason === 'terminal-no-change')
      )) ||
    (state === 'cancellation-closing' && !hasCancellationCommand) ||
    hasSupersedingOperation !==
      ['superseded-closing', 'superseded-sealed'].includes(String(state))
  ) {
    return invalid(code);
  }
  const validState =
    (state === 'open' && !hasCloseReason && !hasCutoffCount) ||
    (state === 'cutoff-pending' && !hasCloseReason && hasCutoffCount) ||
    (state === 'cancellation-closing' &&
      closeReason === 'terminal-no-change' &&
      !hasCutoffCount) ||
    (state === 'integrity-closing' &&
      closeReason === 'integrity-mismatch' &&
      !hasCutoffCount) ||
    (state === 'superseded-closing' && closeReason === 'superseded') ||
    (state === 'sealed' &&
      [
        'terminal-no-change',
        'candidate-complete',
        'integrity-mismatch',
      ].includes(String(closeReason)) &&
      (closeReason !== 'terminal-no-change' || !hasCutoffCount)) ||
    (state === 'sealed' && closeReason === 'deadline' && hasCutoffCount) ||
    (state === 'superseded-sealed' && closeReason === 'superseded');
  if (!validState) return invalid(code);
  return controller;
}

/**
 * Validate the common source identities of a Gala-owned finalization record.
 *
 * @param {Record<string, unknown>} source source record
 * @param {Record<string, unknown>} observation observation
 * @param {Record<string, unknown>} intent intent
 * @returns {void}
 */
function validateFinalizationOwnerFields(source, observation, intent) {
  const common = {
    operationId: intent.operationId,
    attemptId: intent.attemptId,
    intentDigest: intent.intentDigest,
    finalizedAt: observation.observedAt,
  };
  for (const [field, expected] of Object.entries(common)) {
    if (source[field] !== expected)
      invalid('DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH');
  }
}

/**
 * Validate and return the authenticated journal head for an arbitrary prefix,
 * including the defined zero-entry genesis case.
 *
 * @param {unknown[]} entries exact prefix entries
 * @param {string} operationId operation identifier
 * @param {number} runAttempt workflow run attempt
 * @returns {{entryCount: number, headDigest: string}} prefix coordinates
 */
function validateJournalPrefix(entries, operationId, runAttempt) {
  if (!Array.isArray(entries) || entries.length > 1_100) {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
  if (entries.length === 0) {
    return {
      entryCount: 0,
      headDigest: digestManagedEvidenceGenesis({ operationId, runAttempt }),
    };
  }
  const last = asObject(
    entries.at(-1),
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
  try {
    return validateManagedEvidenceJournal({
      operationId,
      runAttempt,
      entries,
      receiptEntryCount: entries.length,
      receiptHeadDigest: String(last.headDigest),
    });
  } catch {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
}

/**
 * Derive the complete verification stream set from the retained plan.
 *
 * @param {unknown[]} plan retained verification plan
 * @returns {{targetId: number, probeRegion: string}[]} ordered streams
 */
function deriveRequiredVerificationStreams(plan) {
  if (!Array.isArray(plan)) {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
  const streams = [];
  const keys = new Set();
  for (const targetValue of plan) {
    const target = asObject(
      targetValue,
      'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
    );
    const targetId = Number(target.targetId);
    const regions = Array.isArray(target.requiredProbeRegions)
      ? target.requiredProbeRegions
      : invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
    if (!Number.isInteger(targetId) || targetId < 1 || targetId > 900) {
      return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
    }
    for (const region of regions) {
      if (typeof region !== 'string') {
        return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
      }
      const key = `${targetId}\0${region}`;
      if (keys.has(key)) {
        return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
      }
      keys.add(key);
      streams.push({ targetId, probeRegion: region });
    }
  }
  streams.sort(
    (left, right) =>
      left.targetId - right.targetId ||
      compareUtf8(left.probeRegion, right.probeRegion),
  );
  if (streams.length < 1 || streams.length > 900) {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
  return streams;
}

/**
 * Extract observation records from a validated managed-evidence prefix.
 *
 * @param {unknown[]} entries journal entries
 * @returns {Record<string, unknown>[]} observations in append order
 */
function journalObservations(entries) {
  return entries
    .map((entry) => asObject(entry, 'DEPLOYMENT_OBSERVATION_SOURCE_INVALID'))
    .filter((entry) => entry.entryType === 'observation')
    .map((entry) =>
      asObject(entry.observation, 'DEPLOYMENT_OBSERVATION_SOURCE_INVALID'),
    );
}

/**
 * Select the greatest complete public attempt observed at or before cutoff.
 *
 * @param {Record<string, unknown>[]} observations retained observations
 * @param {number} targetId target identifier
 * @param {string} probeRegion probe region
 * @param {number} cutoffMilliseconds inclusive cutoff
 * @returns {{observation: Record<string, unknown>, terminal: Record<string, unknown>} | undefined} selected attempt
 */
function selectCutoffPublicAttempt(
  observations,
  targetId,
  probeRegion,
  cutoffMilliseconds,
) {
  /** @type {Map<number, {observation: Record<string, unknown>, probes: Record<string, unknown>[]}>} */
  const attempts = new Map();
  for (const observation of observations) {
    if (observation.observationClass !== 'public-state') continue;
    const probes = Array.isArray(observation.probes) ? observation.probes : [];
    for (const probeValue of probes) {
      const probe = asObject(
        probeValue,
        'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
      );
      if (
        Number(probe.targetId) !== targetId ||
        probe.probeRegion !== probeRegion
      ) {
        continue;
      }
      const attemptNumber = Number(probe.attemptNumber);
      if (!Number.isInteger(attemptNumber)) {
        return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
      }
      const row = attempts.get(attemptNumber) ?? { observation, probes: [] };
      if (row.observation !== observation) {
        return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
      }
      row.probes.push(probe);
      attempts.set(attemptNumber, row);
    }
  }
  const complete = [...attempts.entries()]
    .map(([attemptNumber, row]) => {
      const ordered = [...row.probes].sort(
        (left, right) => Number(left.hopNumber) - Number(right.hopNumber),
      );
      if (ordered.some((probe, index) => Number(probe.hopNumber) !== index)) {
        return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
      }
      const terminal = ordered.at(-1);
      if (
        !terminal ||
        ![
          'candidate',
          'recognized-prior',
          'integrity-mismatch',
          'inconclusive',
        ].includes(String(terminal.classification)) ||
        timestamp(
          terminal.observedAt,
          'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
        ) > cutoffMilliseconds
      ) {
        return undefined;
      }
      return { attemptNumber, observation: row.observation, terminal };
    })
    .filter((row) => row !== undefined)
    .sort((left, right) => right.attemptNumber - left.attemptNumber);
  return complete[0];
}

/**
 * Derive the complete cutoff-selected stream set and its one prescribed
 * finalization branch from authenticated operation-wide observations.
 *
 * @param {Record<string, unknown>[]} observations retained observations in operation order
 * @param {unknown[]} verificationPlan retained verification plan
 * @param {unknown} cutoffValue inclusive verification cutoff
 * @returns {{requiredStreams: {targetId: number, probeRegion: string}[], rows: {targetId: number, probeRegion: string, selected?: {observation: Record<string, unknown>, terminal: Record<string, unknown>}, observationIndex?: number}[], kind: 'candidate-complete'|'propagation-degraded'|'integrity-mismatch'|'observed-inconclusive'|'missing-inconclusive', selectedObservation?: Record<string, unknown>}}
 */
function deriveCutoffSelection(observations, verificationPlan, cutoffValue) {
  const code = 'DEPLOYMENT_OBSERVATION_SOURCE_INVALID';
  const cutoff = timestamp(cutoffValue, code);
  const requiredStreams = deriveRequiredVerificationStreams(verificationPlan);
  const rows = requiredStreams.map(({ targetId, probeRegion }) => {
    const selected = selectCutoffPublicAttempt(
      observations,
      targetId,
      probeRegion,
      cutoff,
    );
    if (!selected) return { targetId, probeRegion };
    const observationIndex = observations.indexOf(selected.observation);
    if (observationIndex < 0) return invalid(code);
    return { targetId, probeRegion, selected, observationIndex };
  });
  const selectedRows = rows.filter((row) => row.selected !== undefined);
  const classifications = selectedRows.map((row) =>
    String(row.selected?.terminal.classification),
  );
  const mismatches = selectedRows.filter(
    (row) => row.selected?.terminal.classification === 'integrity-mismatch',
  );
  if (mismatches.length > 0) {
    const chosen = [...mismatches].sort(
      (left, right) =>
        /** @type {number} */ (left.observationIndex) -
        /** @type {number} */ (right.observationIndex),
    )[0];
    const selectedObservation = chosen?.selected?.observation;
    if (!selectedObservation) return invalid(code);
    return {
      requiredStreams,
      rows,
      kind: 'integrity-mismatch',
      selectedObservation,
    };
  }
  if (selectedRows.length !== rows.length) {
    return { requiredStreams, rows, kind: 'missing-inconclusive' };
  }
  const inconclusive = selectedRows.filter(
    (row) => row.selected?.terminal.classification === 'inconclusive',
  );
  if (inconclusive.length > 0) {
    const chosen = [...inconclusive].sort(
      (left, right) =>
        /** @type {number} */ (right.observationIndex) -
        /** @type {number} */ (left.observationIndex),
    )[0];
    const selectedObservation = chosen?.selected?.observation;
    if (!selectedObservation) return invalid(code);
    return {
      requiredStreams,
      rows,
      kind: 'observed-inconclusive',
      selectedObservation,
    };
  }
  if (
    classifications.every((classification) => classification === 'candidate')
  ) {
    const chosen = [...selectedRows].sort(
      (left, right) =>
        /** @type {number} */ (right.observationIndex) -
        /** @type {number} */ (left.observationIndex),
    )[0];
    const selectedObservation = chosen?.selected?.observation;
    if (!selectedObservation) return invalid(code);
    return {
      requiredStreams,
      rows,
      kind: 'candidate-complete',
      selectedObservation,
    };
  }
  if (
    classifications.includes('recognized-prior') &&
    classifications.every((classification) =>
      ['candidate', 'recognized-prior'].includes(classification),
    )
  ) {
    return { requiredStreams, rows, kind: 'propagation-degraded' };
  }
  return invalid(code);
}

/**
 * Revalidate every public attempt in a cutoff prefix against its immutable
 * plan, retry history, deadline, and lease authority before it is selectable.
 *
 * @param {Record<string, unknown>[]} observations exact journal observations
 * @param {Record<string, unknown>} intent retained intent
 * @param {Record<string, unknown>} context finalization authorities
 * @returns {void}
 */
function validateCutoffPublicAttempts(observations, intent, context) {
  const code = 'DEPLOYMENT_OBSERVATION_SOURCE_INVALID';
  const contextsByObservationId = asObject(
    context.publicProbeAttemptContextsByObservationId,
    code,
  );
  const publicObservations = observations.filter(
    (observation) => observation.observationClass === 'public-state',
  );
  const expectedIds = new Set(
    publicObservations.map((observation) => String(observation.observationId)),
  );
  if (
    Object.keys(contextsByObservationId).length !== expectedIds.size ||
    Object.keys(contextsByObservationId).some(
      (observationId) => !expectedIds.has(observationId),
    )
  ) {
    return invalid(code);
  }
  const operationProbeCoordinates = new Set();
  for (let index = 0; index < observations.length; index += 1) {
    const observation = observations[index];
    if (!observation || observation.observationClass !== 'public-state') {
      continue;
    }
    const probes = Array.isArray(observation.probes)
      ? observation.probes
      : invalid(code);
    const authority = asObject(
      contextsByObservationId[String(observation.observationId)],
      code,
    );
    requireKeys(
      authority,
      [
        'intent',
        'verificationPlan',
        'verificationPlanContext',
        'activationBasis',
        'verificationDeadlineAt',
        'publicProbeAttemptContexts',
      ],
      [],
      code,
    );
    const ownerIntent = asObject(authority.intent, code);
    if (
      ownerIntent.operationId !== intent.operationId ||
      ownerIntent.proposedGenerationId !== intent.proposedGenerationId ||
      ownerIntent.verificationPlanDigest !== intent.verificationPlanDigest ||
      observation.attemptId !== ownerIntent.attemptId ||
      observation.intentDigest !== ownerIntent.intentDigest
    ) {
      return invalid(code);
    }
    let coordinates;
    try {
      coordinates = validatePublicObservationProbes(probes, ownerIntent, {
        operationProbeCoordinates,
        verificationPlan: authority.verificationPlan,
        verificationPlanContext: authority.verificationPlanContext,
        precedingObservations: observations.slice(0, index),
        operationPrecedingObservations: observations.slice(0, index),
        publicProbeAttemptContexts: authority.publicProbeAttemptContexts,
        activationBasis: authority.activationBasis,
        verificationDeadlineAt: authority.verificationDeadlineAt,
      });
    } catch {
      return invalid(code);
    }
    for (const coordinate of coordinates) {
      operationProbeCoordinates.add(coordinate);
    }
  }
}

/**
 * Validate the complete terminal lease projection locked by a cutoff
 * finalizer, in the canonical target/region order.
 *
 * @param {unknown} value retained lease rows
 * @param {{targetId: number, probeRegion: string}[]} requiredStreams required stream set
 * @param {Record<string, unknown>} intent retained intent
 * @returns {Record<string, unknown>[]} validated terminal leases
 */
function validateTerminalVerificationLeases(value, requiredStreams, intent) {
  const code = 'DEPLOYMENT_OBSERVATION_SOURCE_INVALID';
  const leases = Array.isArray(value)
    ? value.map((lease) => asObject(lease, code))
    : invalid(code);
  if (leases.length !== requiredStreams.length) return invalid(code);
  leases.forEach((lease, index) => {
    const required = requiredStreams[index];
    if (!required) return invalid(code);
    requireKeys(
      lease,
      [
        'operationId',
        'attemptId',
        'verificationPlanDigest',
        'targetId',
        'probeRegion',
        'state',
      ],
      [],
      code,
    );
    if (
      lease.operationId !== intent.operationId ||
      lease.attemptId !== intent.attemptId ||
      lease.verificationPlanDigest !== intent.verificationPlanDigest ||
      lease.targetId !== required.targetId ||
      lease.probeRegion !== required.probeRegion ||
      lease.state !== 'terminal'
    ) {
      return invalid(code);
    }
  });
  return leases;
}

/**
 * Validate a deadline-finalization source record.
 *
 * @param {Record<string, unknown>} source source record
 * @param {Record<string, unknown>} observation observation
 * @param {Record<string, unknown>} intent intent
 * @param {Record<string, unknown>} context retained finalization context
 * @returns {void}
 */
function validateDeadlineFinalizationSource(
  source,
  observation,
  intent,
  context,
) {
  requireKeys(
    source,
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
    [],
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
  validateFinalizationOwnerFields(source, observation, intent);
  const controllerBefore = validateVerificationController(
    context.controllerBeforeFinalization,
    intent,
  );
  const controllerAfter = validateVerificationController(
    context.controllerAfterFinalization,
    intent,
  );
  const verificationPlan = Array.isArray(context.verificationPlan)
    ? context.verificationPlan
    : invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  try {
    validateIntentVerificationPlan(
      intent,
      verificationPlan,
      context.verificationPlanContext,
    );
  } catch {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
  const precedingJournalEntries = Array.isArray(context.precedingJournalEntries)
    ? context.precedingJournalEntries
    : invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  const runAttempt = context.runAttempt;
  if (
    typeof runAttempt !== 'number' ||
    !Number.isInteger(runAttempt) ||
    runAttempt < 1 ||
    runAttempt > 51
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
  const prefix = validateJournalPrefix(
    precedingJournalEntries,
    String(intent.operationId),
    runAttempt,
  );
  const retainedJournalObservations = journalObservations(
    precedingJournalEntries,
  );
  const retainedObservations = Array.isArray(
    context.operationPrecedingObservations,
  )
    ? context.operationPrecedingObservations.map((candidate) =>
        asObject(candidate, 'DEPLOYMENT_OBSERVATION_SOURCE_INVALID'),
      )
    : invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  if (
    !Array.isArray(context.precedingObservations) ||
    canonicalizeJcs(retainedJournalObservations) !==
      canonicalizeJcs(context.precedingObservations) ||
    retainedObservations.length < retainedJournalObservations.length ||
    canonicalizeJcs(
      retainedJournalObservations.length === 0
        ? []
        : retainedObservations.slice(-retainedJournalObservations.length),
    ) !== canonicalizeJcs(retainedJournalObservations)
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
  validateCutoffPublicAttempts(retainedObservations, intent, context);
  const cutoffSelection = deriveCutoffSelection(
    retainedObservations,
    verificationPlan,
    source.verificationDeadlineAt,
  );
  const requiredStreams = cutoffSelection.requiredStreams;
  validateTerminalVerificationLeases(context.leases, requiredStreams, intent);
  if (
    source.profile !== 'gala-deadline-finalization-evidence-v2' ||
    source.verificationPlanDigest !== intent.verificationPlanDigest ||
    context.verificationDeadlineAt !== source.verificationDeadlineAt ||
    context.finalizationDeadlineAt !== source.finalizationDeadlineAt ||
    source.verificationDeadlineAt !== controllerBefore.verificationDeadlineAt ||
    source.finalizationDeadlineAt !== controllerBefore.finalizationDeadlineAt ||
    source.verificationDeadlineAt !== controllerAfter.verificationDeadlineAt ||
    source.finalizationDeadlineAt !== controllerAfter.finalizationDeadlineAt ||
    controllerBefore.state !== 'cutoff-pending' ||
    Object.hasOwn(controllerBefore, 'closeReason') ||
    controllerAfter.state !== 'sealed' ||
    controllerAfter.closeReason !== 'deadline' ||
    controllerBefore.cutoffEvidenceJournalEntryCount !== prefix.entryCount ||
    controllerBefore.cutoffEvidenceJournalHeadDigest !== prefix.headDigest ||
    controllerAfter.cutoffEvidenceJournalEntryCount !== prefix.entryCount ||
    controllerAfter.cutoffEvidenceJournalHeadDigest !== prefix.headDigest ||
    precedingJournalEntries.length > 1_098 ||
    source.cutoffEvidenceJournalEntryCount !== prefix.entryCount ||
    source.cutoffEvidenceJournalHeadDigest !== prefix.headDigest ||
    observation.evidenceDigest !==
      computeDeadlineFinalizationEvidenceDigest(source)
  ) {
    invalid('DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH');
  }
  const observedAt = timestamp(
    observation.observedAt,
    'DEPLOYMENT_OBSERVATION_TIME_INVALID',
  );
  if (
    observedAt <
      timestamp(
        controllerBefore.verificationDeadlineAt,
        'DEPLOYMENT_OBSERVATION_TIME_INVALID',
      ) ||
    observedAt >
      timestamp(
        controllerBefore.finalizationDeadlineAt,
        'DEPLOYMENT_OBSERVATION_TIME_INVALID',
      )
  ) {
    invalid('DEPLOYMENT_OBSERVATION_TIME_INVALID');
  }
  const streams = Array.isArray(source.selectedStreams)
    ? source.selectedStreams.map((stream) =>
        asObject(stream, 'DEPLOYMENT_OBSERVATION_SOURCE_INVALID'),
      )
    : invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  if (streams.length !== requiredStreams.length) {
    invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
  let missingCount = 0;
  let priorCount = 0;
  let inconclusiveCount = 0;
  for (let index = 0; index < streams.length; index += 1) {
    const stream = streams[index];
    const required = requiredStreams[index];
    if (!stream || !required) {
      invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
    }
    requireKeys(
      stream,
      ['targetId', 'probeRegion', 'state'],
      ['observationId', 'evidenceDigest'],
      'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
    );
    if (
      stream.targetId !== required.targetId ||
      stream.probeRegion !== required.probeRegion
    ) {
      invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
    }
    const selected = cutoffSelection.rows[index]?.selected;
    if (!selected) {
      missingCount += 1;
      if (
        stream.state !== 'missing' ||
        Object.hasOwn(stream, 'observationId') ||
        Object.hasOwn(stream, 'evidenceDigest')
      ) {
        invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
      }
    } else {
      if (
        stream.state !== 'terminal' ||
        stream.observationId !== selected.observation.observationId ||
        stream.evidenceDigest !== selected.observation.evidenceDigest
      ) {
        invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
      }
      if (selected.terminal.classification === 'recognized-prior') {
        priorCount += 1;
      } else if (selected.terminal.classification === 'inconclusive') {
        inconclusiveCount += 1;
      } else if (selected.terminal.classification === 'integrity-mismatch') {
        invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
      }
    }
  }
  if (
    (source.finalizationKind === 'propagation-degraded' &&
      (missingCount !== 0 ||
        inconclusiveCount !== 0 ||
        priorCount < 1 ||
        observation.outcome !== 'succeeded' ||
        cutoffSelection.kind !== 'propagation-degraded')) ||
    (source.finalizationKind === 'verification-inconclusive' &&
      (missingCount < 1 ||
        observation.outcome !== 'outcome-unknown-reconciling' ||
        cutoffSelection.kind !== 'missing-inconclusive')) ||
    (source.finalizationKind !== 'propagation-degraded' &&
      source.finalizationKind !== 'verification-inconclusive')
  ) {
    invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
}

/**
 * Validate state shared by cancellation and supersession finalizers.
 *
 * @param {Record<string, unknown>} source finalization evidence
 * @param {Record<string, unknown>} intent retained intent
 * @param {Record<string, unknown>} context finalization context
 * @param {'cancellation'|'supersession'} kind finalizer kind
 * @returns {{controllerBefore: Record<string, unknown>, controllerAfter: Record<string, unknown>, fence: Record<string, unknown>}} validated state
 */
function validateControlFinalizationState(source, intent, context, kind) {
  const controllerBefore = validateVerificationController(
    context.controllerBeforeFinalization,
    intent,
  );
  const controllerAfter = validateVerificationController(
    context.controllerAfterFinalization,
    intent,
  );
  const fence = asObject(
    context.destinationFence,
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
  const detector = asObject(
    context.activationDetector,
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
  requireKeys(
    detector,
    ['state', 'observationCount', 'lease'],
    ['lastEvidenceDigest'],
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
  const detectorLease = asObject(
    detector.lease,
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
  requireKeys(
    detectorLease,
    ['operationId', 'attemptId', 'activationDetectionPlanDigest', 'state'],
    [],
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
  if (
    detectorLease.operationId !== intent.operationId ||
    detectorLease.attemptId !== intent.attemptId ||
    detectorLease.activationDetectionPlanDigest !==
      intent.activationDetectionPlanDigest ||
    detectorLease.state !== 'terminal'
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
  const verificationPlan = Array.isArray(context.verificationPlan)
    ? context.verificationPlan
    : invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  try {
    validateIntentVerificationPlan(
      intent,
      verificationPlan,
      context.verificationPlanContext,
    );
  } catch {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
  validateTerminalVerificationLeases(
    context.leases,
    deriveRequiredVerificationStreams(verificationPlan),
    intent,
  );
  const precedingJournalEntries = Array.isArray(context.precedingJournalEntries)
    ? context.precedingJournalEntries
    : invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  if (precedingJournalEntries.length > 1_098) {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
  const runAttempt = context.runAttempt;
  if (
    typeof runAttempt !== 'number' ||
    !Number.isInteger(runAttempt) ||
    runAttempt < 1 ||
    runAttempt > 51
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
  const prefix = validateJournalPrefix(
    precedingJournalEntries,
    String(intent.operationId),
    runAttempt,
  );
  if (
    source.precedingEvidenceJournalEntryCount !== prefix.entryCount ||
    source.precedingEvidenceJournalHeadDigest !== prefix.headDigest ||
    source.destinationKeyDigest !== fence.destinationKeyDigest ||
    source.authorityEpoch !== fence.epoch ||
    source.fenceEvidenceDigest !== fence.evidenceDigest ||
    source.activationDetectionObservationCount !== detector.observationCount ||
    detector.state !== 'closed'
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH');
  }
  requireOwnerField(
    source,
    detector,
    'activationDetectionLastEvidenceDigest',
    'lastEvidenceDigest',
    'DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH',
  );
  const detectionCount = detector.observationCount;
  if (
    typeof detectionCount !== 'number' ||
    !Number.isInteger(detectionCount) ||
    detectionCount < 0 ||
    detectionCount > 91 ||
    (detectionCount === 0) === Object.hasOwn(detector, 'lastEvidenceDigest') ||
    (Object.hasOwn(detector, 'lastEvidenceDigest') &&
      (typeof detector.lastEvidenceDigest !== 'string' ||
        !DIGEST_PATTERN.test(detector.lastEvidenceDigest)))
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
  if (
    (kind === 'cancellation' &&
      (controllerBefore.state !== 'cancellation-closing' ||
        controllerBefore.closeReason !== 'terminal-no-change' ||
        controllerAfter.state !== 'sealed' ||
        controllerAfter.closeReason !== 'terminal-no-change' ||
        fence.state !== 'terminal-no-change')) ||
    (kind === 'supersession' &&
      (!['superseded-closing', 'sealed'].includes(
        String(controllerBefore.state),
      ) ||
        (controllerBefore.state === 'sealed' &&
          controllerBefore.closeReason !== 'candidate-complete' &&
          controllerBefore.closeReason !== 'deadline') ||
        (controllerBefore.state === 'sealed' &&
          fence.state !== 'terminal-candidate') ||
        controllerAfter.state !== 'superseded-sealed' ||
        controllerAfter.closeReason !== 'superseded' ||
        !['terminal-no-change', 'terminal-candidate'].includes(
          String(fence.state),
        )))
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
  for (const field of [
    'operationId',
    'attemptId',
    'verificationPlanDigest',
    'verificationDeadlineAt',
    'finalizationDeadlineAt',
  ]) {
    requireOwnerField(
      controllerAfter,
      controllerBefore,
      field,
      field,
      'DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH',
    );
  }
  for (const field of [
    'cutoffEvidenceJournalEntryCount',
    'cutoffEvidenceJournalHeadDigest',
  ]) {
    requireOwnerField(
      controllerAfter,
      controllerBefore,
      field,
      field,
      'DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH',
    );
  }
  if (kind === 'cancellation') {
    requireOwnerField(
      controllerAfter,
      controllerBefore,
      'cancellationCommandId',
      'cancellationCommandId',
      'DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH',
    );
    requireOwnerField(
      controllerAfter,
      controllerBefore,
      'cancellationActorId',
      'cancellationActorId',
      'DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH',
    );
  }
  return { controllerBefore, controllerAfter, fence };
}

/**
 * Validate a supersession-finalization source record.
 *
 * @param {Record<string, unknown>} source source record
 * @param {Record<string, unknown>} observation observation
 * @param {Record<string, unknown>} intent intent
 * @param {Record<string, unknown>} context retained supersession facts
 * @returns {void}
 */
function validateSupersessionFinalizationSource(
  source,
  observation,
  intent,
  context,
) {
  requireKeys(
    source,
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
    ['activationDetectionLastEvidenceDigest'],
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
  const { controllerBefore, controllerAfter, fence } =
    validateControlFinalizationState(source, intent, context, 'supersession');
  const successor = asObject(
    context.successor,
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
  if (
    source.profile !== 'gala-supersession-finalization-evidence-v2' ||
    source.supersededOperationId !== intent.operationId ||
    source.supersededAttemptId !== intent.attemptId ||
    source.supersededIntentDigest !== intent.intentDigest ||
    source.finalizedAt !== observation.observedAt ||
    source.fenceTerminalState !== fence.state ||
    source.supersededByOperationId !== successor.operationId ||
    source.supersededByGenerationId !== successor.generationId ||
    controllerAfter.supersededByOperationId !== successor.operationId ||
    controllerAfter.supersededByGenerationId !== successor.generationId ||
    (controllerBefore.state === 'superseded-closing' &&
      (controllerBefore.supersededByOperationId !== successor.operationId ||
        controllerBefore.supersededByGenerationId !==
          successor.generationId)) ||
    successor.destinationKeyDigest !== fence.destinationKeyDigest ||
    positiveInt64(
      successor.authorityEpoch,
      'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
    ) !==
      positiveInt64(fence.epoch, 'DEPLOYMENT_OBSERVATION_SOURCE_INVALID') +
        1n ||
    observation.evidenceDigest !==
      computeSupersessionFinalizationEvidenceDigest(source)
  ) {
    invalid('DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH');
  }
  const expectedOutcome =
    source.fenceTerminalState === 'terminal-no-change'
      ? ['before-mutation', 'rejected', 'no']
      : source.fenceTerminalState === 'terminal-candidate'
        ? ['activated', 'succeeded', 'yes']
        : invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  if (
    source.finalizationOutcome !== expectedOutcome[0] ||
    observation.outcome !== expectedOutcome[1] ||
    observation.destinationChanged !== expectedOutcome[2]
  ) {
    invalid('DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH');
  }
}

/**
 * Validate a cancellation-finalization source record.
 *
 * @param {Record<string, unknown>} source source record
 * @param {Record<string, unknown>} observation observation
 * @param {Record<string, unknown>} intent intent
 * @param {Record<string, unknown>} context retained cancellation facts
 * @returns {void}
 */
function validateCancellationFinalizationSource(
  source,
  observation,
  intent,
  context,
) {
  requireKeys(
    source,
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
    ['activationDetectionLastEvidenceDigest'],
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
  validateFinalizationOwnerFields(source, observation, intent);
  const { controllerBefore, controllerAfter } =
    validateControlFinalizationState(source, intent, context, 'cancellation');
  const cancellationCommand = asObject(
    context.cancellationCommand,
    'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
  );
  if (
    source.profile !== 'gala-cancellation-finalization-evidence-v2' ||
    source.cancellationCommandId !== cancellationCommand.commandId ||
    source.cancellationActorId !== cancellationCommand.actorId ||
    controllerBefore.cancellationCommandId !== cancellationCommand.commandId ||
    controllerBefore.cancellationActorId !== cancellationCommand.actorId ||
    controllerAfter.cancellationCommandId !== cancellationCommand.commandId ||
    controllerAfter.cancellationActorId !== cancellationCommand.actorId ||
    cancellationCommand.operationId !== intent.operationId ||
    observation.outcome !== 'rejected' ||
    observation.destinationChanged !== 'no' ||
    observation.evidenceDigest !==
      computeCancellationFinalizationEvidenceDigest(source)
  ) {
    invalid('DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH');
  }
}

/**
 * Validate every exact public target/region/attempt batch and return coordinate
 * keys to commit only after the parent observation has fully validated.
 *
 * @param {unknown[]} probes public probe rows
 * @param {Record<string, unknown>} intent retained intent
 * @param {Record<string, unknown>} context observation context
 * @returns {string[]} new operation-wide coordinate keys
 */
function validatePublicObservationProbes(probes, intent, context) {
  const operationProbeCoordinates = context.operationProbeCoordinates;
  if (!(operationProbeCoordinates instanceof Set)) {
    return invalid('DEPLOYMENT_OBSERVATION_PROBE_VALIDATOR_REQUIRED');
  }
  const planContext = validateIntentVerificationPlan(
    intent,
    context.verificationPlan,
    context.verificationPlanContext,
  );
  const attemptContexts = Array.isArray(context.publicProbeAttemptContexts)
    ? context.publicProbeAttemptContexts.map((candidate) =>
        asObject(candidate, 'DEPLOYMENT_OBSERVATION_PROBES_INVALID'),
      )
    : invalid('DEPLOYMENT_OBSERVATION_PROBE_VALIDATOR_REQUIRED');
  const groups = new Map();
  /** @type {string[]} */
  const coordinateKeys = [];
  /** @type {readonly [number, string, number, number] | undefined} */
  let priorCoordinate;
  for (const probeValue of probes) {
    const probe = asObject(probeValue, 'DEPLOYMENT_OBSERVATION_PROBES_INVALID');
    const targetId = Number(probe.targetId);
    const region = probe.probeRegion;
    const attemptNumber = Number(probe.attemptNumber);
    const hopNumber = Number(probe.hopNumber);
    if (
      !Number.isInteger(targetId) ||
      typeof region !== 'string' ||
      !Number.isInteger(attemptNumber) ||
      !Number.isInteger(hopNumber)
    ) {
      return invalid('DEPLOYMENT_OBSERVATION_PROBES_INVALID');
    }
    const coordinate =
      /** @type {readonly [number, string, number, number]} */ ([
        targetId,
        region,
        attemptNumber,
        hopNumber,
      ]);
    if (
      priorCoordinate !== undefined &&
      compareProbeCoordinate(priorCoordinate, coordinate) >= 0
    ) {
      return invalid('DEPLOYMENT_OBSERVATION_PROBES_INVALID');
    }
    priorCoordinate = coordinate;
    const coordinateKey = coordinate.join('\0');
    if (
      coordinateKeys.includes(coordinateKey) ||
      operationProbeCoordinates.has(coordinateKey)
    ) {
      return invalid('DEPLOYMENT_OBSERVATION_PROBE_DUPLICATE');
    }
    coordinateKeys.push(coordinateKey);
    const groupKey = `${targetId}\0${region}\0${attemptNumber}`;
    const group = groups.get(groupKey) ?? [];
    group.push(probe);
    groups.set(groupKey, group);
  }
  if (attemptContexts.length !== groups.size) {
    return invalid('DEPLOYMENT_OBSERVATION_PROBE_VALIDATOR_REQUIRED');
  }
  const seenGroups = new Set();
  for (const attemptContext of attemptContexts) {
    requireKeys(
      attemptContext,
      ['targetId', 'probeRegion', 'attemptNumber', 'leaseAuthority'],
      [],
      'DEPLOYMENT_OBSERVATION_PROBE_VALIDATOR_REQUIRED',
    );
    const targetId = attemptContext.targetId;
    const probeRegion = attemptContext.probeRegion;
    const attemptNumber = attemptContext.attemptNumber;
    if (
      typeof targetId !== 'number' ||
      !Number.isInteger(targetId) ||
      typeof probeRegion !== 'string' ||
      typeof attemptNumber !== 'number' ||
      !Number.isInteger(attemptNumber)
    ) {
      return invalid('DEPLOYMENT_OBSERVATION_PROBE_VALIDATOR_REQUIRED');
    }
    const key = `${targetId}\0${probeRegion}\0${attemptNumber}`;
    const group = groups.get(key);
    if (!group || seenGroups.has(key)) {
      return invalid('DEPLOYMENT_OBSERVATION_PROBE_VALIDATOR_REQUIRED');
    }
    seenGroups.add(key);
    /** @type {Map<number, Record<string, unknown>[]>} */
    const priorAttemptsByNumber = new Map();
    const precedingObservations = Array.isArray(
      context.operationPrecedingObservations,
    )
      ? context.operationPrecedingObservations
      : Array.isArray(context.precedingObservations)
        ? context.precedingObservations
        : invalid('DEPLOYMENT_OBSERVATION_PROBE_VALIDATOR_REQUIRED');
    for (const priorObservationValue of precedingObservations) {
      const priorObservation = asObject(
        priorObservationValue,
        'DEPLOYMENT_OBSERVATION_PROBES_INVALID',
      );
      const priorProbes = Array.isArray(priorObservation.probes)
        ? priorObservation.probes
        : invalid('DEPLOYMENT_OBSERVATION_PROBES_INVALID');
      for (const priorProbeValue of priorProbes) {
        const priorProbe = asObject(
          priorProbeValue,
          'DEPLOYMENT_OBSERVATION_PROBES_INVALID',
        );
        if (
          priorProbe.targetId !== targetId ||
          priorProbe.probeRegion !== probeRegion
        ) {
          continue;
        }
        const priorAttemptNumber = Number(priorProbe.attemptNumber);
        const rows = priorAttemptsByNumber.get(priorAttemptNumber) ?? [];
        rows.push(priorProbe);
        priorAttemptsByNumber.set(priorAttemptNumber, rows);
      }
    }
    const priorAttempts = [...priorAttemptsByNumber]
      .sort((left, right) => Number(left[0]) - Number(right[0]))
      .map(([priorAttemptNumber, rows]) => {
        const ordered = rows.sort(
          (left, right) => Number(left.hopNumber) - Number(right.hopNumber),
        );
        const first = ordered[0];
        const terminal = ordered.at(-1);
        if (!first || !terminal) {
          return invalid('DEPLOYMENT_OBSERVATION_PROBES_INVALID');
        }
        return {
          attemptNumber: priorAttemptNumber,
          requestStartedAt: first.requestStartedAt,
          terminalClassification: terminal.classification,
          observedAt: terminal.observedAt,
          terminalEvidenceDigest: terminal.evidenceDigest,
        };
      });
    const activationBasis = asObject(
      context.activationBasis,
      'DEPLOYMENT_OBSERVATION_PROBE_VALIDATOR_REQUIRED',
    );
    const publicAttemptContext = {
      plan: context.verificationPlan,
      planContext:
        /** @type {Parameters<typeof validateVerificationPlan>[1]} */ (
          planContext
        ),
      targetId,
      probeRegion,
      attemptNumber,
      proposedGenerationId: String(intent.proposedGenerationId),
      operationId: String(intent.operationId),
      attemptId: String(intent.attemptId),
      activationObservedAt: String(activationBasis.observedAt),
      verificationDeadlineAt: String(context.verificationDeadlineAt),
      operationDeadline: String(intent.operationDeadline),
      priorAttempts,
      leaseAuthority: attemptContext.leaseAuthority,
    };
    validatePublicProbeAttempt(
      group,
      /** @type {Parameters<typeof validatePublicProbeAttempt>[1]} */ (
        publicAttemptContext
      ),
    );
  }
  return coordinateKeys;
}

/**
 * Validate the authenticated activation-detection ledger owned by an intent.
 *
 * @param {Record<string, unknown>} intent retained intent
 * @param {unknown} value retained detector plan and observations
 * @returns {{context: Record<string, unknown>, observations: Record<string, unknown>[], activationBasisCandidate?: Record<string, unknown>, candidateEvidence?: Record<string, unknown>}} validated ledger
 */
function validateActivationDetectionLedger(intent, value) {
  const code = 'DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID';
  const context = asObject(value, code);
  requireKeys(
    context,
    [
      'detectionPlan',
      'verificationPlan',
      'verificationPlanContext',
      'observations',
    ],
    [],
    code,
  );
  const planContext = validateIntentVerificationPlan(
    intent,
    context.verificationPlan,
    context.verificationPlanContext,
  );
  try {
    validatePublicActivationDetectionPlan(context.detectionPlan, {
      intent,
      verificationPlan: context.verificationPlan,
      verificationPlanContext:
        /** @type {Parameters<typeof validateVerificationPlan>[1]} */ (
          planContext
        ),
    });
  } catch {
    return invalid(code);
  }
  const descriptors = Array.isArray(context.observations)
    ? context.observations
    : invalid(code);
  if (descriptors.length > 91) return invalid(code);
  const destinationAuthority = asObject(
    intent.destinationMutationAuthority,
    code,
  );
  /** @type {Record<string, unknown>[]} */
  const observations = [];
  /** @type {Record<string, unknown> | undefined} */
  let priorObservation;
  /** @type {Record<string, unknown> | undefined} */
  let activationBasisCandidate;
  /** @type {Record<string, unknown> | undefined} */
  let candidateEvidence;
  for (let index = 0; index < descriptors.length; index += 1) {
    const descriptor = asObject(descriptors[index], code);
    requireKeys(descriptor, ['observation', 'leaseAuthority'], [], code);
    const observation = asObject(descriptor.observation, code);
    const leaseAuthority = asObject(descriptor.leaseAuthority, code);
    if (
      leaseAuthority.authorityId !== destinationAuthority.authorityId ||
      leaseAuthority.currentAuthorityId !== destinationAuthority.authorityId ||
      leaseAuthority.authorityEpoch !== destinationAuthority.epoch ||
      leaseAuthority.currentAuthorityEpoch !== destinationAuthority.epoch
    ) {
      return invalid(code);
    }
    let validation;
    try {
      validation = validatePublicActivationDetectionObservation(observation, {
        detectionPlan: context.detectionPlan,
        detectionPlanContext: {
          intent,
          verificationPlan: context.verificationPlan,
          verificationPlanContext:
            /** @type {Parameters<typeof validateVerificationPlan>[1]} */ (
              planContext
            ),
        },
        operationDeadline: String(intent.operationDeadline),
        retainedObservationCount: index,
        ...(priorObservation === undefined
          ? {}
          : {
              previousObservation: priorObservation,
              retainedLastEvidenceDigest: String(
                priorObservation.evidenceDigest,
              ),
            }),
        leaseAuthority,
      });
    } catch {
      return invalid(code);
    }
    if (validation.replayed) return invalid(code);
    if (validation.activationBasisCandidate !== undefined) {
      if (
        activationBasisCandidate !== undefined ||
        index !== descriptors.length - 1
      ) {
        return invalid(code);
      }
      activationBasisCandidate = validation.activationBasisCandidate;
      candidateEvidence = observation;
    }
    observations.push(observation);
    priorObservation = observation;
  }
  return {
    context,
    observations,
    ...(activationBasisCandidate === undefined
      ? {}
      : {
          activationBasisCandidate,
          candidateEvidence: /** @type {Record<string, unknown>} */ (
            candidateEvidence
          ),
        }),
  };
}

/**
 * Validate the retained post-CAS operation/fence/controller projection that
 * owns an installed activation basis. Atomic transaction execution remains an
 * implementation boundary; this validator rejects any non-equal retained
 * result projection.
 *
 * @param {Record<string, unknown>} basis validated basis
 * @param {Record<string, unknown>} intent retained intent
 * @param {ReturnType<typeof validateActivationDetectionLedger>} detector detector ledger
 * @param {Record<string, unknown>} context retained observation authorities
 * @returns {void}
 */
function validateInstalledActivationBasis(basis, intent, detector, context) {
  const code = 'DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID';
  const operation = asObject(context.operation, code);
  const fence = asObject(context.destinationFence, code);
  const controller = validateVerificationController(
    context.verificationController,
    intent,
  );
  const authority = asObject(intent.destinationMutationAuthority, code);
  const observations = detector.observations;
  const count = operation.activationDetectionObservationCount;
  const lastObservation = observations.at(-1);
  const controllerState = controller.state;
  const controllerCloseReason = controller.closeReason;
  const controllerStateValid =
    ((controllerState === 'open' || controllerState === 'cutoff-pending') &&
      !Object.hasOwn(controller, 'closeReason')) ||
    (controllerState === 'integrity-closing' &&
      controllerCloseReason === 'integrity-mismatch') ||
    (controllerState === 'superseded-closing' &&
      controllerCloseReason === 'superseded') ||
    (controllerState === 'sealed' &&
      ['candidate-complete', 'integrity-mismatch', 'deadline'].includes(
        String(controllerCloseReason),
      )) ||
    (controllerState === 'superseded-sealed' &&
      controllerCloseReason === 'superseded');
  if (
    operation.operationId !== intent.operationId ||
    operation.attemptId !== intent.attemptId ||
    operation.activationDetectionPlanDigest !==
      intent.activationDetectionPlanDigest ||
    typeof count !== 'number' ||
    !Number.isInteger(count) ||
    count !== observations.length ||
    count < 0 ||
    count > 91 ||
    canonicalizeJcs(operation.activationBasis) !== canonicalizeJcs(basis) ||
    operation.verificationDeadlineAt !== context.verificationDeadlineAt ||
    operation.finalizationDeadlineAt !== context.finalizationDeadlineAt ||
    (count === 0) !==
      !Object.hasOwn(operation, 'activationDetectionLastEvidenceDigest') ||
    (lastObservation !== undefined &&
      operation.activationDetectionLastEvidenceDigest !==
        lastObservation.evidenceDigest) ||
    fence.destinationKeyDigest !== authority.destinationMutationKeyDigest ||
    fence.authorityId !== authority.authorityId ||
    fence.epoch !== authority.epoch ||
    fence.operationId !== intent.operationId ||
    fence.attemptId !== intent.attemptId ||
    fence.proposedGenerationId !== intent.proposedGenerationId ||
    ![
      'active',
      'pages-recovery-active',
      'reconciliation-required',
      'terminal-candidate',
    ].includes(String(fence.state)) ||
    controller.verificationDeadlineAt !== context.verificationDeadlineAt ||
    controller.finalizationDeadlineAt !== context.finalizationDeadlineAt ||
    !controllerStateValid
  ) {
    return invalid(code);
  }
  validateActivationDeadlines(
    basis,
    intent,
    context.verificationDeadlineAt,
    context.finalizationDeadlineAt,
  );
}

/**
 * Validate an installed activation basis against its exact retained evidence.
 *
 * @param {unknown} value activation basis
 * @param {Record<string, unknown>} intent retained intent
 * @param {unknown} evidenceValue retained source evidence
 * @param {Record<string, unknown>} context retained observation authorities
 * @param {Record<string, unknown>} currentObservation current observation
 * @param {Record<string, unknown>[]} precedingObservations observation prefix
 * @returns {Record<string, unknown>} validated activation basis
 */
function validateActivationBasis(
  value,
  intent,
  evidenceValue,
  context,
  currentObservation,
  precedingObservations,
) {
  const basis = asObject(value, 'DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID');
  requireKeys(
    basis,
    ['source', 'observedAt', 'evidenceDigest'],
    [],
    'DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID',
  );
  const evidence = asObject(
    evidenceValue,
    'DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID',
  );
  const detector = validateActivationDetectionLedger(
    intent,
    context.activationDetectionContext,
  );
  if (basis.source === 'kernel-provider-observation') {
    const retained = [...precedingObservations, currentObservation].find(
      (candidate) => candidate.observationId === evidence.observationId,
    );
    if (!retained) {
      return invalid('DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID');
    }
    requireEqual(
      retained,
      evidence,
      'DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID',
    );
    if (
      evidence.observationClass !== 'provider-state' ||
      evidence.generationId !== intent.proposedGenerationId ||
      evidence.destinationChanged !== 'yes' ||
      basis.observedAt !== evidence.observedAt ||
      basis.evidenceDigest !== evidence.evidenceDigest ||
      timestamp(
        basis.observedAt,
        'DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID',
      ) >
        timestamp(
          intent.expiresAt,
          'DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID',
        )
    ) {
      return invalid('DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID');
    }
  } else if (basis.source === 'gala-public-marker-detection') {
    if (
      detector.activationBasisCandidate === undefined ||
      detector.candidateEvidence === undefined ||
      canonicalizeJcs(detector.candidateEvidence) !== canonicalizeJcs(evidence)
    ) {
      return invalid('DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID');
    }
    requireEqual(
      basis,
      detector.activationBasisCandidate,
      'DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID',
    );
  } else {
    return invalid('DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID');
  }
  validateInstalledActivationBasis(basis, intent, detector, context);
  return basis;
}

/**
 * Derive and verify the immutable public-verification/finalization deadlines.
 *
 * @param {Record<string, unknown>} basis validated activation basis
 * @param {Record<string, unknown>} intent retained intent
 * @param {unknown} verificationDeadlineValue retained verification deadline
 * @param {unknown} [finalizationDeadlineValue] retained finalization deadline
 * @returns {void}
 */
function validateActivationDeadlines(
  basis,
  intent,
  verificationDeadlineValue,
  finalizationDeadlineValue,
) {
  const activatedAt = timestamp(
    basis.observedAt,
    'DEPLOYMENT_OBSERVATION_TIME_INVALID',
  );
  const maximumSeconds = Number(intent.maximumPublicVerificationSeconds);
  if (!Number.isInteger(maximumSeconds) || maximumSeconds < 1) {
    return invalid('DEPLOYMENT_OBSERVATION_TIME_INVALID');
  }
  const unconstrained = activatedAt + maximumSeconds * 1_000;
  const expectedVerificationDeadline =
    basis.source === 'gala-public-marker-detection'
      ? Math.min(
          unconstrained,
          timestamp(
            intent.verificationDeadlineLimit,
            'DEPLOYMENT_OBSERVATION_TIME_INVALID',
          ),
        )
      : unconstrained;
  const actualVerificationDeadline = timestamp(
    verificationDeadlineValue,
    'DEPLOYMENT_OBSERVATION_TIME_INVALID',
  );
  if (actualVerificationDeadline !== expectedVerificationDeadline) {
    return invalid('DEPLOYMENT_OBSERVATION_TIME_INVALID');
  }
  if (finalizationDeadlineValue !== undefined) {
    const actualFinalizationDeadline = timestamp(
      finalizationDeadlineValue,
      'DEPLOYMENT_OBSERVATION_TIME_INVALID',
    );
    if (
      actualFinalizationDeadline !== expectedVerificationDeadline + 300_000 ||
      actualFinalizationDeadline >
        timestamp(
          intent.finalizationDeadlineLimit,
          'DEPLOYMENT_OBSERVATION_TIME_INVALID',
        ) ||
      actualFinalizationDeadline >
        timestamp(
          intent.operationDeadline,
          'DEPLOYMENT_OBSERVATION_TIME_INVALID',
        )
    ) {
      return invalid('DEPLOYMENT_OBSERVATION_TIME_INVALID');
    }
  }
}

/**
 * Validate a successful GitHub Pages provider observation against the exact
 * carrier, catalog-selected coordinates, and retained provider preimage.
 *
 * @param {unknown} value Pages deployment identity projection
 * @param {Record<string, unknown>} observation retained observation
 * @param {Record<string, unknown>} intent retained intent
 * @param {Record<string, unknown>} context retained authorities
 * @returns {void}
 */
function validatePagesObservationEvidence(value, observation, intent, context) {
  const code = 'DEPLOYMENT_OBSERVATION_SOURCE_INVALID';
  const evidence = asObject(value, code);
  const common = [
    'pagesActionsArtifactId',
    'pagesActionsArtifactName',
    'pagesActionsArtifactDigest',
    'pagesActionsArtifactByteCount',
    'pagesBuildVersion',
    'pagesDeploymentId',
    'pollingStatusUrl',
    'pageUrl',
    'createResponseObserved',
    'status',
    'pagesOidcOrigin',
  ];
  const optional = ['createResponseStatusUrl'];
  requireKeys(evidence, common, optional, code);
  const capability = asObject(context.capabilityDecision, code);
  const binding = validateDestinationProviderBinding(
    context.destinationProviderBinding,
  );
  if (binding.kind !== 'github-pages') return invalid(code);
  const catalog = validatePagesOidcOriginCatalog(
    context.pagesOidcOriginCatalog,
    capability.pagesOidcOriginCatalogDigest,
  );
  const deploymentId = String(intent.pagesBuildVersion);
  const pollingStatusUrl = `${String(binding.apiOrigin)}/repos/${String(binding.repository)}/pages/deployments/${deploymentId}`;
  const createResponseStatusUrl = `${pollingStatusUrl}/status`;
  const createResponseObserved = evidence.createResponseObserved;
  if (
    typeof evidence.pagesActionsArtifactId !== 'string' ||
    !POSITIVE_DECIMAL_PATTERN.test(evidence.pagesActionsArtifactId) ||
    BigInt(evidence.pagesActionsArtifactId) > UINT64_MAXIMUM ||
    evidence.pagesActionsArtifactName !== capability.pagesActionsArtifactName ||
    evidence.pagesActionsArtifactDigest !==
      capability.pagesActionsArtifactDigest ||
    evidence.pagesActionsArtifactByteCount !==
      capability.pagesActionsArtifactByteCount ||
    evidence.pagesBuildVersion !== deploymentId ||
    evidence.pagesDeploymentId !== deploymentId ||
    evidence.pollingStatusUrl !== pollingStatusUrl ||
    evidence.pageUrl !== asObject(intent.destination, code).baseUrl ||
    (createResponseObserved !== true && createResponseObserved !== false) ||
    (createResponseObserved === true &&
      evidence.createResponseStatusUrl !== createResponseStatusUrl) ||
    (createResponseObserved === false &&
      Object.hasOwn(evidence, 'createResponseStatusUrl')) ||
    evidence.status !== 'succeed' ||
    !Array.isArray(catalog.origins) ||
    !catalog.origins.includes(evidence.pagesOidcOrigin) ||
    observation.providerVersion !== deploymentId ||
    observation.providerObjectIdDigest !==
      digest('pagesDeployment', evidence, code)
  ) {
    return invalid(code);
  }
}

/**
 * Derive cumulative destination-change truth from retained state and facts.
 *
 * @param {Record<string, unknown>} observation current observation
 * @param {Record<string, unknown>} intent retained intent
 * @param {Record<string, unknown>} attempt current stage attempt
 * @param {Record<string, unknown>[]} precedingObservations validated prefix
 * @param {Record<string, unknown>} context retained context
 * @returns {'yes'|'no'|'unknown'} derived cumulative state
 */
function deriveObservationDestinationChange(
  observation,
  intent,
  attempt,
  precedingObservations,
  context,
) {
  /** @type {'yes'|'no'|'unknown'} */
  let priorState = 'no';
  for (const prior of precedingObservations) {
    if (prior.destinationChanged === 'yes') priorState = 'yes';
    if (prior.destinationChanged === 'unknown' && priorState === 'no') {
      priorState = 'unknown';
    }
  }
  const fence = asObject(
    context.destinationFence,
    'DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID',
  );
  const authority = asObject(
    intent.destinationMutationAuthority,
    'DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID',
  );
  if (
    fence.destinationKeyDigest !== authority.destinationMutationKeyDigest ||
    fence.authorityId !== authority.authorityId ||
    fence.epoch !== authority.epoch ||
    fence.operationId !== intent.operationId ||
    fence.attemptId !== intent.attemptId ||
    fence.proposedGenerationId !== intent.proposedGenerationId
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID');
  }
  if (
    fence.state === 'terminal-candidate' ||
    context.activationBasis !== undefined ||
    (observation.observationClass === 'provider-state' &&
      observation.generationId === intent.proposedGenerationId) ||
    (Array.isArray(observation.probes) &&
      observation.probes.some(
        (probe) =>
          asObject(probe, 'DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID')
            .classification === 'candidate',
      ))
  ) {
    return 'yes';
  }
  if (
    fence.state === 'terminal-no-change' ||
    (observation.observationClass === 'supersession-finalization' &&
      observation.outcome === 'rejected') ||
    (observation.observationClass === 'request-not-started' &&
      attempt.stage === 'managed-reconciliation')
  ) {
    return 'no';
  }
  if (attempt.stage === 'cleanup') return priorState;
  if (
    fence.state === 'reconciliation-required' ||
    observation.observationClass === 'request-accepted' ||
    observation.observationClass === 'timeout' ||
    observation.outcome === 'outcome-unknown-reconciling'
  ) {
    return priorState === 'yes' ? 'yes' : 'unknown';
  }
  if (
    observation.observationClass === 'public-state' ||
    observation.observationClass === 'deadline-finalization'
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID');
  }
  return priorState === 'yes' ? 'yes' : 'no';
}

/**
 * Validate a deployment observation against its retained intent and evidence.
 *
 * Structural JSON Schema validation must run before this semantic function.
 *
 * @param {unknown} value deployment observation
 * @param {{
 *   intent: unknown,
 *   expectedSequence: number,
 *   stageAttempt: unknown,
 *   stageEvidence: unknown,
 *   stageRetainedObservations: unknown[],
 *   precedingObservations: unknown[],
 *   operationPrecedingObservations?: unknown[],
 *   destinationFence: unknown,
 *   operation?: unknown,
 *   verificationController?: unknown,
 *   activationBasis?: unknown,
 *   activationBasisEvidence?: unknown,
 *   activationDetectionContext?: unknown,
 *   adapterObservationEvidence?: unknown,
 *   capabilityDecision?: unknown,
 *   destinationProviderBinding?: unknown,
 *   pagesOidcOriginCatalog?: unknown,
 *   finalizationSource?: unknown,
 *   finalizationContext?: Record<string, unknown>,
 *   verificationPlan?: unknown[],
 *   verificationPlanContext?: Parameters<typeof validateVerificationPlan>[1],
 *   verificationDeadlineAt?: string,
 *   finalizationDeadlineAt?: string,
 *   publicProbeAttemptContexts?: Record<string, unknown>[],
 *   operationProbeCoordinates?: Set<string>
 * }} context retained authorities
 * @returns {Record<string, unknown>} validated observation
 */
export function validateDeploymentObservationSemantics(value, context) {
  const observation = asObject(value, 'DEPLOYMENT_OBSERVATION_INVALID');
  const intent = asObject(context.intent, 'DEPLOYMENT_OBSERVATION_INVALID');
  const attempt = asObject(
    context.stageAttempt,
    'DEPLOYMENT_OBSERVATION_INVALID',
  );
  if (intent.intentDigest !== computeDeploymentIntentDigest(intent)) {
    return invalid('DEPLOYMENT_OBSERVATION_INTENT_INVALID');
  }
  if (
    observation.schemaId !== 'urn:gala:schema:deployment-observation:2.0.0' ||
    observation.schemaVersion !== '2.0.0'
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_INVALID');
  }
  const stageRetainedObservations = Array.isArray(
    context.stageRetainedObservations,
  )
    ? context.stageRetainedObservations.map((candidate) =>
        asObject(candidate, 'DEPLOYMENT_OBSERVATION_SOURCE_INVALID'),
      )
    : invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  try {
    validateDeploymentStageRecords({
      deploymentIntent: intent,
      deploymentAttempt: attempt,
      deploymentStageEvidence: context.stageEvidence,
      retainedObservations: stageRetainedObservations,
    });
  } catch {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
  }
  if (
    !stageRetainedObservations.some(
      (retained) =>
        retained.observationId === observation.observationId &&
        retained.evidenceDigest === observation.evidenceDigest,
    )
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH');
  }
  const precedingObservations = Array.isArray(context.precedingObservations)
    ? context.precedingObservations.map((candidate) =>
        asObject(candidate, 'DEPLOYMENT_OBSERVATION_INVALID'),
      )
    : invalid('DEPLOYMENT_OBSERVATION_INVALID');
  if (precedingObservations.length !== context.expectedSequence - 1) {
    return invalid('DEPLOYMENT_OBSERVATION_IDENTITY_MISMATCH');
  }
  precedingObservations.forEach((prior, index) => {
    if (
      prior.sequence !== index + 1 ||
      prior.operationId !== intent.operationId ||
      prior.attemptId !== intent.attemptId ||
      prior.intentDigest !== intent.intentDigest
    ) {
      invalid('DEPLOYMENT_OBSERVATION_IDENTITY_MISMATCH');
    }
  });
  if (context.activationBasis !== undefined) {
    const activationBasis = validateActivationBasis(
      context.activationBasis,
      intent,
      context.activationBasisEvidence,
      /** @type {Record<string, unknown>} */ (context),
      observation,
      precedingObservations,
    );
    if (
      ['public-state', 'deadline-finalization'].includes(
        String(observation.observationClass),
      )
    ) {
      validateActivationDeadlines(
        activationBasis,
        intent,
        context.verificationDeadlineAt,
        context.finalizationDeadlineAt,
      );
    }
  }
  if (
    observation.sequence !== context.expectedSequence ||
    observation.sequence < 1 ||
    observation.sequence > 1_000 ||
    observation.stageAttemptId !== attempt.stageAttemptId ||
    observation.intentDigest !== intent.intentDigest
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_IDENTITY_MISMATCH');
  }
  for (const field of OBSERVATION_INTENT_FIELDS) {
    requireOwnerField(
      observation,
      intent,
      field,
      field,
      'DEPLOYMENT_OBSERVATION_IDENTITY_MISMATCH',
    );
  }
  const observedAt = timestamp(
    observation.observedAt,
    'DEPLOYMENT_OBSERVATION_TIME_INVALID',
  );
  const receivedAt = timestamp(
    observation.receivedAt,
    'DEPLOYMENT_OBSERVATION_TIME_INVALID',
  );
  if (receivedAt < observedAt) {
    return invalid('DEPLOYMENT_OBSERVATION_TIME_INVALID');
  }
  const observationClass = observation.observationClass;
  const classRows =
    typeof observationClass === 'string'
      ? OBSERVATION_MATRIX[observationClass]
      : undefined;
  const changes =
    classRows && typeof observation.outcome === 'string'
      ? classRows[observation.outcome]
      : undefined;
  if (!changes?.includes(String(observation.destinationChanged))) {
    return invalid('DEPLOYMENT_OBSERVATION_TUPLE_INVALID');
  }
  if (
    ['public-state', 'deadline-finalization'].includes(
      String(observation.observationClass),
    ) &&
    context.activationBasis === undefined
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID');
  }
  const derivedDestinationChange = deriveObservationDestinationChange(
    observation,
    intent,
    attempt,
    precedingObservations,
    /** @type {Record<string, unknown>} */ (context),
  );
  if (observation.destinationChanged !== derivedDestinationChange) {
    return invalid('DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID');
  }
  if (
    (observation.observationClass === 'request-not-started' ||
      observation.observationClass === 'provider-error') &&
    observation.destinationChanged === 'yes' &&
    attempt.stage !== 'cleanup'
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID');
  }
  const probes = Array.isArray(observation.probes)
    ? observation.probes
    : invalid('DEPLOYMENT_OBSERVATION_INVALID');
  if (
    (observation.observationClass === 'public-state' &&
      (probes.length < 1 || probes.length > 16)) ||
    (observation.observationClass !== 'public-state' && probes.length !== 0)
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_PROBES_INVALID');
  }
  /** @type {string[]} */
  let pendingCoordinateKeys = [];
  if (probes.length > 0) {
    if (
      !(context.operationProbeCoordinates instanceof Set) ||
      !Array.isArray(context.verificationPlan) ||
      context.verificationPlanContext === undefined ||
      typeof context.verificationDeadlineAt !== 'string'
    ) {
      return invalid('DEPLOYMENT_OBSERVATION_PROBE_VALIDATOR_REQUIRED');
    }
    pendingCoordinateKeys = validatePublicObservationProbes(
      probes,
      intent,
      /** @type {Record<string, unknown>} */ (context),
    );
    for (const probeValue of probes) {
      const probe = asObject(
        probeValue,
        'DEPLOYMENT_OBSERVATION_PROBES_INVALID',
      );
      if (probe.evidenceDigest !== computePublicProbeObservationDigest(probe)) {
        return invalid('PUBLIC_PROBE_OBSERVATION_DIGEST_MISMATCH');
      }
      if (
        probe.classification === 'candidate' &&
        observation.destinationChanged !== 'yes'
      ) {
        return invalid('DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID');
      }
      if (
        timestamp(probe.observedAt, 'DEPLOYMENT_OBSERVATION_TIME_INVALID') >
        observedAt
      ) {
        return invalid('DEPLOYMENT_OBSERVATION_TIME_INVALID');
      }
    }
  }
  if (
    (Object.hasOwn(observation, 'generationId') ||
      Object.hasOwn(observation, 'observedArtifactDigest')) &&
    observation.observationClass !== 'provider-state'
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_PROVIDER_FIELDS_INVALID');
  }
  const providerIdentityClasses = new Set([
    'request-accepted',
    'provider-state',
    'provider-error',
  ]);
  if (
    (Object.hasOwn(observation, 'providerObjectIdDigest') ||
      Object.hasOwn(observation, 'providerVersion')) &&
    !providerIdentityClasses.has(String(observation.observationClass))
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_PROVIDER_FIELDS_INVALID');
  }
  if (
    observation.observationClass === 'provider-state' &&
    observation.outcome === 'succeeded' &&
    observation.destinationChanged === 'yes' &&
    (observation.generationId !== intent.proposedGenerationId ||
      (Object.hasOwn(observation, 'observedArtifactDigest') &&
        observation.observedArtifactDigest !== intent.artifactDigest))
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_PROVIDER_FACT_INVALID');
  }
  if (
    observation.generationId === intent.proposedGenerationId &&
    observation.destinationChanged !== 'yes'
  ) {
    return invalid('DEPLOYMENT_OBSERVATION_CHANGE_PROOF_INVALID');
  }
  if (observation.observationClass === 'deadline-finalization') {
    if (
      attempt.stage !== 'public-verification' ||
      attempt.outcome !==
        (observation.outcome === 'succeeded' ? 'succeeded' : 'unknown') ||
      attempt.destinationChanged !== 'yes'
    ) {
      return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
    }
    validateDeadlineFinalizationSource(
      asObject(
        context.finalizationSource,
        'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
      ),
      observation,
      intent,
      {
        ...asObject(
          context.finalizationContext,
          'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
        ),
        verificationPlan: context.verificationPlan,
        verificationPlanContext: context.verificationPlanContext,
        activationBasis: context.activationBasis,
        verificationDeadlineAt: context.verificationDeadlineAt,
        finalizationDeadlineAt: context.finalizationDeadlineAt,
        precedingObservations,
        operationPrecedingObservations: context.operationPrecedingObservations,
      },
    );
  } else if (observation.observationClass === 'supersession-finalization') {
    const expectedAttemptOutcome =
      observation.outcome === 'rejected' ? 'skipped' : 'succeeded';
    if (
      attempt.stage !== 'managed-reconciliation' ||
      attempt.outcome !== expectedAttemptOutcome ||
      attempt.destinationChanged !== observation.destinationChanged
    ) {
      return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
    }
    validateSupersessionFinalizationSource(
      asObject(
        context.finalizationSource,
        'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
      ),
      observation,
      intent,
      asObject(
        context.finalizationContext,
        'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
      ),
    );
  } else if (
    observation.observationClass === 'request-not-started' &&
    asObject(
      context.finalizationSource ?? {},
      'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
    ).profile === 'gala-cancellation-finalization-evidence-v2'
  ) {
    if (
      attempt.stage !== 'managed-reconciliation' ||
      attempt.outcome !== 'skipped' ||
      attempt.destinationChanged !== 'no'
    ) {
      return invalid('DEPLOYMENT_OBSERVATION_SOURCE_INVALID');
    }
    validateCancellationFinalizationSource(
      asObject(
        context.finalizationSource,
        'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
      ),
      observation,
      intent,
      asObject(
        context.finalizationContext,
        'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
      ),
    );
  } else if (
    asObject(intent.adapter, 'DEPLOYMENT_OBSERVATION_INVALID').adapterId ===
      'github-pages' &&
    observation.observationClass === 'provider-state' &&
    observation.outcome === 'succeeded' &&
    observation.destinationChanged === 'yes'
  ) {
    validatePagesObservationEvidence(
      context.adapterObservationEvidence,
      observation,
      intent,
      /** @type {Record<string, unknown>} */ (context),
    );
  } else if (
    asObject(intent.adapter, 'DEPLOYMENT_OBSERVATION_INVALID').adapterId ===
      'local-directory' &&
    observation.observationClass === 'provider-state'
  ) {
    const evidence = asObject(
      context.adapterObservationEvidence,
      'DEPLOYMENT_OBSERVATION_SOURCE_INVALID',
    );
    validateLocalFilesystemObservationEvidence(evidence);
    if (
      evidence.operationId !== intent.operationId ||
      evidence.attemptId !== intent.attemptId ||
      evidence.stageAttemptId !== attempt.stageAttemptId ||
      evidence.observedAt !== observation.observedAt ||
      evidence.evidenceDigest !== observation.evidenceDigest
    ) {
      return invalid('DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH');
    }
    for (const field of ['observedGenerationId', 'observedArtifactDigest']) {
      const observationField =
        field === 'observedGenerationId' ? 'generationId' : field;
      requireOwnerField(
        observation,
        evidence,
        observationField,
        field,
        'DEPLOYMENT_OBSERVATION_SOURCE_MISMATCH',
      );
    }
  }
  if (context.operationProbeCoordinates instanceof Set) {
    for (const coordinateKey of pendingCoordinateKeys) {
      context.operationProbeCoordinates.add(coordinateKey);
    }
  }
  return observation;
}

/**
 * Find the exact managed-failure catalog row for an attempt/observation pair.
 *
 * @param {Record<string, unknown>} attempt outcome attempt
 * @param {Record<string, unknown>} observation outcome observation
 * @returns {FailureCatalogRow | undefined} matching row
 */
function findFailureRow(attempt, observation) {
  return FAILURE_CATALOG.find(
    ([stage, code, attemptOutcome, observationOutcome, changes, retryable]) =>
      attempt.stage === stage &&
      attempt.failureCode === code &&
      attempt.outcome === attemptOutcome &&
      observation.outcome === observationOutcome &&
      changes.includes(String(observation.destinationChanged)) &&
      attempt.destinationChanged === observation.destinationChanged &&
      attempt.retryable === retryable,
  );
}

/**
 * Validate receipt-local warning order and exact catalog membership.
 *
 * @param {unknown[]} warnings warnings
 * @returns {Set<string>} warning codes
 */
function validateWarnings(warnings) {
  const codes = new Set();
  let prior;
  for (const warningValue of warnings) {
    const warning = asObject(
      warningValue,
      'DEPLOYMENT_RECEIPT_WARNING_INVALID',
    );
    if (
      typeof warning.code !== 'string' ||
      !Object.hasOwn(WARNING_CATALOG, warning.code)
    ) {
      invalid('DEPLOYMENT_RECEIPT_WARNING_INVALID');
    }
    requireEqual(
      warning,
      WARNING_CATALOG[warning.code],
      'DEPLOYMENT_RECEIPT_WARNING_INVALID',
    );
    const bytes = canonicalizeJcs(warning);
    if (prior !== undefined && compareUtf8(prior, bytes) >= 0) {
      invalid('DEPLOYMENT_RECEIPT_WARNING_INVALID');
    }
    prior = bytes;
    if (codes.has(warning.code)) {
      invalid('DEPLOYMENT_RECEIPT_WARNING_INVALID');
    }
    codes.add(warning.code);
  }
  return codes;
}

/**
 * Validate the portable stage-attempt state used by receipt derivation.
 *
 * @param {Record<string, unknown>} attempt attempt
 * @param {Record<string, unknown>} intent intent
 * @param {number} expectedSequence expected sequence
 * @returns {void}
 */
function validateReceiptAttempt(attempt, intent, expectedSequence) {
  if (
    attempt.attemptId !== intent.attemptId ||
    attempt.sequence !== expectedSequence ||
    attempt.outcome === 'running' ||
    attempt.outcome === 'not-started'
  ) {
    invalid('DEPLOYMENT_RECEIPT_ATTEMPT_INVALID');
  }
  const started = Object.hasOwn(attempt, 'startedAt');
  const completed = Object.hasOwn(attempt, 'completedAt');
  const terminalWithTime = new Set(['succeeded', 'failed', 'unknown']);
  if (
    (terminalWithTime.has(String(attempt.outcome)) &&
      (!started || !completed)) ||
    (attempt.outcome === 'skipped' && (started || completed))
  ) {
    invalid('DEPLOYMENT_RECEIPT_ATTEMPT_INVALID');
  }
  if (
    started &&
    completed &&
    timestamp(attempt.startedAt, 'DEPLOYMENT_RECEIPT_TIME_INVALID') >
      timestamp(attempt.completedAt, 'DEPLOYMENT_RECEIPT_TIME_INVALID')
  ) {
    invalid('DEPLOYMENT_RECEIPT_TIME_INVALID');
  }
  const hasFailure = Object.hasOwn(attempt, 'failureCode');
  if (
    hasFailure !==
      (attempt.outcome === 'failed' || attempt.outcome === 'unknown') ||
    (attempt.retryable === true && !hasFailure)
  ) {
    invalid('DEPLOYMENT_RECEIPT_ATTEMPT_INVALID');
  }
}

/**
 * Derive candidate/degraded coverage from the authenticated journal and plan.
 *
 * @param {Record<string, unknown>[]} observations complete journal observations
 * @param {unknown[]} verificationPlan retained plan
 * @param {Record<string, unknown>} outcomeObservation selected observation
 * @param {unknown} deadlineEvidence retained deadline source, when applicable
 * @returns {'candidate-complete'|'candidate-prior-degraded'|'inconclusive'} coverage
 */
function deriveVerificationCoverage(
  observations,
  verificationPlan,
  outcomeObservation,
  deadlineEvidence,
) {
  const requiredStreams = new Set();
  for (const targetValue of verificationPlan) {
    const target = asObject(targetValue, 'DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
    if (!Number.isInteger(target.targetId)) {
      return invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
    }
    const regions = Array.isArray(target.requiredProbeRegions)
      ? target.requiredProbeRegions
      : invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
    for (const region of regions) {
      if (typeof region !== 'string') {
        return invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
      }
      const key = `${target.targetId}\0${region}`;
      if (requiredStreams.has(key)) {
        return invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
      }
      requiredStreams.add(key);
    }
  }
  if (requiredStreams.size === 0) {
    return invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
  }
  /** @type {Map<string, {attemptNumber: number, hopNumber: number, classification: string}>} */
  const latest = new Map();
  for (const observation of observations) {
    const probes = Array.isArray(observation.probes) ? observation.probes : [];
    for (const probeValue of probes) {
      const probe = asObject(probeValue, 'DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
      const key = `${probe.targetId}\0${String(probe.probeRegion)}`;
      if (!requiredStreams.has(key)) {
        return invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
      }
      const attemptNumber = Number(probe.attemptNumber);
      const hopNumber = Number(probe.hopNumber);
      const classification = probe.classification;
      if (
        !Number.isInteger(attemptNumber) ||
        !Number.isInteger(hopNumber) ||
        typeof classification !== 'string'
      ) {
        return invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
      }
      const prior = latest.get(key);
      if (
        !prior ||
        attemptNumber > prior.attemptNumber ||
        (attemptNumber === prior.attemptNumber && hopNumber > prior.hopNumber)
      ) {
        latest.set(key, { attemptNumber, hopNumber, classification });
      }
    }
  }
  if (
    [...requiredStreams].every(
      (key) => latest.get(key)?.classification === 'candidate',
    )
  ) {
    return 'candidate-complete';
  }
  if (
    outcomeObservation.observationClass !== 'deadline-finalization' ||
    deadlineEvidence === undefined
  ) {
    return 'inconclusive';
  }
  const source = asObject(
    deadlineEvidence,
    'DEPLOYMENT_RECEIPT_COVERAGE_INVALID',
  );
  if (
    source.profile !== 'gala-deadline-finalization-evidence-v2' ||
    source.finalizedAt !== outcomeObservation.observedAt ||
    computeDeadlineFinalizationEvidenceDigest(source) !==
      outcomeObservation.evidenceDigest
  ) {
    return invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
  }
  if (source.finalizationKind === 'verification-inconclusive') {
    return 'inconclusive';
  }
  if (source.finalizationKind !== 'propagation-degraded') {
    return invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
  }
  const streams = Array.isArray(source.selectedStreams)
    ? source.selectedStreams
    : invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
  if (streams.length !== requiredStreams.size) {
    return invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
  }
  let priorCount = 0;
  const selectedKeys = new Set();
  for (const streamValue of streams) {
    const stream = asObject(streamValue, 'DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
    const key = `${stream.targetId}\0${String(stream.probeRegion)}`;
    if (
      !requiredStreams.has(key) ||
      selectedKeys.has(key) ||
      stream.state !== 'terminal'
    ) {
      return invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
    }
    selectedKeys.add(key);
    const selectedObservation = observations.find(
      (candidate) => candidate.observationId === stream.observationId,
    );
    if (
      !selectedObservation ||
      selectedObservation.evidenceDigest !== stream.evidenceDigest
    ) {
      return invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
    }
    const selectedProbes = Array.isArray(selectedObservation.probes)
      ? selectedObservation.probes
      : invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
    const terminal = selectedProbes
      .map((probe) => asObject(probe, 'DEPLOYMENT_RECEIPT_COVERAGE_INVALID'))
      .filter(
        (probe) =>
          String(probe.targetId) === String(stream.targetId) &&
          probe.probeRegion === stream.probeRegion,
      )
      .sort(
        (left, right) =>
          Number(right.attemptNumber) - Number(left.attemptNumber) ||
          Number(right.hopNumber) - Number(left.hopNumber),
      )[0];
    if (
      !terminal ||
      !['candidate', 'recognized-prior'].includes(
        String(terminal.classification),
      )
    ) {
      return invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
    }
    if (terminal.classification === 'recognized-prior') priorCount += 1;
  }
  return priorCount > 0
    ? 'candidate-prior-degraded'
    : invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
}

/**
 * Validate the selected receipt outcome tuple and generation semantics.
 *
 * @param {Record<string, unknown>} receipt receipt
 * @param {Record<string, unknown>} intent intent
 * @param {Record<string, unknown>} attempt selected outcome attempt
 * @param {Record<string, unknown>} observation selected outcome observation
 * @param {Set<string>} warningCodes warning codes
 * @param {Record<string, unknown>} context retained receipt context, including derived verificationCoverage
 * @returns {void}
 */
function validateReceiptOutcome(
  receipt,
  intent,
  attempt,
  observation,
  warningCodes,
  context,
) {
  const proposedGeneration = intent.proposedGenerationId;
  const hasGeneration = Object.hasOwn(receipt, 'destinationGenerationId');
  const propagation = warningCodes.has('PUBLIC_PROPAGATION_DEADLINE');
  const cleanup = warningCodes.has('CLEANUP_FAILED');
  const hasFailure = Object.hasOwn(receipt, 'failure');
  const hasVerificationDeadline = Object.hasOwn(
    receipt,
    'verificationDeadlineAt',
  );
  const successTuple =
    attempt.outcome === 'succeeded' &&
    observation.outcome === 'succeeded' &&
    observation.destinationChanged === 'yes' &&
    hasGeneration &&
    receipt.destinationGenerationId === proposedGeneration;
  switch (receipt.outcome) {
    case 'succeeded':
      if (
        !successTuple ||
        warningCodes.size !== 0 ||
        hasFailure ||
        hasVerificationDeadline ||
        context.verificationCoverage !== 'candidate-complete'
      ) {
        invalid('DEPLOYMENT_RECEIPT_OUTCOME_INVALID');
      }
      break;
    case 'succeeded-with-warnings':
      if (
        !successTuple ||
        warningCodes.size !== 1 ||
        !cleanup ||
        propagation ||
        hasFailure ||
        hasVerificationDeadline ||
        context.verificationCoverage !== 'candidate-complete'
      ) {
        invalid('DEPLOYMENT_RECEIPT_OUTCOME_INVALID');
      }
      break;
    case 'activated-degraded':
      if (
        !successTuple ||
        !propagation ||
        hasFailure ||
        !hasVerificationDeadline ||
        receipt.verificationDeadlineAt !== context.verificationDeadlineAt ||
        observation.observationClass !== 'deadline-finalization' ||
        context.verificationCoverage !== 'candidate-prior-degraded'
      ) {
        invalid('DEPLOYMENT_RECEIPT_OUTCOME_INVALID');
      }
      break;
    case 'failed-no-destination-change':
      if (
        attempt.outcome !== 'failed' ||
        observation.destinationChanged !== 'no' ||
        ![
          'rejected',
          'not-attempted-retryable',
          'authorization-lost',
          'rate-limited',
          'provider-contract-violation',
        ].includes(String(observation.outcome)) ||
        hasGeneration ||
        !hasFailure ||
        propagation ||
        hasVerificationDeadline
      ) {
        invalid('DEPLOYMENT_RECEIPT_OUTCOME_INVALID');
      }
      break;
    case 'cancelled-no-destination-change':
      if (
        attempt.stage !== 'managed-reconciliation' ||
        attempt.outcome !== 'skipped' ||
        observation.observationClass !== 'request-not-started' ||
        observation.outcome !== 'rejected' ||
        observation.destinationChanged !== 'no' ||
        hasGeneration ||
        hasFailure ||
        propagation ||
        hasVerificationDeadline ||
        context.finalizationKind !== 'cancellation'
      ) {
        invalid('DEPLOYMENT_RECEIPT_OUTCOME_INVALID');
      }
      break;
    case 'superseded': {
      const referenceFields = [
        'supersededByOperationId',
        'supersededByGenerationId',
      ];
      const supersessionSource =
        context.finalizationSource === undefined
          ? undefined
          : asObject(
              context.finalizationSource,
              'DEPLOYMENT_RECEIPT_OUTCOME_INVALID',
            );
      if (
        referenceFields.some((field) => !Object.hasOwn(receipt, field)) ||
        observation.observationClass !== 'supersession-finalization' ||
        context.finalizationKind !== 'supersession' ||
        supersessionSource === undefined ||
        receipt.supersededByOperationId !==
          supersessionSource.supersededByOperationId ||
        receipt.supersededByGenerationId !==
          supersessionSource.supersededByGenerationId ||
        hasFailure ||
        propagation ||
        hasVerificationDeadline
      ) {
        invalid('DEPLOYMENT_RECEIPT_OUTCOME_INVALID');
      }
      if (
        hasGeneration
          ? !successTuple
          : attempt.outcome !== 'skipped' ||
            observation.outcome !== 'rejected' ||
            observation.destinationChanged !== 'no'
      ) {
        invalid('DEPLOYMENT_RECEIPT_OUTCOME_INVALID');
      }
      break;
    }
    case 'unknown-reconciling':
      if (
        !['unknown', 'failed'].includes(String(attempt.outcome)) ||
        ![
          'outcome-unknown-reconciling',
          'provider-contract-violation',
        ].includes(String(observation.outcome)) ||
        !['unknown', 'yes'].includes(String(observation.destinationChanged)) ||
        hasGeneration !== (observation.destinationChanged === 'yes') ||
        (hasGeneration &&
          receipt.destinationGenerationId !== proposedGeneration) ||
        !hasFailure ||
        propagation ||
        hasVerificationDeadline ||
        (observation.destinationChanged === 'unknown' &&
          warningCodes.size !== 0)
      ) {
        invalid('DEPLOYMENT_RECEIPT_OUTCOME_INVALID');
      }
      break;
    case 'rolled-back': {
      const rollbackFields = [
        'rollbackOfOperationId',
        'rollbackOfGenerationId',
        'rollbackOfReceiptDigest',
        'rollbackActorId',
        'rollbackReason',
      ];
      if (
        !successTuple ||
        rollbackFields.some((field) => !Object.hasOwn(receipt, field)) ||
        hasFailure ||
        propagation ||
        hasVerificationDeadline ||
        context.rollbackCertification === undefined
      ) {
        invalid('DEPLOYMENT_RECEIPT_OUTCOME_INVALID');
      }
      const certification = asObject(
        context.rollbackCertification,
        'DEPLOYMENT_RECEIPT_OUTCOME_INVALID',
      );
      for (const field of rollbackFields) {
        requireOwnerField(
          receipt,
          certification,
          field,
          field,
          'DEPLOYMENT_RECEIPT_OUTCOME_INVALID',
        );
      }
      if (context.verificationCoverage !== 'candidate-complete') {
        invalid('DEPLOYMENT_RECEIPT_OUTCOME_INVALID');
      }
      break;
    }
    default:
      invalid('DEPLOYMENT_RECEIPT_OUTCOME_INVALID');
  }
  if (receipt.outcome !== 'rolled-back') {
    for (const field of [
      'rollbackOfOperationId',
      'rollbackOfGenerationId',
      'rollbackOfReceiptDigest',
      'rollbackActorId',
      'rollbackReason',
    ]) {
      if (Object.hasOwn(receipt, field)) {
        invalid('DEPLOYMENT_RECEIPT_OUTCOME_INVALID');
      }
    }
  }
  if (receipt.outcome !== 'superseded') {
    for (const field of [
      'supersededByOperationId',
      'supersededByGenerationId',
    ]) {
      if (Object.hasOwn(receipt, field)) {
        invalid('DEPLOYMENT_RECEIPT_OUTCOME_INVALID');
      }
    }
  }
}

/**
 * Project the verification policy and complete plan that must remain immutable
 * for every workflow run attempt admitted under one operation.
 *
 * @param {Record<string, unknown>} intent retained intent
 * @param {Record<string, unknown>} intentContext retained intent authorities
 * @returns {Record<string, unknown>} immutable operation-wide projection
 */
function projectOperationVerificationAuthority(intent, intentContext) {
  const code = 'DEPLOYMENT_RECEIPT_VERIFICATION_AUTHORITY_INVALID';
  const decision = asObject(intentContext.deploymentPolicyDecision, code);
  /** @type {Record<string, unknown>} */
  const projection = {
    verificationPlanDigest: intent.verificationPlanDigest,
    verificationPlan: intentContext.verificationPlan,
  };
  for (const field of OPERATION_VERIFICATION_AUTHORITY_FIELDS) {
    if (!Object.hasOwn(decision, field)) return invalid(code);
    projection[field] = decision[field];
  }
  return projection;
}

/**
 * Derive the authenticated proved-no-change close that alone permits a later
 * workflow run attempt to reserve operation-wide evidence capacity.
 *
 * @param {ReturnType<typeof validateOperationJournals>[number]} journal validated run journal
 * @returns {{runAttempt: number, intentDigest: unknown, attempt: Record<string, unknown>, observation: Record<string, unknown>} | undefined} close authority
 */
function deriveProvedNoChangeRunClosure(journal) {
  const witness = deriveReceiptWitness(journal);
  const attempt = witness.attempt;
  const observation = witness.observation;
  const observationContext = asObject(
    journal.observationContextsById[String(observation.observationId)],
    'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
  );
  const finalizationSource =
    observationContext.finalizationSource === undefined
      ? undefined
      : asObject(
          observationContext.finalizationSource,
          'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
        );
  const cancellationClose =
    observation.observationClass === 'request-not-started' &&
    finalizationSource?.profile ===
      'gala-cancellation-finalization-evidence-v2';
  if (
    attempt.destinationChanged !== 'no' ||
    observation.destinationChanged !== 'no' ||
    (!findFailureRow(attempt, observation) && !cancellationClose)
  ) {
    return undefined;
  }
  return {
    runAttempt: journal.runAttempt,
    intentDigest: journal.intent.intentDigest,
    attempt,
    observation,
  };
}

/**
 * Select the exact observation named by a terminal stage result and prove that
 * it precedes the attempt. The owning transition validator separately proves
 * immediate pairing where that transaction creates an observation.
 *
 * @param {ReturnType<typeof validateOperationJournals>[number]} journal validated journal
 * @param {Record<string, unknown>} attempt terminal stage attempt
 * @param {Record<string, unknown> | undefined} controllerTransition authenticated public-controller transition
 * @param {string} code failure code
 * @returns {{observation: Record<string, unknown>, observationEntryIndex: number, attemptEntryIndex: number}} selected pair
 */
function selectStageFinalizationObservation(
  journal,
  attempt,
  controllerTransition,
  code,
) {
  const stageAttemptId = String(attempt.stageAttemptId);
  const evidence = asObject(journal.stageEvidenceById[stageAttemptId], code);
  const stageResult = asObject(evidence.stageResult, code);
  const reference = asObject(stageResult.finalizationObservation, code);
  requireKeys(reference, ['observationId', 'evidenceDigest'], [], code);
  const matches = journal.observations.filter(
    (observation) =>
      observation.stageAttemptId === stageAttemptId &&
      observation.observationId === reference.observationId &&
      observation.evidenceDigest === reference.evidenceDigest,
  );
  const observation = matches[0];
  const attemptEntryIndex = journal.attemptEntryIndexes.get(stageAttemptId);
  const observationEntryIndex = observation
    ? journal.observationEntryIndexes.get(String(observation.observationId))
    : undefined;
  if (
    matches.length !== 1 ||
    !observation ||
    attemptEntryIndex === undefined ||
    observationEntryIndex === undefined ||
    observationEntryIndex >= attemptEntryIndex
  ) {
    return invalid(code);
  }
  if (controllerTransition !== undefined) {
    validateVerificationController(
      controllerTransition.controllerBeforeFinalization,
      journal.intent,
    );
  }
  return { observation, observationEntryIndex, attemptEntryIndex };
}

/**
 * Return whether a retained controller can advance without another journal
 * observation. DEC-097 admits only the lease-drain close from
 * `integrity-closing` to `sealed/integrity-mismatch` on that path.
 *
 * @param {Record<string, unknown>} before earlier controller
 * @param {Record<string, unknown>} after later controller
 * @returns {boolean} whether this is the admitted observation-free advance
 */
function isIntegrityDrainControllerAdvance(before, after) {
  if (
    before.state !== 'integrity-closing' ||
    before.closeReason !== 'integrity-mismatch' ||
    after.state !== 'sealed' ||
    after.closeReason !== 'integrity-mismatch'
  ) {
    return false;
  }
  return [
    'operationId',
    'attemptId',
    'verificationPlanDigest',
    'verificationDeadlineAt',
    'finalizationDeadlineAt',
  ].every((field) => before[field] === after[field]);
}

/**
 * Validate every authenticated per-run journal and compose stage/observation
 * validators over each retained row.
 *
 * @param {unknown} value journal descriptors
 * @param {unknown} operationValue durable operation owner
 * @returns {Array<{runAttempt: number, intent: Record<string, unknown>, workload: Record<string, unknown>, operation: Record<string, unknown>, entries: unknown[], attempts: Record<string, unknown>[], observations: Record<string, unknown>[], attemptEntryIndexes: Map<string, number>, observationEntryIndexes: Map<string, number>, stageEvidenceById: Record<string, unknown>, observationContextsById: Record<string, unknown>, descriptor: Record<string, unknown>, intentContext: Record<string, unknown>} >} validated journals
 */
function validateOperationJournals(value, operationValue) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 51) {
    return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
  }
  const operation = asObject(
    operationValue,
    'DEPLOYMENT_RECEIPT_OWNER_MISMATCH',
  );
  const operationId = stableId(
    operation.operationId,
    'DEPLOYMENT_RECEIPT_OWNER_MISMATCH',
  );
  stableId(operation.organizationId, 'DEPLOYMENT_RECEIPT_OWNER_MISMATCH');
  stableId(operation.publicationId, 'DEPLOYMENT_RECEIPT_OWNER_MISMATCH');
  const reservationTransitionsByRunAttempt = asObject(
    operation.publicProbeReservationTransitionsByRunAttempt,
    'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
  );
  const controllerTransitionsByStageAttemptId = asObject(
    operation.verificationControllerTransitionsByStageAttemptId,
    'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
  );
  if (Object.keys(reservationTransitionsByRunAttempt).length !== value.length) {
    return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
  }
  const operationProbeCoordinates = new Set();
  /** @type {Record<string, unknown>[]} */
  const operationObservations = [];
  /** @type {Record<string, Record<string, unknown>>} */
  const operationObservationContextsById = {};
  /** @type {Record<string, Record<string, unknown>>} */
  const operationPublicProbeAuthoritiesByObservationId = {};
  const observationIds = new Set();
  const runAttempts = new Set();
  const usedControllerTransitionIds = new Set();
  let totalObservations = 0;
  let nonPublicObservations = 0;
  let totalProbes = 0;
  let priorRunAttempt = 0;
  /** @type {Record<string, unknown> | undefined} */
  let latestJournalControllerAfter;
  /** @type {Record<string, unknown> | undefined} */
  let operationVerificationAuthority;
  /** @type {ReturnType<typeof deriveProvedNoChangeRunClosure>} */
  let priorRunClosure;
  /** @type {ReturnType<typeof validateOperationJournals>} */
  const validatedJournals = [];
  const journals = value.map((candidate) => {
    const descriptor = asObject(
      candidate,
      'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
    );
    requireKeys(
      descriptor,
      [
        'runAttempt',
        'intent',
        'intentContext',
        'entries',
        'stageEvidenceByStageAttemptId',
        'observationContextsByObservationId',
      ],
      [],
      'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
    );
    const runAttempt = descriptor.runAttempt;
    if (
      typeof runAttempt !== 'number' ||
      !Number.isInteger(runAttempt) ||
      runAttempt < 1 ||
      runAttempt > 51 ||
      runAttempts.has(runAttempt) ||
      runAttempt <= priorRunAttempt
    ) {
      return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
    }
    runAttempts.add(runAttempt);
    priorRunAttempt = runAttempt;
    const intent = asObject(
      descriptor.intent,
      'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
    );
    const intentContext = asObject(
      descriptor.intentContext,
      'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
    );
    const reservationTransition =
      reservationTransitionsByRunAttempt[String(runAttempt)];
    if (reservationTransition === undefined) {
      return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
    }
    const retainedReservationTransition = asObject(
      reservationTransition,
      'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
    );
    const retainedReservationBefore = asObject(
      retainedReservationTransition.before,
      'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
    );
    if (
      canonicalizeJcs(
        retainedReservationTransition.priorOperationObservations,
      ) !== canonicalizeJcs(operationObservations) ||
      (priorRunClosure === undefined) !==
        !Object.hasOwn(retainedReservationBefore, 'priorRunClosure') ||
      (priorRunClosure !== undefined &&
        canonicalizeJcs(retainedReservationBefore.priorRunClosure) !==
          canonicalizeJcs(priorRunClosure))
    ) {
      return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
    }
    const verificationAuthority = projectOperationVerificationAuthority(
      intent,
      intentContext,
    );
    if (
      operationVerificationAuthority !== undefined &&
      canonicalizeJcs(verificationAuthority) !==
        canonicalizeJcs(operationVerificationAuthority)
    ) {
      return invalid('DEPLOYMENT_RECEIPT_VERIFICATION_AUTHORITY_INVALID');
    }
    try {
      const operationAtReservation = {
        ...operation,
        publicProbeReservationTransitionsByRunAttempt: Object.fromEntries(
          Array.from({ length: runAttempt }, (_, index) => {
            const key = String(index + 1);
            return [key, reservationTransitionsByRunAttempt[key]];
          }),
        ),
      };
      validateDeploymentIntentSemantics(
        intent,
        /** @type {Parameters<typeof validateDeploymentIntentSemantics>[1]} */ ({
          ...intentContext,
          operation: operationAtReservation,
        }),
      );
    } catch {
      return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
    }
    operationVerificationAuthority = verificationAuthority;
    const verificationPlanContext = deriveIntentVerificationPlanContext(
      intent,
      intentContext,
    );
    const workload = validateVerifiedWorkloadBinding(
      intentContext.workloadBinding,
      'DEPLOYMENT_RECEIPT_WORKLOAD_MISMATCH',
    );
    const intentOperation = asObject(
      intentContext.operation,
      'DEPLOYMENT_RECEIPT_OWNER_MISMATCH',
    );
    if (
      intent.operationId !== operationId ||
      intent.intentDigest !== computeDeploymentIntentDigest(intent) ||
      workload.runAttempt !== runAttempt ||
      workload.workloadBindingDigest !== intent.workloadBindingDigest ||
      intentOperation.operationId !== operationId ||
      intentOperation.organizationId !== operation.organizationId ||
      intentOperation.publicationId !== operation.publicationId
    ) {
      return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
    }
    const entries = Array.isArray(descriptor.entries)
      ? descriptor.entries
      : invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
    const lastEntry = asObject(
      entries.at(-1),
      'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
    );
    try {
      validateManagedEvidenceJournal({
        operationId,
        runAttempt,
        entries,
        receiptEntryCount: entries.length,
        receiptHeadDigest: String(lastEntry.headDigest),
      });
    } catch {
      return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
    }
    /** @type {Record<string, unknown>[]} */
    const attempts = [];
    /** @type {Record<string, unknown>[]} */
    const observations = [];
    const attemptEntryIndexes = new Map();
    const observationEntryIndexes = new Map();
    entries.forEach((entryValue, entryIndex) => {
      const entry = asObject(entryValue, 'DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
      if (entry.entryType === 'attempt') {
        const attempt = asObject(
          entry.attempt,
          'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
        );
        const stageAttemptId = String(attempt.stageAttemptId);
        if (
          attempt.sequence !== attempts.length + 1 ||
          attemptEntryIndexes.has(stageAttemptId)
        ) {
          return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
        }
        attempts.push(attempt);
        attemptEntryIndexes.set(stageAttemptId, entryIndex);
      } else {
        const observation = asObject(
          entry.observation,
          'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
        );
        observations.push(observation);
        observationEntryIndexes.set(
          String(observation.observationId),
          entryIndex,
        );
        const observationId = String(observation.observationId);
        if (observationIds.has(observationId)) {
          invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
        }
        observationIds.add(observationId);
        totalObservations += 1;
        if (observation.observationClass !== 'public-state') {
          nonPublicObservations += 1;
        }
        totalProbes += Array.isArray(observation.probes)
          ? observation.probes.length
          : 0;
      }
    });
    if (
      attempts.length < 1 ||
      attempts.length > 100 ||
      observations.length < 1 ||
      observations.length > 1_000
    ) {
      return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
    }
    const stageEvidenceById = asObject(
      descriptor.stageEvidenceByStageAttemptId,
      'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
    );
    const observationContextsById = asObject(
      descriptor.observationContextsByObservationId,
      'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
    );
    /** @type {Record<string, Record<string, unknown>>} */
    const validatedObservationContextsById = {};
    /** @type {Record<string, Record<string, unknown>>} */
    const validatedPublicProbeAuthoritiesByObservationId = {};
    if (
      Object.keys(stageEvidenceById).length !== attempts.length ||
      Object.keys(observationContextsById).length !== observations.length
    ) {
      return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
    }
    for (const attempt of attempts) {
      const stageAttemptId = String(attempt.stageAttemptId);
      const stageObservations = observations.filter(
        (observation) => observation.stageAttemptId === stageAttemptId,
      );
      if (stageObservations.length < 1) {
        return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
      }
      try {
        validateDeploymentStageRecords({
          deploymentIntent: intent,
          deploymentAttempt: attempt,
          deploymentStageEvidence: stageEvidenceById[stageAttemptId],
          retainedObservations: stageObservations,
        });
      } catch {
        return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
      }
    }
    /** @type {Record<string, Record<string, unknown>>} */
    const publicControllerTransitionsByStageAttemptId = {};
    for (const attempt of attempts.filter(
      (candidateAttempt) => candidateAttempt.stage === 'public-verification',
    )) {
      const stageAttemptId = String(attempt.stageAttemptId);
      const transition = asObject(
        controllerTransitionsByStageAttemptId[stageAttemptId],
        'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
      );
      requireKeys(
        transition,
        ['controllerBeforeFinalization', 'controllerAfterFinalization'],
        ['leases'],
        'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
      );
      if (usedControllerTransitionIds.has(stageAttemptId)) {
        return invalid('DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID');
      }
      usedControllerTransitionIds.add(stageAttemptId);
      validateVerificationController(
        transition.controllerBeforeFinalization,
        intent,
      );
      validateVerificationController(
        transition.controllerAfterFinalization,
        intent,
      );
      publicControllerTransitionsByStageAttemptId[stageAttemptId] = transition;
    }
    observations.forEach((observation, index) => {
      const stageAttemptId = String(observation.stageAttemptId);
      const attempt = attempts.find(
        (candidateAttempt) =>
          candidateAttempt.stageAttemptId === stageAttemptId,
      );
      if (!attempt) invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
      const observationId = String(observation.observationId);
      const observationContext = asObject(
        observationContextsById[observationId],
        'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
      );
      const activationDetectionContext =
        observationContext.activationDetectionContext === undefined
          ? undefined
          : {
              ...asObject(
                observationContext.activationDetectionContext,
                'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
              ),
              detectionPlan: intentContext.activationDetectionPlan,
              verificationPlan: intentContext.verificationPlan,
              verificationPlanContext,
            };
      const rawFinalizationContext =
        observationContext.finalizationContext === undefined
          ? undefined
          : asObject(
              observationContext.finalizationContext,
              'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
            );
      if (observation.observationClass === 'deadline-finalization') {
        const transition = asObject(
          publicControllerTransitionsByStageAttemptId[stageAttemptId],
          'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
        );
        if (
          rawFinalizationContext === undefined ||
          canonicalizeJcs(
            rawFinalizationContext.controllerBeforeFinalization,
          ) !== canonicalizeJcs(transition.controllerBeforeFinalization) ||
          canonicalizeJcs(
            rawFinalizationContext.controllerAfterFinalization,
          ) !== canonicalizeJcs(transition.controllerAfterFinalization) ||
          canonicalizeJcs(rawFinalizationContext.leases) !==
            canonicalizeJcs(transition.leases)
        ) {
          return invalid('DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID');
        }
      }
      const finalizationContext =
        rawFinalizationContext === undefined
          ? undefined
          : {
              ...rawFinalizationContext,
              verificationPlan: intentContext.verificationPlan,
              verificationPlanContext,
              precedingJournalEntries: entries.slice(
                0,
                Number(observationEntryIndexes.get(observationId)),
              ),
              operationPrecedingObservations: [
                ...operationObservations,
                ...observations.slice(0, index),
              ],
              publicProbeAttemptContextsByObservationId: Object.fromEntries(
                [...operationObservations, ...observations.slice(0, index)]
                  .filter(
                    (priorObservation) =>
                      priorObservation.observationClass === 'public-state',
                  )
                  .map((priorObservation) => {
                    const priorObservationId = String(
                      priorObservation.observationId,
                    );
                    const priorContext =
                      operationObservationContextsById[priorObservationId] ??
                      validatedObservationContextsById[priorObservationId];
                    if (!priorContext) {
                      return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
                    }
                    const priorAuthority =
                      operationPublicProbeAuthoritiesByObservationId[
                        priorObservationId
                      ];
                    return [
                      priorObservationId,
                      priorAuthority ?? {
                        intent,
                        verificationPlan: intentContext.verificationPlan,
                        verificationPlanContext,
                        activationBasis: priorContext.activationBasis,
                        verificationDeadlineAt:
                          priorContext.verificationDeadlineAt,
                        publicProbeAttemptContexts:
                          priorContext.publicProbeAttemptContexts,
                      },
                    ];
                  }),
              ),
              runAttempt,
            };
      validateDeploymentObservationSemantics(observation, {
        ...observationContext,
        intent,
        operation,
        verificationController: asObject(
          operation.verificationController,
          'DEPLOYMENT_RECEIPT_JOURNAL_INVALID',
        ),
        expectedSequence: index + 1,
        stageAttempt: attempt,
        stageEvidence: stageEvidenceById[stageAttemptId],
        stageRetainedObservations: observations.filter(
          (candidateObservation) =>
            candidateObservation.stageAttemptId === stageAttemptId,
        ),
        precedingObservations: observations.slice(0, index),
        operationPrecedingObservations: [
          ...operationObservations,
          ...observations.slice(0, index),
        ],
        destinationFence: observationContext.destinationFence,
        capabilityDecision: intentContext.capabilityDecision,
        destinationProviderBinding: intentContext.destinationProviderBinding,
        pagesOidcOriginCatalog: intentContext.pagesOidcOriginCatalog,
        verificationPlan: /** @type {unknown[]} */ (
          intentContext.verificationPlan
        ),
        verificationPlanContext:
          /** @type {Parameters<typeof validateVerificationPlan>[1]} */ (
            verificationPlanContext
          ),
        ...(activationDetectionContext === undefined
          ? {}
          : { activationDetectionContext }),
        ...(finalizationContext === undefined ? {} : { finalizationContext }),
        operationProbeCoordinates,
      });
      validatedObservationContextsById[observationId] = observationContext;
      if (observation.observationClass === 'public-state') {
        validatedPublicProbeAuthoritiesByObservationId[observationId] = {
          intent,
          verificationPlan: intentContext.verificationPlan,
          verificationPlanContext,
          activationBasis: observationContext.activationBasis,
          verificationDeadlineAt: observationContext.verificationDeadlineAt,
          publicProbeAttemptContexts:
            observationContext.publicProbeAttemptContexts,
        };
      }
    });
    if (
      totalObservations > 1_000 ||
      nonPublicObservations > 100 ||
      totalProbes > 900
    ) {
      return invalid('DEPLOYMENT_RECEIPT_EVIDENCE_LIMIT_EXCEEDED');
    }
    const validatedJournal = {
      runAttempt,
      intent,
      workload,
      operation,
      entries,
      attempts,
      observations,
      attemptEntryIndexes,
      observationEntryIndexes,
      stageEvidenceById,
      observationContextsById,
      descriptor,
      intentContext,
    };
    for (const attempt of attempts.filter(
      (candidateAttempt) => candidateAttempt.stage === 'public-verification',
    )) {
      const transition =
        publicControllerTransitionsByStageAttemptId[
          String(attempt.stageAttemptId)
        ];
      const { observation: outcomeObservation, attemptEntryIndex } =
        selectStageFinalizationObservation(
          validatedJournal,
          attempt,
          transition,
          'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
        );
      const relevantObservations = observations.filter(
        (observation) =>
          Number(
            observationEntryIndexes.get(String(observation.observationId)),
          ) < attemptEntryIndex,
      );
      const outcomeContext = asObject(
        observationContextsById[String(outcomeObservation.observationId)],
        'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
      );
      const deadlineFinalizationEvidence =
        outcomeObservation.observationClass === 'deadline-finalization'
          ? outcomeContext.finalizationSource
          : undefined;
      const verificationCoverage = deriveVerificationCoverage(
        [...operationObservations, ...relevantObservations],
        /** @type {unknown[]} */ (intentContext.verificationPlan),
        outcomeObservation,
        deadlineFinalizationEvidence,
      );
      validatePublicVerificationControllerOutcome(
        [...validatedJournals, validatedJournal],
        validatedJournal,
        attempt,
        outcomeObservation,
        verificationCoverage,
        asObject(
          transition,
          'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
        ),
      );
    }
    /** @type {Record<string, unknown> | undefined} */
    let journalControllerAfter;
    const orderedAttempts = [...attempts].sort(
      (left, right) =>
        Number(attemptEntryIndexes.get(String(left.stageAttemptId))) -
        Number(attemptEntryIndexes.get(String(right.stageAttemptId))),
    );
    for (const attempt of orderedAttempts) {
      const stageAttemptId = String(attempt.stageAttemptId);
      let transition =
        publicControllerTransitionsByStageAttemptId[stageAttemptId];
      if (transition === undefined) {
        const { observation, observationEntryIndex, attemptEntryIndex } =
          selectStageFinalizationObservation(
            validatedJournal,
            attempt,
            undefined,
            'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
          );
        const observationContext = asObject(
          observationContextsById[String(observation.observationId)],
          'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
        );
        const source =
          observationContext.finalizationSource === undefined
            ? undefined
            : asObject(
                observationContext.finalizationSource,
                'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
              );
        const controlFinalization =
          observation.observationClass === 'supersession-finalization' ||
          (observation.observationClass === 'request-not-started' &&
            source?.profile === 'gala-cancellation-finalization-evidence-v2');
        if (!controlFinalization) continue;
        if (observationEntryIndex + 1 !== attemptEntryIndex) {
          return invalid('DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID');
        }
        transition = asObject(
          observationContext.finalizationContext,
          'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID',
        );
      }
      const controllerBefore = validateVerificationController(
        transition.controllerBeforeFinalization,
        intent,
      );
      const controllerAfter = validateVerificationController(
        transition.controllerAfterFinalization,
        intent,
      );
      if (
        journalControllerAfter !== undefined &&
        canonicalizeJcs(journalControllerAfter) !==
          canonicalizeJcs(controllerBefore) &&
        !isIntegrityDrainControllerAdvance(
          journalControllerAfter,
          controllerBefore,
        )
      ) {
        return invalid('DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID');
      }
      journalControllerAfter = controllerAfter;
    }
    latestJournalControllerAfter = journalControllerAfter;
    operationObservations.push(...observations);
    Object.assign(
      operationObservationContextsById,
      validatedObservationContextsById,
    );
    Object.assign(
      operationPublicProbeAuthoritiesByObservationId,
      validatedPublicProbeAuthoritiesByObservationId,
    );
    priorRunClosure = deriveProvedNoChangeRunClosure(validatedJournal);
    validatedJournals.push(validatedJournal);
    return validatedJournal;
  });
  if (
    usedControllerTransitionIds.size !==
    Object.keys(controllerTransitionsByStageAttemptId).length
  ) {
    return invalid('DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID');
  }
  if (latestJournalControllerAfter !== undefined) {
    const currentController = validateVerificationController(
      operation.verificationController,
      validatedJournals.at(-1)?.intent ??
        invalid('DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID'),
    );
    if (
      canonicalizeJcs(latestJournalControllerAfter) !==
        canonicalizeJcs(currentController) &&
      !isIntegrityDrainControllerAdvance(
        latestJournalControllerAfter,
        currentController,
      )
    ) {
      return invalid('DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID');
    }
  }
  return journals;
}

/**
 * Validate a closed acyclic causation order and derive the current outcome pair.
 *
 * @param {ReturnType<typeof validateOperationJournals>[number]} journal selected journal
 * @returns {{attempt: Record<string, unknown>, observation: Record<string, unknown>, auxiliaryAttempts: Record<string, unknown>[], outcomeEntryIndex: number}} derived witnesses
 */
function deriveReceiptWitness(journal) {
  const known = new Set([String(journal.intent.idempotencyKey)]);
  const usedCausation = new Set();
  for (const entryValue of journal.entries) {
    const entry = asObject(entryValue, 'DEPLOYMENT_RECEIPT_CAUSATION_INVALID');
    if (entry.entryType === 'observation') {
      const observation = asObject(
        entry.observation,
        'DEPLOYMENT_RECEIPT_CAUSATION_INVALID',
      );
      known.add(String(observation.observationId));
      continue;
    }
    const attempt = asObject(
      entry.attempt,
      'DEPLOYMENT_RECEIPT_CAUSATION_INVALID',
    );
    const causationId = String(attempt.causationId);
    if (!known.has(causationId) || usedCausation.has(causationId)) {
      return invalid('DEPLOYMENT_RECEIPT_CAUSATION_INVALID');
    }
    usedCausation.add(causationId);
    known.add(String(attempt.stageAttemptId));
  }
  const pairs = journal.attempts.map((attempt) => {
    const transitions =
      attempt.stage === 'public-verification'
        ? asObject(
            journal.operation.verificationControllerTransitionsByStageAttemptId,
            'DEPLOYMENT_RECEIPT_WITNESS_INVALID',
          )
        : undefined;
    const transition =
      transitions === undefined
        ? undefined
        : asObject(
            transitions[String(attempt.stageAttemptId)],
            'DEPLOYMENT_RECEIPT_WITNESS_INVALID',
          );
    const { observation, attemptEntryIndex: outcomeEntryIndex } =
      selectStageFinalizationObservation(
        journal,
        attempt,
        transition,
        'DEPLOYMENT_RECEIPT_WITNESS_INVALID',
      );
    return { attempt, observation, outcomeEntryIndex };
  });
  const supersession = pairs.filter(
    ({ observation }) =>
      observation.observationClass === 'supersession-finalization',
  );
  const cancellation = pairs.filter(({ observation }) => {
    const source = asObject(
      journal.observationContextsById[String(observation.observationId)],
      'DEPLOYMENT_RECEIPT_WITNESS_INVALID',
    ).finalizationSource;
    return (
      observation.observationClass === 'request-not-started' &&
      source !== undefined &&
      asObject(source, 'DEPLOYMENT_RECEIPT_WITNESS_INVALID').profile ===
        'gala-cancellation-finalization-evidence-v2'
    );
  });
  if (supersession.length > 1 || cancellation.length > 1) {
    return invalid('DEPLOYMENT_RECEIPT_WITNESS_INVALID');
  }
  let selected;
  if (supersession.length === 1) {
    selected = supersession[0];
  } else if (cancellation.length === 1) {
    selected = cancellation[0];
  } else {
    selected = [...pairs]
      .filter(({ attempt }) => attempt.stage !== 'cleanup')
      .sort(
        (left, right) =>
          Number(right.attempt.sequence) - Number(left.attempt.sequence),
      )[0];
  }
  if (!selected) return invalid('DEPLOYMENT_RECEIPT_WITNESS_INVALID');
  const auxiliaryAttempts = pairs
    .filter(
      ({ attempt }) =>
        attempt.stage === 'cleanup' &&
        ['failed', 'unknown'].includes(String(attempt.outcome)) &&
        attempt.stageAttemptId !== selected.attempt.stageAttemptId,
    )
    .map(({ attempt }) => attempt)
    .sort((left, right) => Number(left.sequence) - Number(right.sequence));
  return { ...selected, auxiliaryAttempts };
}

/**
 * Validate one immutable receipt ancestry against the complete retained
 * operation snapshot history.
 *
 * @param {Record<string, unknown>} receipt candidate receipt
 * @param {unknown} value prior immutable receipts in global append order
 * @returns {void}
 */
function validateReceiptAncestry(receipt, value) {
  if (!Array.isArray(value) || value.length > 999) {
    return invalid('DEPLOYMENT_RECEIPT_ANCESTRY_INVALID');
  }
  const priorIds = new Set();
  const priorDigests = new Set();
  /** @type {Record<string, unknown> | undefined} */
  let sameAttemptPredecessor;
  let sameAttemptSequence = 0;
  value.forEach((candidate, index) => {
    const prior = asObject(candidate, 'DEPLOYMENT_RECEIPT_ANCESTRY_INVALID');
    const priorId = stableId(
      prior.receiptId,
      'DEPLOYMENT_RECEIPT_ANCESTRY_INVALID',
    );
    if (
      prior.schemaId !== 'urn:gala:schema:deployment-receipt:2.0.0' ||
      prior.schemaVersion !== '2.0.0' ||
      prior.operationId !== receipt.operationId ||
      prior.snapshotSequence !== index + 1 ||
      prior.receiptDigest !== computeDeploymentReceiptDigest(prior) ||
      priorIds.has(priorId) ||
      priorDigests.has(String(prior.receiptDigest))
    ) {
      invalid('DEPLOYMENT_RECEIPT_ANCESTRY_INVALID');
    }
    priorIds.add(priorId);
    priorDigests.add(String(prior.receiptDigest));
    if (prior.runAttempt === receipt.runAttempt) {
      sameAttemptSequence += 1;
      if (
        prior.attemptSnapshotSequence !== sameAttemptSequence ||
        (sameAttemptPredecessor === undefined) !==
          !Object.hasOwn(prior, 'supersedesReceiptId') ||
        (sameAttemptPredecessor !== undefined &&
          prior.supersedesReceiptId !== sameAttemptPredecessor.receiptId)
      ) {
        invalid('DEPLOYMENT_RECEIPT_ANCESTRY_INVALID');
      }
      sameAttemptPredecessor = prior;
    }
  });
  if (
    receipt.snapshotSequence !== value.length + 1 ||
    receipt.attemptSnapshotSequence !== sameAttemptSequence + 1 ||
    priorIds.has(String(receipt.receiptId))
  ) {
    return invalid('DEPLOYMENT_RECEIPT_ANCESTRY_INVALID');
  }
  if (sameAttemptPredecessor === undefined) {
    if (Object.hasOwn(receipt, 'supersedesReceiptId')) {
      return invalid('DEPLOYMENT_RECEIPT_ANCESTRY_INVALID');
    }
  } else if (receipt.supersedesReceiptId !== sameAttemptPredecessor.receiptId) {
    return invalid('DEPLOYMENT_RECEIPT_ANCESTRY_INVALID');
  }
}

/**
 * Return the exact receipt-committed prefix of a validated run journal.
 *
 * @param {ReturnType<typeof validateOperationJournals>[number]} journal full run journal
 * @param {Record<string, unknown>} receipt candidate receipt
 * @returns {ReturnType<typeof validateOperationJournals>[number]} prefix projection
 */
function selectReceiptJournalPrefix(journal, receipt) {
  const count = Number(receipt.evidenceJournalEntryCount);
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > journal.entries.length ||
    count > 1_100
  ) {
    return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
  }
  const entries = journal.entries.slice(0, count);
  const last = asObject(entries.at(-1), 'DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
  try {
    validateManagedEvidenceJournal({
      operationId: String(receipt.operationId),
      runAttempt: Number(receipt.runAttempt),
      entries,
      receiptEntryCount: count,
      receiptHeadDigest: String(receipt.evidenceJournalHeadDigest),
    });
  } catch {
    return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
  }
  if (last.headDigest !== receipt.evidenceJournalHeadDigest) {
    return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
  }
  const attempts = journal.attempts.filter(
    (attempt) =>
      Number(journal.attemptEntryIndexes.get(String(attempt.stageAttemptId))) <
      count,
  );
  const observations = journal.observations.filter(
    (observation) =>
      Number(
        journal.observationEntryIndexes.get(String(observation.observationId)),
      ) < count,
  );
  if (attempts.length < 1 || observations.length < 1) {
    return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
  }
  return {
    ...journal,
    entries,
    attempts,
    observations,
    attemptEntryIndexes: new Map(
      [...journal.attemptEntryIndexes].filter(([, index]) => index < count),
    ),
    observationEntryIndexes: new Map(
      [...journal.observationEntryIndexes].filter(([, index]) => index < count),
    ),
  };
}

/**
 * Bind one terminal public-verification outcome to its immutable controller
 * transition and, for a cutoff, replay the exact authenticated prefix.
 *
 * @param {ReturnType<typeof validateOperationJournals>} journals validated operation journals
 * @param {ReturnType<typeof selectReceiptJournalPrefix>} journal selected receipt prefix
 * @param {Record<string, unknown>} attempt outcome attempt
 * @param {Record<string, unknown>} observation outcome observation
 * @param {string} verificationCoverage derived receipt coverage
 * @param {Record<string, unknown>} transition authenticated transition
 * @returns {void}
 */
function validatePublicVerificationControllerOutcome(
  journals,
  journal,
  attempt,
  observation,
  verificationCoverage,
  transition,
) {
  if (attempt.stage !== 'public-verification') return;
  const code = 'DEPLOYMENT_RECEIPT_VERIFICATION_CONTROLLER_INVALID';
  requireKeys(
    transition,
    ['controllerBeforeFinalization', 'controllerAfterFinalization'],
    ['leases'],
    code,
  );
  const controllerBefore = validateVerificationController(
    transition.controllerBeforeFinalization,
    journal.intent,
  );
  const controllerAfter = validateVerificationController(
    transition.controllerAfterFinalization,
    journal.intent,
  );
  for (const field of [
    'operationId',
    'attemptId',
    'verificationPlanDigest',
    'verificationDeadlineAt',
    'finalizationDeadlineAt',
  ]) {
    requireOwnerField(controllerAfter, controllerBefore, field, field, code);
  }
  let expectedCloseReason;
  if (observation.observationClass === 'deadline-finalization') {
    expectedCloseReason = 'deadline';
  } else if (attempt.failureCode === 'PUBLIC_INTEGRITY_MISMATCH') {
    expectedCloseReason = 'integrity-mismatch';
  } else if (attempt.failureCode === 'PUBLIC_VERIFICATION_INCONCLUSIVE') {
    expectedCloseReason = 'deadline';
  } else if (
    attempt.outcome === 'succeeded' &&
    observation.observationClass === 'public-state' &&
    observation.outcome === 'succeeded' &&
    verificationCoverage === 'candidate-complete'
  ) {
    expectedCloseReason = 'candidate-complete';
  } else {
    return invalid(code);
  }
  if (typeof attempt.completedAt !== 'string') return invalid(code);
  const completedAt = timestamp(attempt.completedAt, code);
  const verificationDeadline = timestamp(
    controllerAfter.verificationDeadlineAt,
    code,
  );
  const finalizationDeadline = timestamp(
    controllerAfter.finalizationDeadlineAt,
    code,
  );
  const cutoffTransition = controllerBefore.state === 'cutoff-pending';
  const attemptEntryIndex = journal.attemptEntryIndexes.get(
    String(attempt.stageAttemptId),
  );
  const observationEntryIndex = journal.observationEntryIndexes.get(
    String(observation.observationId),
  );
  const outcomeContext = asObject(
    journal.observationContextsById[String(observation.observationId)],
    code,
  );
  const expectedCausationId = cutoffTransition
    ? observation.observationId
    : asObject(outcomeContext.activationBasis, code).source ===
        'kernel-provider-observation'
      ? asObject(outcomeContext.activationBasisEvidence, code).observationId
      : journal.intent.idempotencyKey;
  if (
    attemptEntryIndex === undefined ||
    observationEntryIndex === undefined ||
    observationEntryIndex >= attemptEntryIndex ||
    attempt.causationId !== expectedCausationId
  ) {
    return invalid(code);
  }
  if (!cutoffTransition) {
    const directPublicObservations = journals
      .flatMap((candidate) =>
        candidate.runAttempt < journal.runAttempt
          ? candidate.observations
          : candidate.runAttempt === journal.runAttempt
            ? candidate.observations.filter(
                (candidateObservation) =>
                  Number(
                    candidate.observationEntryIndexes.get(
                      String(candidateObservation.observationId),
                    ),
                  ) < Number(attemptEntryIndex),
              )
            : [],
      )
      .filter((candidate) => candidate.observationClass === 'public-state');
    const hasLateTrustedPublicFact =
      observation.observationClass !== 'public-state' ||
      directPublicObservations.length < 1 ||
      directPublicObservations.some((publicObservation) => {
        const probes = Array.isArray(publicObservation.probes)
          ? publicObservation.probes
          : invalid(code);
        return (
          probes.length < 1 ||
          timestamp(publicObservation.observedAt, code) >
            verificationDeadline ||
          probes.some(
            (probeValue) =>
              timestamp(asObject(probeValue, code).observedAt, code) >
              verificationDeadline,
          )
        );
      });
    const directStateValid =
      controllerBefore.state === 'open' &&
      !Object.hasOwn(controllerBefore, 'closeReason') &&
      !Object.hasOwn(controllerBefore, 'cutoffEvidenceJournalEntryCount') &&
      !Object.hasOwn(transition, 'leases') &&
      ((expectedCloseReason === 'candidate-complete' &&
        controllerAfter.state === 'sealed' &&
        controllerAfter.closeReason === 'candidate-complete') ||
        (expectedCloseReason === 'integrity-mismatch' &&
          controllerAfter.state === 'integrity-closing' &&
          controllerAfter.closeReason === 'integrity-mismatch'));
    if (
      !directStateValid ||
      Object.hasOwn(controllerAfter, 'cutoffEvidenceJournalEntryCount') ||
      observationEntryIndex + 1 !== attemptEntryIndex ||
      completedAt > verificationDeadline ||
      hasLateTrustedPublicFact
    ) {
      return invalid(code);
    }
    return;
  }
  const cutoffEntryCount = Number(
    controllerBefore.cutoffEvidenceJournalEntryCount,
  );
  if (
    !Number.isInteger(cutoffEntryCount) ||
    cutoffEntryCount < 0 ||
    cutoffEntryCount > attemptEntryIndex
  ) {
    return invalid(code);
  }
  const deadlinePair = observation.observationClass === 'deadline-finalization';
  if (
    (deadlinePair &&
      (observationEntryIndex !== cutoffEntryCount ||
        attemptEntryIndex !== cutoffEntryCount + 1)) ||
    (!deadlinePair &&
      (observationEntryIndex >= cutoffEntryCount ||
        attemptEntryIndex !== cutoffEntryCount))
  ) {
    return invalid(code);
  }
  const precedingJournalEntries = journal.entries.slice(0, cutoffEntryCount);
  const prefix = validateJournalPrefix(
    precedingJournalEntries,
    String(journal.intent.operationId),
    journal.runAttempt,
  );
  if (
    controllerBefore.state !== 'cutoff-pending' ||
    Object.hasOwn(controllerBefore, 'closeReason') ||
    controllerAfter.state !== 'sealed' ||
    controllerAfter.closeReason !== expectedCloseReason ||
    controllerBefore.cutoffEvidenceJournalEntryCount !== prefix.entryCount ||
    controllerBefore.cutoffEvidenceJournalHeadDigest !== prefix.headDigest ||
    controllerAfter.cutoffEvidenceJournalEntryCount !== prefix.entryCount ||
    controllerAfter.cutoffEvidenceJournalHeadDigest !== prefix.headDigest
  ) {
    return invalid(code);
  }
  const verificationPlan = Array.isArray(journal.intentContext.verificationPlan)
    ? journal.intentContext.verificationPlan
    : invalid(code);
  const requiredStreams = deriveRequiredVerificationStreams(verificationPlan);
  validateTerminalVerificationLeases(
    transition.leases,
    requiredStreams,
    journal.intent,
  );
  const priorJournals = journals.filter(
    (candidate) => candidate.runAttempt < journal.runAttempt,
  );
  const priorObservations = priorJournals.flatMap(
    (candidate) => candidate.observations,
  );
  const currentObservations = journalObservations(precedingJournalEntries);
  const retainedObservations = [...priorObservations, ...currentObservations];
  const publicProbeAttemptContextsByObservationId = Object.fromEntries(
    retainedObservations
      .filter((candidate) => candidate.observationClass === 'public-state')
      .map((candidate) => {
        const observationId = String(candidate.observationId);
        const ownerJournal =
          priorJournals.find((prior) =>
            prior.observations.some(
              (priorObservation) =>
                priorObservation.observationId === candidate.observationId,
            ),
          ) ?? journal;
        const observationContext = asObject(
          ownerJournal.observationContextsById[observationId],
          code,
        );
        return [
          observationId,
          {
            intent: ownerJournal.intent,
            verificationPlan: ownerJournal.intentContext.verificationPlan,
            verificationPlanContext: deriveIntentVerificationPlanContext(
              ownerJournal.intent,
              ownerJournal.intentContext,
            ),
            activationBasis: observationContext.activationBasis,
            verificationDeadlineAt: observationContext.verificationDeadlineAt,
            publicProbeAttemptContexts:
              observationContext.publicProbeAttemptContexts,
          },
        ];
      }),
  );
  validateCutoffPublicAttempts(retainedObservations, journal.intent, {
    publicProbeAttemptContextsByObservationId,
  });
  const selection = deriveCutoffSelection(
    retainedObservations,
    verificationPlan,
    controllerAfter.verificationDeadlineAt,
  );
  const deadlineSource =
    observation.observationClass === 'deadline-finalization'
      ? asObject(
          journal.observationContextsById[String(observation.observationId)],
          code,
        ).finalizationSource
      : undefined;
  const deadlineFinalizationKind =
    deadlineSource === undefined
      ? undefined
      : asObject(deadlineSource, code).finalizationKind;
  const expectedKind =
    expectedCloseReason === 'candidate-complete'
      ? 'candidate-complete'
      : expectedCloseReason === 'integrity-mismatch'
        ? 'integrity-mismatch'
        : deadlineFinalizationKind === 'propagation-degraded'
          ? 'propagation-degraded'
          : deadlineFinalizationKind === 'verification-inconclusive'
            ? 'missing-inconclusive'
            : 'observed-inconclusive';
  if (
    selection.kind !== expectedKind ||
    (observation.observationClass !== 'deadline-finalization' &&
      (selection.selectedObservation === undefined ||
        canonicalizeJcs(selection.selectedObservation) !==
          canonicalizeJcs(observation)))
  ) {
    return invalid(code);
  }
  if (
    completedAt < verificationDeadline ||
    completedAt > finalizationDeadline
  ) {
    return invalid(code);
  }
}

/**
 * Validate the exact accepted extended workflow submission and its durable
 * submission-recorded fence, then bind it to expanded journal rows.
 *
 * @param {unknown} value retained submission record
 * @param {ReturnType<typeof selectReceiptJournalPrefix>} journal receipt prefix
 * @returns {{submission: Record<string, unknown>, requestReceivedAt: string, workflowStartedAt: string, workflowCompletedAt: string, destinationReceiptDigest?: string}} validated submission facts
 */
function validateReceiptSubmissionRecord(value, journal) {
  const record = asObject(value, 'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
  requireKeys(
    record,
    [
      'state',
      'intentDigest',
      'workloadBindingDigest',
      'requestReceivedAt',
      'submissionJournalEntryCount',
      'submissionJournalHeadDigest',
      'submission',
    ],
    [],
    'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
  );
  const submission = asObject(
    record.submission,
    'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
  );
  requireKeys(
    submission,
    [
      'operationId',
      'repositoryId',
      'sourceCommit',
      'runId',
      'runAttempt',
      'artifactManifestDigest',
      'artifactByteCount',
      'artifactFileCount',
      'provenanceDigest',
      'sbomDigest',
      'publisherPackage',
      'publisherVersion',
      'adapterId',
      'adapterVersion',
      'publicBaseUrl',
      'observedRoutes',
      'workflowStartedAt',
      'workflowCompletedAt',
      'kernelJournal',
    ],
    ['destinationGenerationId', 'destinationReceiptDigest'],
    'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
  );
  const intent = journal.intent;
  const workload = journal.workload;
  const publisher = asObject(
    intent.publisher,
    'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
  );
  const adapter = asObject(
    intent.adapter,
    'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
  );
  const destination = asObject(
    intent.destination,
    'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
  );
  if (
    record.state !== 'submission-recorded' ||
    record.intentDigest !== intent.intentDigest ||
    record.workloadBindingDigest !== workload.workloadBindingDigest ||
    submission.operationId !== intent.operationId ||
    submission.repositoryId !== workload.repositoryId ||
    submission.sourceCommit !==
      gitObjectPayload(
        intent.sourceCommit,
        'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
      ) ||
    submission.runId !== workload.runId ||
    submission.runAttempt !== workload.runAttempt ||
    submission.artifactManifestDigest !==
      sha256Payload(
        intent.manifestDigest,
        'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
      ) ||
    submission.artifactByteCount !== intent.artifactByteCount ||
    submission.artifactFileCount !== intent.artifactFileCount ||
    submission.provenanceDigest !==
      sha256Payload(
        intent.provenanceDigest,
        'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
      ) ||
    submission.sbomDigest !==
      sha256Payload(
        intent.sbomDigest,
        'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
      ) ||
    submission.publisherPackage !== publisher.package ||
    submission.publisherVersion !== publisher.version ||
    submission.adapterId !== adapter.adapterId ||
    submission.adapterVersion !== adapter.adapterVersion ||
    submission.publicBaseUrl !== destination.baseUrl
  ) {
    return invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
  }
  const submissionCount = record.submissionJournalEntryCount;
  if (
    typeof submissionCount !== 'number' ||
    !Number.isInteger(submissionCount) ||
    submissionCount < 1 ||
    submissionCount > journal.entries.length
  ) {
    return invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
  }
  const submissionPrefix = journal.entries.slice(0, submissionCount);
  const submissionHead = asObject(
    submissionPrefix.at(-1),
    'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
  );
  try {
    validateManagedEvidenceJournal({
      operationId: String(intent.operationId),
      runAttempt: Number(workload.runAttempt),
      entries: submissionPrefix,
      receiptEntryCount: submissionCount,
      receiptHeadDigest: String(record.submissionJournalHeadDigest),
    });
  } catch {
    return invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
  }
  if (submissionHead.headDigest !== record.submissionJournalHeadDigest) {
    return invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
  }
  const startedAt = timestamp(
    submission.workflowStartedAt,
    'DEPLOYMENT_RECEIPT_TIME_INVALID',
  );
  const completedAt = timestamp(
    submission.workflowCompletedAt,
    'DEPLOYMENT_RECEIPT_TIME_INVALID',
  );
  const requestReceivedAt = timestamp(
    record.requestReceivedAt,
    'DEPLOYMENT_RECEIPT_TIME_INVALID',
  );
  if (startedAt > completedAt || completedAt > requestReceivedAt) {
    return invalid('DEPLOYMENT_RECEIPT_TIME_INVALID');
  }
  const plan = Array.isArray(journal.intentContext.verificationPlan)
    ? journal.intentContext.verificationPlan
    : invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
  const orderedPlan = [...plan].sort((leftValue, rightValue) =>
    compareUtf8(canonicalizeJcs(leftValue), canonicalizeJcs(rightValue)),
  );
  const observedRoutes = Array.isArray(submission.observedRoutes)
    ? submission.observedRoutes
    : invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
  if (
    observedRoutes.length > 16 ||
    observedRoutes.length > orderedPlan.length
  ) {
    return invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
  }
  observedRoutes.forEach((routeValue, index) => {
    const route = asObject(routeValue, 'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
    requireKeys(
      route,
      ['route', 'expectedDigest'],
      ['observedStatus', 'observedDigest'],
      'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
    );
    const target = asObject(
      orderedPlan[index],
      'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
    );
    const expectedRoute = Object.hasOwn(target, 'publicRoute')
      ? target.publicRoute
      : target.route;
    const hasStatus = Object.hasOwn(route, 'observedStatus');
    const hasDigest = Object.hasOwn(route, 'observedDigest');
    if (
      route.route !== expectedRoute ||
      route.expectedDigest !==
        sha256Payload(
          target.expectedCandidateDigest,
          'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
        ) ||
      (hasStatus &&
        (!Number.isInteger(route.observedStatus) ||
          Number(route.observedStatus) < 100 ||
          Number(route.observedStatus) > 599)) ||
      (hasDigest && route.observedStatus !== 200) ||
      (hasDigest &&
        (typeof route.observedDigest !== 'string' ||
          !/^[0-9a-f]{64}$/u.test(route.observedDigest)))
    ) {
      invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
    }
  });
  const kernelJournal = asObject(
    submission.kernelJournal,
    'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
  );
  requireKeys(
    kernelJournal,
    ['attempts', 'observations'],
    [],
    'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
  );
  const kernelAttempts = Array.isArray(kernelJournal.attempts)
    ? kernelJournal.attempts
    : invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
  const kernelObservations = Array.isArray(kernelJournal.observations)
    ? kernelJournal.observations
    : invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
  if (
    kernelAttempts.length < 1 ||
    kernelAttempts.length > 100 ||
    kernelObservations.length < 1 ||
    kernelObservations.length > 100
  ) {
    return invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
  }
  const submittedStageIds = new Set();
  for (let index = 0; index < kernelAttempts.length; index += 1) {
    const kernelAttempt = asObject(
      kernelAttempts[index],
      'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
    );
    if (kernelAttempt.kernelSequence !== index + 1) {
      return invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
    }
    const stageAttemptId = String(kernelAttempt.stageAttemptId);
    const expanded = journal.attempts.find(
      (candidate) => candidate.stageAttemptId === stageAttemptId,
    );
    const entryIndex = journal.attemptEntryIndexes.get(stageAttemptId);
    if (
      !expanded ||
      entryIndex === undefined ||
      entryIndex >= submissionCount ||
      submittedStageIds.has(stageAttemptId) ||
      !['staging', 'activation', 'cleanup'].includes(String(expanded.stage)) ||
      ['running', 'not-started'].includes(String(expanded.outcome))
    ) {
      return invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
    }
    submittedStageIds.add(stageAttemptId);
    const projection = /** @type {Record<string, unknown>} */ ({
      ...expanded,
      kernelSequence: index + 1,
    });
    delete projection.attemptId;
    delete projection.sequence;
    requireEqual(
      kernelAttempt,
      projection,
      'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
    );
    for (const field of ['startedAt', 'completedAt']) {
      if (Object.hasOwn(expanded, field)) {
        const instant = timestamp(
          expanded[field],
          'DEPLOYMENT_RECEIPT_TIME_INVALID',
        );
        if (instant < startedAt || instant > completedAt) {
          return invalid('DEPLOYMENT_RECEIPT_TIME_INVALID');
        }
      }
    }
  }
  const submittedObservationIds = new Set();
  let submittedCandidateObserved = false;
  for (let index = 0; index < kernelObservations.length; index += 1) {
    const kernelObservation = asObject(
      kernelObservations[index],
      'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
    );
    if (kernelObservation.kernelSequence !== index + 1) {
      return invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
    }
    const observationId = String(kernelObservation.observationId);
    const expanded = journal.observations.find(
      (candidate) => candidate.observationId === observationId,
    );
    const entryIndex = journal.observationEntryIndexes.get(observationId);
    if (
      !expanded ||
      entryIndex === undefined ||
      entryIndex >= submissionCount ||
      submittedObservationIds.has(observationId) ||
      !submittedStageIds.has(String(expanded.stageAttemptId)) ||
      ![
        'request-not-started',
        'request-accepted',
        'provider-state',
        'timeout',
        'provider-error',
      ].includes(String(expanded.observationClass)) ||
      !Array.isArray(expanded.probes) ||
      expanded.probes.length !== 0 ||
      expanded.receivedAt !== record.requestReceivedAt
    ) {
      return invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
    }
    submittedObservationIds.add(observationId);
    const projection = /** @type {Record<string, unknown>} */ ({
      ...expanded,
      kernelSequence: index + 1,
    });
    for (const field of [
      'operationId',
      'attemptId',
      'sequence',
      'intentDigest',
      'artifactId',
      'artifactDigest',
      'adapter',
      'destination',
      'receivedAt',
      'probes',
    ]) {
      delete projection[field];
    }
    requireEqual(
      kernelObservation,
      projection,
      'DEPLOYMENT_RECEIPT_SUBMISSION_INVALID',
    );
    const observedAt = timestamp(
      expanded.observedAt,
      'DEPLOYMENT_RECEIPT_TIME_INVALID',
    );
    if (observedAt < startedAt || observedAt > completedAt) {
      return invalid('DEPLOYMENT_RECEIPT_TIME_INVALID');
    }
    if (
      expanded.destinationChanged === 'yes' &&
      expanded.generationId === intent.proposedGenerationId
    ) {
      submittedCandidateObserved = true;
    }
  }
  if (
    [...submittedStageIds].some(
      (stageAttemptId) =>
        !journal.observations.some(
          (observation) =>
            submittedObservationIds.has(String(observation.observationId)) &&
            observation.stageAttemptId === stageAttemptId,
        ),
    )
  ) {
    return invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
  }
  const hasGeneration = Object.hasOwn(submission, 'destinationGenerationId');
  const hasReceipt = Object.hasOwn(submission, 'destinationReceiptDigest');
  if (
    hasGeneration !== submittedCandidateObserved ||
    (hasGeneration &&
      submission.destinationGenerationId !== intent.proposedGenerationId) ||
    (hasReceipt &&
      (!hasGeneration ||
        typeof submission.destinationReceiptDigest !== 'string' ||
        !/^[0-9a-f]{64}$/u.test(submission.destinationReceiptDigest)))
  ) {
    return invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
  }
  return {
    submission,
    requestReceivedAt: String(record.requestReceivedAt),
    workflowStartedAt: String(submission.workflowStartedAt),
    workflowCompletedAt: String(submission.workflowCompletedAt),
    ...(hasReceipt
      ? {
          destinationReceiptDigest: `sha256:${String(submission.destinationReceiptDigest)}`,
        }
      : {}),
  };
}

/**
 * Bind an optional provider receipt to its exact retained Pages preimage and
 * the corresponding authenticated provider observation.
 *
 * @param {Record<string, unknown>} receipt candidate receipt
 * @param {ReturnType<typeof validateReceiptSubmissionRecord>} submission validated submission
 * @param {ReturnType<typeof selectReceiptJournalPrefix>} journal receipt prefix
 * @returns {void}
 */
function validateDestinationReceipt(receipt, submission, journal) {
  const hasReceipt = Object.hasOwn(receipt, 'destinationReceiptDigest');
  if (hasReceipt !== (submission.destinationReceiptDigest !== undefined)) {
    return invalid('DEPLOYMENT_RECEIPT_PROVIDER_RECEIPT_INVALID');
  }
  if (!hasReceipt) return;
  if (
    receipt.destinationReceiptDigest !== submission.destinationReceiptDigest ||
    asObject(receipt.adapter, 'DEPLOYMENT_RECEIPT_PROVIDER_RECEIPT_INVALID')
      .adapterId !== 'github-pages'
  ) {
    return invalid('DEPLOYMENT_RECEIPT_PROVIDER_RECEIPT_INVALID');
  }
  const matching = journal.observations.filter(
    (observation) =>
      observation.providerObjectIdDigest === receipt.destinationReceiptDigest &&
      observation.generationId === journal.intent.proposedGenerationId &&
      observation.destinationChanged === 'yes',
  );
  if (matching.length !== 1) {
    return invalid('DEPLOYMENT_RECEIPT_PROVIDER_RECEIPT_INVALID');
  }
  const observation = matching[0];
  if (!observation) {
    return invalid('DEPLOYMENT_RECEIPT_PROVIDER_RECEIPT_INVALID');
  }
  const observationContext = asObject(
    journal.observationContextsById[String(observation.observationId)],
    'DEPLOYMENT_RECEIPT_PROVIDER_RECEIPT_INVALID',
  );
  const evidence = asObject(
    observationContext.adapterObservationEvidence,
    'DEPLOYMENT_RECEIPT_PROVIDER_RECEIPT_INVALID',
  );
  try {
    validatePagesObservationEvidence(evidence, observation, journal.intent, {
      capabilityDecision: journal.intentContext.capabilityDecision,
      destinationProviderBinding:
        journal.intentContext.destinationProviderBinding,
      pagesOidcOriginCatalog: journal.intentContext.pagesOidcOriginCatalog,
    });
  } catch {
    return invalid('DEPLOYMENT_RECEIPT_PROVIDER_RECEIPT_INVALID');
  }
  if (
    digest(
      'pagesDeployment',
      evidence,
      'DEPLOYMENT_RECEIPT_PROVIDER_RECEIPT_INVALID',
    ) !== receipt.destinationReceiptDigest
  ) {
    return invalid('DEPLOYMENT_RECEIPT_PROVIDER_RECEIPT_INVALID');
  }
}

/**
 * Validate the durable rollback command, historical managed receipt, lineage,
 * and exact archive-or-rebuild recovery proof.
 *
 * @param {Record<string, unknown>} receipt current receipt
 * @param {ReturnType<typeof selectReceiptJournalPrefix>} journal current receipt journal
 * @param {Record<string, unknown>} operation current durable operation
 * @param {unknown} value retained rollback certification owners
 * @returns {Record<string, unknown>} exact receipt rollback-field owner
 */
function validateRollbackCertification(receipt, journal, operation, value) {
  const certification = asObject(value, 'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID');
  requireKeys(
    certification,
    [
      'rollbackCommand',
      'historicalReceipt',
      'historicalReceiptContext',
      'artifactRecovery',
    ],
    [],
    'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
  );
  const command = asObject(
    certification.rollbackCommand,
    'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
  );
  requireKeys(
    command,
    [
      'operationId',
      'rollbackOfOperationId',
      'rollbackOfGenerationId',
      'rollbackOfReceiptDigest',
      'actorId',
      'reason',
    ],
    [],
    'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
  );
  const historicalReceipt = asObject(
    certification.historicalReceipt,
    'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
  );
  const historicalContext = asObject(
    certification.historicalReceiptContext,
    'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
  );
  try {
    validateDeploymentReceiptSemantics(
      historicalReceipt,
      /** @type {Parameters<typeof validateDeploymentReceiptSemantics>[1]} */ (
        historicalContext
      ),
    );
  } catch {
    return invalid('DEPLOYMENT_RECEIPT_ROLLBACK_INVALID');
  }
  if (
    !['succeeded', 'succeeded-with-warnings', 'rolled-back'].includes(
      String(historicalReceipt.outcome),
    ) ||
    historicalReceipt.receiptDigest !==
      computeDeploymentReceiptDigest(historicalReceipt) ||
    operation.kind !== 'rollback' ||
    command.operationId !== receipt.operationId ||
    command.rollbackOfOperationId !== historicalReceipt.operationId ||
    command.rollbackOfGenerationId !==
      historicalReceipt.destinationGenerationId ||
    command.rollbackOfReceiptDigest !== historicalReceipt.receiptDigest ||
    receipt.rollbackOfOperationId !== command.rollbackOfOperationId ||
    receipt.rollbackOfGenerationId !== command.rollbackOfGenerationId ||
    receipt.rollbackOfReceiptDigest !== command.rollbackOfReceiptDigest ||
    receipt.rollbackActorId !== command.actorId ||
    receipt.rollbackReason !== command.reason
  ) {
    return invalid('DEPLOYMENT_RECEIPT_ROLLBACK_INVALID');
  }
  const historicalOperation = asObject(
    historicalContext.operation,
    'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
  );
  const historicalJournals = validateOperationJournals(
    historicalContext.operationJournals,
    historicalOperation,
  );
  const historicalJournal = historicalJournals.find(
    (candidate) => candidate.runAttempt === historicalReceipt.runAttempt,
  );
  if (!historicalJournal) {
    return invalid('DEPLOYMENT_RECEIPT_ROLLBACK_INVALID');
  }
  const historicalIntent = historicalJournal.intent;
  const currentIntent = journal.intent;
  if (
    historicalOperation.organizationId !== operation.organizationId ||
    historicalOperation.publicationId !== operation.publicationId ||
    historicalReceipt.organizationId !== operation.organizationId
  ) {
    return invalid('DEPLOYMENT_RECEIPT_ROLLBACK_INVALID');
  }
  for (const field of [
    'sourceCommit',
    'artifactDigest',
    'manifestDigest',
    'lockDigest',
    'publisher',
    'adapter',
    'destination',
  ]) {
    requireOwnerField(
      currentIntent,
      historicalIntent,
      field,
      field,
      'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
    );
  }
  if (
    currentIntent.operationId === historicalIntent.operationId ||
    currentIntent.attemptId === historicalIntent.attemptId ||
    currentIntent.proposedGenerationId ===
      historicalIntent.proposedGenerationId ||
    receipt.receiptId === historicalReceipt.receiptId
  ) {
    return invalid('DEPLOYMENT_RECEIPT_ROLLBACK_INVALID');
  }
  const recovery = asObject(
    certification.artifactRecovery,
    'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
  );
  const recoveryCommon = [
    'kind',
    'artifactDigest',
    'manifestDigest',
    'stagedEnvelopeDigest',
    'marker',
  ];
  const recoveryOptional =
    recovery.kind === 'archive'
      ? ['archiveDigest', 'verifiedAt', 'archiveExpiresAt']
      : recovery.kind === 'rebuild'
        ? ['rebuildRecord']
        : invalid('DEPLOYMENT_RECEIPT_ROLLBACK_INVALID');
  requireKeys(
    recovery,
    [...recoveryCommon, ...recoveryOptional],
    [],
    'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
  );
  if (
    recovery.artifactDigest !== historicalIntent.artifactDigest ||
    recovery.manifestDigest !== historicalIntent.manifestDigest ||
    recovery.stagedEnvelopeDigest !== currentIntent.frozenEnvelopeDigest
  ) {
    return invalid('DEPLOYMENT_RECEIPT_ROLLBACK_INVALID');
  }
  requireEqual(
    recovery.marker,
    currentIntent.marker,
    'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
  );
  if (recovery.kind === 'archive') {
    if (
      recovery.archiveDigest !== historicalIntent.frozenEnvelopeDigest ||
      timestamp(recovery.verifiedAt, 'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID') >
        timestamp(
          recovery.archiveExpiresAt,
          'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
        ) ||
      timestamp(
        currentIntent.authorizedAt,
        'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
      ) >=
        timestamp(
          recovery.archiveExpiresAt,
          'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
        )
    ) {
      return invalid('DEPLOYMENT_RECEIPT_ROLLBACK_INVALID');
    }
  } else {
    requireEqual(
      recovery.rebuildRecord,
      currentIntent.rebuildRecord,
      'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
    );
    requireEqual(
      recovery.rebuildRecord,
      historicalIntent.rebuildRecord,
      'DEPLOYMENT_RECEIPT_ROLLBACK_INVALID',
    );
  }
  return {
    rollbackOfOperationId: command.rollbackOfOperationId,
    rollbackOfGenerationId: command.rollbackOfGenerationId,
    rollbackOfReceiptDigest: command.rollbackOfReceiptDigest,
    rollbackActorId: command.actorId,
    rollbackReason: command.reason,
  };
}

/**
 * Validate a managed deployment receipt with its authenticated journal prefix.
 *
 * Structural JSON Schema validation must run before this aggregate validator.
 *
 * @param {unknown} value deployment receipt
 * @param {{
 *   operation: unknown,
 *   operationJournals: unknown,
 *   submissionRecord: unknown,
 *   priorReceipts: unknown,
 *   rollbackCertification?: unknown
 * }} context authenticated retained state
 * @returns {Record<string, unknown>} validated receipt
 */
export function validateDeploymentReceiptSemantics(value, context) {
  const receipt = asObject(value, 'DEPLOYMENT_RECEIPT_INVALID');
  if (
    receipt.schemaId !== 'urn:gala:schema:deployment-receipt:2.0.0' ||
    receipt.schemaVersion !== '2.0.0'
  ) {
    return invalid('DEPLOYMENT_RECEIPT_INVALID');
  }
  stableId(receipt.receiptId, 'DEPLOYMENT_RECEIPT_INVALID');
  const operation = asObject(
    context.operation,
    'DEPLOYMENT_RECEIPT_OWNER_MISMATCH',
  );
  if (
    receipt.operationId !== operation.operationId ||
    receipt.organizationId !== operation.organizationId
  ) {
    return invalid('DEPLOYMENT_RECEIPT_OWNER_MISMATCH');
  }
  const journals = validateOperationJournals(
    context.operationJournals,
    operation,
  );
  const fullJournal = journals.find(
    (candidate) => candidate.runAttempt === receipt.runAttempt,
  );
  if (!fullJournal) return invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
  const journal = selectReceiptJournalPrefix(fullJournal, receipt);
  const intent = journal.intent;
  const workload = journal.workload;
  for (const [receiptField, intentField] of Object.entries(
    RECEIPT_INTENT_FIELD_MAP,
  )) {
    requireOwnerField(
      receipt,
      intent,
      receiptField,
      intentField,
      'DEPLOYMENT_RECEIPT_INTENT_MISMATCH',
    );
  }
  const workloadMap = {
    repositoryId: 'repositoryId',
    repositoryOwnerId: 'repositoryOwnerId',
    sourceCommit: 'sourceCommit',
    workflowSha: 'workflowTriggerCommit',
    runId: 'runId',
    runAttempt: 'runAttempt',
  };
  for (const [receiptField, workloadField] of Object.entries(workloadMap)) {
    requireOwnerField(
      receipt,
      workload,
      receiptField,
      workloadField,
      'DEPLOYMENT_RECEIPT_WORKLOAD_MISMATCH',
    );
  }
  if (
    typeof workload.repository !== 'string' ||
    workload.ref !== `refs/heads/gala/publish/${String(intent.operationId)}` ||
    receipt.workflowRef !==
      `${workload.repository}/.github/workflows/gala-publish-v2.yml@${String(workload.ref)}`
  ) {
    return invalid('DEPLOYMENT_RECEIPT_WORKLOAD_MISMATCH');
  }
  validateReceiptAncestry(receipt, context.priorReceipts);
  journal.attempts.forEach((attempt, index) => {
    validateReceiptAttempt(attempt, intent, index + 1);
    const stageObservations = journal.observations.filter(
      (observation) => observation.stageAttemptId === attempt.stageAttemptId,
    );
    if (stageObservations.length < 1) {
      invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
    }
    try {
      validateDeploymentStageRecords({
        deploymentIntent: intent,
        deploymentAttempt: attempt,
        deploymentStageEvidence:
          journal.stageEvidenceById[String(attempt.stageAttemptId)],
        retainedObservations: stageObservations,
      });
    } catch {
      invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
    }
  });
  journal.observations.forEach((observation, index) => {
    if (
      observation.sequence !== index + 1 ||
      observation.intentDigest !== intent.intentDigest ||
      !journal.attempts.some(
        (attempt) => attempt.stageAttemptId === observation.stageAttemptId,
      )
    ) {
      invalid('DEPLOYMENT_RECEIPT_JOURNAL_INVALID');
    }
  });
  const submission = validateReceiptSubmissionRecord(
    context.submissionRecord,
    journal,
  );
  const submissionEvidenceDigest = computeManagedReceiptSubmissionDigest(
    submission.submission,
  );
  if (receipt.submissionEvidenceDigest !== submissionEvidenceDigest) {
    return invalid('DEPLOYMENT_RECEIPT_SUBMISSION_INVALID');
  }
  const witness = deriveReceiptWitness(journal);
  const outcomeAttempt = witness.attempt;
  const outcomeObservation = witness.observation;
  const auxiliaryIds = new Set(
    witness.auxiliaryAttempts.map((attempt) => String(attempt.stageAttemptId)),
  );
  const selectedAttempts = [outcomeAttempt, ...witness.auxiliaryAttempts].sort(
    (left, right) => Number(left.sequence) - Number(right.sequence),
  );
  if (
    selectedAttempts.length !== auxiliaryIds.size + 1 ||
    !Array.isArray(receipt.attempts) ||
    receipt.attempts.length !== selectedAttempts.length
  ) {
    return invalid('DEPLOYMENT_RECEIPT_WITNESS_INVALID');
  }
  requireEqual(
    receipt.attempts,
    selectedAttempts,
    'DEPLOYMENT_RECEIPT_WITNESS_INVALID',
  );
  if (
    !Array.isArray(receipt.observations) ||
    receipt.observations.length !== 1 ||
    canonicalizeJcs(receipt.observations[0]) !==
      canonicalizeJcs(outcomeObservation)
  ) {
    return invalid('DEPLOYMENT_RECEIPT_WITNESS_INVALID');
  }
  const warnings = Array.isArray(receipt.warnings)
    ? receipt.warnings
    : invalid('DEPLOYMENT_RECEIPT_WARNING_INVALID');
  const warningCodes = validateWarnings(warnings);
  const cleanupFailure = selectedAttempts.some(
    (attempt) =>
      auxiliaryIds.has(String(attempt.stageAttemptId)) &&
      attempt.stage === 'cleanup' &&
      (attempt.outcome === 'failed' || attempt.outcome === 'unknown'),
  );
  if (cleanupFailure !== warningCodes.has('CLEANUP_FAILED')) {
    return invalid('DEPLOYMENT_RECEIPT_WARNING_INVALID');
  }
  const failureRow = findFailureRow(outcomeAttempt, outcomeObservation);
  if (
    Object.hasOwn(receipt, 'failure') !==
    (receipt.outcome === 'failed-no-destination-change' ||
      receipt.outcome === 'unknown-reconciling')
  ) {
    return invalid('DEPLOYMENT_RECEIPT_FAILURE_INVALID');
  }
  if (Object.hasOwn(receipt, 'failure')) {
    if (!failureRow) return invalid('DEPLOYMENT_RECEIPT_FAILURE_INVALID');
    const failure = asObject(
      receipt.failure,
      'DEPLOYMENT_RECEIPT_FAILURE_INVALID',
    );
    const [stage, code, , , changes, retryable, recovery] = failureRow;
    if (
      failure.stage !== stage ||
      failure.code !== code ||
      failure.retryable !== retryable ||
      !changes.includes(String(failure.destinationChanged)) ||
      failure.destinationChanged !== outcomeObservation.destinationChanged ||
      failure.recovery !== recovery ||
      (stage === 'cleanup' && failure.destinationChanged === 'yes')
    ) {
      return invalid('DEPLOYMENT_RECEIPT_FAILURE_INVALID');
    }
  }
  const verificationPlan = Array.isArray(journal.intentContext.verificationPlan)
    ? journal.intentContext.verificationPlan
    : invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
  if (
    computeVerificationPlanDigest(verificationPlan) !==
    intent.verificationPlanDigest
  ) {
    return invalid('DEPLOYMENT_RECEIPT_COVERAGE_INVALID');
  }
  const outcomeContext = asObject(
    journal.observationContextsById[String(outcomeObservation.observationId)],
    'DEPLOYMENT_RECEIPT_WITNESS_INVALID',
  );
  const deadlineFinalizationEvidence =
    outcomeObservation.observationClass === 'deadline-finalization'
      ? outcomeContext.finalizationSource
      : undefined;
  const receiptOperationObservations = [
    ...journals
      .filter((candidate) => candidate.runAttempt < journal.runAttempt)
      .flatMap((candidate) => candidate.observations),
    ...journal.observations,
  ];
  const verificationCoverage = deriveVerificationCoverage(
    receiptOperationObservations,
    verificationPlan,
    outcomeObservation,
    deadlineFinalizationEvidence,
  );
  const finalizationSource =
    outcomeContext.finalizationSource === undefined
      ? undefined
      : asObject(
          outcomeContext.finalizationSource,
          'DEPLOYMENT_RECEIPT_WITNESS_INVALID',
        );
  const finalizationKind =
    outcomeObservation.observationClass === 'supersession-finalization'
      ? 'supersession'
      : finalizationSource?.profile ===
          'gala-cancellation-finalization-evidence-v2'
        ? 'cancellation'
        : undefined;
  const verificationDeadlineAt =
    outcomeObservation.observationClass === 'deadline-finalization'
      ? finalizationSource?.verificationDeadlineAt
      : undefined;
  let rollbackCertification;
  if (receipt.outcome === 'rolled-back') {
    rollbackCertification = validateRollbackCertification(
      receipt,
      journal,
      operation,
      context.rollbackCertification,
    );
  } else if (context.rollbackCertification !== undefined) {
    return invalid('DEPLOYMENT_RECEIPT_ROLLBACK_INVALID');
  }
  validateReceiptOutcome(
    receipt,
    intent,
    outcomeAttempt,
    outcomeObservation,
    warningCodes,
    {
      verificationCoverage,
      verificationDeadlineAt,
      finalizationKind,
      finalizationSource,
      rollbackCertification,
    },
  );
  validateDestinationReceipt(receipt, submission, journal);
  const receiptStarted = timestamp(
    receipt.startedAt,
    'DEPLOYMENT_RECEIPT_TIME_INVALID',
  );
  const workflowStarted = timestamp(
    submission.workflowStartedAt,
    'DEPLOYMENT_RECEIPT_TIME_INVALID',
  );
  const workflowCompleted = timestamp(
    submission.workflowCompletedAt,
    'DEPLOYMENT_RECEIPT_TIME_INVALID',
  );
  const receiptCompleted = timestamp(
    receipt.completedAt,
    'DEPLOYMENT_RECEIPT_TIME_INVALID',
  );
  const requestReceived = timestamp(
    submission.requestReceivedAt,
    'DEPLOYMENT_RECEIPT_TIME_INVALID',
  );
  if (
    receipt.startedAt !== submission.workflowStartedAt ||
    receiptStarted !== workflowStarted ||
    workflowCompleted < workflowStarted ||
    requestReceived < workflowCompleted ||
    requestReceived > receiptCompleted ||
    receiptCompleted < receiptStarted ||
    workflowCompleted > receiptCompleted
  ) {
    return invalid('DEPLOYMENT_RECEIPT_TIME_INVALID');
  }
  for (const attempt of journal.attempts) {
    for (const field of ['startedAt', 'completedAt']) {
      if (Object.hasOwn(attempt, field)) {
        const instant = timestamp(
          attempt[field],
          'DEPLOYMENT_RECEIPT_TIME_INVALID',
        );
        if (instant < receiptStarted || instant > receiptCompleted) {
          return invalid('DEPLOYMENT_RECEIPT_TIME_INVALID');
        }
      }
    }
  }
  for (const observation of journal.observations) {
    const observationStarted = timestamp(
      observation.observedAt,
      'DEPLOYMENT_RECEIPT_TIME_INVALID',
    );
    const observationReceived = timestamp(
      observation.receivedAt,
      'DEPLOYMENT_RECEIPT_TIME_INVALID',
    );
    if (
      observationStarted < receiptStarted ||
      observationReceived < observationStarted ||
      observationReceived > receiptCompleted
    ) {
      return invalid('DEPLOYMENT_RECEIPT_TIME_INVALID');
    }
    const probes = Array.isArray(observation.probes) ? observation.probes : [];
    for (const probeValue of probes) {
      const probe = asObject(probeValue, 'DEPLOYMENT_RECEIPT_TIME_INVALID');
      const requestStarted = timestamp(
        probe.requestStartedAt,
        'DEPLOYMENT_RECEIPT_TIME_INVALID',
      );
      const probeObserved = timestamp(
        probe.observedAt,
        'DEPLOYMENT_RECEIPT_TIME_INVALID',
      );
      if (
        requestStarted < receiptStarted ||
        probeObserved < requestStarted ||
        probeObserved > observationStarted
      ) {
        return invalid('DEPLOYMENT_RECEIPT_TIME_INVALID');
      }
    }
  }
  if (receipt.receiptDigest !== computeDeploymentReceiptDigest(receipt)) {
    return invalid('DEPLOYMENT_RECEIPT_DIGEST_MISMATCH');
  }
  return receipt;
}
