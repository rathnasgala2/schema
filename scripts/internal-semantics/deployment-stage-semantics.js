import {
  canonicalizeJcs,
  canonicalizeJcsBytes,
} from '../../src/internal/canonical-jcs.js';
import { ACTIVE_DIGEST_PROFILES } from '../../src/internal/digest-profiles.js';
import { validateRfc3339 } from '../../src/internal/portable-scalars.js';
import { SemanticValidationError } from '../../src/internal/semver.js';

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const STABLE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const NONNEGATIVE_INT64_PATTERN = /^(?:0|[1-9][0-9]*)$/u;
const INT64_MAXIMUM = 9_223_372_036_854_775_807n;

const PROBE_PROFILE = 'gala-local-filesystem-probe-transcript-v2';
const PROBE_PAYLOAD_PROFILE = 'gala-local-filesystem-probe-payload-v2';

const STAGES = [
  'staging',
  'activation',
  'public-verification',
  'managed-reconciliation',
  'cleanup',
];
const DESTINATION_CHANGES = ['yes', 'no', 'unknown'];
const TERMINAL_OUTCOMES = ['succeeded', 'failed', 'skipped', 'unknown'];
const ALL_OUTCOMES = ['not-started', 'running', ...TERMINAL_OUTCOMES];
const PROBE_PAYLOAD_SOURCES = ['control', 'race-a', 'race-b'];

const TRANSCRIPT_KEYS = [
  'profile',
  'initialTarget',
  'replacements',
  'controlPublication',
  'racePublication',
];
const REPLACEMENT_KEYS = [
  'operationNumber',
  'preparedTarget',
  'renameResult',
  'readerResult',
];
const CONTROL_PUBLICATION_KEYS = [
  'publisherSource',
  'publicationResult',
  'conflictingSource',
  'conflictingResult',
  'publishedInodeSource',
  'publishedByteSource',
];
const RACE_PUBLICATION_KEYS = [
  'contenders',
  'winner',
  'publishedInodeSource',
  'publishedByteSource',
];
const RACE_CONTENDER_KEYS = ['source', 'linkResult'];

const LOCAL_OBSERVATION_REQUIRED_KEYS = [
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
];
const LOCAL_OBSERVATION_OPTIONAL_KEYS = [
  'expectedGenerationId',
  'observedGenerationId',
  'observedArtifactDigest',
  'observedMarkerDigest',
  'observedFileCount',
  'observedByteCount',
];
const LOCAL_OBSERVATION_STATE_KEYS = [
  'observedGenerationId',
  'observedArtifactDigest',
  'observedMarkerDigest',
  'observedFileCount',
  'observedByteCount',
];

