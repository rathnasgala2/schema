/**
 * Validate one custom Gala string format, except `gala-spdx-expression`.
 * Unknown format names fail closed.
 *
 * This is everything the Gala format vocabulary needs apart from the SPDX
 * licence expression grammar, which alone pulls in the 4.5 MB pinned SPDX
 * licence list. Contracts that do not use `gala-spdx-expression` bind this
 * module directly and never carry that table; `format-validators.js` adds the
 * SPDX branch back for the full 19-contract surface.
 *
 * @param {string} formatName custom format name
 * @param {string} value candidate string
 * @returns {boolean} whether the value satisfies the format
 */
export function validateGalaFormatCore(formatName: string, value: string): boolean;
