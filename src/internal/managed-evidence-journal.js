import { canonicalizeJcs } from './canonical-jcs.js';
import {
  appendManagedEvidenceHead,
  digestManagedEvidenceEntry,
  digestManagedEvidenceGenesis,
} from './digest-profiles.js';
import { SemanticValidationError } from './semver.js';

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;

/**
 * Raise one stable journal diagnostic.
 *
 * @returns {never}
 */
function invalidJournal() {
  throw new SemanticValidationError('MANAGED_EVIDENCE_JOURNAL_INVALID');
}

/**
 * Require an ordinary JSON object.
 *
 * @param {unknown} value candidate value
 * @returns {Record<string, unknown>} object
 */
function asObject(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return invalidJournal();
  }
  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * Require an object's exact member set.
 *
 * @param {Record<string, unknown>} value object
 * @param {readonly string[]} keys exact keys
 * @returns {void}
 */
function requireKeys(value, keys) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    invalidJournal();
  }
}

/**
 * Require a canonical tagged SHA-256 digest.
 *
 * @param {unknown} value candidate digest
 * @returns {string} digest
 */
function requireDigest(value) {
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) {
    return invalidJournal();
  }
  return value;
}

/**
 * Validate a complete managed evidence journal against receipt coordinates.
 *
 * This is an internal validator context, not a portable wire shape. Each entry
 * is the stored response projection without receipt/page fields; the owning
 * API schema supplies structural validation for each attempt and observation.
 *
 * @param {{
 *   operationId: string,
 *   runAttempt: number,
 *   entries: unknown[],
 *   receiptEntryCount: number,
 *   receiptHeadDigest: string
 * }} context complete retained journal context
 * @returns {{entryCount: number, headDigest: string}} validated terminal state
 */
export function validateManagedEvidenceJournal(context) {
  const {
    operationId,
    runAttempt,
    entries,
    receiptEntryCount,
    receiptHeadDigest,
  } = context;
  if (
    typeof operationId !== 'string' ||
    operationId.length === 0 ||
    !Number.isInteger(runAttempt) ||
    runAttempt < 1 ||
    runAttempt > 51 ||
    !Array.isArray(entries) ||
    entries.length < 1 ||
    entries.length > 1_100 ||
    receiptEntryCount !== entries.length
  ) {
    return invalidJournal();
  }

  let headDigest = digestManagedEvidenceGenesis({ operationId, runAttempt });
  const wrappers = new Set();
  const identities = new Set();
  const nextSequence = { attempt: 1, observation: 1 };
  for (let index = 0; index < entries.length; index += 1) {
    const entry = asObject(entries[index]);
    const entryType = entry.entryType;
    if (entryType !== 'attempt' && entryType !== 'observation') {
      return invalidJournal();
    }
    const selectedMember = entryType;
    requireKeys(entry, [
      'entryNumber',
      'previousHeadDigest',
      'entryType',
      selectedMember,
      'entryDigest',
      'headDigest',
    ]);
    if (entry.entryNumber !== index + 1) return invalidJournal();
    if (requireDigest(entry.previousHeadDigest) !== headDigest) {
      return invalidJournal();
    }
    const record = asObject(entry[selectedMember]);
    if (record.sequence !== nextSequence[entryType]) return invalidJournal();
    nextSequence[entryType] += 1;
    const identityName =
      entryType === 'attempt' ? 'stageAttemptId' : 'observationId';
    const identity = record[identityName];
    if (typeof identity !== 'string' || identity.length === 0) {
      return invalidJournal();
    }
    const typedIdentity = `${entryType}:${identity}`;
    if (identities.has(typedIdentity)) return invalidJournal();
    identities.add(typedIdentity);

    const wrapper = { entryType, [selectedMember]: record };
    const wrapperBytes = canonicalizeJcs(wrapper);
    if (wrappers.has(wrapperBytes)) return invalidJournal();
    wrappers.add(wrapperBytes);
    const entryDigest = digestManagedEvidenceEntry(wrapper);
    if (requireDigest(entry.entryDigest) !== entryDigest) {
      return invalidJournal();
    }
    headDigest = appendManagedEvidenceHead(headDigest, entryDigest);
    if (requireDigest(entry.headDigest) !== headDigest) {
      return invalidJournal();
    }
  }
  if (requireDigest(receiptHeadDigest) !== headDigest) {
    return invalidJournal();
  }
  return { entryCount: entries.length, headDigest };
}