const STAGE_INPUT_KEYS = [
  'profile',
  'intentDigest',
  'destinationMutationAuthority',
  'stageAttemptId',
  'causationId',
  'stage',
];
const STAGE_RESULT_REQUIRED_KEYS = [
  'profile',
  'stageInput',
  'inputDigest',
  'outcome',
  'destinationChanged',
  'retryable',
  'finalizationObservation',
];
const STAGE_RESULT_OPTIONAL_KEYS = ['failureCode', 'startedAt', 'completedAt'];
const STAGE_EVIDENCE_REQUIRED_KEYS = [
  'profile',
  'stageInput',
  'inputDigest',
  'outcome',
  'destinationChanged',
  'retryable',
  'observationEvidence',
  'evidenceDigest',
];
const STAGE_EVIDENCE_OPTIONAL_KEYS = [
  'failureCode',
  'startedAt',
  'completedAt',
  'stageResult',
  'resultDigest',
];
const OBSERVATION_REFERENCE_KEYS = ['observationId', 'evidenceDigest'];
const ATTEMPT_REQUIRED_KEYS = [
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
const ATTEMPT_OPTIONAL_KEYS = [
  'resultDigest',
  'failureCode',
  'startedAt',
  'completedAt',
];
const COPIED_RESULT_FIELDS = [
  'outcome',
  'destinationChanged',
  'failureCode',
  'retryable',
  'startedAt',
  'completedAt',
];

/**
 * @typedef {{ stage: string, code: string, outcome: string, destinationChanges: readonly string[], retryable: boolean }} FailureCatalogRow
 */

/** @type {readonly FailureCatalogRow[]} */
const FAILURE_CATALOG = [
  {
    stage: 'staging',
    code: 'TARGET_CAPABILITY_UNAVAILABLE',
    outcome: 'failed',
    destinationChanges: ['no'],
    retryable: false,
  },
  {
    stage: 'staging',
    code: 'ATOMIC_ACTIVATION_UNSUPPORTED',
    outcome: 'failed',
    destinationChanges: ['no'],
    retryable: false,
  },
  {
    stage: 'staging',
    code: 'REJECTED',
    outcome: 'failed',
    destinationChanges: ['no'],
    retryable: false,
  },
  {
    stage: 'staging',
    code: 'NOT_ATTEMPTED_RETRYABLE',
    outcome: 'failed',
    destinationChanges: ['no'],
    retryable: true,
  },
  {
    stage: 'staging',
    code: 'AUTHORIZATION_LOST',
    outcome: 'failed',
    destinationChanges: ['no'],
    retryable: false,
  },
  {
    stage: 'staging',
    code: 'RATE_LIMITED',
    outcome: 'failed',
    destinationChanges: ['no'],
    retryable: true,
  },
  {
    stage: 'staging',
    code: 'PROVIDER_CONTRACT_VIOLATION',
    outcome: 'failed',
    destinationChanges: ['no'],
    retryable: false,
  },
  {
    stage: 'staging',
    code: 'OUTCOME_UNKNOWN_RECONCILING',
    outcome: 'unknown',
    destinationChanges: ['unknown', 'yes'],
    retryable: false,
  },
  {
    stage: 'activation',
    code: 'REJECTED',
    outcome: 'failed',
    destinationChanges: ['no'],
    retryable: false,
  },
  {
    stage: 'activation',
    code: 'NOT_ATTEMPTED_RETRYABLE',
    outcome: 'failed',
    destinationChanges: ['no'],
    retryable: true,
  },
  {
    stage: 'activation',
    code: 'AUTHORIZATION_LOST',
    outcome: 'failed',
    destinationChanges: ['no'],
    retryable: false,
  },
  {
    stage: 'activation',
    code: 'RATE_LIMITED',
    outcome: 'failed',
    destinationChanges: ['no'],
    retryable: true,
  },
  {
    stage: 'activation',
    code: 'PROVIDER_CONTRACT_VIOLATION',
    outcome: 'failed',
    destinationChanges: ['no'],
    retryable: false,
  },
  {
    stage: 'activation',
    code: 'OUTCOME_UNKNOWN_RECONCILING',
    outcome: 'unknown',
    destinationChanges: ['unknown', 'yes'],
    retryable: false,
  },
  {
    stage: 'public-verification',
    code: 'PUBLIC_VERIFICATION_INCONCLUSIVE',
    outcome: 'unknown',
    destinationChanges: ['unknown', 'yes'],
    retryable: false,
  },
  {
    stage: 'public-verification',
    code: 'PUBLIC_INTEGRITY_MISMATCH',
    outcome: 'failed',
    destinationChanges: ['unknown', 'yes'],
    retryable: false,
  },
  {
    stage: 'managed-reconciliation',
    code: 'REJECTED',
    outcome: 'failed',
    destinationChanges: ['no'],
    retryable: false,
  },
  {
    stage: 'managed-reconciliation',
    code: 'NOT_ATTEMPTED_RETRYABLE',
    outcome: 'unknown',
    destinationChanges: ['unknown', 'yes'],
    retryable: true,
  },
  {
    stage: 'managed-reconciliation',
    code: 'AUTHORIZATION_LOST',
    outcome: 'unknown',
    destinationChanges: ['unknown', 'yes'],
    retryable: false,
  },
  {
    stage: 'managed-reconciliation',
    code: 'RATE_LIMITED',
    outcome: 'unknown',
    destinationChanges: ['unknown', 'yes'],
    retryable: true,
  },
  {
    stage: 'managed-reconciliation',
    code: 'OUTCOME_UNKNOWN_RECONCILING',
    outcome: 'unknown',
    destinationChanges: ['unknown', 'yes'],
    retryable: false,
  },
  {
    stage: 'managed-reconciliation',
    code: 'PROVIDER_CONTRACT_VIOLATION',
    outcome: 'failed',
    destinationChanges: ['unknown', 'yes'],
    retryable: false,
  },
  {
    stage: 'cleanup',
    code: 'REJECTED',
    outcome: 'failed',
    destinationChanges: ['no', 'yes'],
    retryable: false,
  },
  {
    stage: 'cleanup',
    code: 'NOT_ATTEMPTED_RETRYABLE',
    outcome: 'failed',
    destinationChanges: ['no', 'yes'],
    retryable: true,
  },
  {
    stage: 'cleanup',
    code: 'AUTHORIZATION_LOST',
    outcome: 'failed',
    destinationChanges: ['no', 'yes'],
    retryable: false,
  },
  {
    stage: 'cleanup',
    code: 'RATE_LIMITED',
    outcome: 'failed',
    destinationChanges: ['no', 'yes'],
    retryable: true,
  },
  {
    stage: 'cleanup',
    code: 'OUTCOME_UNKNOWN_RECONCILING',
    outcome: 'unknown',
    destinationChanges: ['unknown', 'yes'],
    retryable: false,
  },
  {
    stage: 'cleanup',
    code: 'PROVIDER_CONTRACT_VIOLATION',
    outcome: 'failed',
    destinationChanges: ['no', 'yes'],
    retryable: false,
  },
];

/**
 * Throw an internal assertion failure.
 *
 * @returns {never} never returns
 */
function fail() {
  throw new TypeError('DEPLOYMENT_STAGE_ASSERTION_FAILED');
}

/**
 * Throw a stable public semantic diagnostic.
 *
 * @param {string} code diagnostic code
 * @returns {never} never returns
 */
function invalid(code) {
  throw new SemanticValidationError(code);
}

/**
 * Return a candidate as a plain JSON object.
 *
 * @param {unknown} value candidate value
 * @returns {Record<string, unknown>} plain object
 */
function asObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail();
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail();
  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * Require an exact closed-object member ledger.
 *
 * @param {unknown} value candidate object
 * @param {readonly string[]} required required members
 * @param {readonly string[]} [optional] optional members
 * @returns {Record<string, unknown>} validated object
 */
function assertLedger(value, required, optional = []) {
  const object = asObject(value);
  const allowed = new Set([...required, ...optional]);
  const actual = Object.keys(object);
  if (
    required.some((key) => !Object.hasOwn(object, key)) ||
    actual.some((key) => !allowed.has(key))
  ) {
    fail();
  }
  return object;
}

/**
 * Require one exact literal value.
 *
 * @param {unknown} value candidate value
 * @param {unknown} expected required value
 * @returns {void}
 */
function assertEqual(value, expected) {
  if (value !== expected) fail();
}

/**
 * Require one string from a closed catalog.
 *
 * @param {unknown} value candidate value
 * @param {readonly string[]} catalog exact catalog
 * @returns {string} validated value
 */
function assertCatalog(value, catalog) {
  if (typeof value !== 'string' || !catalog.includes(value)) fail();
  return value;
}

/**
 * Require one portable tagged SHA-256 digest.
 *
 * @param {unknown} value candidate value
 * @returns {string} validated digest
 */
function assertDigest(value) {
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) fail();
  return value;
}

