import {
  canonicalizeJcsBytes,
  domainSeparatedSha256,
  parseDuplicateFreeIJson,
  sha256Tagged,
} from './canonical-jcs.js';
import unicodeTable from './generated/unicode17.json' with { type: 'json' };
import { normalizeNfc17, unicodeCollisionKey17 } from './unicode17.js';

const MAGIC = Buffer.from('GALA-FROZEN-ENVELOPE-V2\n', 'ascii');
const HEADER_BYTE_COUNT = 13;
const MAX_RECORD_COUNT = 200_003;
const MAX_ENVELOPE_BYTE_COUNT = 1_073_741_824;
const MAX_MANIFEST_BYTE_COUNT = 268_435_456;
const MAX_PROVENANCE_BYTE_COUNT = 16_777_216;
const MAX_SBOM_BYTE_COUNT = 16_777_216;
const MAX_PATH_BYTE_COUNT = 512;
const MAX_SEGMENT_BYTE_COUNT = 128;
const MAX_SIGNED_INT64 = 9_223_372_036_854_775_807n;
const FATAL_UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const NON_NEGATIVE_INT64_PATTERN = /^(?:0|[1-9][0-9]*)$/u;

const METADATA = Object.freeze([
  Object.freeze({
    kind: 0x02,
    path: 'metadata/artifact-manifest.jcs',
    maximumByteCount: MAX_MANIFEST_BYTE_COUNT,
  }),
  Object.freeze({
    kind: 0x03,
    path: 'metadata/provenance.jcs',
    maximumByteCount: MAX_PROVENANCE_BYTE_COUNT,
  }),
  Object.freeze({
    kind: 0x04,
    path: 'metadata/sbom.spdx.json',
    maximumByteCount: MAX_SBOM_BYTE_COUNT,
  }),
]);

const RESERVED_PATH_KEYS = new Set(
  METADATA.map(({ path }) => unicodeCollisionKey17(path)),
);
const RESERVED_STEMS = new Set([
  'con',
  'prn',
  'aux',
  'nul',
  ...Array.from({ length: 9 }, (_, index) => `com${index + 1}`),
  ...Array.from({ length: 9 }, (_, index) => `lpt${index + 1}`),
  'com¹',
  'com²',
  'com³',
  'lpt¹',
  'lpt²',
  'lpt³',
]);

/** @typedef {[number, number, string]} PropertyRange */

const pinnedProperties = /** @type {{
  whiteSpace: PropertyRange[],
  noncharacter: PropertyRange[],
  defaultIgnorable: PropertyRange[]
}} */ (/** @type {unknown} */ (unicodeTable));

/**
 * One stable frozen-envelope validation failure.
 */
class FrozenEnvelopeValidationError extends TypeError {
  /**
   * Create an envelope validation failure.
   *
   * @param {string} code stable diagnostic code
   */
  constructor(code) {
    super(code);
    this.name = 'FrozenEnvelopeValidationError';
    this.code = code;
  }
}

/**
 * Throw one stable envelope diagnostic.
 *
 * @param {string} code stable diagnostic code
 * @returns {never} always throws
 */
function fail(code) {
  throw new FrozenEnvelopeValidationError(code);
}

/**
 * Test membership in one sorted inclusive Unicode range table.
 *
 * @param {number} codePoint Unicode scalar
 * @param {PropertyRange[]} ranges sorted ranges
 * @returns {boolean} membership
 */
function inRanges(codePoint, ranges) {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const range = ranges[middle];
    if (!range) return false;
    if (codePoint < range[0]) high = middle - 1;
    else if (codePoint > range[1]) low = middle + 1;
    else return true;
  }
  return false;
}

/**
 * Read an unsigned big-endian 32-bit integer.
 *
 * @param {Uint8Array} bytes envelope bytes
 * @param {number} offset field offset
 * @returns {number} decoded value
 */
function readU32(bytes, offset) {
  if (bytes.length - offset < 4) fail('FROZEN_ENVELOPE_TRUNCATED');
  const first = bytes[offset];
  const second = bytes[offset + 1];
  const third = bytes[offset + 2];
  const fourth = bytes[offset + 3];
  if (
    first === undefined ||
    second === undefined ||
    third === undefined ||
    fourth === undefined
  ) {
    fail('FROZEN_ENVELOPE_TRUNCATED');
  }
  return first * 0x1_00_00_00 + (second << 16) + (third << 8) + fourth;
}

