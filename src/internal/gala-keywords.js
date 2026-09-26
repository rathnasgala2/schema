/**
 * Pure implementations of Gala's `x-gala-*` assertion keywords.
 *
 * This is the single source of truth for what each keyword means; it is
 * consumed two ways, by two different Ajv wiring styles that cannot share
 * more than this:
 *
 * - `validator-core.js`'s `addGalaKeywords` wraps each function in a
 *   closure-based `ajv.addKeyword({validate: ...})` for the runtime-compiled
 *   registry used by the Node-only fixture and parity tooling.
 * - `codegen/generate-contracts.ts`'s browser core generator wraps each
 *   function in a `code`-based `ajv.addKeyword({code: ...})` definition, so
 *   Ajv's standalone output calls these functions directly by their real
 *   ESM import instead of trying to serialize a closure (SCH-C2).
 *
 * @module
 */

import { canonicalizeJcsBytes } from './canonical-jcs.js';
import { utf8Bytes } from './bytes.js';
import { assertUnicodeScalarString, graphemeLength17 } from './unicode17.js';

/**
 * Test inclusive bounds.
 *
 * @param {number} value measured value
 * @param {{minimum?: number, maximum?: number}} bounds inclusive bounds
 * @returns {boolean} whether the value is in range
 */
function withinBounds(value, bounds) {
  return (
    (bounds.minimum === undefined || value >= bounds.minimum) &&
    (bounds.maximum === undefined || value <= bounds.maximum)
  );
}

/**
 * `x-gala-asciiByteLength`: every scalar is ASCII and the byte (== code
 * unit, for ASCII) length is within bounds.
 *
 * @param {{minimum?: number, maximum?: number}} bounds declared bounds
 * @param {string} value candidate string
 * @returns {boolean} whether the value satisfies the keyword
 */
export function galaAsciiByteLength(bounds, value) {
  return (
    [...value].every((character) => character.charCodeAt(0) <= 0x7f) &&
    withinBounds(value.length, bounds)
  );
}

/**
 * `x-gala-utf8ByteLength`: the value is Unicode-scalar-clean and its UTF-8
 * byte length is within bounds.
 *
 * @param {{minimum?: number, maximum?: number}} bounds declared bounds
 * @param {string} value candidate string
 * @returns {boolean} whether the value satisfies the keyword
 */
export function galaUtf8ByteLength(bounds, value) {
  try {
    assertUnicodeScalarString(value);
    return withinBounds(utf8Bytes(value).length, bounds);
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message === 'UNICODE_SCALAR_INVALID'
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * `x-gala-graphemeLength`: the UAX #29 extended grapheme cluster count is
 * within bounds.
 *
 * @param {{minimum?: number, maximum?: number}} bounds declared bounds
 * @param {string} value candidate string
 * @returns {boolean} whether the value satisfies the keyword
 */
export function galaGraphemeLength(bounds, value) {
  try {
    return withinBounds(graphemeLength17(value), bounds);
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message === 'UNICODE_SCALAR_INVALID'
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * `x-gala-maxCanonicalBytes`: the RFC 8785 JCS-canonicalized byte length of
 * the whole value does not exceed the declared maximum.
 *
 * @param {number} maximum declared inclusive maximum
 * @param {unknown} value candidate value
 * @returns {boolean} whether the value satisfies the keyword
 */
export function galaMaxCanonicalBytes(maximum, value) {
  try {
    return canonicalizeJcsBytes(value).byteLength <= maximum;
  } catch {
    return false;
  }
}

/**
 * `x-gala-maximum`: the value, read as a non-negative decimal integer, does
 * not exceed the declared maximum.
 *
 * Fails closed (SCH-H13): a range assertion in a package whose README
 * describes it as fail-closed must reject what it cannot evaluate rather
 * than defer to a pattern/format keyword that may not be present on every
 * `$def` using this keyword (see SCH-C3).
 *
 * @param {number | string} maximum declared inclusive maximum
 * @param {unknown} value candidate value
 * @returns {boolean} whether the value satisfies the keyword
 */
export function galaMaximum(maximum, value) {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  if (typeof value === 'string' && !/^(?:0|[1-9][0-9]*)$/u.test(value)) {
    return false;
  }
  try {
    return BigInt(value) <= BigInt(maximum);
  } catch {
    return false;
  }
}

/**
 * `x-gala-decision-phase`: pure annotation, not an assertion. It marks
 * which DEC-097 lifecycle phase (issuance vs. deploy) a property belongs to
 * for digest scoping (see LOCAL-62 in README.md) and carries no independent
 * validation rule of its own.
 *
 * @returns {true} always valid
 */
export function galaDecisionPhase() {
  return true;
}