/**
 * Require one lowercase UUIDv7 stable identifier.
 *
 * @param {unknown} value candidate value
 * @returns {string} validated identifier
 */
function assertStableId(value) {
  if (typeof value !== 'string' || !STABLE_ID_PATTERN.test(value)) fail();
  return value;
}

/**
 * Require a boolean.
 *
 * @param {unknown} value candidate value
 * @returns {boolean} validated boolean
 */
function assertBoolean(value) {
  if (typeof value !== 'boolean') fail();
  return value;
}

/**
 * Require an integer in an inclusive range.
 *
 * @param {unknown} value candidate value
 * @param {number} minimum inclusive minimum
 * @param {number} maximum inclusive maximum
 * @returns {number} validated integer
 */
function assertInteger(value, minimum, maximum) {
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    fail();
  }
  return value;
}

/**
 * Require one canonical non-negative signed-64-bit decimal string.
 *
 * @param {unknown} value candidate value
 * @returns {string} validated decimal string
 */
function assertNonnegativeInt64(value) {
  if (
    typeof value !== 'string' ||
    value.length > 19 ||
    !NONNEGATIVE_INT64_PATTERN.test(value) ||
    BigInt(value) > INT64_MAXIMUM
  ) {
    fail();
  }
  return value;
}

/**
 * Require one canonical Gala timestamp.
 *
 * @param {unknown} value candidate value
 * @returns {string} validated timestamp
 */
function assertTimestamp(value) {
  if (typeof value !== 'string') fail();
  validateRfc3339(value);
  return value;
}

/**
 * Require a field to be absent.
 *
 * @param {Record<string, unknown>} object record
 * @param {string} key member name
 * @returns {void}
 */
function assertAbsent(object, key) {
  if (Object.hasOwn(object, key)) fail();
}

/**
 * Require all named fields to be absent.
 *
 * @param {Record<string, unknown>} object record
 * @param {readonly string[]} keys member names
 * @returns {void}
 */
function assertAllAbsent(object, keys) {
  for (const key of keys) assertAbsent(object, key);
}

