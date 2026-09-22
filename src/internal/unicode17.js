import unicodeTable from './generated/unicode17.json' with { type: 'json' };

/** @typedef {[number, number, string]} PropertyRange */

const table = /** @type {{
  combiningClasses: [number, number][],
  decompositions: [number, number[]][],
  compositions: [number, number, number][],
  caseFolding: [number, number[]][],
  generalCategories: PropertyRange[],
  bidiClasses: PropertyRange[],
  idna: [number, number, string, number[]][],
  joiningType: PropertyRange[],
  graphemeBreak: PropertyRange[],
  indicConjunctBreak: PropertyRange[],
  extendedPictographic: PropertyRange[]
}} */ (/** @type {unknown} */ (unicodeTable));

const HANGUL = Object.freeze({
  syllableBase: 0xac00,
  leadingBase: 0x1100,
  vowelBase: 0x1161,
  trailingBase: 0x11a7,
  leadingCount: 19,
  vowelCount: 21,
  trailingCount: 28,
  syllableCount: 11_172,
});
const HANGUL_BLOCK_COUNT = HANGUL.vowelCount * HANGUL.trailingCount;

const combiningClasses = new Map(table.combiningClasses);
const decompositions = new Map(table.decompositions);
const compositions = new Map(
  table.compositions.map(([first, second, composite]) => [
    `${first},${second}`,
    composite,
  ]),
);
const caseFolding = new Map(table.caseFolding);
const COMBINING_CLASS_COUNT = 256;
const CODE_POINT_CHUNK = 8_192;

/**
 * Return the scalar value of one already validated character.
 *
 * @param {string} character one Unicode scalar
 * @returns {number} scalar value
 */
function scalarCodePoint(character) {
  const codePoint = character.codePointAt(0);
  if (codePoint === undefined) throw new TypeError('UNICODE_SCALAR_INVALID');
  return codePoint;
}

/**
 * Read one required numeric array member.
 *
 * @param {number[]} values numeric array
 * @param {number} index required offset
 * @returns {number} array member
 */
function requiredNumber(values, index) {
  const value = values[index];
  if (value === undefined) throw new TypeError('UNICODE_DATA_INVALID');
  return value;
}

/**
 * Convert scalar values without exceeding the engine's argument-count limit.
 *
 * @param {number[]} values Unicode scalar values
 * @returns {string} scalar string
 */
export function stringFromCodePoints(values) {
  const chunks = [];
  for (let index = 0; index < values.length; index += CODE_POINT_CHUNK) {
    chunks.push(
      String.fromCodePoint(...values.slice(index, index + CODE_POINT_CHUNK)),
    );
  }
  return chunks.join('');
}

/**
 * Assert that a JavaScript string contains only Unicode scalar values.
 *
 * @param {string} value input string
 * @returns {void}
 */
export function assertUnicodeScalarString(value) {
  for (let index = 0; index < value.length; index += 1) {
    const current = value.charCodeAt(index);
    if (current >= 0xd800 && current <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) {
        throw new TypeError('UNICODE_SCALAR_INVALID');
      }
      index += 1;
    } else if (current >= 0xdc00 && current <= 0xdfff) {
      throw new TypeError('UNICODE_SCALAR_INVALID');
    }
  }
}

/**
 * Find a generated range property with a binary search.
 *
 * @param {number} codePoint Unicode scalar
 * @param {PropertyRange[]} ranges sorted inclusive ranges
 * @param {string} fallback default property
 * @returns {string} property value
 */
function rangeProperty(codePoint, ranges, fallback) {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const range = ranges[middle];
    if (!range) break;
    const first = range[0];
    const last = range[1];
    const value = range[2];
    if (typeof first !== 'number' || typeof last !== 'number') break;
    if (codePoint < first) high = middle - 1;
    else if (codePoint > last) low = middle + 1;
    else return typeof value === 'string' ? value : fallback;
  }
  return fallback;
}

/**
 * Test membership in one generated range set.
 *
 * @param {number} codePoint Unicode scalar
 * @param {PropertyRange[]} ranges sorted inclusive ranges
 * @returns {boolean} membership
 */
function inRanges(codePoint, ranges) {
  return rangeProperty(codePoint, ranges, '') !== '';
}

