import {
  assertUnicodeScalarString,
  bidiClass17,
  checkJoiners17,
  generalCategory17,
  idnaMapping17,
  normalizeNfc17,
  stringFromCodePoints,
} from './unicode17.js';

/** @type {Readonly<Record<'base' | 'tmin' | 'tmax' | 'skew' | 'damp' | 'initialBias' | 'initialCodePoint', number>>} */
const PUNYCODE = Object.freeze({
  base: 36,
  tmin: 1,
  tmax: 26,
  skew: 38,
  damp: 700,
  initialBias: 72,
  initialCodePoint: 128,
});

/**
 * Convert one basic-code-point digit to its Punycode value.
 *
 * @param {number} codePoint ASCII code point
 * @returns {number} digit or base for invalid input
 */
function decodeDigit(codePoint) {
  if (codePoint >= 0x30 && codePoint <= 0x39) return codePoint - 0x16;
  if (codePoint >= 0x41 && codePoint <= 0x5a) return codePoint - 0x41;
  if (codePoint >= 0x61 && codePoint <= 0x7a) return codePoint - 0x61;
  return PUNYCODE.base;
}

/**
 * Convert one Punycode digit value to lowercase ASCII.
 *
 * @param {number} digit digit in 0..35
 * @returns {string} ASCII digit
 */
function encodeDigit(digit) {
  return String.fromCharCode(digit + 22 + 75 * Number(digit < 26));
}

/**
 * Adapt the Punycode bias.
 *
 * @param {number} delta accumulated delta
 * @param {number} points processed point count
 * @param {boolean} first whether this is the first adaptation
 * @returns {number} adapted bias
 */
function adaptBias(delta, points, first) {
  let value = first ? Math.floor(delta / PUNYCODE.damp) : delta >> 1;
  value += Math.floor(value / points);
  let power = 0;
  const threshold = Math.floor(
    ((PUNYCODE.base - PUNYCODE.tmin) * PUNYCODE.tmax) / 2,
  );
  while (value > threshold) {
    value = Math.floor(value / (PUNYCODE.base - PUNYCODE.tmin));
    power += PUNYCODE.base;
  }
  return (
    power +
    Math.floor(
      ((PUNYCODE.base - PUNYCODE.tmin + 1) * value) / (value + PUNYCODE.skew),
    )
  );
}

/**
 * Reject an arithmetic result outside the exact safe working domain.
 *
 * @param {number} value arithmetic result
 * @returns {number} the accepted value
 */
function checkedInteger(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError('IDNA_INVALID');
  }
  return value;
}

/**
 * Decode one lowercase ASCII Punycode payload.
 *
 * @param {string} input payload after xn--
 * @returns {string} decoded Unicode label
 */
export function decodePunycode(input) {
  if (!/^[a-z0-9-]+$/u.test(input)) throw new TypeError('IDNA_INVALID');
  const output = [];
  let delimiter = input.lastIndexOf('-');
  if (delimiter < 0) delimiter = 0;
  else {
    for (const character of input.slice(0, delimiter)) {
      const codePoint = character.codePointAt(0);
      if (codePoint === undefined || codePoint >= 0x80) {
        throw new TypeError('IDNA_INVALID');
      }
      output.push(codePoint);
    }
    delimiter += 1;
  }

  let codePoint = PUNYCODE.initialCodePoint;
  let index = 0;
  let bias = PUNYCODE.initialBias;
  let cursor = delimiter;
  while (cursor < input.length) {
    const priorIndex = index;
    let weight = 1;
    for (let power = PUNYCODE.base; ; power += PUNYCODE.base) {
      if (cursor >= input.length) throw new TypeError('IDNA_INVALID');
      const digit = decodeDigit(input.charCodeAt(cursor));
      cursor += 1;
      if (digit >= PUNYCODE.base) throw new TypeError('IDNA_INVALID');
      index = checkedInteger(index + digit * weight);
      const threshold =
        power <= bias + PUNYCODE.tmin
          ? PUNYCODE.tmin
          : power >= bias + PUNYCODE.tmax
            ? PUNYCODE.tmax
            : power - bias;
      if (digit < threshold) break;
      weight = checkedInteger(weight * (PUNYCODE.base - threshold));
    }
    const outputLength = output.length + 1;
    bias = adaptBias(index - priorIndex, outputLength, priorIndex === 0);
    codePoint = checkedInteger(codePoint + Math.floor(index / outputLength));
    index %= outputLength;
    if (codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
      throw new TypeError('IDNA_INVALID');
    }
    output.splice(index, 0, codePoint);
    index += 1;
  }
  return stringFromCodePoints(output);
}