/**
 * Require all named fields to be present.
 *
 * @param {Record<string, unknown>} object record
 * @param {readonly string[]} keys member names
 * @returns {void}
 */
function assertAllPresent(object, keys) {
  if (keys.some((key) => !Object.hasOwn(object, key))) fail();
}

/**
 * Compare two validated JSON values by their exact RFC 8785 bytes.
 *
 * @param {unknown} left first value
 * @param {unknown} right second value
 * @returns {void}
 */
function assertJcsEqual(left, right) {
  if (canonicalizeJcs(left) !== canonicalizeJcs(right)) fail();
}

/**
 * Require identical presence and value for copied scalar fields.
 *
 * @param {Record<string, unknown>} left first record
 * @param {Record<string, unknown>} right second record
 * @param {readonly string[]} keys copied fields
 * @returns {void}
 */
function assertCopiedFields(left, right, keys) {
  for (const key of keys) {
    if (
      Object.hasOwn(left, key) !== Object.hasOwn(right, key) ||
      left[key] !== right[key]
    ) {
      fail();
    }
  }
}

/**
 * Compute one digest through the shared named-profile authority.
 *
 * @param {string} name exact active profile name
 * @param {unknown} value complete profile input
 * @returns {string} tagged digest
 */
function digestNamedProfile(name, value) {
  const profile = ACTIVE_DIGEST_PROFILES[name];
  if (!profile) throw new TypeError('DIGEST_PROFILE_REQUIRED');
  return profile.digest(value);
}

/**
 * Validate the exact credential-free stage input ledger.
 *
 * The embedded authority's complete schema remains owned by the generated
 * contract; this validator reads only the identity fields used by DEC-098's
 * cross-record equalities.
 *
 * @param {unknown} value candidate stage input
 * @returns {Record<string, unknown>} validated stage input
 */
function validateStageInputInternal(value) {
  const input = assertLedger(value, STAGE_INPUT_KEYS);
  assertEqual(input.profile, 'gala-deployment-stage-input-v2');
  assertDigest(input.intentDigest);
  const authority = asObject(input.destinationMutationAuthority);
  assertEqual(authority.profile, 'gala-destination-mutation-authority-v2');
  assertStableId(authority.operationId);
  assertStableId(authority.attemptId);
  assertStableId(input.stageAttemptId);
  assertStableId(input.causationId);
  assertCatalog(input.stage, STAGES);
  if (input.stageAttemptId === input.causationId) fail();
  canonicalizeJcs(input);
  return input;
}

/**
 * Validate one closed observation-evidence reference.
 *
 * @param {unknown} value candidate reference
 * @returns {Record<string, unknown>} validated reference
 */
function validateObservationReference(value) {
  const reference = assertLedger(value, OBSERVATION_REFERENCE_KEYS);
  assertStableId(reference.observationId);
  assertDigest(reference.evidenceDigest);
  return reference;
}

/**
 * Require a valid managed failure-catalog tuple.
 *
 * @param {string} stage stage
 * @param {string} outcome attempt outcome
 * @param {string} destinationChanged cumulative destination mutation
 * @param {unknown} failureCode failure code
 * @param {boolean} retryable retryability value
 * @returns {void}
 */
function assertFailureCatalogTuple(
  stage,
  outcome,
  destinationChanged,
  failureCode,
  retryable,
) {
  if (typeof failureCode !== 'string') fail();
  const matched = FAILURE_CATALOG.some(
    (row) =>
      row.stage === stage &&
      row.code === failureCode &&
      row.outcome === outcome &&
      row.destinationChanges.includes(destinationChanged) &&
      row.retryable === retryable,
  );
  if (!matched) fail();
}

/**
 * Validate outcome, change, failure, retry, and timestamp state.
 *
 * @param {Record<string, unknown>} record result, evidence, or attempt
 * @param {string} stage owning stage
 * @returns {string} validated outcome
 */
