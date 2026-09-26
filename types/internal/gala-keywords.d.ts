/**
 * `x-gala-asciiByteLength`: every scalar is ASCII and the byte (== code
 * unit, for ASCII) length is within bounds.
 *
 * @param {{minimum?: number, maximum?: number}} bounds declared bounds
 * @param {string} value candidate string
 * @returns {boolean} whether the value satisfies the keyword
 */
export function galaAsciiByteLength(bounds: {
    minimum?: number;
    maximum?: number;
}, value: string): boolean;
/**
 * `x-gala-utf8ByteLength`: the value is Unicode-scalar-clean and its UTF-8
 * byte length is within bounds.
 *
 * @param {{minimum?: number, maximum?: number}} bounds declared bounds
 * @param {string} value candidate string
 * @returns {boolean} whether the value satisfies the keyword
 */
export function galaUtf8ByteLength(bounds: {
    minimum?: number;
    maximum?: number;
}, value: string): boolean;
/**
 * `x-gala-graphemeLength`: the UAX #29 extended grapheme cluster count is
 * within bounds.
 *
 * @param {{minimum?: number, maximum?: number}} bounds declared bounds
 * @param {string} value candidate string
 * @returns {boolean} whether the value satisfies the keyword
 */
export function galaGraphemeLength(bounds: {
    minimum?: number;
    maximum?: number;
}, value: string): boolean;
/**
 * `x-gala-maxCanonicalBytes`: the RFC 8785 JCS-canonicalized byte length of
 * the whole value does not exceed the declared maximum.
 *
 * @param {number} maximum declared inclusive maximum
 * @param {unknown} value candidate value
 * @returns {boolean} whether the value satisfies the keyword
 */
export function galaMaxCanonicalBytes(maximum: number, value: unknown): boolean;
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
export function galaMaximum(maximum: number | string, value: unknown): boolean;
/**
 * `x-gala-decision-phase`: pure annotation, not an assertion. It marks
 * which DEC-097 lifecycle phase (issuance vs. deploy) a property belongs to
 * for digest scoping (see LOCAL-62 in README.md) and carries no independent
 * validation rule of its own.
 *
 * @returns {true} always valid
 */
export function galaDecisionPhase(): true;
