/**
 * Parse an exact canonical dotted-decimal IPv4 address.
 *
 * @param {string} input source spelling
 * @returns {{ bytes: number[], value: bigint }} parsed address
 */
export function parseCanonicalIpv4(input: string): {
    bytes: number[];
    value: bigint;
};
/**
 * Convert an unsigned 32-bit value to canonical dotted decimal.
 *
 * @param {bigint} value address value
 * @returns {string} canonical spelling
 */
export function formatIpv4(value: bigint): string;
/**
 * Parse an IPv6 spelling into eight 16-bit words.
 *
 * The parser accepts alternate spellings so callers can compare the formatted
 * result with the source when canonical bytes are required.
 *
 * @param {string} input source spelling without brackets
 * @returns {{ words: number[], value: bigint }} parsed address
 */
export function parseIpv6(input: string): {
    words: number[];
    value: bigint;
};
/**
 * Format an IPv6 value with RFC 5952 lowercase longest-leftmost compression.
 *
 * @param {bigint} value unsigned 128-bit address
 * @param {boolean} [mixedMapped] use RFC 5952 section 5 mapped-address form
 * @returns {string} canonical spelling
 */
export function formatIpv6(value: bigint, mixedMapped?: boolean): string;
/**
 * Parse and require one canonical CIDR used by the pinned IANA registries.
 *
 * @param {string} input CIDR spelling
 * @returns {{ family: 4 | 6, network: bigint, prefix: number }} parsed CIDR
 */
export function parseCanonicalCidr(input: string): {
    family: 4 | 6;
    network: bigint;
    prefix: number;
};
/**
 * Require an IPv6 source spelling to be its canonical origin form.
 *
 * @param {string} input spelling without brackets
 * @returns {{ words: number[], value: bigint }} parsed address
 */
export function parseCanonicalOriginIpv6(input: string): {
    words: number[];
    value: bigint;
};