/**
 * Read an unsigned big-endian 64-bit integer without narrowing it.
 *
 * @param {Uint8Array} bytes envelope bytes
 * @param {number} offset field offset
 * @returns {bigint} decoded value
 */
function readU64(bytes, offset) {
  if (bytes.length - offset < 8) fail('FROZEN_ENVELOPE_TRUNCATED');
  let value = 0n;
  for (let index = 0; index < 8; index += 1) {
    value =
      (value << 8n) | BigInt(/** @type {number} */ (bytes[offset + index]));
  }
  if (value > MAX_SIGNED_INT64) fail('FROZEN_ENVELOPE_LENGTH_INVALID');
  return value;
}

/**
 * Decode exact UTF-8 path bytes.
 *
 * @param {Uint8Array} bytes path bytes
 * @returns {string} decoded path
 */
function decodePath(bytes) {
  try {
    return FATAL_UTF8_DECODER.decode(bytes);
  } catch {
    return fail('FROZEN_ENVELOPE_PATH_UTF8_INVALID');
  }
}

/**
 * Check one `gala-portable-v2` artifact path.
 *
 * @param {string} path decoded path
 * @param {Uint8Array} bytes exact UTF-8 bytes
 * @returns {void}
 */
function validatePortablePath(path, bytes) {
  if (
    bytes.length === 0 ||
    bytes.length > MAX_PATH_BYTE_COUNT ||
    normalizeNfc17(path) !== path ||
    path.startsWith('/') ||
    path.endsWith('/') ||
    path.includes('//')
  ) {
    fail('FROZEN_ENVELOPE_PATH_INVALID');
  }

  for (const segment of path.split('/')) {
    const segmentBytes = Buffer.byteLength(segment, 'utf8');
    const scalars = [...segment];
    const first = scalars[0];
    const last = scalars.at(-1);
    if (
      segmentBytes < 1 ||
      segmentBytes > MAX_SEGMENT_BYTE_COUNT ||
      segment === '.' ||
      segment === '..' ||
      last === '.' ||
      first === undefined ||
      last === undefined
    ) {
      fail('FROZEN_ENVELOPE_PATH_INVALID');
    }
    const firstCodePoint = first.codePointAt(0);
    const lastCodePoint = last.codePointAt(0);
    if (
      firstCodePoint === undefined ||
      lastCodePoint === undefined ||
      inRanges(firstCodePoint, pinnedProperties.whiteSpace) ||
      inRanges(lastCodePoint, pinnedProperties.whiteSpace)
    ) {
      fail('FROZEN_ENVELOPE_PATH_INVALID');
    }
    for (const character of scalars) {
      const codePoint = character.codePointAt(0);
      if (
        codePoint === undefined ||
        codePoint < 0x20 ||
        (codePoint >= 0x7f && codePoint <= 0x9f) ||
        ['%', '\\', '<', '>', ':', '"', '|', '?', '*'].includes(character) ||
        inRanges(codePoint, pinnedProperties.defaultIgnorable) ||
        inRanges(codePoint, pinnedProperties.noncharacter)
      ) {
        fail('FROZEN_ENVELOPE_PATH_INVALID');
      }
    }
    const stem = segment.split('.', 1)[0];
    if (stem && RESERVED_STEMS.has(unicodeCollisionKey17(stem))) {
      fail('FROZEN_ENVELOPE_PATH_INVALID');
    }
  }
}

/**
 * Parse duplicate-key-free compact RFC 8785 JCS.
 *
 * @param {Uint8Array} bytes exact JSON bytes
 * @returns {unknown} parsed value
 */
function parseCompactJcs(bytes) {
  let value;
  try {
    value = parseDuplicateFreeIJson(bytes);
  } catch {
    return fail('FROZEN_ENVELOPE_JSON_INVALID');
  }
  let canonical;
  try {
    canonical = canonicalizeJcsBytes(value);
  } catch {
    return fail('FROZEN_ENVELOPE_JSON_INVALID');
  }
  if (!Buffer.from(bytes).equals(canonical)) {
    fail('FROZEN_ENVELOPE_JCS_INVALID');
  }
  return value;
}

