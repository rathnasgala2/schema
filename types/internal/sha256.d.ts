/**
 * Compute the SHA-256 digest of exact bytes.
 *
 * @param {Uint8Array} message exact preimage bytes
 * @returns {Uint8Array} 32-byte digest
 */
export function sha256(message: Uint8Array): Uint8Array;