/**
 * Encode one normalized Unicode label as lowercase Punycode.
 *
 * @param {string} input normalized label
 * @returns {string} Punycode payload
 */
export function encodePunycode(input) {
  assertUnicodeScalarString(input);
  const codePoints = [...input].map((character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) throw new TypeError('IDNA_INVALID');
    return codePoint;
  });
  const output = codePoints
    .filter((codePoint) => codePoint < 0x80)
    .map((codePoint) => String.fromCodePoint(codePoint));
  let handled = output.length;
  const basicCount = handled;
  if (basicCount > 0 && handled < codePoints.length) output.push('-');
  let codePoint = PUNYCODE.initialCodePoint;
  let delta = 0;
  let bias = PUNYCODE.initialBias;
  while (handled < codePoints.length) {
    let next = Number.POSITIVE_INFINITY;
    for (const value of codePoints) {
      if (value >= codePoint && value < next) next = value;
    }
    if (!Number.isSafeInteger(next)) throw new TypeError('IDNA_INVALID');
    delta = checkedInteger(delta + (next - codePoint) * (handled + 1));
    codePoint = next;
    for (const value of codePoints) {
      if (value < codePoint) delta = checkedInteger(delta + 1);
      if (value !== codePoint) continue;
      let quotient = delta;
      for (let power = PUNYCODE.base; ; power += PUNYCODE.base) {
        const threshold =
          power <= bias + PUNYCODE.tmin
            ? PUNYCODE.tmin
            : power >= bias + PUNYCODE.tmax
              ? PUNYCODE.tmax
              : power - bias;
        if (quotient < threshold) break;
        const digit =
          threshold + ((quotient - threshold) % (PUNYCODE.base - threshold));
        output.push(encodeDigit(digit));
        quotient = Math.floor(
          (quotient - threshold) / (PUNYCODE.base - threshold),
        );
      }
      output.push(encodeDigit(quotient));
      bias = adaptBias(delta, handled + 1, handled === basicCount);
      delta = 0;
      handled += 1;
    }
    delta = checkedInteger(delta + 1);
    codePoint += 1;
  }
  return output.join('');
}

/**
 * Apply Unicode 17 UTS #46 nontransitional mapping with STD3 rules.
 *
 * @param {string} value source value
 * @returns {string} mapped NFC value
 */
function mapUts46(value) {
  assertUnicodeScalarString(value);
  const mapped = [];
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) throw new TypeError('IDNA_INVALID');
    const row = idnaMapping17(codePoint);
    if (row.status === 'valid' || row.status === 'deviation') {
      mapped.push(codePoint);
    } else if (row.status === 'mapped') {
      mapped.push(...row.mapping);
    } else if (row.status !== 'ignored') {
      throw new TypeError('IDNA_INVALID');
    }
  }
  return normalizeNfc17(stringFromCodePoints(mapped));
}

/**
 * Validate one post-mapping Unicode label except domain-wide Bidi rules.
 *
 * @param {string} label mapped label
 * @returns {void}
 */
function validateUnicodeLabel(label) {
  const codePoints = [...label].map((character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) throw new TypeError('IDNA_INVALID');
    return codePoint;
  });
  if (
    codePoints.length === 0 ||
    label.startsWith('-') ||
    label.endsWith('-') ||
    (codePoints[2] === 0x2d && codePoints[3] === 0x2d) ||
    generalCategory17(codePoints[0] ?? 0).startsWith('M')
  ) {
    throw new TypeError('IDNA_INVALID');
  }
  for (const codePoint of codePoints) {
    const row = idnaMapping17(codePoint);
    if (row.status !== 'valid' && row.status !== 'deviation') {
      throw new TypeError('IDNA_INVALID');
    }
    if (
      codePoint < 0x80 &&
      !(
        (codePoint >= 0x61 && codePoint <= 0x7a) ||
        (codePoint >= 0x30 && codePoint <= 0x39) ||
        codePoint === 0x2d
      )
    ) {
      throw new TypeError('IDNA_INVALID');
    }
  }
  checkJoiners17(label);
}