/**
 * Require an ordinary parsed JSON object.
 *
 * @param {unknown} value candidate value
 * @returns {Record<string, unknown>} object value
 */
function requireObject(value) {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail('FROZEN_ENVELOPE_METADATA_INVALID');
  }
  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * Parse one canonical non-negative signed-64-bit decimal.
 *
 * @param {unknown} value candidate value
 * @returns {bigint} parsed integer
 */
function parseNonNegativeInt64(value) {
  if (typeof value !== 'string' || !NON_NEGATIVE_INT64_PATTERN.test(value)) {
    fail('FROZEN_ENVELOPE_MANIFEST_INVALID');
  }
  const parsed = BigInt(value);
  if (parsed > MAX_SIGNED_INT64) fail('FROZEN_ENVELOPE_MANIFEST_INVALID');
  return parsed;
}

/**
 * Compare exact UTF-8 byte strings.
 *
 * @param {string} left left string
 * @param {string} right right string
 * @returns {number} comparison result
 */
function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

/**
 * Extract and validate the manifest's artifact-entry projection.
 *
 * @param {Record<string, unknown>} manifest parsed manifest
 * @returns {{ entries: {path: string, byteLength: string, sha256: string}[], byteCount: bigint }} entries and total
 */
function manifestEntries(manifest) {
  if (!Array.isArray(manifest.routes) || !Array.isArray(manifest.assets)) {
    fail('FROZEN_ENVELOPE_MANIFEST_INVALID');
  }
  /** @type {{path: string, byteLength: string, sha256: string}[]} */
  const entries = [];
  const collisionKeys = new Set();
  for (const inventory of [manifest.routes, manifest.assets]) {
    let priorPath;
    for (const rawEntry of inventory) {
      const entry = requireObject(rawEntry);
      const path = entry.path;
      const byteLength = entry.byteLength;
      const digest = entry.sha256;
      if (
        typeof path !== 'string' ||
        typeof byteLength !== 'string' ||
        typeof digest !== 'string' ||
        !DIGEST_PATTERN.test(digest)
      ) {
        fail('FROZEN_ENVELOPE_MANIFEST_INVALID');
      }
      const pathBytes = Buffer.from(path, 'utf8');
      validatePortablePath(path, pathBytes);
      if (RESERVED_PATH_KEYS.has(unicodeCollisionKey17(path))) {
        fail('FROZEN_ENVELOPE_RESERVED_PATH');
      }
      if (priorPath !== undefined && compareUtf8(priorPath, path) >= 0) {
        fail('FROZEN_ENVELOPE_MANIFEST_INVALID');
      }
      priorPath = path;
      const collisionKey = unicodeCollisionKey17(path);
      if (collisionKeys.has(collisionKey)) {
        fail('FROZEN_ENVELOPE_PATH_COLLISION');
      }
      collisionKeys.add(collisionKey);
      parseNonNegativeInt64(byteLength);
      entries.push({ path, byteLength, sha256: digest });
    }
  }
  entries.sort((left, right) => compareUtf8(left.path, right.path));
  const byteCount = entries.reduce(
    (total, entry) => total + parseNonNegativeInt64(entry.byteLength),
    0n,
  );
  if (byteCount > MAX_SIGNED_INT64) {
    fail('FROZEN_ENVELOPE_MANIFEST_INVALID');
  }
  return { entries, byteCount };
}

/**
 * Validate the manifest and payload records one-for-one.
 *
 * @param {Record<string, unknown>} manifest parsed manifest
 * @param {{kind: number, path: string, content: Uint8Array}[]} payloads payload records
 * @returns {{artifactDigest: string, manifestDigest: string}}
 */
