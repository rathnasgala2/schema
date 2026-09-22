import { validateCanonicalBcp47 } from './bcp47.js';
import { utf8Bytes } from './bytes.js';
import { parseRepositoryGlob, validateRfc3339 } from './portable-scalars.js';
import { parseSemver, parseSemverRange } from './semver.js';
import {
  validateCanonicalVerificationRoute,
  validateObservedRedirectLocation,
  joinVerificationUrl,
} from './public-verification-semantics.js';
import {
  assertUnicodeScalarString,
  graphemeLength17,
  normalizeNfc17,
} from './unicode17.js';
import { validateVerificationOrigin } from './verification-origin.js';

const NPM_PACKAGE_PATTERN =
  /^(?:[a-z0-9][a-z0-9._-]*|@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*)$/u;
const GITHUB_REPOSITORY_PATTERN =
  /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/u;
const EXTENSION_KEY_PATTERN =
  /^(?!gala(?:\.|$))[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/u;
const INT64_MINIMUM = -9_223_372_036_854_775_808n;
const INT64_MAXIMUM = 9_223_372_036_854_775_807n;
const UINT64_MAXIMUM = 18_446_744_073_709_551_615n;

/**
 * Report whether a string contains a disallowed control or bidi scalar.
 *
 * @param {string} value candidate value
 * @param {boolean} [allowLineFeed] whether U+000A is admitted
 * @returns {boolean} whether a forbidden scalar is present
 */
function hasForbiddenTextScalar(value, allowLineFeed = false) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return (
      (codePoint <= 0x1f && !(allowLineFeed && codePoint === 0x0a)) ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      (codePoint >= 0x202a && codePoint <= 0x202e) ||
      (codePoint >= 0x2066 && codePoint <= 0x2069)
    );
  });
}

/**
 * Parse an npm package coordinate into its package and version expression.
 *
 * @param {string} value coordinate
 * @returns {{name: string, version: string} | undefined} parsed coordinate
 */
function packageCoordinate(value) {
  const separator = value.lastIndexOf('@');
  if (separator <= 0) return undefined;
  const name = value.slice(0, separator);
  const version = value.slice(separator + 1);
  if (
    version.length === 0 ||
    utf8Bytes(name).length > 214 ||
    !NPM_PACKAGE_PATTERN.test(name) ||
    name.split('/').some((part) => part === '.' || part === '..')
  ) {
    return undefined;
  }
  return { name, version };
}

/**
 * Validate the exact repository-relative path format.
 *
 * @param {string} value candidate path
 * @returns {boolean} whether the path is canonical and confined
 */
function validRepositoryPath(value) {
  if (!accepts(() => assertUnicodeScalarString(value))) return false;
  if (
    utf8Bytes(value).length < 1 ||
    utf8Bytes(value).length > 512 ||
    normalizeNfc17(value) !== value ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.includes('\u0000')
  ) {
    return false;
  }
  const decoded = value.replace(/%([0-9A-Fa-f]{2})/gu, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16)),
  );
  return (
    !decoded.startsWith('/') &&
    !decoded.includes('\\') &&
    !decoded.includes('\u0000') &&
    !decoded.split('/').some((segment) => segment === '.' || segment === '..')
  );
}

/**
 * Validate one exact absolute verification URL.
 *
 * @param {string} value candidate URL
 * @returns {boolean} whether the URL is canonical
 */
function validVerificationUrl(value) {
  const routeOffset = value.indexOf('/', 'https://'.length);
  if (routeOffset < 0) return false;
  const origin = value.slice(0, routeOffset);
  const route = value.slice(routeOffset);
  return joinVerificationUrl(origin, route) === value;
}

/**
 * Run one throwing validator as a boolean predicate.
 *
 * @param {() => unknown} validate validation operation
 * @returns {boolean} whether validation completed
 */
