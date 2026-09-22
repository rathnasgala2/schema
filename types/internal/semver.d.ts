/**
 * Parse one canonical SemVer 2.0.0 value without a numeric-size bound.
 *
 * @param {string} source authored version
 * @returns {{ source: string, major: bigint, minor: bigint, patch: bigint, prerelease: string[] }} parsed version
 */
export function parseSemver(source: string): {
    source: string;
    major: bigint;
    minor: bigint;
    patch: bigint;
    prerelease: string[];
};
/**
 * Compare two parsed canonical SemVer values by SemVer precedence.
 *
 * @param {ReturnType<typeof parseSemver>} left left value
 * @param {ReturnType<typeof parseSemver>} right right value
 * @returns {-1 | 0 | 1} precedence comparison
 */
export function compareParsedSemver(left: ReturnType<typeof parseSemver>, right: ReturnType<typeof parseSemver>): -1 | 0 | 1;
/**
 * Compare two canonical SemVer strings.
 *
 * @param {string} left left value
 * @param {string} right right value
 * @returns {-1 | 0 | 1} precedence comparison
 */
export function compareSemver(left: string, right: string): -1 | 0 | 1;
/**
 * Parse the exact DEC-099 semantic-version range grammar.
 *
 * @param {string} source authored range
 * @returns {{ source: string, kind: 'exact' | 'caret' | 'bounded', comparators: { operator: string, version: ReturnType<typeof parseSemver> }[] }} parsed range
 */
export function parseSemverRange(source: string): {
    source: string;
    kind: "exact" | "caret" | "bounded";
    comparators: {
        operator: string;
        version: ReturnType<typeof parseSemver>;
    }[];
};
/**
 * Evaluate a canonical candidate against an admitted DEC-099 range.
 *
 * @param {string} candidateSource canonical SemVer candidate
 * @param {string} rangeSource admitted range
 * @returns {boolean} whether the candidate satisfies the range
 */
export function satisfiesSemverRange(candidateSource: string, rangeSource: string): boolean;
/**
 * Error carrying one stable semantic diagnostic code.
 */
export class SemanticValidationError extends Error {
    /**
     * Create a semantic validation error.
     *
     * @param {string} code normalized diagnostic code
     */
    constructor(code: string);
    code: string;
}
