/**
 * Validate Gala's canonical UTC-millisecond RFC-3339 subset.
 *
 * @param {string} value timestamp spelling
 * @returns {void}
 */
export function validateRfc3339(value: string): void;
/**
 * Parse and validate one exact DEC-099 repository glob.
 *
 * @param {string} pattern authored pattern
 * @returns {string[]} validated pattern segments
 */
export function parseRepositoryGlob(pattern: string): string[];
/**
 * Match a validated repository glob against a canonical root-relative path.
 *
 * @param {string} pattern repository glob
 * @param {string} candidate canonical candidate path
 * @returns {boolean} match result
 */
export function matchRepositoryGlob(pattern: string, candidate: string): boolean;
/**
 * Select canonical paths using include-then-exclude semantics and UTF-8 order.
 *
 * @param {string[]} includes include globs
 * @param {string[]} excludes exclude globs
 * @param {string[]} candidates canonical candidate paths
 * @returns {string[]} selected unique paths
 */
export function selectRepositoryPaths(includes: string[], excludes: string[], candidates: string[]): string[];