/**
 * Recursively append one canonical decomposition.
 *
 * @param {number} codePoint Unicode scalar
 * @param {number[]} output decomposition destination
 * @returns {void}
 */
function decompose(codePoint, output) {
  const syllableIndex = codePoint - HANGUL.syllableBase;
  if (syllableIndex >= 0 && syllableIndex < HANGUL.syllableCount) {
    const leading =
      HANGUL.leadingBase + Math.floor(syllableIndex / HANGUL_BLOCK_COUNT);
    const vowel =
      HANGUL.vowelBase +
      Math.floor((syllableIndex % HANGUL_BLOCK_COUNT) / HANGUL.trailingCount);
    const trailing =
      HANGUL.trailingBase + (syllableIndex % HANGUL.trailingCount);
    output.push(leading, vowel);
    if (trailing !== HANGUL.trailingBase) output.push(trailing);
    return;
  }
  const decomposition = decompositions.get(codePoint);
  if (!decomposition) {
    output.push(codePoint);
    return;
  }
  for (const component of decomposition) decompose(component, output);
}

/**
 * Look up the Unicode 17 canonical combining class.
 *
 * @param {number} codePoint Unicode scalar
 * @returns {number} canonical combining class
 */
export function canonicalCombiningClass(codePoint) {
  return combiningClasses.get(codePoint) ?? 0;
}

/**
 * Return the Unicode 17 General_Category value.
 *
 * @param {number} codePoint Unicode scalar
 * @returns {string} general category
 */
export function generalCategory17(codePoint) {
  return rangeProperty(codePoint, table.generalCategories, 'Cn');
}

/**
 * Return the Unicode 17 Bidi_Class value.
 *
 * @param {number} codePoint Unicode scalar
 * @returns {string} bidi class
 */
export function bidiClass17(codePoint) {
  return rangeProperty(codePoint, table.bidiClasses, 'L');
}

/**
 * Return the Unicode 17 UTS #46 mapping row for one scalar.
 *
 * @param {number} codePoint Unicode scalar
 * @returns {{ status: string, mapping: number[] }} mapping row
 */
export function idnaMapping17(codePoint) {
  let low = 0;
  let high = table.idna.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const range = table.idna[middle];
    if (!range) break;
    if (codePoint < range[0]) high = middle - 1;
    else if (codePoint > range[1]) low = middle + 1;
    else return { status: range[2], mapping: range[3] };
  }
  throw new TypeError('IDNA_INVALID');
}

/**
 * Canonically compose one scalar pair, including algorithmic Hangul.
 *
 * @param {number} first starter scalar
 * @param {number} second following scalar
 * @returns {number | undefined} composite scalar
 */
function composePair(first, second) {
  const leadingIndex = first - HANGUL.leadingBase;
  const vowelIndex = second - HANGUL.vowelBase;
  if (
    leadingIndex >= 0 &&
    leadingIndex < HANGUL.leadingCount &&
    vowelIndex >= 0 &&
    vowelIndex < HANGUL.vowelCount
  ) {
    return (
      HANGUL.syllableBase +
      (leadingIndex * HANGUL.vowelCount + vowelIndex) * HANGUL.trailingCount
    );
  }
  const syllableIndex = first - HANGUL.syllableBase;
  const trailingIndex = second - HANGUL.trailingBase;
  if (
    syllableIndex >= 0 &&
    syllableIndex < HANGUL.syllableCount &&
    syllableIndex % HANGUL.trailingCount === 0 &&
    trailingIndex > 0 &&
    trailingIndex < HANGUL.trailingCount
  ) {
    return first + trailingIndex;
  }
  return compositions.get(`${first},${second}`);
}

/**
 * Normalize a scalar string with Unicode 17 canonical NFC.
 *
 * @param {string} value input string
 * @returns {string} Unicode 17 NFC
 */
