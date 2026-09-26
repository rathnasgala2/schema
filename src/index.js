/**
 * Galascribe's executable schema catalog.
 *
 * @module
 */

import {
  REGISTERED_SCHEMA_IDS,
  validateRegisteredDocument,
} from './internal/browser-schema-validator.js';

/** Exact immutable identities accepted by the validator registry. */
export const GALA_SCHEMA_IDS = REGISTERED_SCHEMA_IDS;

/**
 * Validate one complete Gala document and return stable diagnostics.
 *
 * @param {string} schemaId exact immutable schema identity
 * @param {unknown} value document value
 * @returns {import('./internal/browser-schema-validator.js').GalaValidationResult} validation result
 */
export function validateGalaDocument(schemaId, value) {
  return validateRegisteredDocument(schemaId, value);
}
