/**
 * Browser-safe byte utilities used in place of Node's Buffer across the
 * package's browser-reachable modules.
 *
 * @module
 */

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder('utf-8');
const HEX_PATTERN = /^[0-9a-f]*$/u;

/**
 * Encode a string as exact UTF-8 bytes.
 *
 * @param {string} value input string
 * @returns {Uint8Array} UTF-8 bytes
 */
export function utf8Bytes(value) {
  return TEXT_ENCODER.encode(value);
}

/**
 * Encode a 7-bit-clean ASCII string as exact bytes.
 *
 * ASCII is a strict subset of UTF-8 for every 7-bit-clean code point, so this
 * reuses the UTF-8 encoder; callers are responsible for the ASCII contract.
 *
 * @param {string} value input string, expected to be 7-bit ASCII
 * @returns {Uint8Array} encoded bytes
 */
export function asciiBytes(value) {
  return TEXT_ENCODER.encode(value);
}

/**
 * Decode exact UTF-8 bytes to a string, throwing on malformed input.
 *
 * @param {Uint8Array} bytes source bytes
 * @returns {string} decoded string
 */
export function decodeUtf8(bytes) {
  return TEXT_DECODER.decode(bytes);
}

/**
 * Decode a lowercase hexadecimal string to bytes.
 *
 * @param {string} hex lowercase hexadecimal string
 * @returns {Uint8Array} decoded bytes
 */
export function bytesFromHex(hex) {
  if (
    typeof hex !== 'string' ||
    hex.length % 2 !== 0 ||
    !HEX_PATTERN.test(hex)
  ) {
    throw new TypeError('BYTES_FROM_HEX_INVALID');
  }
  const out = new Uint8Array(hex.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

/**
 * Encode bytes to a lowercase hexadecimal string.
 *
 * @param {Uint8Array} bytes source bytes
 * @returns {string} lowercase hex
 */
export function hexFromBytes(bytes) {
  let out = '';
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = /** @type {number} */ (bytes[index]);
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * Compare two byte sequences lexicographically by unsigned byte value.
 *
 * @param {Uint8Array} left left operand
 * @param {Uint8Array} right right operand
 * @returns {-1 | 0 | 1} byte-lexicographic order
 */
export function compareBytes(left, right) {
  const length = Math.min(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftByte = /** @type {number} */ (left[index]);
    const rightByte = /** @type {number} */ (right[index]);
    if (leftByte !== rightByte) return leftByte < rightByte ? -1 : 1;
  }
  if (left.length === right.length) return 0;
  return left.length < right.length ? -1 : 1;
}

/**
 * Test two byte sequences for exact equality.
 *
 * @param {Uint8Array} left left operand
 * @param {Uint8Array} right right operand
 * @returns {boolean} whether the sequences are byte-identical
 */
export function bytesEqual(left, right) {
  if (left.length !== right.length) return false;
  return compareBytes(left, right) === 0;
}

/**
 * Concatenate byte sequences into one new Uint8Array.
 *
 * @param {readonly Uint8Array[]} parts byte sequences, in order
 * @returns {Uint8Array} concatenated bytes
 */
export function concatBytes(parts) {
  let total = 0;
  for (const part of parts) total += part.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * Read a big-endian unsigned 32-bit integer at an exact byte offset.
 *
 * @param {Uint8Array} bytes source bytes
 * @param {number} offset byte offset
 * @returns {number} unsigned 32-bit value
 */
export function readUint32BigEndian(bytes, offset) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getUint32(offset, false);
}

/**
 * Read a big-endian unsigned 64-bit integer at an exact byte offset.
 *
 * @param {Uint8Array} bytes source bytes
 * @param {number} offset byte offset
 * @returns {bigint} unsigned 64-bit value
 */
export function readUint64BigEndian(bytes, offset) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return view.getBigUint64(offset, false);
}

/**
 * Find the first offset of an ASCII/Latin-1 needle within bytes, from a start
 * offset, matching Buffer#indexOf's single-byte-per-character semantics.
 *
 * @param {Uint8Array} bytes haystack bytes
 * @param {string} needle 7-bit ASCII search string
 * @param {number} from inclusive start offset
 * @returns {number} matched offset, or -1
 */
export function indexOfAscii(bytes, needle, from) {
  if (needle.length === 0) return from;
  const first = needle.charCodeAt(0);
  const limit = bytes.length - needle.length;
  outer: for (let index = Math.max(from, 0); index <= limit; index += 1) {
    if (bytes[index] !== first) continue;
    for (let offset = 1; offset < needle.length; offset += 1) {
      if (bytes[index + offset] !== needle.charCodeAt(offset)) continue outer;
    }
    return index;
  }
  return -1;
}

/**
 * Decode a byte range as Latin-1 (one code unit per byte).
 *
 * @param {Uint8Array} bytes source bytes
 * @param {number} start inclusive start offset
 * @param {number} end exclusive end offset
 * @returns {string} decoded string
 */
export function decodeLatin1(bytes, start, end) {
  let out = '';
  for (let index = start; index < end; index += 1) {
    out += String.fromCharCode(/** @type {number} */ (bytes[index]));
  }
  return out;
}