export function normalizeNfc17(value) {
  assertUnicodeScalarString(value);
  /** @type {number[]} */
  const ordered = [];
  /** @type {number[][]} */
  const combiningBuckets = Array.from(
    { length: COMBINING_CLASS_COUNT },
    () => [],
  );
  /** @type {number[]} */
  const activeCombiningClasses = [];
  for (const character of value) {
    /** @type {number[]} */
    const decomposition = [];
    decompose(scalarCodePoint(character), decomposition);
    for (const codePoint of decomposition) {
      const combiningClass = canonicalCombiningClass(codePoint);
      if (combiningClass === 0) {
        activeCombiningClasses.sort((left, right) => left - right);
        for (const activeClass of activeCombiningClasses) {
          const bucket = combiningBuckets[activeClass];
          if (bucket === undefined) throw new TypeError('UNICODE_DATA_INVALID');
          for (const item of bucket) ordered.push(item);
          bucket.length = 0;
        }
        activeCombiningClasses.length = 0;
        ordered.push(codePoint);
      } else {
        const bucket = combiningBuckets[combiningClass];
        if (bucket === undefined) throw new TypeError('UNICODE_DATA_INVALID');
        if (bucket.length === 0) activeCombiningClasses.push(combiningClass);
        bucket.push(codePoint);
      }
    }
  }
  activeCombiningClasses.sort((left, right) => left - right);
  for (const activeClass of activeCombiningClasses) {
    const bucket = combiningBuckets[activeClass];
    if (bucket === undefined) throw new TypeError('UNICODE_DATA_INVALID');
    for (const item of bucket) ordered.push(item);
  }
  if (ordered.length === 0) return '';
  const first = requiredNumber(ordered, 0);
  const composed = [first];
  let starterPosition = 0;
  let starter = first;
  let priorClass = 0;
  for (let index = 1; index < ordered.length; index += 1) {
    const codePoint = requiredNumber(ordered, index);
    const combiningClass = canonicalCombiningClass(codePoint);
    const composite = composePair(starter, codePoint);
    if (
      composite !== undefined &&
      (priorClass < combiningClass || priorClass === 0)
    ) {
      composed[starterPosition] = composite;
      starter = composite;
      continue;
    }
    composed.push(codePoint);
    if (combiningClass === 0) {
      starterPosition = composed.length - 1;
      starter = codePoint;
    }
    priorClass = combiningClass;
  }
  return stringFromCodePoints(composed);
}

/**
 * Compute the Unicode 17 NFC/default-case-fold collision key.
 *
 * @param {string} value input string
 * @returns {string} folded NFC string
 */
export function unicodeCollisionKey17(value) {
  /** @type {number[]} */
  const folded = [];
  for (const character of normalizeNfc17(value)) {
    const codePoint = scalarCodePoint(character);
    folded.push(...(caseFolding.get(codePoint) ?? [codePoint]));
  }
  return normalizeNfc17(stringFromCodePoints(folded));
}

/**
 * Return the Unicode 17 Joining_Type value.
 *
 * @param {number} codePoint Unicode scalar
 * @returns {string} abbreviated Joining_Type
 */
export function joiningType17(codePoint) {
  return rangeProperty(codePoint, table.joiningType, 'U');
}

/**
 * Enforce the DEC-099 ContextJ algorithm on one post-map, post-NFC label.
 *
 * @param {string} label normalized label
 * @returns {void}
 */
export function checkJoiners17(label) {
  const codePoints = [...label].map(scalarCodePoint);
  for (let index = 0; index < codePoints.length; index += 1) {
    const codePoint = requiredNumber(codePoints, index);
    if (codePoint !== 0x200c && codePoint !== 0x200d) continue;
    const prior = codePoints[index - 1];
    if (prior !== undefined && canonicalCombiningClass(prior) === 9) continue;
    if (codePoint === 0x200d) {
      throw new TypeError('IDNA_CONTEXTJ_INVALID');
    }
    let left = index - 1;
    while (
      left >= 0 &&
      joiningType17(requiredNumber(codePoints, left)) === 'T'
    ) {
      left -= 1;
    }
    let right = index + 1;
    while (
      right < codePoints.length &&
      joiningType17(requiredNumber(codePoints, right)) === 'T'
    ) {
      right += 1;
    }
    const leftType =
      left >= 0 ? joiningType17(requiredNumber(codePoints, left)) : 'U';
    const rightType =
      right < codePoints.length
        ? joiningType17(requiredNumber(codePoints, right))
        : 'U';
    if (
      (leftType !== 'L' && leftType !== 'D') ||
      (rightType !== 'R' && rightType !== 'D')
    ) {
      throw new TypeError('IDNA_CONTEXTJ_INVALID');
    }
  }
}