function validateManifest(manifest, payloads) {
  if (
    manifest.schemaId !== 'urn:gala:schema:artifact-manifest:2.0.0' ||
    manifest.schemaVersion !== '2.0.0'
  ) {
    fail('FROZEN_ENVELOPE_MANIFEST_INVALID');
  }
  const { entries, byteCount } = manifestEntries(manifest);
  if (
    manifest.artifactFileCount !== String(payloads.length) ||
    manifest.artifactByteCount !== byteCount.toString() ||
    entries.length !== payloads.length
  ) {
    fail('FROZEN_ENVELOPE_INVENTORY_MISMATCH');
  }
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    const payload = payloads[index];
    if (!entry || !payload) fail('FROZEN_ENVELOPE_INVENTORY_MISMATCH');
    if (
      entry.path !== payload.path ||
      entry.byteLength !== String(payload.content.length) ||
      entry.sha256 !== sha256Tagged(payload.content)
    ) {
      fail('FROZEN_ENVELOPE_INVENTORY_MISMATCH');
    }
  }

  const artifactDigest = domainSeparatedSha256(
    'GALA-ARTIFACT-V2\0',
    canonicalizeJcsBytes(entries),
  );
  if (manifest.artifactDigest !== artifactDigest) {
    fail('FROZEN_ENVELOPE_DIGEST_MISMATCH');
  }
  if (
    !Object.hasOwn(manifest, 'artifactId') ||
    typeof manifest.manifestDigest !== 'string' ||
    !DIGEST_PATTERN.test(manifest.manifestDigest)
  ) {
    fail('FROZEN_ENVELOPE_MANIFEST_INVALID');
  }
  const projection = { ...manifest };
  delete projection.artifactId;
  delete projection.manifestDigest;
  const manifestDigest = domainSeparatedSha256(
    'GALA-ARTIFACT-MANIFEST-V2\0',
    canonicalizeJcsBytes(projection),
  );
  if (manifest.manifestDigest !== manifestDigest) {
    fail('FROZEN_ENVELOPE_DIGEST_MISMATCH');
  }
  return { artifactDigest, manifestDigest };
}

/**
 * Validate a deterministic `gala-frozen-envelope-v2` byte string.
 *
 * The returned record content values are zero-copy views of the supplied byte
 * string. Structural JSON Schema validation and external intent/workload
 * equalities remain the responsibility of their owning semantic validator.
 *
 * @param {Uint8Array} bytes complete envelope bytes
 * @returns {{
 *   recordCount: number,
 *   records: {kind: number, path: string, content: Uint8Array}[],
 *   artifactManifest: Record<string, unknown>,
 *   buildProvenance: Record<string, unknown>,
 *   sbom: Record<string, unknown>,
 *   artifactDigest: string,
 *   manifestDigest: string,
 *   provenanceDigest: string,
 *   sbomDigest: string,
 *   frozenEnvelopeByteCount: string,
 *   frozenEnvelopeDigest: string
 * }} validated projection and computed digests
 * @throws {TypeError} with a stable `code` when any envelope invariant fails
 */
