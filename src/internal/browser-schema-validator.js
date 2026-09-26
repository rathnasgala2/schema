/**
 * The public `.` export's validator suite, bound to the precompiled browser
 * standalone core (SCH-C2) instead of a runtime `ajv.compile()`.
 *
 * `src/internal/schema-validator.js` -- the runtime-compiled equivalent --
 * stays in place for `scripts/validator-parity.mjs` (the Node-only fixture
 * and cross-language parity tooling), which additionally needs fragment-
 * and cardinality-level validation the precompiled core does not carry.
 * The public `.` export only ever needed whole-document validation, so it
 * moves to this module instead.
 *
 * @module
 */

import diagnosticMap from '../../diagnostics/diagnostic-map.json' with { type: 'json' };
import { SCHEMA_VALIDATORS } from '../../generated/browser/validator-core.mjs';
import { createPrecompiledValidatorSuite } from './validator-core.js';

const SUITE = createPrecompiledValidatorSuite({
  validators: SCHEMA_VALIDATORS,
  diagnosticMap: /** @type {import('./validator-core.js').DiagnosticMap} */ (
    diagnosticMap
  ),
});

/**
 * @typedef {import('./validator-core.js').GalaDiagnostic} GalaDiagnostic
 * @typedef {import('./validator-core.js').GalaValidationResult} GalaValidationResult
 */

/** Exact immutable identities accepted by the public registry. */
export const REGISTERED_SCHEMA_IDS = SUITE.schemaIds;

/**
 * Validate one complete Gala document and return stable diagnostics.
 *
 * @param {string} schemaId exact immutable schema identity
 * @param {unknown} value document value
 * @returns {GalaValidationResult} validation result
 */
export function validateRegisteredDocument(schemaId, value) {
  return SUITE.validateDocument(schemaId, value);
}