function validateStateFacts(record, stage) {
  const outcome = assertCatalog(record.outcome, ALL_OUTCOMES);
  const destinationChanged = assertCatalog(
    record.destinationChanged,
    DESTINATION_CHANGES,
  );
  const retryable = assertBoolean(record.retryable);

  if (outcome === 'not-started') {
    assertEqual(destinationChanged, 'no');
    assertEqual(retryable, false);
    assertAllAbsent(record, [
      'resultDigest',
      'failureCode',
      'startedAt',
      'completedAt',
    ]);
    return outcome;
  }
  if (outcome === 'running') {
    assertEqual(retryable, false);
    assertAllPresent(record, ['startedAt']);
    assertTimestamp(record.startedAt);
    assertAllAbsent(record, ['resultDigest', 'failureCode', 'completedAt']);
    return outcome;
  }
  if (outcome === 'skipped') {
    assertEqual(destinationChanged, 'no');
    assertEqual(retryable, false);
    assertAllAbsent(record, ['failureCode', 'startedAt', 'completedAt']);
    return outcome;
  }
  if (outcome === 'succeeded') {
    assertCatalog(destinationChanged, ['no', 'yes']);
    assertEqual(retryable, false);
    assertAbsent(record, 'failureCode');
  } else {
    assertFailureCatalogTuple(
      stage,
      outcome,
      destinationChanged,
      record.failureCode,
      retryable,
    );
  }

  assertAllPresent(record, ['startedAt', 'completedAt']);
  const startedAt = assertTimestamp(record.startedAt);
  const completedAt = assertTimestamp(record.completedAt);
  if (startedAt > completedAt) fail();
  return outcome;
}

/**
 * Validate a stage result without remapping its public diagnostic.
 *
 * @param {unknown} value candidate result
 * @returns {Record<string, unknown>} validated result
 */
function validateStageResultInternal(value) {
  const result = assertLedger(
    value,
    STAGE_RESULT_REQUIRED_KEYS,
    STAGE_RESULT_OPTIONAL_KEYS,
  );
  assertEqual(result.profile, 'gala-deployment-stage-result-v2');
  const input = validateStageInputInternal(result.stageInput);
  const inputDigest = assertDigest(result.inputDigest);
  assertEqual(inputDigest, computeDeploymentStageInputDigest(input));
  const stage = assertCatalog(input.stage, STAGES);
  const outcome = validateStateFacts(result, stage);
  if (!TERMINAL_OUTCOMES.includes(outcome)) fail();
  validateObservationReference(result.finalizationObservation);
  return result;
}

/**
 * Sort complete observation references by RFC 8785 UTF-8 bytes.
 *
 * @param {Record<string, unknown>[]} references observation references
 * @returns {Record<string, unknown>[]} sorted copy
 */
function sortReferences(references) {
  return [...references].sort((left, right) =>
    Buffer.compare(canonicalizeJcsBytes(left), canonicalizeJcsBytes(right)),
  );
}

/**
 * Validate a complete stage evidence owner without remapping diagnostics.
 *
 * @param {unknown} value candidate evidence
 * @returns {Record<string, unknown>} validated evidence
 */
function validateStageEvidenceInternal(value) {
  const evidence = assertLedger(
    value,
    STAGE_EVIDENCE_REQUIRED_KEYS,
    STAGE_EVIDENCE_OPTIONAL_KEYS,
  );
  assertEqual(evidence.profile, 'gala-deployment-stage-evidence-v2');
  const input = validateStageInputInternal(evidence.stageInput);
  const inputDigest = assertDigest(evidence.inputDigest);
  assertEqual(inputDigest, computeDeploymentStageInputDigest(input));
  const stage = assertCatalog(input.stage, STAGES);
  const outcome = validateStateFacts(evidence, stage);

  if (!Array.isArray(evidence.observationEvidence)) fail();
  const observationEvidence = evidence.observationEvidence.map((reference) =>
    validateObservationReference(reference),
  );
  if (observationEvidence.length > 1_000) fail();

  const observationIds = new Set();
  let previousBytes;
  for (const reference of observationEvidence) {
    if (observationIds.has(reference.observationId)) fail();
    observationIds.add(reference.observationId);
    const bytes = canonicalizeJcsBytes(reference);
    if (previousBytes && Buffer.compare(previousBytes, bytes) >= 0) fail();
    previousBytes = bytes;
  }

  const ownedDigests = new Set([
    inputDigest,
    evidence.resultDigest,
    evidence.evidenceDigest,
  ]);
  if (
    observationEvidence.some((reference) =>
      ownedDigests.has(reference.evidenceDigest),
    )
  ) {
    fail();
  }

  if (outcome === 'not-started') {
    if (observationEvidence.length !== 0) fail();
    assertAllAbsent(evidence, ['stageResult', 'resultDigest']);
  } else if (outcome === 'running') {
    assertAllAbsent(evidence, ['stageResult', 'resultDigest']);
  } else {
    if (observationEvidence.length === 0) fail();
    assertAllPresent(evidence, ['stageResult', 'resultDigest']);
    const result = validateStageResultInternal(evidence.stageResult);
    assertJcsEqual(result.stageInput, input);
    assertEqual(result.inputDigest, inputDigest);
    assertCopiedFields(evidence, result, COPIED_RESULT_FIELDS);
    const resultDigest = assertDigest(evidence.resultDigest);
    assertEqual(resultDigest, computeDeploymentStageResultDigest(result));
    const finalization = validateObservationReference(
      result.finalizationObservation,
    );
    if (
      !observationEvidence.some(
        (reference) =>
          canonicalizeJcs(reference) === canonicalizeJcs(finalization),
      )
    ) {
      fail();
    }
  }

  const evidenceDigest = assertDigest(evidence.evidenceDigest);
  assertEqual(evidenceDigest, computeDeploymentStageEvidenceDigest(evidence));
  return evidence;
}

