/**
 * Validate one complete public runtime-origins document.
 *
 * Any other schema identity fails closed with `SCHEMA_VERSION_UNSUPPORTED`,
 * exactly as an unknown identity does at the package root.
 *
 * @param {string} schemaId exact immutable schema identity
 * @param {unknown} value document value
 * @returns {import('./internal/validator-core.js').GalaValidationResult} validation result
 */
export function validateRuntimeOriginsDocument(schemaId: string, value: unknown): import("./internal/validator-core.js").GalaValidationResult;
/** The one schema identity this narrow entry point accepts. */
export const RUNTIME_ORIGINS_SCHEMA_ID: "urn:gala:schema:public-runtime-origins:2.0.0";
/** Exact immutable identities accepted by this entry point. */
export const GALA_SCHEMA_IDS: readonly string[];
