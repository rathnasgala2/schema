/**
 * Decode one lowercase ASCII Punycode payload.
 *
 * @param {string} input payload after xn--
 * @returns {string} decoded Unicode label
 */
export function decodePunycode(input: string): string;
/**
 * Encode one normalized Unicode label as lowercase Punycode.
 *
 * @param {string} input normalized label
 * @returns {string} Punycode payload
 */
export function encodePunycode(input: string): string;
/**
 * Convert a DNS name with the pinned Unicode 17 UTS #46 profile.
 *
 * @param {string} input source DNS name
 * @returns {string} lowercase canonical ASCII DNS name
 */
export function toAsciiDomain17(input: string): string;
/**
 * Require a DNS name to equal its canonical Unicode-17 ASCII form.
 *
 * @param {string} input stored DNS name
 * @returns {void}
 */
export function validateCanonicalAsciiDomain17(input: string): void;
