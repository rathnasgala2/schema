/**
 * Validate one complete Gala document against an exact registered schema identity.
 *
 * @param {string} schemaId exact immutable schema identity
 * @param {unknown} value document value
 * @returns {GalaValidationResult} frozen validation result
 */
export function validateRegisteredDocument(schemaId: string, value: unknown): GalaValidationResult;
/**
 * Validate a fixture value against one registered schema fragment.
 *
 * This is the private cross-language parity seam; package consumers validate
 * complete documents through validateGalaDocument.
 *
 * @param {string} schemaId exact immutable schema identity
 * @param {string} schemaPointer local JSON Pointer
 * @param {unknown} value fixture value
 * @returns {{valid: boolean, codes: string[], keywords: string[]}} normalized result
 */
export function validateRegisteredFragment(schemaId: string, schemaPointer: string, value: unknown): {
    valid: boolean;
    codes: string[];
    keywords: string[];
};
/**
 * Validate only the cardinality and uniqueness assertions of a large array.
 *
 * Item schemas are validated separately by the parity harness so compact
 * recipes never allocate hundreds of thousands of complex object witnesses.
 *
 * @param {{minItems?: number, maxItems?: number, uniqueItems?: boolean}} schema array schema
 * @param {number} length logical fixture length
 * @returns {{valid: boolean, codes: string[], keywords: string[]}} normalized result
 */
export function validateArrayCardinality(schema: {
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
}, length: number): {
    valid: boolean;
    codes: string[];
    keywords: string[];
};
/** Exact immutable identities accepted by the public validator. */
export const REGISTERED_SCHEMA_IDS: readonly string[];
export type GalaDiagnostic = import("./validator-core.js").GalaDiagnostic;
export type GalaValidationResult = import("./validator-core.js").GalaValidationResult;
