/**
 * Validate one complete Gala document and return stable diagnostics.
 *
 * @param {string} schemaId exact immutable schema identity
 * @param {unknown} value document value
 * @returns {GalaValidationResult} validation result
 */
export function validateRegisteredDocument(schemaId: string, value: unknown): GalaValidationResult;
/**
 * @typedef {import('./validator-core.js').GalaDiagnostic} GalaDiagnostic
 * @typedef {import('./validator-core.js').GalaValidationResult} GalaValidationResult
 */
/** Exact immutable identities accepted by the public registry. */
export const REGISTERED_SCHEMA_IDS: readonly string[];
export type GalaDiagnostic = import("./validator-core.js").GalaDiagnostic;
export type GalaValidationResult = import("./validator-core.js").GalaValidationResult;