/**
 * Validate one enclosing deployment attempt.
 *
 * @param {unknown} value candidate attempt
 * @returns {Record<string, unknown>} validated attempt
 */
function validateAttemptInternal(value) {
  const attempt = assertLedger(
    value,
    ATTEMPT_REQUIRED_KEYS,
    ATTEMPT_OPTIONAL_KEYS,
  );
  assertStableId(attempt.attemptId);
  assertStableId(attempt.stageAttemptId);
  assertStableId(attempt.causationId);
  const stage = assertCatalog(attempt.stage, STAGES);
  assertInteger(attempt.sequence, 1, 100);
  assertDigest(attempt.inputDigest);
  assertDigest(attempt.evidenceDigest);
  const outcome = validateStateFacts(attempt, stage);
  if (TERMINAL_OUTCOMES.includes(outcome)) {
    assertDigest(attempt.resultDigest);
  }
  return attempt;
}

/**
 * Return the exact no-newline payload bytes for one probe source.
 *
 * @param {string} source `control`, `race-a`, or `race-b`
 * @returns {Buffer} exact compact-JCS payload bytes
 */
export function createLocalFilesystemProbePayload(source) {
  try {
    assertCatalog(source, PROBE_PAYLOAD_SOURCES);
    return Buffer.from(
      `{"profile":"${PROBE_PAYLOAD_PROFILE}","source":"${source}"}`,
      'utf8',
    );
  } catch {
    invalid('LOCAL_FILESYSTEM_PROBE_PAYLOAD_INVALID');
  }
}

/**
 * Validate exact local-filesystem probe payload bytes.
 *
 * @param {unknown} payload exact payload bytes
 * @param {string} source expected source
 * @returns {void}
 */
export function validateLocalFilesystemProbePayload(payload, source) {
  try {
    if (!(payload instanceof Uint8Array)) fail();
    const expected = createLocalFilesystemProbePayload(source);
    if (!Buffer.from(payload).equals(expected)) fail();
  } catch {
    invalid('LOCAL_FILESYSTEM_PROBE_PAYLOAD_INVALID');
  }
}

/**
 * Compute the exact DEC-098 local-filesystem probe transcript digest.
 *
 * @param {unknown} transcript complete transcript
 * @returns {string} tagged digest
 */
export function computeLocalFilesystemProbeTranscriptDigest(transcript) {
  return digestNamedProfile('localFilesystemProbeTranscript', transcript);
}

/**
 * Validate the exact 10,000-operation local-filesystem probe transcript.
 *
 * @param {unknown} value candidate transcript
 * @returns {void}
 */
export function validateLocalFilesystemProbeTranscript(value) {
  try {
    const transcript = assertLedger(value, TRANSCRIPT_KEYS);
    assertEqual(transcript.profile, PROBE_PROFILE);
    assertEqual(transcript.initialTarget, 'target-a');
    if (
      !Array.isArray(transcript.replacements) ||
      transcript.replacements.length !== 10_000
    ) {
      fail();
    }
    for (let index = 0; index < transcript.replacements.length; index += 1) {
      const replacement = assertLedger(
        transcript.replacements[index],
        REPLACEMENT_KEYS,
      );
      const operationNumber = index + 1;
      assertEqual(replacement.operationNumber, operationNumber);
      assertEqual(
        replacement.preparedTarget,
        operationNumber % 2 === 1 ? 'target-b' : 'target-a',
      );
      assertEqual(replacement.renameResult, 'success');
      assertCatalog(replacement.readerResult, ['target-a', 'target-b']);
    }

    const control = assertLedger(
      transcript.controlPublication,
      CONTROL_PUBLICATION_KEYS,
    );
    assertEqual(control.publisherSource, 'control');
    assertEqual(control.publicationResult, 'success');
    assertEqual(control.conflictingSource, 'race-a');
    assertEqual(control.conflictingResult, 'EEXIST');
    assertEqual(control.publishedInodeSource, 'control');
    assertEqual(control.publishedByteSource, 'control');

    const race = assertLedger(
      transcript.racePublication,
      RACE_PUBLICATION_KEYS,
    );
    if (!Array.isArray(race.contenders) || race.contenders.length !== 2) {
      fail();
    }
    const contenders = race.contenders.map((contender) =>
      assertLedger(contender, RACE_CONTENDER_KEYS),
    );
    assertEqual(contenders[0]?.source, 'race-a');
    assertEqual(contenders[1]?.source, 'race-b');
    for (const contender of contenders) {
      assertCatalog(contender.linkResult, ['success', 'EEXIST']);
    }
    const successful = contenders.filter(
      (contender) => contender.linkResult === 'success',
    );
    const conflicting = contenders.filter(
      (contender) => contender.linkResult === 'EEXIST',
    );
    if (successful.length !== 1 || conflicting.length !== 1) fail();
    const winner = successful[0]?.source;
    assertEqual(race.winner, winner);
    assertEqual(race.publishedInodeSource, winner);
    assertEqual(race.publishedByteSource, winner);

    computeLocalFilesystemProbeTranscriptDigest(transcript);
  } catch {
    invalid('LOCAL_FILESYSTEM_PROBE_TRANSCRIPT_INVALID');
  }
}