export function validateFrozenEnvelope(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    fail('FROZEN_ENVELOPE_INPUT_INVALID');
  }
  if (bytes.length > MAX_ENVELOPE_BYTE_COUNT) {
    fail('FROZEN_ENVELOPE_SIZE_INVALID');
  }
  if (
    bytes.length < MAGIC.length + 4 ||
    !Buffer.from(bytes.subarray(0, MAGIC.length)).equals(MAGIC)
  ) {
    fail('FROZEN_ENVELOPE_MAGIC_INVALID');
  }

  const recordCount = readU32(bytes, MAGIC.length);
  if (recordCount < METADATA.length || recordCount > MAX_RECORD_COUNT) {
    fail('FROZEN_ENVELOPE_COUNT_INVALID');
  }
  let offset = MAGIC.length + 4;
  const minimumRecordBytes = BigInt(recordCount) * BigInt(HEADER_BYTE_COUNT);
  if (minimumRecordBytes > BigInt(bytes.length - offset)) {
    fail('FROZEN_ENVELOPE_TRUNCATED');
  }

  const payloadCount = recordCount - METADATA.length;
  /** @type {{kind: number, path: string, content: Uint8Array}[]} */
  const records = [];
  const collisionKeys = new Set();
  let priorPayloadPathBytes;
  for (let index = 0; index < recordCount; index += 1) {
    if (bytes.length - offset < HEADER_BYTE_COUNT) {
      fail('FROZEN_ENVELOPE_TRUNCATED');
    }
    const kind = /** @type {number} */ (bytes[offset]);
    const pathByteCount = readU32(bytes, offset + 1);
    const contentByteCount = readU64(bytes, offset + 5);
    offset += HEADER_BYTE_COUNT;

    const expectedMetadata =
      index >= payloadCount ? METADATA[index - payloadCount] : undefined;
    const expectedKind = expectedMetadata?.kind ?? 0x01;
    if (![0x01, 0x02, 0x03, 0x04].includes(kind)) {
      fail('FROZEN_ENVELOPE_KIND_INVALID');
    }
    if (kind !== expectedKind) {
      fail('FROZEN_ENVELOPE_RECORD_ORDER_INVALID');
    }
    if (
      expectedMetadata &&
      contentByteCount > BigInt(expectedMetadata.maximumByteCount)
    ) {
      fail('FROZEN_ENVELOPE_METADATA_LIMIT_EXCEEDED');
    }
    if (pathByteCount > MAX_PATH_BYTE_COUNT) {
      fail('FROZEN_ENVELOPE_PATH_INVALID');
    }
    const remaining = BigInt(bytes.length - offset);
    const recordBodyByteCount = BigInt(pathByteCount) + contentByteCount;
    if (recordBodyByteCount > remaining) {
      fail('FROZEN_ENVELOPE_TRUNCATED');
    }
    const contentLength = Number(contentByteCount);
    const pathBytes = bytes.subarray(offset, offset + pathByteCount);
    offset += pathByteCount;
    const content = bytes.subarray(offset, offset + contentLength);
    offset += contentLength;
    const path = decodePath(pathBytes);

    if (expectedMetadata) {
      if (path !== expectedMetadata.path) {
        fail('FROZEN_ENVELOPE_RECORD_ORDER_INVALID');
      }
    } else {
      validatePortablePath(path, pathBytes);
      const collisionKey = unicodeCollisionKey17(path);
      if (RESERVED_PATH_KEYS.has(collisionKey)) {
        fail('FROZEN_ENVELOPE_RESERVED_PATH');
      }
      if (collisionKeys.has(collisionKey)) {
        fail('FROZEN_ENVELOPE_PATH_COLLISION');
      }
      collisionKeys.add(collisionKey);
      if (
        priorPayloadPathBytes !== undefined &&
        Buffer.compare(
          Buffer.from(priorPayloadPathBytes),
          Buffer.from(pathBytes),
        ) >= 0
      ) {
        fail('FROZEN_ENVELOPE_PATH_ORDER_INVALID');
      }
      priorPayloadPathBytes = pathBytes;
    }
    records.push({ kind, path, content });
  }
  if (offset !== bytes.length) fail('FROZEN_ENVELOPE_TRAILING_BYTES');

  const payloads = records.slice(0, payloadCount);
  const manifestRecord = records[payloadCount];
  const provenanceRecord = records[payloadCount + 1];
  const sbomRecord = records[payloadCount + 2];
  if (!manifestRecord || !provenanceRecord || !sbomRecord) {
    fail('FROZEN_ENVELOPE_COUNT_INVALID');
  }
  const artifactManifest = requireObject(
    parseCompactJcs(manifestRecord.content),
  );
  const buildProvenance = requireObject(
    parseCompactJcs(provenanceRecord.content),
  );
  const sbom = requireObject(parseCompactJcs(sbomRecord.content));
  const { artifactDigest, manifestDigest } = validateManifest(
    artifactManifest,
    payloads,
  );
  if (
    buildProvenance.schemaId !== 'urn:gala:metadata:build-provenance:2.0.0' ||
    buildProvenance.schemaVersion !== '2.0.0' ||
    buildProvenance.artifactDigest !== artifactDigest ||
    buildProvenance.manifestDigest !== manifestDigest
  ) {
    fail('FROZEN_ENVELOPE_PROVENANCE_INVALID');
  }
  const sbomDigest = sha256Tagged(sbomRecord.content);
  if (buildProvenance.sbomDigest !== sbomDigest) {
    fail('FROZEN_ENVELOPE_DIGEST_MISMATCH');
  }
  const provenanceDigest = domainSeparatedSha256(
    'GALA-BUILD-PROVENANCE-V2\0',
    provenanceRecord.content,
  );
  return {
    recordCount,
    records,
    artifactManifest,
    buildProvenance,
    sbom,
    artifactDigest,
    manifestDigest,
    provenanceDigest,
    sbomDigest,
    frozenEnvelopeByteCount: String(bytes.length),
    frozenEnvelopeDigest: sha256Tagged(bytes),
  };
}
