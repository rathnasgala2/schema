/**
 * Narrow browser entry point for the public runtime-origins contract.
 *
 * The package root (`.`) binds all twenty contracts, which transitively
 * pins the SPDX licence list, the Unicode 17 tables, the IANA language
 * subtag registry and the complete 7,804-rule diagnostic map — around 5.3 MB
 * of source data that a browser bundle pays for in full. A client that only
 * reads and writes `urn:gala:schema:public-runtime-origins:2.0.0` needs none
 * of the SPDX material and none of the other nineteen contracts' rules, so
 * this entry point binds exactly that one schema and exactly that one
 * contract's slice of the diagnostic map, through the same validator core
 * and the same format semantics as the root export. Identical inputs
 * therefore produce identical diagnostics; the only difference is what is
 * absent.
 *
 * Like the `.` export, this binds a precompiled standalone validator
 * (SCH-C2): no runtime `ajv.compile()` happens at import.
 *
 * The `.` export is unchanged and remains the general-purpose surface.
 *
 * @module
 */

import diagnosticMap from '../diagnostics/diagnostic-map.public-runtime-origins.json' with { type: 'json' };
import { SCHEMA_VALIDATORS } from '../generated/browser/runtime-origins-validator-core.mjs';
import { createPrecompiledValidatorSuite } from './internal/validator-core.js';

const SUITE = createPrecompiledValidatorSuite({
  validators: SCHEMA_VALIDATORS,
  diagnosticMap:
    /** @type {import('./internal/validator-core.js').DiagnosticMap} */ (
      diagnosticMap
    ),
});

/** The one schema identity this narrow entry point accepts. */
export const RUNTIME_ORIGINS_SCHEMA_ID =
  'urn:gala:schema:public-runtime-origins:2.0.0';

/** Exact immutable identities accepted by this entry point. */
export const GALA_SCHEMA_IDS = SUITE.schemaIds;

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
export function validateRuntimeOriginsDocument(schemaId, value) {
  return SUITE.validateDocument(schemaId, value);
}