/**
 * Compute a local observation evidence self-exclusion digest.
 *
 * @param {unknown} evidence complete local observation evidence
 * @returns {string} tagged digest
 */
export function computeLocalFilesystemObservationEvidenceDigest(evidence) {
  return digestNamedProfile('localFilesystemObservationEvidence', evidence);
}

/**
 * Validate local observation evidence and its five-field state ledger.
 *
 * @param {unknown} value candidate evidence
 * @returns {void}
 */
export function validateLocalFilesystemObservationEvidence(value) {
  try {
    const evidence = assertLedger(
      value,
      LOCAL_OBSERVATION_REQUIRED_KEYS,
      LOCAL_OBSERVATION_OPTIONAL_KEYS,
    );
    assertEqual(evidence.profile, 'gala-local-directory-observation-v2');
    assertDigest(evidence.filesystemEvidenceDigest);
    assertDigest(evidence.rootIdentityDigest);
    assertStableId(evidence.operationId);
    assertStableId(evidence.attemptId);
    assertStableId(evidence.stageAttemptId);
    if (Object.hasOwn(evidence, 'expectedGenerationId')) {
      assertStableId(evidence.expectedGenerationId);
    }
    const state = assertCatalog(evidence.observedCurrentState, [
      'absent',
      'valid',
      'malformed',
      'unsafe',
    ]);
    if (state === 'valid') {
      assertAllPresent(evidence, LOCAL_OBSERVATION_STATE_KEYS);
      assertStableId(evidence.observedGenerationId);
      assertDigest(evidence.observedArtifactDigest);
      assertDigest(evidence.observedMarkerDigest);
      assertNonnegativeInt64(evidence.observedFileCount);
      assertNonnegativeInt64(evidence.observedByteCount);
    } else {
      assertAllAbsent(evidence, LOCAL_OBSERVATION_STATE_KEYS);
    }
    assertDigest(evidence.controlHeadDigest);
    assertTimestamp(evidence.observedAt);
    assertEqual(
      assertDigest(evidence.evidenceDigest),
      computeLocalFilesystemObservationEvidenceDigest(evidence),
    );
  } catch {
    invalid('LOCAL_FILESYSTEM_OBSERVATION_EVIDENCE_INVALID');
  }
}

/**
 * Compute the exact credential-free deployment-stage input digest.
 *
 * @param {unknown} input complete stage input
 * @returns {string} tagged digest
 */
export function computeDeploymentStageInputDigest(input) {
  return digestNamedProfile('deploymentStageInput', input);
}

/**
 * Validate one closed deployment-stage input.
 *
 * @param {unknown} input candidate stage input
 * @returns {void}
 */
export function validateDeploymentStageInput(input) {
  try {
    validateStageInputInternal(input);
  } catch {
    invalid('DEPLOYMENT_STAGE_INPUT_INVALID');
  }
}

/**
 * Compute the exact normalized deployment-stage result digest.
 *
 * @param {unknown} result complete stage result
 * @returns {string} tagged digest
 */
export function computeDeploymentStageResultDigest(result) {
  return digestNamedProfile('deploymentStageResult', result);
}

/**
 * Validate one closed terminal deployment-stage result.
 *
 * @param {unknown} result candidate result
 * @returns {void}
 */
export function validateDeploymentStageResult(result) {
  try {
    validateStageResultInternal(result);
  } catch {
    invalid('DEPLOYMENT_STAGE_RESULT_INVALID');
  }
}

