/**
 * Convert scalar values without exceeding the engine's argument-count limit.
 *
 * @param {number[]} values Unicode scalar values
 * @returns {string} scalar string
 */
export function stringFromCodePoints(values: number[]): string;
/**
 * Assert that a JavaScript string contains only Unicode scalar values.
 *
 * @param {string} value input string
 * @returns {void}
 */
export function assertUnicodeScalarString(value: string): void;
/**
 * Look up the Unicode 17 canonical combining class.
 *
 * @param {number} codePoint Unicode scalar
 * @returns {number} canonical combining class
 */
export function canonicalCombiningClass(codePoint: number): number;
/**
 * Return the Unicode 17 General_Category value.
 *
 * @param {number} codePoint Unicode scalar
 * @returns {string} general category
 */
export function generalCategory17(codePoint: number): string;
/**
 * Return the Unicode 17 Bidi_Class value.
 *
 * @param {number} codePoint Unicode scalar
 * @returns {string} bidi class
 */
export function bidiClass17(codePoint: number): string;
/**
 * Return the Unicode 17 UTS #46 mapping row for one scalar.
 *
 * @param {number} codePoint Unicode scalar
 * @returns {{ status: string, mapping: number[] }} mapping row
 */
export function idnaMapping17(codePoint: number): {
    status: string;
    mapping: number[];
};
/**
 * Normalize a scalar string with Unicode 17 canonical NFC.
 *
 * @param {string} value input string
 * @returns {string} Unicode 17 NFC
 */
export function normalizeNfc17(value: string): string;
/**
 * Compute the Unicode 17 NFC/default-case-fold collision key.
 *
 * @param {string} value input string
 * @returns {string} folded NFC string
 */
export function unicodeCollisionKey17(value: string): string;
/**
 * Return the Unicode 17 Joining_Type value.
 *
 * @param {number} codePoint Unicode scalar
 * @returns {string} abbreviated Joining_Type
 */
export function joiningType17(codePoint: number): string;
/**
 * Enforce the DEC-099 ContextJ algorithm on one post-map, post-NFC label.
 *
 * @param {string} label normalized label
 * @returns {void}
 */
export function checkJoiners17(label: string): void;
/**
 * Return Unicode 17 extended-grapheme boundary offsets in scalar indexes.
 *
 * @param {string} value input string
 * @returns {number[]} boundary offsets including zero and scalar length
 */
export function graphemeBoundaries17(value: string): number[];
/**
 * Count Unicode 17 default extended grapheme clusters.
 *
 * @param {string} value input string
 * @returns {number} cluster count
 */
export function graphemeLength17(value: string): number;
export type PropertyRange = [number, number, string];
