/**
 * Canonicalize an I-JSON value according to RFC 8785.
 *
 * @param {unknown} value input value
 * @returns {string} canonical JSON text
 */
export function canonicalizeJcs(value: unknown): string;
/**
 * Canonicalize an I-JSON value to exact UTF-8 bytes.
 *
 * @param {unknown} value input value
 * @returns {Uint8Array} canonical JSON bytes
 */
export function canonicalizeJcsBytes(value: unknown): Uint8Array;
/**
 * Parse duplicate-key-free UTF-8 I-JSON bytes.
 *
 * @param {Uint8Array} bytes exact source bytes
 * @returns {unknown} parsed JSON value
 */
export function parseDuplicateFreeIJson(bytes: Uint8Array): unknown;
/**
 * Hash exact bytes and return the portable tagged SHA-256 spelling.
 *
 * @param {Uint8Array} bytes exact preimage bytes
 * @returns {string} tagged digest
 */
export function sha256Tagged(bytes: Uint8Array): string;
/**
 * Hash a terminal-NUL domain followed by exact bytes.
 *
 * @param {string} domain literal domain including its terminal NUL
 * @param {Uint8Array} bytes exact projected bytes
 * @returns {string} tagged digest
 */
export function domainSeparatedSha256(domain: string, bytes: Uint8Array): string;
/**
 * Decode a portable tagged SHA-256 value to its fixed 32 octets.
 *
 * @param {string} digest tagged digest
 * @returns {Uint8Array} decoded digest bytes
 */
export function decodeTaggedSha256(digest: string): Uint8Array;