/**
 * Compute the complete deployment-stage evidence self-exclusion digest.
 *
 * @param {unknown} evidence complete stage evidence
 * @returns {string} tagged digest
 */
export function computeDeploymentStageEvidenceDigest(evidence) {
  return digestNamedProfile('deploymentStageEvidence', evidence);
}

/**
 * Validate one closed deployment-stage evidence owner.
 *
 * Cross-record intent, attempt, and journal-prefix equalities are validated by
 * `validateDeploymentStageRecords`.
 *
 * @param {unknown} evidence candidate evidence
 * @returns {void}
 */
export function validateDeploymentStageEvidence(evidence) {
  try {
    validateStageEvidenceInternal(evidence);
  } catch {
    invalid('DEPLOYMENT_STAGE_EVIDENCE_INVALID');
  }
}

/**
 * Validate all DEC-098 equalities for one stage and its already committed
 * observation prefix.
 *
 * `retainedObservations` is the retained joint-evidence-journal order, not a
 * caller-selected or observation-sequence order. This function only consumes
 * committed observations and never constructs a current observation wrapper,
 * which preserves DEC-098's stage digest dependency order.
 *
 * @param {unknown} records related retained records
 * @returns {void}
 */
export function validateDeploymentStageRecords(records) {
  try {
    const context = assertLedger(asObject(records), [
      'deploymentIntent',
      'deploymentAttempt',
      'deploymentStageEvidence',
      'retainedObservations',
    ]);
    const evidence = validateStageEvidenceInternal(
      context.deploymentStageEvidence,
    );
    const input = validateStageInputInternal(evidence.stageInput);
    const authority = asObject(input.destinationMutationAuthority);
    const intent = asObject(context.deploymentIntent);
    const attempt = validateAttemptInternal(context.deploymentAttempt);

    const operationId = assertStableId(intent.operationId);
    const attemptId = assertStableId(intent.attemptId);
    assertEqual(input.intentDigest, assertDigest(intent.intentDigest));
    assertJcsEqual(
      input.destinationMutationAuthority,
      intent.destinationMutationAuthority,
    );
    assertEqual(authority.operationId, operationId);
    assertEqual(authority.attemptId, attemptId);
    assertEqual(attempt.attemptId, attemptId);
    assertEqual(attempt.stageAttemptId, input.stageAttemptId);
    assertEqual(attempt.causationId, input.causationId);
    assertEqual(attempt.stage, input.stage);
    assertEqual(attempt.inputDigest, evidence.inputDigest);
    assertEqual(attempt.evidenceDigest, evidence.evidenceDigest);
    assertCopiedFields(attempt, evidence, COPIED_RESULT_FIELDS);

    const outcome = assertCatalog(evidence.outcome, ALL_OUTCOMES);
    if (TERMINAL_OUTCOMES.includes(outcome)) {
      assertEqual(attempt.resultDigest, evidence.resultDigest);
    } else {
      assertAbsent(attempt, 'resultDigest');
    }

    if (!Array.isArray(context.retainedObservations)) fail();
    const observations = context.retainedObservations.map((candidate) => {
      const observation = asObject(candidate);
      assertStableId(observation.observationId);
      assertStableId(observation.stageAttemptId);
      assertDigest(observation.evidenceDigest);
      return observation;
    });
    const retainedIds = new Set();
    for (const observation of observations) {
      if (retainedIds.has(observation.observationId)) fail();
      retainedIds.add(observation.observationId);
    }

    let prefix = observations;
    if (TERMINAL_OUTCOMES.includes(outcome)) {
      const result = asObject(evidence.stageResult);
      const finalization = asObject(result.finalizationObservation);
      const finalizationIndex = observations.findIndex(
        (observation) =>
          observation.observationId === finalization.observationId &&
          observation.evidenceDigest === finalization.evidenceDigest,
      );
      if (finalizationIndex < 0) fail();
      const finalObservation = observations[finalizationIndex];
      if (finalObservation?.stageAttemptId !== input.stageAttemptId) fail();
      prefix = observations.slice(0, finalizationIndex + 1);
    }

    const expectedReferences = sortReferences(
      prefix
        .filter(
          (observation) => observation.stageAttemptId === input.stageAttemptId,
        )
        .map((observation) => ({
          observationId: observation.observationId,
          evidenceDigest: observation.evidenceDigest,
        })),
    );
    assertJcsEqual(evidence.observationEvidence, expectedReferences);
  } catch {
    invalid('DEPLOYMENT_STAGE_RECORDS_INVALID');
  }
}
