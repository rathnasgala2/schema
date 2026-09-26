import { validateGalaFormatCore } from './format-validators-core.js';
import { validateSpdxExpression } from './spdx.js';

/**
 * Validate one custom Gala string format for fixture generation and audits.
 * Unknown format names fail closed.
 *
 * The complete 20-contract surface needs `gala-spdx-expression`, so this
 * module adds that one branch on top of the browser-light core dispatcher and
 * delegates everything else unchanged. Importing this module pulls in the
 * pinned SPDX licence list; importing the core does not.
 *
 * @param {string} formatName custom format name
 * @param {string} value candidate string
 * @returns {boolean} whether the value satisfies the format
 */
export function validateGalaFormat(formatName, value) {
  if (typeof value !== 'string') return false;
  if (formatName === 'gala-spdx-expression') {
    try {
      validateSpdxExpression(value);
      return true;
    } catch {
      return false;
    }
  }
  return validateGalaFormatCore(formatName, value);
}
