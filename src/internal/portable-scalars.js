import { compareBytes, utf8Bytes } from './bytes.js';
import { normalizeNfc17 } from './unicode17.js';

const RFC3339_PATTERN =
  /^([0-9]{4})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])\.([0-9]{3})Z$/u;

/**
 * Validate Gala's canonical UTC-millisecond RFC-3339 subset.
 *
 * @param {string} value timestamp spelling
 * @returns {void}
 */
export function validateRfc3339(value) {
  const match = RFC3339_PATTERN.exec(value);
  if (!match) throw new TypeError('RFC3339_INVALID');
  const yearSource = match[1];
  const monthSource = match[2];
  const daySource = match[3];
  if (!yearSource || !monthSource || !daySource) {
    throw new TypeError('RFC3339_INVALID');
  }
  const year = Number.parseInt(yearSource, 10);
  const month = Number.parseInt(monthSource, 10);
  const day = Number.parseInt(daySource, 10);
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthLengths = [
    31,
    leapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  const maximumDay = monthLengths[month - 1];
  if (maximumDay === undefined || day > maximumDay) {
    throw new TypeError('RFC3339_INVALID');
  }
}

/**
 * Report whether a scalar is forbidden in a portable path or glob literal.
 *
 * @param {string} character Unicode scalar
 * @returns {boolean} whether the scalar is forbidden
 */
function forbiddenPathScalar(character) {
  const codePoint = character.codePointAt(0);
  return (
    codePoint === undefined ||
    codePoint === 0 ||
    codePoint < 0x20 ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    character === '\\' ||
    character === '%'
  );
}

/**
 * Parse and validate one exact DEC-099 repository glob.
 *
 * @param {string} pattern authored pattern
 * @returns {string[]} validated pattern segments
 */
export function parseRepositoryGlob(pattern) {
  if (
    typeof pattern !== 'string' ||
    pattern.length === 0 ||
    utf8Bytes(pattern).length > 256 ||
    normalizeNfc17(pattern) !== pattern ||
    pattern.startsWith('/') ||
    pattern.endsWith('/') ||
    pattern.includes('//') ||
    pattern.startsWith('~') ||
    pattern.startsWith('!') ||
    /^[A-Za-z]:/u.test(pattern) ||
    /[{}]/u.test(pattern) ||
    /(?:@|\+|\?|\*|!)\(/u.test(pattern)
  ) {
    throw new TypeError('REPOSITORY_GLOB_INVALID');
  }
  const segments = pattern.split('/');
  for (const segment of segments) {
    if (
      segment.length === 0 ||
      segment === '.' ||
      segment === '..' ||
      utf8Bytes(segment).length > 128 ||
      (segment !== '**' && segment.includes('**')) ||
      [...segment].some(
        (character) =>
          (character !== '*' &&
            character !== '?' &&
            forbiddenPathScalar(character)) ||
          character === '/',
      )
    ) {
      throw new TypeError('REPOSITORY_GLOB_INVALID');
    }
  }
  return segments;
}

/**
 * Validate one candidate path relative to its declared content root.
 *
 * @param {string} candidate candidate path
 * @returns {string[]} canonical path segments
 */
function parseCandidatePath(candidate) {
  if (
    typeof candidate !== 'string' ||
    candidate.length === 0 ||
    normalizeNfc17(candidate) !== candidate ||
    candidate.startsWith('/') ||
    candidate.endsWith('/') ||
    candidate.includes('//') ||
    /^[A-Za-z]:/u.test(candidate)
  ) {
    throw new TypeError('REPOSITORY_GLOB_INVALID');
  }
  const segments = candidate.split('/');
  if (
    segments.some(
      (segment) =>
        segment === '.' ||
        segment === '..' ||
        [...segment].some(forbiddenPathScalar),
    )
  ) {
    throw new TypeError('REPOSITORY_GLOB_INVALID');
  }
  return segments;
}

/**
 * Match one non-globstar segment over Unicode scalar values.
 *
 * @param {string} pattern pattern segment
 * @param {string} candidate candidate segment
 * @returns {boolean} match result
 */
function matchSegment(pattern, candidate) {
  const patternScalars = [...pattern];
  const candidateScalars = [...candidate];
  if (candidateScalars[0] === '.' && patternScalars[0] !== '.') {
    return false;
  }
  /** @type {Map<string, boolean>} */
  const memo = new Map();
  /** @type {(patternIndex: number, candidateIndex: number) => boolean} */
  const visit = (patternIndex, candidateIndex) => {
    const key = `${patternIndex},${candidateIndex}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let result;
    if (patternIndex === patternScalars.length) {
      result = candidateIndex === candidateScalars.length;
    } else if (patternScalars[patternIndex] === '*') {
      result =
        visit(patternIndex + 1, candidateIndex) ||
        (candidateIndex < candidateScalars.length &&
          visit(patternIndex, candidateIndex + 1));
    } else if (patternScalars[patternIndex] === '?') {
      result =
        candidateIndex < candidateScalars.length &&
        visit(patternIndex + 1, candidateIndex + 1);
    } else {
      result =
        patternScalars[patternIndex] === candidateScalars[candidateIndex] &&
        visit(patternIndex + 1, candidateIndex + 1);
    }
    memo.set(key, result);
    return result;
  };
  return visit(0, 0);
}

/**
 * Match a validated repository glob against a canonical root-relative path.
 *
 * @param {string} pattern repository glob
 * @param {string} candidate canonical candidate path
 * @returns {boolean} match result
 */
export function matchRepositoryGlob(pattern, candidate) {
  const patternSegments = parseRepositoryGlob(pattern);
  const candidateSegments = parseCandidatePath(candidate);
  /** @type {Map<string, boolean>} */
  const memo = new Map();
  /** @type {(patternIndex: number, candidateIndex: number) => boolean} */
  const visit = (patternIndex, candidateIndex) => {
    const key = `${patternIndex},${candidateIndex}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    let result;
    if (patternIndex === patternSegments.length) {
      result = candidateIndex === candidateSegments.length;
    } else if (patternSegments[patternIndex] === '**') {
      result = visit(patternIndex + 1, candidateIndex);
      if (
        !result &&
        candidateIndex < candidateSegments.length &&
        !candidateSegments[candidateIndex]?.startsWith('.')
      ) {
        result = visit(patternIndex, candidateIndex + 1);
      }
    } else {
      result =
        candidateIndex < candidateSegments.length &&
        matchSegment(
          patternSegments[patternIndex] ?? '',
          candidateSegments[candidateIndex] ?? '',
        ) &&
        visit(patternIndex + 1, candidateIndex + 1);
    }
    memo.set(key, result);
    return result;
  };
  return visit(0, 0);
}

/**
 * Select canonical paths using include-then-exclude semantics and UTF-8 order.
 *
 * @param {string[]} includes include globs
 * @param {string[]} excludes exclude globs
 * @param {string[]} candidates canonical candidate paths
 * @returns {string[]} selected unique paths
 */
export function selectRepositoryPaths(includes, excludes, candidates) {
  includes.forEach(parseRepositoryGlob);
  excludes.forEach(parseRepositoryGlob);
  return [...new Set(candidates)]
    .filter(
      (candidate) =>
        includes.some((pattern) => matchRepositoryGlob(pattern, candidate)) &&
        !excludes.some((pattern) => matchRepositoryGlob(pattern, candidate)),
    )
    .sort((left, right) => compareBytes(utf8Bytes(left), utf8Bytes(right)));
}