/**
 * Decide whether a UAX #29 boundary exists before one scalar.
 *
 * @param {number[]} codePoints complete input scalars
 * @param {string[]} breaks precomputed grapheme-break properties
 * @param {number} index right scalar index
 * @param {number} regionalRun consecutive Regional_Indicator count ending at the left scalar
 * @returns {boolean} whether a boundary exists
 */
function hasGraphemeBoundary(codePoints, breaks, index, regionalRun) {
  const right = requiredNumber(codePoints, index);
  const leftBreak = breaks[index - 1];
  const rightBreak = breaks[index];
  if (leftBreak === undefined || rightBreak === undefined) {
    throw new TypeError('UNICODE_DATA_INVALID');
  }
  if (leftBreak === 'CR' && rightBreak === 'LF') return false;
  if (['Control', 'CR', 'LF'].includes(leftBreak)) return true;
  if (['Control', 'CR', 'LF'].includes(rightBreak)) return true;
  if (leftBreak === 'L' && ['L', 'V', 'LV', 'LVT'].includes(rightBreak)) {
    return false;
  }
  if (['LV', 'V'].includes(leftBreak) && ['V', 'T'].includes(rightBreak)) {
    return false;
  }
  if (['LVT', 'T'].includes(leftBreak) && rightBreak === 'T') return false;
  if (rightBreak === 'Extend' || rightBreak === 'ZWJ') return false;
  if (rightBreak === 'SpacingMark') return false;
  if (leftBreak === 'Prepend') return false;

  const rightIncb = rangeProperty(right, table.indicConjunctBreak, 'None');
  if (rightIncb === 'Consonant') {
    let cursor = index - 1;
    let sawLinker = false;
    while (cursor >= 0) {
      const property = rangeProperty(
        requiredNumber(codePoints, cursor),
        table.indicConjunctBreak,
        'None',
      );
      if (property === 'Linker') sawLinker = true;
      if (property !== 'Linker' && property !== 'Extend') break;
      cursor -= 1;
    }
    if (
      sawLinker &&
      cursor >= 0 &&
      rangeProperty(
        requiredNumber(codePoints, cursor),
        table.indicConjunctBreak,
        'None',
      ) === 'Consonant'
    ) {
      return false;
    }
  }

  if (inRanges(right, table.extendedPictographic) && leftBreak === 'ZWJ') {
    let cursor = index - 2;
    while (cursor >= 0 && breaks[cursor] === 'Extend') {
      cursor -= 1;
    }
    if (
      cursor >= 0 &&
      inRanges(requiredNumber(codePoints, cursor), table.extendedPictographic)
    ) {
      return false;
    }
  }

  if (
    leftBreak === 'Regional_Indicator' &&
    rightBreak === 'Regional_Indicator' &&
    regionalRun % 2 === 1
  ) {
    return false;
  }
  return true;
}

/**
 * Return Unicode 17 extended-grapheme boundary offsets in scalar indexes.
 *
 * @param {string} value input string
 * @returns {number[]} boundary offsets including zero and scalar length
 */
export function graphemeBoundaries17(value) {
  assertUnicodeScalarString(value);
  const codePoints = [...value].map(scalarCodePoint);
  const breaks = codePoints.map((codePoint) =>
    rangeProperty(codePoint, table.graphemeBreak, 'Other'),
  );
  const boundaries = [0];
  let regionalRun = breaks[0] === 'Regional_Indicator' ? 1 : 0;
  for (let index = 1; index < codePoints.length; index += 1) {
    if (hasGraphemeBoundary(codePoints, breaks, index, regionalRun)) {
      boundaries.push(index);
    }
    regionalRun = breaks[index] === 'Regional_Indicator' ? regionalRun + 1 : 0;
  }
  if (codePoints.length > 0) boundaries.push(codePoints.length);
  return boundaries;
}

/**
 * Count Unicode 17 default extended grapheme clusters.
 *
 * @param {string} value input string
 * @returns {number} cluster count
 */
export function graphemeLength17(value) {
  const boundaries = graphemeBoundaries17(value);
  return boundaries.length === 1 ? 0 : boundaries.length - 1;
}
