/**
 * Encode a string as exact UTF-8 bytes.
 *
 * @param {string} value input string
 * @returns {Uint8Array} UTF-8 bytes
 */
export function utf8Bytes(value: string): Uint8Array;
/**
 * Encode a 7-bit-clean ASCII string as exact bytes.
 *
 * ASCII is a strict subset of UTF-8 for every 7-bit-clean code point, so this
 * reuses the UTF-8 encoder; callers are responsible for the ASCII contract.
 *
 * @param {string} value input string, expected to be 7-bit ASCII
 * @returns {Uint8Array} encoded bytes
 */
export function asciiBytes(value: string): Uint8Array;
/**
 * Decode exact UTF-8 bytes to a string, throwing on malformed input.
 *
 * @param {Uint8Array} bytes source bytes
 * @returns {string} decoded string
 */
export function decodeUtf8(bytes: Uint8Array): string;
/**
 * Decode a lowercase hexadecimal string to bytes.
 *
 * @param {string} hex lowercase hexadecimal string
 * @returns {Uint8Array} decoded bytes
 */
export function bytesFromHex(hex: string): Uint8Array;
/**
 * Encode bytes to a lowercase hexadecimal string.
 *
 * @param {Uint8Array} bytes source bytes
 * @returns {string} lowercase hex
 */
export function hexFromBytes(bytes: Uint8Array): string;
/**
 * Compare two byte sequences lexicographically by unsigned byte value.
 *
 * @param {Uint8Array} left left operand
 * @param {Uint8Array} right right operand
 * @returns {-1 | 0 | 1} byte-lexicographic order
 */
export function compareBytes(left: Uint8Array, right: Uint8Array): -1 | 0 | 1;
/**
 * Test two byte sequences for exact equality.
 *
 * @param {Uint8Array} left left operand
 * @param {Uint8Array} right right operand
 * @returns {boolean} whether the sequences are byte-identical
 */
export function bytesEqual(left: Uint8Array, right: Uint8Array): boolean;
/**
 * Concatenate byte sequences into one new Uint8Array.
 *
 * @param {readonly Uint8Array[]} parts byte sequences, in order
 * @returns {Uint8Array} concatenated bytes
 */
export function concatBytes(parts: readonly Uint8Array[]): Uint8Array;
/**
 * Read a big-endian unsigned 32-bit integer at an exact byte offset.
 *
 * @param {Uint8Array} bytes source bytes
 * @param {number} offset byte offset
 * @returns {number} unsigned 32-bit value
 */
export function readUint32BigEndian(bytes: Uint8Array, offset: number): number;
/**
 * Read a big-endian unsigned 64-bit integer at an exact byte offset.
 *
 * @param {Uint8Array} bytes source bytes
 * @param {number} offset byte offset
 * @returns {bigint} unsigned 64-bit value
 */
export function readUint64BigEndian(bytes: Uint8Array, offset: number): bigint;
/**
 * Find the first offset of an ASCII/Latin-1 needle within bytes, from a start
 * offset, matching Buffer#indexOf's single-byte-per-character semantics.
 *
 * @param {Uint8Array} bytes haystack bytes
 * @param {string} needle 7-bit ASCII search string
 * @param {number} from inclusive start offset
 * @returns {number} matched offset, or -1
 */
export function indexOfAscii(bytes: Uint8Array, needle: string, from: number): number;
/**
 * Decode a byte range as Latin-1 (one code unit per byte).
 *
 * @param {Uint8Array} bytes source bytes
 * @param {number} start inclusive start offset
 * @param {number} end exclusive end offset
 * @returns {string} decoded string
 */
export function decodeLatin1(bytes: Uint8Array, start: number, end: number): string;
