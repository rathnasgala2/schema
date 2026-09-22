import { createHash } from 'node:crypto';

import { canonicalizeJcsBytes } from './canonical-jcs.js';
import { validateRfc3339 } from './portable-scalars.js';

const DOMAIN = 'GALA-PUBLIC-RUNTIME-ORIGINS-V2\0';
const MAXIMUM_VALIDITY_MILLISECONDS = 300_000;
const CATALOG_BINDING_FIELDS = [
  'environment',
  'generation',
  'appOrigin',
  'apiOrigin',
  'schemaDocsOrigin',
  'publicRecoveryBase',
  'transactionalLinkBase',
  'sourceCatalogGeneration',
  'sourceCatalogDigest',
  'appArtifactDigest',
];
const EXPECTED_BINDING_FIELDS = [
  ...CATALOG_BINDING_FIELDS,
  'documentOrigin',
  'observedAt',
];

/**
 * Require a plain JSON object.
 *
 * @param {unknown} value candidate value
 * @param {string} code diagnostic code
 * @returns {Record<string, unknown>} checked record
 */
function asRecord(value, code) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(code);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(code);
  }
  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * Require and parse one canonical Gala timestamp.
 *
 * @param {unknown} value candidate timestamp
 * @param {string} code diagnostic code
 * @returns {number} epoch milliseconds
 */
function timestamp(value, code) {
  if (typeof value !== 'string') throw new TypeError(code);
  try {
    validateRfc3339(value);
  } catch {
    throw new TypeError(code);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new TypeError(code);
  return milliseconds;
}

/**
 * Project a public-runtime-origins record for its self-excluding digest.
 *
 * @param {unknown} value complete or pre-digest runtime-origins record
 * @returns {Record<string, unknown>} record without payloadDigest
 */
export function projectPublicRuntimeOrigins(value) {
  const record = asRecord(value, 'PUBLIC_RUNTIME_ORIGINS_RECORD_INVALID');
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => key !== 'payloadDigest'),
  );
}

/**
 * Compute the runtime-origins self-excluding domain-separated digest.
 *
 * @param {unknown} value complete or pre-digest runtime-origins record
 * @returns {string} tagged SHA-256 digest
 */
export function digestPublicRuntimeOrigins(value) {
  return `sha256:${createHash('sha256')
    .update(DOMAIN, 'utf8')
    .update(canonicalizeJcsBytes(projectPublicRuntimeOrigins(value)))
    .digest('base64url')}`;
}

/**
 * Validate runtime-origin time, digest and exact App binding semantics.
 *
 * @param {unknown} value structurally valid runtime-origins record
 * @param {unknown} expectedBinding expected catalog, document-origin and observation binding
 * @returns {void}
 */
export function validatePublicRuntimeOrigins(value, expectedBinding) {
  const record = asRecord(value, 'PUBLIC_RUNTIME_ORIGINS_RECORD_INVALID');
  const binding = asRecord(
    expectedBinding,
    'PUBLIC_RUNTIME_ORIGINS_BINDING_INVALID',
  );
  if (
    Object.keys(binding).length !== EXPECTED_BINDING_FIELDS.length ||
    EXPECTED_BINDING_FIELDS.some((field) => !Object.hasOwn(binding, field))
  ) {
    throw new TypeError('PUBLIC_RUNTIME_ORIGINS_BINDING_INVALID');
  }
  const issuedAt = timestamp(
    record.issuedAt,
    'PUBLIC_RUNTIME_ORIGINS_TIME_INVALID',
  );
  const expiresAt = timestamp(
    record.expiresAt,
    'PUBLIC_RUNTIME_ORIGINS_TIME_INVALID',
  );
  if (
    expiresAt <= issuedAt ||
    expiresAt - issuedAt > MAXIMUM_VALIDITY_MILLISECONDS
  ) {
    throw new TypeError('PUBLIC_RUNTIME_ORIGINS_TIME_INVALID');
  }
  if (record.payloadDigest !== digestPublicRuntimeOrigins(record)) {
    throw new TypeError('PUBLIC_RUNTIME_ORIGINS_DIGEST_INVALID');
  }
  if (
    CATALOG_BINDING_FIELDS.some((field) => record[field] !== binding[field])
  ) {
    throw new TypeError('PUBLIC_RUNTIME_ORIGINS_BINDING_INVALID');
  }
  if (record.appOrigin !== binding.documentOrigin) {
    throw new TypeError('PUBLIC_RUNTIME_ORIGINS_APP_ORIGIN_INVALID');
  }
  const observedAt = timestamp(
    binding.observedAt,
    'PUBLIC_RUNTIME_ORIGINS_TIME_INVALID',
  );
  if (observedAt < issuedAt) {
    throw new TypeError('PUBLIC_RUNTIME_ORIGINS_TIME_INVALID');
  }
  if (observedAt >= expiresAt) {
    throw new TypeError('PUBLIC_RUNTIME_ORIGINS_EXPIRED');
  }
}
