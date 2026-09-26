/**
 * Validate one complete Gala document and return stable diagnostics.
 *
 * @param {string} schemaId exact immutable schema identity
 * @param {unknown} value document value
 * @returns {import('./internal/browser-schema-validator.js').GalaValidationResult} validation result
 */
export function validateGalaDocument(schemaId: string, value: unknown): import("./internal/browser-schema-validator.js").GalaValidationResult;
/** Exact immutable identities accepted by the validator registry. */
export const GALA_SCHEMA_IDS: readonly string[];