/**
 * Enforce RFC 5893 rules for a domain containing an RTL scalar.
 *
 * @param {string} label mapped Unicode label
 * @returns {void}
 */
function validateBidiLabel(label) {
  const classes = [...label].map((character) => {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) throw new TypeError('IDNA_INVALID');
    return bidiClass17(codePoint);
  });
  const first = classes[0];
  let lastIndex = classes.length - 1;
  while (classes[lastIndex] === 'NSM') lastIndex -= 1;
  const last = classes[lastIndex];
  if (first === 'L') {
    const allowed = new Set(['L', 'EN', 'ES', 'CS', 'ET', 'ON', 'BN', 'NSM']);
    if (
      !classes.every((value) => allowed.has(value)) ||
      !['L', 'EN'].includes(last ?? '')
    ) {
      throw new TypeError('IDNA_INVALID');
    }
    return;
  }
  if (first !== 'R' && first !== 'AL') throw new TypeError('IDNA_INVALID');
  const allowed = new Set([
    'R',
    'AL',
    'AN',
    'EN',
    'ES',
    'CS',
    'ET',
    'ON',
    'BN',
    'NSM',
  ]);
  if (
    !classes.every((value) => allowed.has(value)) ||
    !['R', 'AL', 'EN', 'AN'].includes(last ?? '') ||
    (classes.includes('EN') && classes.includes('AN'))
  ) {
    throw new TypeError('IDNA_INVALID');
  }
}

/**
 * Convert a DNS name with the pinned Unicode 17 UTS #46 profile.
 *
 * @param {string} input source DNS name
 * @returns {string} lowercase canonical ASCII DNS name
 */
export function toAsciiDomain17(input) {
  const mappedDomain = mapUts46(input);
  if (mappedDomain.startsWith('.') || mappedDomain.endsWith('.')) {
    throw new TypeError('IDNA_INVALID');
  }
  const sourceLabels = mappedDomain.split('.');
  const unicodeLabels = [];
  const asciiLabels = [];
  for (const sourceLabel of sourceLabels) {
    let label = sourceLabel;
    let wasAce = false;
    if (/^xn--/u.test(label)) {
      wasAce = true;
      label = decodePunycode(label.slice(4));
      if (mapUts46(label) !== label) throw new TypeError('IDNA_INVALID');
    }
    validateUnicodeLabel(label);
    const ascii = [...label].every(
      (character) => (character.codePointAt(0) ?? 0x80) < 0x80,
    )
      ? label
      : `xn--${encodePunycode(label)}`;
    if (
      ascii.length < 1 ||
      ascii.length > 63 ||
      (wasAce && ascii !== sourceLabel)
    ) {
      throw new TypeError('IDNA_INVALID');
    }
    unicodeLabels.push(label);
    asciiLabels.push(ascii);
  }
  if (
    unicodeLabels.some((label) =>
      [...label].some((character) => {
        const codePoint = character.codePointAt(0);
        return (
          codePoint !== undefined &&
          ['R', 'AL', 'AN'].includes(bidiClass17(codePoint))
        );
      }),
    )
  ) {
    unicodeLabels.forEach(validateBidiLabel);
  }
  const result = asciiLabels.join('.');
  if (result.length > 253) {
    throw new TypeError('IDNA_INVALID');
  }
  return result;
}

/**
 * Require a DNS name to equal its canonical Unicode-17 ASCII form.
 *
 * @param {string} input stored DNS name
 * @returns {void}
 */
export function validateCanonicalAsciiDomain17(input) {
  if (toAsciiDomain17(input) !== input) throw new TypeError('IDNA_INVALID');
}