function accepts(validate) {
  try {
    validate();
    return true;
  } catch {
    return false;
  }
}

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
export function validateGalaFormatCore(formatName, value) {
  if (typeof value !== 'string') return false;
  if (formatName === 'gala-base64url-32-byte') {
    return /^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/u.test(value);
  }
  if (formatName === 'gala-bcp47') {
    return accepts(() => validateCanonicalBcp47(value));
  }
  if (formatName === 'gala-canonical-route') {
    return accepts(() => validateCanonicalVerificationRoute(value));
  }
  if (formatName === 'gala-extension-key') {
    return EXTENSION_KEY_PATTERN.test(value);
  }
  if (formatName === 'gala-github-action-coordinate') {
    const revisionOffset = value.lastIndexOf('@');
    const coordinate = value.slice(0, revisionOffset);
    const revision = value.slice(revisionOffset + 1);
    const segments = coordinate.split('/');
    const owner = segments.shift();
    const repository = segments.shift();
    const actionPath = segments.join('/');
    return (
      value.length === utf8Bytes(value).length &&
      value.length >= 44 &&
      value.length <= 512 &&
      /^[0-9a-f]{40}$/u.test(revision) &&
      owner !== undefined &&
      repository !== undefined &&
      GITHUB_REPOSITORY_PATTERN.test(`${owner}/${repository}`) &&
      (actionPath === '' || validRepositoryPath(actionPath))
    );
  }
  if (formatName === 'gala-github-repository-coordinate') {
    return (
      value.length === utf8Bytes(value).length &&
      value.length >= 3 &&
      value.length <= 140 &&
      GITHUB_REPOSITORY_PATTERN.test(value)
    );
  }
  if (
    formatName === 'gala-github-positive-uint64' ||
    formatName === 'gala-unsigned-64-bit-decimal'
  ) {
    const pattern =
      formatName === 'gala-github-positive-uint64'
        ? /^[1-9][0-9]*$/u
        : /^(?:0|[1-9][0-9]*)$/u;
    return pattern.test(value) && BigInt(value) <= UINT64_MAXIMUM;
  }
  if (formatName === 'gala-int64') {
    if (!/^(?:0|-?[1-9][0-9]*)$/u.test(value)) return false;
    const integer = BigInt(value);
    return integer >= INT64_MINIMUM && integer <= INT64_MAXIMUM;
  }
  if (
    formatName === 'gala-nonnegative-int64' ||
    formatName === 'gala-positive-int64'
  ) {
    const pattern =
      formatName === 'gala-positive-int64'
        ? /^[1-9][0-9]*$/u
        : /^(?:0|[1-9][0-9]*)$/u;
    return pattern.test(value) && BigInt(value) <= INT64_MAXIMUM;
  }
  if (formatName === 'gala-iso-country') return /^[A-Z]{2}$/u.test(value);
  if (formatName === 'gala-observed-redirect-location') {
    return accepts(() => validateObservedRedirectLocation(value));
  }
  if (
    formatName === 'gala-package-exact' ||
    formatName === 'gala-package-range'
  ) {
    const coordinate = packageCoordinate(value);
    if (coordinate === undefined) return false;
    return accepts(() =>
      formatName === 'gala-package-exact'
        ? parseSemver(coordinate.version)
        : parseSemverRange(coordinate.version),
    );
  }
  if (formatName === 'gala-plain-label') {
    return (
      accepts(() => assertUnicodeScalarString(value)) &&
      normalizeNfc17(value) === value &&
      graphemeLength17(value) >= 1 &&
      graphemeLength17(value) <= 80 &&
      !value.includes('<') &&
      !value.includes('>') &&
      !hasForbiddenTextScalar(value)
    );
  }
  if (formatName === 'gala-plain-text') {
    return (
      accepts(() => assertUnicodeScalarString(value)) &&
      normalizeNfc17(value) === value &&
      !hasForbiddenTextScalar(value, true)
    );
  }
  if (formatName === 'gala-repository-glob') {
    return accepts(() => parseRepositoryGlob(value));
  }
  if (formatName === 'gala-repository-relative-path') {
    return validRepositoryPath(value);
  }
  if (formatName === 'gala-semver-range') {
    return accepts(() => parseSemverRange(value));
  }
  if (formatName === 'gala-verification-origin') {
    return accepts(() => validateVerificationOrigin(value));
  }
  if (formatName === 'gala-verification-url') {
    return accepts(() => {
      if (!validVerificationUrl(value)) {
        throw new TypeError('VERIFICATION_URL_INVALID');
      }
    });
  }
  if (formatName === 'date-time') {
    return accepts(() => validateRfc3339(value));
  }
  if (formatName === 'uri') {
    return accepts(() => new URL(value));
  }
  return false;
}
