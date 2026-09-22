/**
 * Project a public-runtime-origins record for its self-excluding digest.
 *
 * @param {unknown} value complete or pre-digest runtime-origins record
 * @returns {Record<string, unknown>} record without payloadDigest
 */
export function projectPublicRuntimeOrigins(value: unknown): Record<string, unknown>;
/**
 * Compute the runtime-origins self-excluding domain-separated digest.
 *
 * @param {unknown} value complete or pre-digest runtime-origins record
 * @returns {string} tagged SHA-256 digest
 */
export function digestPublicRuntimeOrigins(value: unknown): string;
/**
 * Validate runtime-origin time, digest and exact App binding semantics.
 *
 * @param {unknown} value structurally valid runtime-origins record
 * @param {unknown} expectedBinding expected catalog, document-origin and observation binding
 * @returns {void}
 */
export function validatePublicRuntimeOrigins(value: unknown, expectedBinding: unknown): void;
