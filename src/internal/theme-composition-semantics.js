import {
  canonicalizeJcs,
  canonicalizeJcsBytes,
  parseDuplicateFreeIJson,
  sha256Tagged,
} from './canonical-jcs.js';
import { ACTIVE_DIGEST_PROFILES } from './digest-profiles.js';
import {
  parseSemver,
  parseSemverRange,
  satisfiesSemverRange,
  SemanticValidationError,
} from './semver.js';
import { validateSpdxCatalogEvidence, validateSpdxExpression } from './spdx.js';
import unicodeData from './generated/unicode17.json' with { type: 'json' };
import {
  assertUnicodeScalarString,
  graphemeLength17,
  normalizeNfc17,
  unicodeCollisionKey17,
} from './unicode17.js';

const FATAL_UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const STABLE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const POSITIVE_INT64_PATTERN = /^[1-9][0-9]*$/u;
const NONNEGATIVE_INT64_PATTERN = /^(?:0|[1-9][0-9]*)$/u;
const INT64_MAXIMUM = 9_223_372_036_854_775_807n;
const STYLE_NAME_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const COLOR_PATTERN = /^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/u;
const LENGTH_PATTERN =
  /^(?:0|(?:[1-9][0-9]*(?:\.[0-9]{0,3}[1-9])?|0\.(?:[0-9]{0,3}[1-9]))(?:px|rem))$/u;
const FONT_FAMILY_PATTERN =
  /^[A-Za-z][A-Za-z0-9]*(?:[ -][A-Za-z0-9]+)*(?:, [A-Za-z][A-Za-z0-9]*(?:[ -][A-Za-z0-9]+)*){0,7}$/u;
const FONT_WEIGHT_PATTERN = /^[1-9]00$/u;
const PACKAGE_NAME_PATTERN =
  /^(?:[a-z0-9][a-z0-9._-]*|@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*)$/u;

const TEMPLATE_COMPOSITION_KEYS = ['schemaId', 'schemaVersion'];
const THEME_KEYS = [
  'schemaId',
  'schemaVersion',
  'themeId',
  'package',
  'contractVersion',
  'templateRange',
  'stylesheets',
  'cssLayers',
  'slotHooks',
  'tokens',
  'modes',
  'assets',
  'fixtures',
  'browserPolicyRef',
  'integrity',
  'budgets',
  'fixtureDigest',
  'evidenceDigest',
  'stylingContractDigest',
];
const TOKEN_KEYS = ['key', 'type', 'light', 'dark'];
const ASSET_KEYS = ['path', 'mediaType', 'byteLength', 'sha256', 'license'];
const BUDGET_KEYS = ['maximumFileBytes', 'maximumTotalBytes', 'maximumFiles'];
const PACKAGE_FILE_KEYS = ['path', 'kind', 'mode', 'bytes'];
const PACKAGE_JSON_KEYS = ['name', 'version', 'license', 'files'];
const LICENSE_EVIDENCE_KEYS = [
  'profile',
  'licenseListVersion',
  'licenseListDigest',
  'packageExpression',
  'assetOverrides',
  'catalogEntries',
];
const LICENSE_OVERRIDE_KEYS = ['path', 'expression'];

const STYLING_CONTRACT_KEYS = [
  'profile',
  'contractVersion',
  'templatePackage',
  'templateVersion',
  'orderedLayers',
  'stylesheetLayers',
  'publicationRootSelector',
  'resolvedPaletteSelectors',
  'typeSelectors',
  'classSelectors',
  'idSelectors',
  'attributes',
  'pseudoClasses',
  'pseudoElements',
  'functionalPseudos',
  'combinators',
  'publicThemeSlotHooks',
  'composition',
  'catalogDigest',
];
const STYLE_ATTRIBUTE_KEYS = ['name', 'match', 'values', 'role'];
const STYLE_HOOK_KEYS = ['hookId', 'selectorAtom'];
const STYLESHEET_LAYER_KEYS = ['tokens', 'components', 'utilities', 'print'];
const PALETTE_SELECTOR_KEYS = ['light', 'dark'];
const COMPOSITION_KEYS = [
  'rootScope',
  'compoundOrder',
  'functionalSelectorArguments',
  'maximumFunctionalDepth',
  'nthExpressionProfile',
];

const FIXTURE_RELEASE_KEYS = [
  'profile',
  'fixtureReleaseId',
  'contractVersion',
  'browserPolicyRef',
  'binaryAssetProfile',
  'stylingContractDigest',
  'runners',
  'fixtures',
  'fixtureDigest',
];
const FIXTURE_RUNNER_KEYS = ['runnerId', 'version', 'executableDigest'];
const FIXTURE_DEFINITION_KEYS = [
  'fixtureId',
  'runnerId',
  'inputDigest',
  'expectedDisposition',
  'expectedEvidenceDigest',
];
const CONFORMANCE_RESULT_KEYS = [
  'profile',
  'fixtureReleaseId',
  'fixtureDigest',
  'themeConformanceInputDigest',
  'results',
  'overallState',
  'evidenceDigest',
];
const FIXTURE_RESULT_KEYS = [
  'fixtureId',
  'runnerId',
  'observedDisposition',
  'observedEvidenceDigest',
  'state',
];

const CSS_EVIDENCE_BASE_KEYS = [
  'path',
  'profile',
  'disposition',
  'byteLength',
  'sha256',
  'outerLayer',
  'usedSlotHookIds',
  'referencedAssetPaths',
  'fontFaceAssetPaths',
  'metrics',
];
const CSS_METRIC_KEYS = [
  'tokens',
  'qualifiedRules',
  'declarations',
  'localUrls',
  'fontFaces',
  'pageRules',
  'mediaRules',
  'maximumBlockFunctionDepth',
  'commentBytes',
];
const TOKEN_DECLARATION_KEYS = [
  'lightSelector',
  'darkSelector',
  'light',
  'dark',
];
const PASSIVE_EVIDENCE_KEYS = [
  'path',
  'mediaType',
  'profile',
  'disposition',
  'byteLength',
  'sha256',
];
const RUNNER_EVIDENCE_KEYS = ['runner', 'records'];

const THEME_TOKEN_CATALOG = Object.freeze([
  ['border-width', 'length'],
  ['color-accent', 'color'],
  ['color-border', 'color'],
  ['color-canvas', 'color'],
  ['color-code-canvas', 'color'],
  ['color-code-text', 'color'],
  ['color-danger', 'color'],
  ['color-focus', 'color'],
  ['color-link', 'color'],
  ['color-link-visited', 'color'],
  ['color-on-accent', 'color'],
  ['color-selection', 'color'],
  ['color-success', 'color'],
  ['color-surface', 'color'],
  ['color-surface-raised', 'color'],
  ['color-text', 'color'],
  ['color-text-muted', 'color'],
  ['color-warning', 'color'],
  ['content-measure', 'length'],
  ['focus-width', 'length'],
  ['font-body', 'font-family'],
  ['font-heading', 'font-family'],
  ['font-mono', 'font-family'],
  ['radius-medium', 'length'],
  ['radius-small', 'length'],
  ['space-1', 'length'],
  ['space-2', 'length'],
  ['space-3', 'length'],
  ['space-4', 'length'],
  ['space-6', 'length'],
  ['space-8', 'length'],
  ['weight-heading', 'font-weight'],
  ['weight-medium', 'font-weight'],
  ['weight-normal', 'font-weight'],
  ['weight-strong', 'font-weight'],
]);

const THEME_IDENTITIES = Object.freeze(
  Object.fromEntries(
    ['default', 'amaze', 'flashy', 'minimal', 'zebra'].map((themeId) => [
      themeId,
      `@rathnasgala2/theme-${themeId}`,
    ]),
  ),
);
const STYLESHEET_VARIANTS = Object.freeze([
  Object.freeze({
    paths: Object.freeze(['tokens.css', 'components.css', 'print.css']),
    layers: Object.freeze(['gala-tokens', 'gala-components', 'gala-print']),
  }),
  Object.freeze({
    paths: Object.freeze([
      'tokens.css',
      'components.css',
      'utilities.css',
      'print.css',
    ]),
    layers: Object.freeze([
      'gala-tokens',
      'gala-components',
      'gala-utilities',
      'gala-print',
    ]),
  }),
]);
const MODES = Object.freeze(['dark', 'light', 'system']);
const ORDERED_LAYERS = Object.freeze([
  'gala-tokens',
  'gala-components',
  'gala-utilities',
  'gala-print',
]);
const FIXTURE_RUNNER_IDS = Object.freeze([
  'schema',
  'semantic',
  'package',
  'css',
  'binary',
  'browser',
  'a11y',
  'absence',
]);
/** @type {Readonly<Record<string, string>>} */
const MEDIA_BY_EXTENSION = Object.freeze({
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
});
/** @type {Readonly<Record<string, number>>} */
const PASSIVE_SOURCE_LIMITS = Object.freeze({
  'font/woff2': 4_194_304,
  'image/png': 16_777_216,
  'image/jpeg': 16_777_216,
  'image/webp': 16_777_216,
  'image/avif': 16_777_216,
  'image/svg+xml': 262_144,
});
/** @type {Readonly<Record<string, number>>} */
const CSS_METRIC_LIMITS = Object.freeze({
  tokens: 32_768,
  qualifiedRules: 4_096,
  declarations: 32_768,
  localUrls: 256,
  fontFaces: 128,
  pageRules: 64,
  mediaRules: 512,
  maximumBlockFunctionDepth: 16,
  commentBytes: 1_048_576,
});

/** @typedef {[number, number, string]} UnicodePropertyRange */

const portableUnicodeTable =
  /** @type {{ version: string, whiteSpace: UnicodePropertyRange[], noncharacter: UnicodePropertyRange[], defaultIgnorable: UnicodePropertyRange[] }} */ (
    /** @type {unknown} */ (unicodeData)
  );
if (portableUnicodeTable.version !== '17.0.0') {
  throw new TypeError('UNICODE_GENERATED_DATA_INVALID');
}

/**
 * @typedef {Record<string, unknown>} UnknownRecord
 */

/**
 * @typedef {{ path: string, kind: 'file', mode: number, bytes: Uint8Array }} ThemePackageFile
 */

/**
 * @typedef {{ path: string, byteLength: string, sha256: string }} ThemeEntry
 */

/**
 * Throw one stable semantic diagnostic.
 *
 * @param {string} code diagnostic code
 * @returns {never} never returns
 */
function invalid(code) {
  throw new SemanticValidationError(code);
}

/**
 * Test whether a value is a plain object.
 *
 * @param {unknown} value candidate value
 * @returns {value is UnknownRecord} whether the value is a plain object
 */
function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Require a closed plain object.
 *
 * @param {unknown} value candidate object
 * @param {readonly string[]} keys exact key ledger
 * @param {string} code failure diagnostic
 * @returns {UnknownRecord} validated record
 */
function exactRecord(value, keys, code) {
  if (!isPlainObject(value)) invalid(code);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  ) {
    invalid(code);
  }
  return value;
}

/**
 * Compare two values by exact RFC 8785 bytes.
 *
 * @param {unknown} left first value
 * @param {unknown} right second value
 * @returns {boolean} whether canonical bytes are equal
 */
function jcsEqual(left, right) {
  return canonicalizeJcs(left) === canonicalizeJcs(right);
}

/**
 * Compare two strings by unsigned UTF-8 bytes.
 *
 * @param {string} left first string
 * @param {string} right second string
 * @returns {number} byte-order comparison
 */
function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

/**
 * Compare JSON values by their complete RFC 8785 encoded bytes.
 *
 * @param {unknown} left first value
 * @param {unknown} right second value
 * @returns {number} canonical-byte comparison
 */
function compareJcsValues(left, right) {
  return Buffer.compare(
    canonicalizeJcsBytes(left),
    canonicalizeJcsBytes(right),
  );
}

/**
 * Compare string values by their complete RFC 8785 encoded bytes.
 *
 * @param {string} left first string
 * @param {string} right second string
 * @returns {number} canonical-byte comparison
 */
function compareJcsStrings(left, right) {
  return Buffer.compare(
    Buffer.from(canonicalizeJcs(left), 'utf8'),
    Buffer.from(canonicalizeJcs(right), 'utf8'),
  );
}

/**
 * Report whether a string contains any code unit in inclusive ranges.
 *
 * The caller has already rejected lone surrogates, so code-unit iteration is
 * exact for the BMP control and bidi ranges used here.
 *
 * @param {string} value checked string
 * @param {readonly (readonly [number, number])[]} ranges inclusive ranges
 * @returns {boolean} whether a range contains a code unit
 */
function hasCodeUnitInRanges(value, ranges) {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (ranges.some(([first, last]) => codeUnit >= first && codeUnit <= last)) {
      return true;
    }
  }
  return false;
}

/**
 * Test Unicode scalar membership in one generated sorted inclusive range set.
 *
 * @param {number} codePoint Unicode scalar value
 * @param {UnicodePropertyRange[]} ranges generated property ranges
 * @returns {boolean} membership
 */
function inUnicodeRanges(codePoint, ranges) {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const range = ranges[middle];
    if (!range) return false;
    if (codePoint < range[0]) high = middle - 1;
    else if (codePoint > range[1]) low = middle + 1;
    else return true;
  }
  return false;
}

/**
 * Test whether a Unicode scalar is forbidden by gala-portable-v2.
 *
 * @param {string} character one Unicode scalar
 * @returns {boolean} whether the scalar is forbidden
 */
function forbiddenPortablePathScalar(character) {
  const codePoint = character.codePointAt(0);
  return (
    codePoint === undefined ||
    codePoint < 0x20 ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    ['%', '<', '>', ':', '"', '|', '?', '*', '\\'].includes(character) ||
    inUnicodeRanges(codePoint, portableUnicodeTable.defaultIgnorable) ||
    inUnicodeRanges(codePoint, portableUnicodeTable.noncharacter)
  );
}

/**
 * Test whether one segment begins or ends in Unicode 17 White_Space.
 *
 * @param {string} segment non-empty path segment
 * @returns {boolean} whether either edge is White_Space
 */
function hasWhitespaceEdge(segment) {
  const scalars = [...segment];
  const first = scalars[0]?.codePointAt(0);
  const last = scalars.at(-1)?.codePointAt(0);
  return (
    first === undefined ||
    last === undefined ||
    inUnicodeRanges(first, portableUnicodeTable.whiteSpace) ||
    inUnicodeRanges(last, portableUnicodeTable.whiteSpace)
  );
}

/**
 * Test one gala-portable-v2 reserved path stem.
 *
 * @param {string} segment normalized path segment
 * @returns {boolean} whether the stem is reserved
 */
function isReservedPortableStem(segment) {
  const stem = segment.split('.', 1)[0];
  if (!stem) return false;
  const folded = unicodeCollisionKey17(stem);
  return (
    ['con', 'prn', 'aux', 'nul'].includes(folded) ||
    /^(?:com|lpt)[1-9]$/u.test(folded) ||
    /^(?:com|lpt)[¹²³]$/u.test(folded)
  );
}

/**
 * Require exact array contents.
 *
 * @param {unknown} value candidate array
 * @param {readonly unknown[]} expected required sequence
 * @param {string} code failure diagnostic
 * @returns {void}
 */
function requireExactArray(value, expected, code) {
  if (
    !Array.isArray(value) ||
    value.length !== expected.length ||
    value.some((entry, index) => !jcsEqual(entry, expected[index]))
  ) {
    invalid(code);
  }
}

/**
 * Require a tagged SHA-256 digest.
 *
 * @param {unknown} value candidate digest
 * @param {string} code failure diagnostic
 * @returns {string} checked digest
 */
function requireDigest(value, code) {
  if (typeof value !== 'string' || !DIGEST_PATTERN.test(value)) invalid(code);
  return value;
}

/**
 * Require a canonical UUIDv7 stable ID.
 *
 * @param {unknown} value candidate identifier
 * @param {string} code failure diagnostic
 * @returns {string} checked identifier
 */
function requireStableId(value, code) {
  if (typeof value !== 'string' || !STABLE_ID_PATTERN.test(value))
    invalid(code);
  return value;
}

/**
 * Require a canonical SemVer scalar while normalizing its diagnostic.
 *
 * @param {unknown} value candidate version
 * @param {string} code failure diagnostic
 * @returns {string} checked version
 */
function requireSemver(value, code) {
  if (typeof value !== 'string') invalid(code);
  try {
    parseSemver(value);
  } catch {
    invalid(code);
  }
  return value;
}

/**
 * Require a canonical SemVer range while normalizing its diagnostic.
 *
 * @param {unknown} value candidate range
 * @param {string} code failure diagnostic
 * @returns {string} checked range
 */
function requireSemverRange(value, code) {
  if (typeof value !== 'string') invalid(code);
  try {
    parseSemverRange(value);
  } catch {
    invalid(code);
  }
  return value;
}

/**
 * Require one canonical signed-64 non-negative or positive decimal.
 *
 * @param {unknown} value candidate decimal
 * @param {boolean} positive whether zero is forbidden
 * @param {string} code failure diagnostic
 * @returns {bigint} checked numeric value
 */
function requireInt64(value, positive, code) {
  const pattern = positive ? POSITIVE_INT64_PATTERN : NONNEGATIVE_INT64_PATTERN;
  if (typeof value !== 'string' || !pattern.test(value)) invalid(code);
  const numeric = BigInt(value);
  if (numeric > INT64_MAXIMUM) invalid(code);
  return numeric;
}

/**
 * Require normalized bounded plain-label text.
 *
 * @param {unknown} value candidate label
 * @param {string} code failure diagnostic
 * @returns {string} checked label
 */
function requirePlainLabel(value, code) {
  if (typeof value !== 'string') invalid(code);
  try {
    assertUnicodeScalarString(value);
  } catch {
    invalid(code);
  }
  if (
    normalizeNfc17(value) !== value ||
    graphemeLength17(value) < 1 ||
    graphemeLength17(value) > 80 ||
    value.includes('<') ||
    value.includes('>') ||
    hasCodeUnitInRanges(value, [
      [0x00, 0x1f],
      [0x7f, 0x9f],
      [0x202a, 0x202e],
      [0x2066, 0x2069],
    ])
  ) {
    invalid(code);
  }
  return value;
}

/**
 * Require a normalized repository-relative path.
 *
 * @param {unknown} value candidate path
 * @param {string} code failure diagnostic
 * @returns {string} checked path
 */
function requireRepositoryPath(value, code) {
  if (typeof value !== 'string') invalid(code);
  try {
    assertUnicodeScalarString(value);
  } catch {
    invalid(code);
  }
  if (
    Buffer.byteLength(value, 'utf8') < 1 ||
    Buffer.byteLength(value, 'utf8') > 512 ||
    normalizeNfc17(value) !== value ||
    value.startsWith('/') ||
    value.endsWith('/') ||
    value.includes('//') ||
    value.includes('\\') ||
    value.includes('%') ||
    hasCodeUnitInRanges(value, [
      [0x00, 0x1f],
      [0x7f, 0x9f],
    ])
  ) {
    invalid(code);
  }
  const segments = value.split('/');
  if (
    segments.some(
      (segment) =>
        segment === '.' ||
        segment === '..' ||
        Buffer.byteLength(segment, 'utf8') > 128 ||
        hasWhitespaceEdge(segment) ||
        segment.endsWith('.') ||
        [...segment].some(forbiddenPortablePathScalar) ||
        isReservedPortableStem(segment),
    )
  ) {
    invalid(code);
  }
  return value;
}

/**
 * Require an array of unique, byte-sorted strings.
 *
 * @param {unknown} value candidate array
 * @param {number} minimum minimum length
 * @param {number} maximum maximum length
 * @param {(entry: unknown) => string} validateEntry element validator
 * @param {string} code failure diagnostic
 * @param {(left: string, right: string) => number} [compare] order comparator
 * @returns {string[]} checked array
 */
function requireSortedStringSet(
  value,
  minimum,
  maximum,
  validateEntry,
  code,
  compare = compareUtf8,
) {
  if (
    !Array.isArray(value) ||
    value.length < minimum ||
    value.length > maximum
  ) {
    invalid(code);
  }
  const checked = value.map(validateEntry);
  for (let index = 1; index < checked.length; index += 1) {
    const previous = checked[index - 1];
    const current = checked[index];
    if (
      previous === undefined ||
      current === undefined ||
      compare(previous, current) >= 0
    ) {
      invalid(code);
    }
  }
  return checked;
}

/**
 * Require one 1..64-byte style selector name/value.
 *
 * @param {unknown} value candidate style scalar
 * @param {string} code failure diagnostic
 * @returns {string} checked value
 */
function requireStyleName(value, code) {
  if (
    typeof value !== 'string' ||
    Buffer.byteLength(value, 'utf8') > 64 ||
    !STYLE_NAME_PATTERN.test(value)
  ) {
    invalid(code);
  }
  return value;
}

/**
 * Require exact compact JCS bytes for an object.
 *
 * @param {unknown} bytes candidate retained bytes
 * @param {unknown} value represented object
 * @param {string} code failure diagnostic
 * @returns {void}
 */
function requireCanonicalBytes(bytes, value, code) {
  if (
    !(bytes instanceof Uint8Array) ||
    !Buffer.from(bytes).equals(canonicalizeJcsBytes(value))
  ) {
    invalid(code);
  }
}

/**
 * Parse one retained JSON file and normalize all parser failures.
 *
 * @param {Uint8Array} bytes exact file bytes
 * @param {string} code failure diagnostic
 * @returns {unknown} parsed I-JSON value
 */
function parseRetainedJson(bytes, code) {
  try {
    return parseDuplicateFreeIJson(bytes);
  } catch {
    invalid(code);
  }
}

/**
 * Return one package's exact package name and version.
 *
 * @param {unknown} value candidate packageExact scalar
 * @param {string} code failure diagnostic
 * @returns {{ name: string, version: string }} parsed identity
 */
function parsePackageExact(value, code) {
  if (typeof value !== 'string') invalid(code);
  const separator = value.lastIndexOf('@');
  if (separator <= 0) invalid(code);
  const name = value.slice(0, separator);
  const version = value.slice(separator + 1);
  if (
    Buffer.byteLength(name, 'utf8') > 214 ||
    !PACKAGE_NAME_PATTERN.test(name)
  ) {
    invalid(code);
  }
  requireSemver(version, code);
  return { name, version };
}

/**
 * Return whether a string array exactly equals another sequence.
 *
 * @param {unknown} value candidate array
 * @param {readonly string[]} expected required strings
 * @returns {boolean} exact equality
 */
function stringArrayEquals(value, expected) {
  return (
    Array.isArray(value) &&
    value.length === expected.length &&
    value.every((entry, index) => entry === expected[index])
  );
}

/**
 * Validate the intentionally empty MVP template-composition projection.
 *
 * @param {unknown} value template-composition instance
 * @returns {void}
 */
export function validateTemplateComposition(value) {
  const record = exactRecord(
    value,
    TEMPLATE_COMPOSITION_KEYS,
    'TEMPLATE_COMPOSITION_INVALID',
  );
  if (
    record.schemaId !== 'urn:gala:schema:template-composition:2.0.0' ||
    record.schemaVersion !== '2.0.0'
  ) {
    invalid('TEMPLATE_COMPOSITION_INVALID');
  }
}

/**
 * Validate one exact 35-row theme token catalog.
 *
 * @param {unknown} value candidate token array
 * @returns {void}
 */
function validateThemeTokens(value) {
  const code = 'THEME_TOKEN_CATALOG_INVALID';
  if (!Array.isArray(value) || value.length !== THEME_TOKEN_CATALOG.length) {
    invalid(code);
  }
  for (let index = 0; index < THEME_TOKEN_CATALOG.length; index += 1) {
    const expected = THEME_TOKEN_CATALOG[index];
    const token = exactRecord(value[index], TOKEN_KEYS, code);
    if (!expected || token.key !== expected[0] || token.type !== expected[1]) {
      invalid(code);
    }
    if (typeof token.light !== 'string' || typeof token.dark !== 'string') {
      invalid(code);
    }
    let valid = false;
    if (token.type === 'color') {
      valid = COLOR_PATTERN.test(token.light) && COLOR_PATTERN.test(token.dark);
    } else if (token.type === 'length') {
      valid =
        LENGTH_PATTERN.test(token.light) && LENGTH_PATTERN.test(token.dark);
    } else if (token.type === 'font-family') {
      valid =
        FONT_FAMILY_PATTERN.test(token.light) &&
        FONT_FAMILY_PATTERN.test(token.dark) &&
        token.light
          .split(', ')
          .every((component) => Buffer.byteLength(component, 'ascii') <= 64) &&
        token.dark
          .split(', ')
          .every((component) => Buffer.byteLength(component, 'ascii') <= 64);
    } else if (token.type === 'font-weight') {
      valid =
        FONT_WEIGHT_PATTERN.test(token.light) &&
        FONT_WEIGHT_PATTERN.test(token.dark);
    }
    if (!valid || (token.type !== 'color' && token.light !== token.dark)) {
      invalid(code);
    }
  }
}

/**
 * Validate one passive-asset manifest row.
 *
 * @param {unknown} value candidate row
 * @returns {UnknownRecord} checked row
 */
function validatePassiveAsset(value) {
  const code = 'THEME_PASSIVE_ASSET_INVALID';
  const asset = exactRecord(value, ASSET_KEYS, code);
  requireRepositoryPath(asset.path, code);
  if (
    typeof asset.mediaType !== 'string' ||
    ![
      'text/css',
      'font/woff2',
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/avif',
      'image/svg+xml',
    ].includes(asset.mediaType)
  ) {
    invalid(code);
  }
  requireInt64(asset.byteLength, false, code);
  requireDigest(asset.sha256, code);
  if (typeof asset.license !== 'string') invalid(code);
  try {
    validateSpdxExpression(asset.license);
  } catch {
    invalid(code);
  }
  return asset;
}

/**
 * Validate declared theme budgets and return their numeric values.
 *
 * @param {unknown} value candidate budget record
 * @param {string} [code] failure diagnostic
 * @returns {{ maximumFileBytes: bigint, maximumTotalBytes: bigint, maximumFiles: number }} numeric budgets
 */
function validateBudgets(value, code = 'THEME_BUDGET_INVALID') {
  const budgets = exactRecord(value, BUDGET_KEYS, code);
  const maximumFileBytes = requireInt64(budgets.maximumFileBytes, true, code);
  const maximumTotalBytes = requireInt64(budgets.maximumTotalBytes, true, code);
  if (
    !Number.isInteger(budgets.maximumFiles) ||
    Number(budgets.maximumFiles) < 1 ||
    Number(budgets.maximumFiles) > 512
  ) {
    invalid(code);
  }
  return {
    maximumFileBytes,
    maximumTotalBytes,
    maximumFiles: Number(budgets.maximumFiles),
  };
}

/**
 * Validate the closed theme-contract instance independent of external records.
 *
 * @param {unknown} value theme-contract instance
 * @returns {void}
 */
export function validateThemeContract(value) {
  const code = 'THEME_CONTRACT_INVALID';
  const theme = exactRecord(value, THEME_KEYS, code);
  if (
    theme.schemaId !== 'urn:gala:schema:theme-contract:2.0.0' ||
    theme.schemaVersion !== '2.0.0' ||
    typeof theme.themeId !== 'string' ||
    !Object.hasOwn(THEME_IDENTITIES, theme.themeId)
  ) {
    invalid(code);
  }

  const identity = parsePackageExact(theme.package, code);
  if (identity.name !== THEME_IDENTITIES[theme.themeId]) invalid(code);
  requireSemver(theme.contractVersion, code);
  requireSemverRange(theme.templateRange, code);

  const variant = STYLESHEET_VARIANTS.find(
    ({ paths, layers }) =>
      stringArrayEquals(theme.stylesheets, paths) &&
      stringArrayEquals(theme.cssLayers, layers),
  );
  if (!variant) invalid(code);

  requireSortedStringSet(
    theme.slotHooks,
    1,
    64,
    (entry) => requirePlainLabel(entry, code),
    code,
    compareJcsStrings,
  );
  validateThemeTokens(theme.tokens);
  requireExactArray(theme.modes, MODES, code);

  if (!Array.isArray(theme.assets) || theme.assets.length > 256) invalid(code);
  const assetPaths = new Set();
  for (const candidate of theme.assets) {
    const asset = validatePassiveAsset(candidate);
    if (typeof asset.path !== 'string' || assetPaths.has(asset.path))
      invalid(code);
    assetPaths.add(asset.path);
  }

  requireSortedStringSet(
    theme.fixtures,
    1,
    64,
    (entry) => requirePlainLabel(entry, code),
    code,
  );
  if (theme.browserPolicyRef !== 'gala-theme-css-v2-20211224') invalid(code);
  requireDigest(theme.integrity, code);
  validateBudgets(theme.budgets);
  requireDigest(theme.fixtureDigest, code);
  requireDigest(theme.evidenceDigest, code);
  requireDigest(theme.stylingContractDigest, code);
}

/**
 * Compute the exact self-excluding template styling-contract digest.
 *
 * @param {unknown} contract complete styling-contract record
 * @returns {string} tagged digest
 */
export function computeTemplateStylingContractDigest(contract) {
  const profile = ACTIVE_DIGEST_PROFILES.templateStylingContract;
  if (!profile) throw new TypeError('DIGEST_PROFILE_MISSING');
  return profile.digest(contract);
}

/**
 * Build the exact public-hook atom catalog and count each atom occurrence.
 *
 * @param {UnknownRecord} contract validated styling contract
 * @param {string} code failure diagnostic
 * @returns {Map<string, number>} atom occurrence counts
 */
function buildHookAtomCatalog(contract, code) {
  /** @type {Map<string, number>} */
  const atoms = new Map();
  /**
   * @param {string} atom selector atom
   * @returns {void}
   */
  const add = (atom) => {
    atoms.set(atom, (atoms.get(atom) ?? 0) + 1);
  };

  for (const selector of /** @type {string[]} */ (contract.typeSelectors)) {
    add(selector);
  }
  for (const selector of /** @type {string[]} */ (contract.classSelectors)) {
    add(`.${selector}`);
  }
  for (const selector of /** @type {string[]} */ (contract.idSelectors)) {
    add(`#${selector}`);
  }
  for (const candidate of /** @type {unknown[]} */ (contract.attributes)) {
    const attribute = exactRecord(candidate, STYLE_ATTRIBUTE_KEYS, code);
    if (
      attribute.name === 'data-gala-publication-root' ||
      attribute.name === 'data-gala-resolved-color-mode'
    ) {
      continue;
    }
    if (attribute.match === 'presence') {
      add(`[${String(attribute.name)}]`);
    } else {
      for (const value of /** @type {string[]} */ (attribute.values)) {
        add(`[${String(attribute.name)}="${value}"]`);
      }
    }
  }
  return atoms;
}

/**
 * Validate the selected template's exact immutable styling contract.
 *
 * `context.bytes` is the retained
 * `contracts/theme-styling-contract.jcs` member. `context.lockedTemplate` is
 * the integrity-verified selected lock row; no package or digest fields are
 * synthesized by this validator.
 *
 * @param {unknown} value template styling-contract record
 * @param {unknown} context retained bytes and selected template identity
 * @returns {void}
 */
export function validateTemplateStylingContract(value, context) {
  const code = 'TEMPLATE_STYLING_CONTRACT_INVALID';
  const contract = exactRecord(value, STYLING_CONTRACT_KEYS, code);
  const retained = exactRecord(context, ['bytes', 'lockedTemplate'], code);
  const lockedTemplate = isPlainObject(retained.lockedTemplate)
    ? retained.lockedTemplate
    : invalid(code);

  if (
    contract.profile !== 'gala-template-styling-contract-v2' ||
    contract.contractVersion !== '2.0.0' ||
    contract.templatePackage !== '@rathnasgala2/template' ||
    contract.templatePackage !== lockedTemplate.package ||
    contract.templateVersion !== lockedTemplate.version
  ) {
    invalid(code);
  }
  requireSemver(contract.templateVersion, code);
  requireCanonicalBytes(retained.bytes, contract, code);
  requireExactArray(contract.orderedLayers, ORDERED_LAYERS, code);

  const layers = exactRecord(
    contract.stylesheetLayers,
    STYLESHEET_LAYER_KEYS,
    code,
  );
  if (
    layers.tokens !== 'gala-tokens' ||
    layers.components !== 'gala-components' ||
    layers.utilities !== 'gala-utilities' ||
    layers.print !== 'gala-print'
  ) {
    invalid(code);
  }
  if (contract.publicationRootSelector !== '[data-gala-publication-root]') {
    invalid(code);
  }
  const palettes = exactRecord(
    contract.resolvedPaletteSelectors,
    PALETTE_SELECTOR_KEYS,
    code,
  );
  if (
    palettes.light !==
      '[data-gala-publication-root][data-gala-resolved-color-mode="light"]' ||
    palettes.dark !==
      '[data-gala-publication-root][data-gala-resolved-color-mode="dark"]'
  ) {
    invalid(code);
  }

  /** @type {readonly (readonly [string, number])[]} */
  const selectorSets = [
    ['typeSelectors', 64],
    ['classSelectors', 256],
    ['idSelectors', 64],
    ['pseudoClasses', 64],
  ];
  for (const [member, maximum] of selectorSets) {
    requireSortedStringSet(
      contract[member],
      0,
      maximum,
      (entry) => requireStyleName(entry, code),
      code,
    );
  }

  if (
    !Array.isArray(contract.attributes) ||
    contract.attributes.length < 2 ||
    contract.attributes.length > 128
  ) {
    invalid(code);
  }
  /** @type {UnknownRecord | undefined} */
  let previousAttribute;
  const attributeNames = new Set();
  let rootRows = 0;
  let paletteRows = 0;
  for (const candidate of contract.attributes) {
    const attribute = exactRecord(candidate, STYLE_ATTRIBUTE_KEYS, code);
    const name = requireStyleName(attribute.name, code);
    if (attributeNames.has(name)) invalid(code);
    if (!['presence', 'exact-value'].includes(String(attribute.match))) {
      invalid(code);
    }
    if (!['root', 'state', 'semantic'].includes(String(attribute.role))) {
      invalid(code);
    }
    const values = requireSortedStringSet(
      attribute.values,
      attribute.match === 'presence' ? 0 : 1,
      32,
      (entry) => requireStyleName(entry, code),
      code,
    );
    if (attribute.match === 'presence' && values.length !== 0) invalid(code);

    if (
      name === 'data-gala-publication-root' &&
      attribute.match === 'presence' &&
      attribute.role === 'root' &&
      values.length === 0
    ) {
      rootRows += 1;
    } else if (attribute.role === 'root') {
      invalid(code);
    }
    if (
      name === 'data-gala-resolved-color-mode' &&
      attribute.match === 'exact-value' &&
      attribute.role === 'state' &&
      stringArrayEquals(values, ['dark', 'light'])
    ) {
      paletteRows += 1;
    } else if (name === 'data-gala-resolved-color-mode') {
      invalid(code);
    }
    if (
      previousAttribute !== undefined &&
      compareJcsValues(previousAttribute, attribute) >= 0
    ) {
      invalid(code);
    }
    previousAttribute = attribute;
    attributeNames.add(name);
  }
  if (rootRows !== 1 || paletteRows !== 1) invalid(code);

  requireExactArray(
    contract.pseudoElements,
    ['after', 'before', 'marker', 'selection'],
    code,
  );
  requireExactArray(
    contract.functionalPseudos,
    ['is', 'where', 'not', 'nth-child', 'nth-last-child'],
    code,
  );
  requireExactArray(contract.combinators, [' ', ' > ', ' + ', ' ~ '], code);

  const composition = exactRecord(contract.composition, COMPOSITION_KEYS, code);
  if (
    composition.rootScope !== 'first-compound-required' ||
    !stringArrayEquals(composition.compoundOrder, [
      'type',
      'id',
      'class',
      'attribute',
      'pseudo-class',
      'pseudo-element',
    ]) ||
    composition.functionalSelectorArguments !== 'compound-only' ||
    composition.maximumFunctionalDepth !== 1 ||
    composition.nthExpressionProfile !== 'gala-positive-an-plus-b-v2'
  ) {
    invalid(code);
  }

  if (
    !Array.isArray(contract.publicThemeSlotHooks) ||
    contract.publicThemeSlotHooks.length < 1 ||
    contract.publicThemeSlotHooks.length > 64
  ) {
    invalid(code);
  }
  const atomCatalog = buildHookAtomCatalog(contract, code);
  let previousHookId = '';
  const hookAtoms = new Set();
  for (const candidate of contract.publicThemeSlotHooks) {
    const hook = exactRecord(candidate, STYLE_HOOK_KEYS, code);
    const hookId = requirePlainLabel(hook.hookId, code);
    if (previousHookId !== '' && compareUtf8(previousHookId, hookId) >= 0) {
      invalid(code);
    }
    previousHookId = hookId;
    if (
      typeof hook.selectorAtom !== 'string' ||
      Buffer.byteLength(hook.selectorAtom, 'utf8') < 1 ||
      Buffer.byteLength(hook.selectorAtom, 'utf8') > 132 ||
      atomCatalog.get(hook.selectorAtom) !== 1 ||
      hookAtoms.has(hook.selectorAtom)
    ) {
      invalid(code);
    }
    hookAtoms.add(hook.selectorAtom);
  }

  requireDigest(contract.catalogDigest, code);
  let expectedDigest;
  try {
    expectedDigest = computeTemplateStylingContractDigest(contract);
  } catch {
    invalid(code);
  }
  if (contract.catalogDigest !== expectedDigest) invalid(code);
}

/**
 * Compute the exact self-excluding shared theme-fixture release digest.
 *
 * @param {unknown} release complete fixture-release record
 * @returns {string} tagged digest
 */
export function computeThemeFixtureReleaseDigest(release) {
  const profile = ACTIVE_DIGEST_PROFILES.themeFixtureRelease;
  if (!profile) throw new TypeError('DIGEST_PROFILE_MISSING');
  return profile.digest(release);
}

/**
 * Validate an immutable shared theme fixture release.
 *
 * `context.bytes` are its retained compact-JCS bytes and
 * `context.stylingContractDigest` is the independently validated template
 * styling catalog digest.
 *
 * @param {unknown} value fixture-release record
 * @param {unknown} context retained bytes and styling digest
 * @returns {void}
 */
export function validateThemeFixtureRelease(value, context) {
  const code = 'THEME_FIXTURE_RELEASE_INVALID';
  const release = exactRecord(value, FIXTURE_RELEASE_KEYS, code);
  const retained = exactRecord(
    context,
    ['bytes', 'stylingContractDigest'],
    code,
  );
  if (
    release.profile !== 'gala-theme-fixture-release-v2' ||
    release.contractVersion !== '2.0.0' ||
    release.browserPolicyRef !== 'gala-theme-css-v2-20211224' ||
    release.binaryAssetProfile !== 'gala-theme-binary-assets-v2'
  ) {
    invalid(code);
  }
  requireStableId(release.fixtureReleaseId, code);
  requireDigest(release.stylingContractDigest, code);
  if (release.stylingContractDigest !== retained.stylingContractDigest) {
    invalid(code);
  }
  requireCanonicalBytes(retained.bytes, release, code);

  if (
    !Array.isArray(release.runners) ||
    release.runners.length < 1 ||
    release.runners.length > 16
  ) {
    invalid(code);
  }
  const runnerIds = new Set();
  let previousRunner = '';
  for (const candidate of release.runners) {
    const runner = exactRecord(candidate, FIXTURE_RUNNER_KEYS, code);
    if (
      typeof runner.runnerId !== 'string' ||
      !FIXTURE_RUNNER_IDS.includes(runner.runnerId) ||
      runnerIds.has(runner.runnerId) ||
      (previousRunner !== '' &&
        compareUtf8(previousRunner, runner.runnerId) >= 0)
    ) {
      invalid(code);
    }
    runnerIds.add(runner.runnerId);
    previousRunner = runner.runnerId;
    requireSemver(runner.version, code);
    requireDigest(runner.executableDigest, code);
  }

  if (
    !Array.isArray(release.fixtures) ||
    release.fixtures.length < 1 ||
    release.fixtures.length > 64
  ) {
    invalid(code);
  }
  let previousFixture = '';
  for (const candidate of release.fixtures) {
    const fixture = exactRecord(candidate, FIXTURE_DEFINITION_KEYS, code);
    const fixtureId = requirePlainLabel(fixture.fixtureId, code);
    if (
      (previousFixture !== '' &&
        compareUtf8(previousFixture, fixtureId) >= 0) ||
      typeof fixture.runnerId !== 'string' ||
      !runnerIds.has(fixture.runnerId) ||
      !FIXTURE_RUNNER_IDS.includes(fixture.runnerId) ||
      !['accepted', 'rejected'].includes(String(fixture.expectedDisposition))
    ) {
      invalid(code);
    }
    previousFixture = fixtureId;
    requireDigest(fixture.inputDigest, code);
    requireDigest(fixture.expectedEvidenceDigest, code);
  }

  requireDigest(release.fixtureDigest, code);
  let expectedDigest;
  try {
    expectedDigest = computeThemeFixtureReleaseDigest(release);
  } catch {
    invalid(code);
  }
  if (release.fixtureDigest !== expectedDigest) invalid(code);
}

/**
 * Compute the exact self-excluding theme conformance-evidence digest.
 *
 * @param {unknown} result complete conformance result
 * @returns {string} tagged digest
 */
export function computeThemeConformanceEvidenceDigest(result) {
  const profile = ACTIVE_DIGEST_PROFILES.themeConformanceEvidence;
  if (!profile) throw new TypeError('DIGEST_PROFILE_MISSING');
  return profile.digest(result);
}

/**
 * Validate one retained theme conformance result against its fixture release.
 *
 * `context.bytes` are exact compact-JCS result bytes. The other context fields
 * are independently validated retained inputs, not additional wire members.
 *
 * @param {unknown} value conformance-result record
 * @param {unknown} context release, input digest, and retained result bytes
 * @returns {void}
 */
export function validateThemeConformanceResult(value, context) {
  const code = 'THEME_CONFORMANCE_RESULT_INVALID';
  const result = exactRecord(value, CONFORMANCE_RESULT_KEYS, code);
  const retained = exactRecord(
    context,
    ['bytes', 'fixtureRelease', 'themeConformanceInputDigest'],
    code,
  );
  const release = isPlainObject(retained.fixtureRelease)
    ? retained.fixtureRelease
    : invalid(code);
  if (
    result.profile !== 'gala-theme-conformance-result-v2' ||
    result.fixtureReleaseId !== release.fixtureReleaseId ||
    result.fixtureDigest !== release.fixtureDigest ||
    result.themeConformanceInputDigest !== retained.themeConformanceInputDigest
  ) {
    invalid(code);
  }
  requireStableId(result.fixtureReleaseId, code);
  requireDigest(result.fixtureDigest, code);
  requireDigest(result.themeConformanceInputDigest, code);
  requireCanonicalBytes(retained.bytes, result, code);

  if (
    !Array.isArray(release.fixtures) ||
    !Array.isArray(result.results) ||
    result.results.length !== release.fixtures.length
  ) {
    invalid(code);
  }
  let everyPasses = true;
  let previousFixtureId = '';
  for (let index = 0; index < release.fixtures.length; index += 1) {
    const definition = exactRecord(
      release.fixtures[index],
      FIXTURE_DEFINITION_KEYS,
      code,
    );
    const row = exactRecord(result.results[index], FIXTURE_RESULT_KEYS, code);
    const fixtureId = requirePlainLabel(row.fixtureId, code);
    if (
      row.fixtureId !== definition.fixtureId ||
      (previousFixtureId !== '' &&
        compareUtf8(previousFixtureId, fixtureId) >= 0) ||
      typeof row.runnerId !== 'string' ||
      !FIXTURE_RUNNER_IDS.includes(row.runnerId) ||
      !['accepted', 'rejected'].includes(String(row.observedDisposition)) ||
      !['pass', 'fail'].includes(String(row.state))
    ) {
      invalid(code);
    }
    previousFixtureId = fixtureId;
    requireDigest(row.observedEvidenceDigest, code);
    const passes =
      row.runnerId === definition.runnerId &&
      row.observedDisposition === definition.expectedDisposition &&
      row.observedEvidenceDigest === definition.expectedEvidenceDigest;
    if (row.state !== (passes ? 'pass' : 'fail')) invalid(code);
    everyPasses &&= passes;
  }
  if (result.overallState !== (everyPasses ? 'pass' : 'fail')) invalid(code);
  requireDigest(result.evidenceDigest, code);
  let expectedDigest;
  try {
    expectedDigest = computeThemeConformanceEvidenceDigest(result);
  } catch {
    invalid(code);
  }
  if (result.evidenceDigest !== expectedDigest) invalid(code);
}

/**
 * Validate extracted package-file observations shared by both digest profiles.
 *
 * The extraction layer supplies one row for every stripped `package/` tar
 * member. Requiring `kind:file` and mode 0644 here makes links, devices,
 * directories, and executable members unrepresentable as admitted input.
 *
 * @param {unknown} value candidate file rows
 * @param {string} code failure diagnostic
 * @returns {ThemePackageFile[]} checked copied rows
 */
function validatePackageFiles(value, code) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 512) {
    invalid(code);
  }
  /** @type {ThemePackageFile[]} */
  const files = [];
  const paths = new Set();
  const collisionKeys = new Set();
  for (const candidate of value) {
    const row = exactRecord(candidate, PACKAGE_FILE_KEYS, code);
    const path = requireRepositoryPath(row.path, code);
    let collisionKey;
    try {
      collisionKey = unicodeCollisionKey17(path);
    } catch {
      invalid(code);
    }
    if (
      paths.has(path) ||
      collisionKeys.has(collisionKey) ||
      row.kind !== 'file' ||
      row.mode !== 0o644 ||
      !(row.bytes instanceof Uint8Array)
    ) {
      invalid(code);
    }
    paths.add(path);
    collisionKeys.add(collisionKey);
    files.push({
      path,
      kind: 'file',
      mode: 0o644,
      bytes: row.bytes,
    });
  }
  return files;
}

/**
 * Replace theme.json with one of the two authority-defined virtual manifests
 * and return the complete path-sorted entry projection.
 *
 * @param {unknown} theme complete theme contract
 * @param {unknown} packageFiles extracted package-file rows
 * @param {readonly string[]} excludedManifestMembers self fields to omit
 * @returns {ThemeEntry[]} exact digest entries
 */
function projectThemeEntries(theme, packageFiles, excludedManifestMembers) {
  validateThemeContract(theme);
  const source = /** @type {UnknownRecord} */ (theme);
  const files = validatePackageFiles(packageFiles, 'THEME_PACKAGE_INVALID');
  if (files.filter((file) => file.path === 'theme.json').length !== 1) {
    invalid('THEME_PACKAGE_INVALID');
  }
  const excluded = new Set(excludedManifestMembers);
  const virtualTheme = Object.fromEntries(
    Object.entries(source).filter(([key]) => !excluded.has(key)),
  );
  const virtualBytes = canonicalizeJcsBytes(virtualTheme);
  return files
    .map((file) => {
      const bytes = file.path === 'theme.json' ? virtualBytes : file.bytes;
      return {
        path: file.path,
        byteLength: String(bytes.byteLength),
        sha256: sha256Tagged(bytes),
      };
    })
    .sort((left, right) => compareUtf8(left.path, right.path));
}

/**
 * Compute the pre-finalization conformance-input digest.
 *
 * `theme.json` is virtualized with exactly `integrity` and `evidenceDigest`
 * omitted; every other package member is represented by its raw bytes.
 *
 * @param {unknown} theme complete theme contract
 * @param {unknown} packageFiles extracted package-file rows
 * @returns {string} tagged digest
 */
export function computeThemeConformanceInputDigest(theme, packageFiles) {
  const profile = ACTIVE_DIGEST_PROFILES.themeConformanceInput;
  if (!profile) throw new TypeError('DIGEST_PROFILE_MISSING');
  return profile.digest(
    projectThemeEntries(theme, packageFiles, ['integrity', 'evidenceDigest']),
  );
}

/**
 * Compute final semantic theme-package integrity.
 *
 * `theme.json` is virtualized with exactly `integrity` omitted; every other
 * package member is represented by its raw bytes.
 *
 * @param {unknown} theme complete theme contract
 * @param {unknown} packageFiles extracted package-file rows
 * @returns {string} tagged digest
 */
export function computeThemePackageIntegrity(theme, packageFiles) {
  const profile = ACTIVE_DIGEST_PROFILES.themePackageIntegrity;
  if (!profile) throw new TypeError('DIGEST_PROFILE_MISSING');
  return profile.digest(
    projectThemeEntries(theme, packageFiles, ['integrity']),
  );
}

/**
 * Find one checked package file by path.
 *
 * @param {ThemePackageFile[]} files checked file rows
 * @param {string} path exact path
 * @param {string} code failure diagnostic
 * @returns {ThemePackageFile} required file
 */
function requirePackageFile(files, path, code) {
  const file = files.find((candidate) => candidate.path === path);
  if (!file) invalid(code);
  return file;
}

/**
 * Return one non-CSS asset's required media type.
 *
 * @param {string} path asset path
 * @param {string} code failure diagnostic
 * @returns {string} required media type
 */
function mediaTypeForAssetPath(path, code) {
  if (!path.startsWith('assets/') || path.length === 'assets/'.length) {
    invalid(code);
  }
  const dot = path.lastIndexOf('.');
  const extension = dot < 0 ? '' : path.slice(dot);
  const mediaType = MEDIA_BY_EXTENSION[extension];
  if (!mediaType) invalid(code);
  return mediaType;
}

/**
 * Validate an exact asset-to-file byte binding.
 *
 * @param {UnknownRecord} asset checked manifest asset
 * @param {ThemePackageFile} file retained package file
 * @param {string} code failure diagnostic
 * @returns {void}
 */
function validateAssetBytes(asset, file, code) {
  if (
    asset.byteLength !== String(file.bytes.byteLength) ||
    asset.sha256 !== sha256Tagged(file.bytes)
  ) {
    invalid(code);
  }
}

/**
 * Validate the exact package.json projection and return its package expression.
 *
 * @param {ThemePackageFile[]} files checked package files
 * @param {UnknownRecord} theme checked theme root
 * @param {string[]} manifestFilePaths package.json `files` closure
 * @param {string} code failure diagnostic
 * @returns {string} canonical package SPDX expression
 */
function validatePackageJson(files, theme, manifestFilePaths, code) {
  const packageFile = requirePackageFile(files, 'package.json', code);
  const parsed = exactRecord(
    parseRetainedJson(packageFile.bytes, code),
    PACKAGE_JSON_KEYS,
    code,
  );
  const identity = parsePackageExact(theme.package, code);
  if (parsed.name !== identity.name || parsed.version !== identity.version) {
    invalid(code);
  }
  if (typeof parsed.license !== 'string') invalid(code);
  try {
    validateSpdxExpression(parsed.license);
  } catch {
    invalid(code);
  }
  if (!stringArrayEquals(parsed.files, manifestFilePaths)) invalid(code);
  return parsed.license;
}

/**
 * Validate compact-JCS LICENSE evidence and exact per-asset inheritance.
 *
 * @param {ThemePackageFile[]} files checked package files
 * @param {UnknownRecord[]} assets checked manifest assets
 * @param {string} packageExpression package.json expression
 * @param {string} code failure diagnostic
 * @returns {void}
 */
function validateLicenseEvidence(files, assets, packageExpression, code) {
  const licenseFile = requirePackageFile(files, 'LICENSE', code);
  const evidence = exactRecord(
    parseRetainedJson(licenseFile.bytes, code),
    LICENSE_EVIDENCE_KEYS,
    code,
  );
  requireCanonicalBytes(licenseFile.bytes, evidence, code);
  if (
    evidence.profile !== 'gala-theme-license-evidence-v2' ||
    evidence.packageExpression !== packageExpression ||
    !Array.isArray(evidence.assetOverrides) ||
    evidence.assetOverrides.length > 256 ||
    !Array.isArray(evidence.catalogEntries) ||
    evidence.catalogEntries.length < 1 ||
    evidence.catalogEntries.length > 512
  ) {
    invalid(code);
  }

  /** @type {Map<string, string>} */
  const overrides = new Map();
  /** @type {UnknownRecord | undefined} */
  let previousOverride;
  for (const candidate of evidence.assetOverrides) {
    const override = exactRecord(candidate, LICENSE_OVERRIDE_KEYS, code);
    const path = requireRepositoryPath(override.path, code);
    if (overrides.has(path)) invalid(code);
    if (typeof override.expression !== 'string') invalid(code);
    try {
      validateSpdxExpression(override.expression);
    } catch {
      invalid(code);
    }
    if (
      previousOverride !== undefined &&
      compareJcsValues(previousOverride, override) >= 0
    ) {
      invalid(code);
    }
    previousOverride = override;
    overrides.set(path, override.expression);
  }

  const expressions = [packageExpression];
  for (const asset of assets) {
    if (typeof asset.path !== 'string' || typeof asset.license !== 'string') {
      invalid(code);
    }
    expressions.push(asset.license);
    const inherited = asset.license === packageExpression;
    const override = overrides.get(asset.path);
    if (asset.mediaType === 'text/css') {
      if (!inherited || override !== undefined) invalid(code);
    } else if (
      (inherited && override !== undefined) ||
      (!inherited && override !== asset.license)
    ) {
      invalid(code);
    }
  }
  const nonCssPaths = new Set(
    assets
      .filter((asset) => asset.mediaType !== 'text/css')
      .map((asset) => String(asset.path)),
  );
  if ([...overrides.keys()].some((path) => !nonCssPaths.has(path))) {
    invalid(code);
  }

  try {
    validateSpdxCatalogEvidence(expressions, evidence);
  } catch {
    invalid(code);
  }
}

/**
 * Validate the retained source byte subset that precedes pinned CSS parsing.
 *
 * @param {Uint8Array} bytes stylesheet bytes
 * @param {string} code failure diagnostic
 * @returns {void}
 */
function validateCssSourceBytes(bytes, code) {
  if (
    bytes.byteLength === 0 ||
    bytes.byteLength > 1_048_576 ||
    (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf)
  ) {
    invalid(code);
  }
  let source;
  try {
    source = FATAL_UTF8_DECODER.decode(bytes);
  } catch {
    invalid(code);
  }
  const forbiddenSourceByte = [...source].some((character) => {
    const codePoint = character.codePointAt(0);
    return (
      codePoint === undefined ||
      (codePoint !== 0x09 &&
        codePoint !== 0x0a &&
        (codePoint < 0x20 || codePoint > 0x7e))
    );
  });
  if (
    normalizeNfc17(source) !== source ||
    source.includes('\\') ||
    forbiddenSourceByte
  ) {
    invalid(code);
  }
}

/**
 * Validate parser-reported CSS resource counters.
 *
 * @param {unknown} value metric record
 * @param {Record<string, number>} totals package aggregate counters
 * @param {string} code failure diagnostic
 * @returns {void}
 */
function validateCssMetrics(value, totals, code) {
  const metrics = exactRecord(value, CSS_METRIC_KEYS, code);
  for (const key of CSS_METRIC_KEYS) {
    const metric = metrics[key];
    const limit = CSS_METRIC_LIMITS[key];
    if (
      !Number.isInteger(metric) ||
      Number(metric) < 0 ||
      limit === undefined ||
      Number(metric) > limit
    ) {
      invalid(code);
    }
    if (key === 'maximumBlockFunctionDepth') {
      totals[key] = Math.max(totals[key] ?? 0, Number(metric));
    } else {
      totals[key] = (totals[key] ?? 0) + Number(metric);
    }
  }
}

/**
 * Validate tokens.css's exact parser-derived custom-property projection.
 *
 * @param {unknown} value token declaration evidence
 * @param {UnknownRecord} theme checked theme
 * @param {UnknownRecord} stylingContract checked styling contract
 * @param {string} code failure diagnostic
 * @returns {void}
 */
function validateTokenDeclarations(value, theme, stylingContract, code) {
  const declarations = exactRecord(value, TOKEN_DECLARATION_KEYS, code);
  const palettes = exactRecord(
    stylingContract.resolvedPaletteSelectors,
    PALETTE_SELECTOR_KEYS,
    code,
  );
  if (
    declarations.lightSelector !== palettes.light ||
    declarations.darkSelector !== palettes.dark
  ) {
    invalid(code);
  }
  const light = isPlainObject(declarations.light)
    ? declarations.light
    : invalid(code);
  const dark = isPlainObject(declarations.dark)
    ? declarations.dark
    : invalid(code);
  const expectedProperties = THEME_TOKEN_CATALOG.map(
    ([key]) => `--gala-${key}`,
  ).sort();
  if (
    !stringArrayEquals(Object.keys(light).sort(), expectedProperties) ||
    !stringArrayEquals(Object.keys(dark).sort(), expectedProperties)
  ) {
    invalid(code);
  }
  if (!Array.isArray(theme.tokens)) invalid(code);
  for (const candidate of theme.tokens) {
    const token = exactRecord(candidate, TOKEN_KEYS, code);
    const property = `--gala-${String(token.key)}`;
    if (light[property] !== token.light || dark[property] !== token.dark) {
      invalid(code);
    }
  }
}

/**
 * Bind one retained parser-evidence envelope to the exact runner identity in
 * the independently validated immutable fixture release.
 *
 * This is the T03/S2 trust boundary: S2 owns isolated execution of the
 * integrity-verified runner bytes; T03 accepts only that runner's retained
 * evidence envelope and verifies its identity against the release ledger.
 * Copying these fields is not proof that the runner executed, so callers must
 * obtain the envelope directly from the trusted S2 parser runner.
 *
 * @param {unknown} value parser-evidence envelope
 * @param {UnknownRecord} fixtureRelease independently validated fixture release
 * @param {'css' | 'binary'} expectedRunnerId required runner identity
 * @param {string} code failure diagnostic
 * @returns {unknown[]} retained parser-evidence records
 */
function requireTrustedRunnerEvidence(
  value,
  fixtureRelease,
  expectedRunnerId,
  code,
) {
  const envelope = exactRecord(value, RUNNER_EVIDENCE_KEYS, code);
  const runner = exactRecord(envelope.runner, FIXTURE_RUNNER_KEYS, code);
  if (runner.runnerId !== expectedRunnerId) invalid(code);
  requireSemver(runner.version, code);
  requireDigest(runner.executableDigest, code);
  if (!Array.isArray(fixtureRelease.runners)) invalid(code);
  const matchingRunners = fixtureRelease.runners
    .map((candidate) => exactRecord(candidate, FIXTURE_RUNNER_KEYS, code))
    .filter((candidate) => candidate.runnerId === expectedRunnerId);
  if (
    matchingRunners.length !== 1 ||
    !jcsEqual(runner, matchingRunners[0]) ||
    !Array.isArray(envelope.records)
  ) {
    invalid(code);
  }
  return envelope.records;
}

/**
 * Validate trusted pinned-parser CSS evidence and all semantic relations it
 * exposes. The parser owns CSS tokenization, selector/property grammar, and
 * at-rule context; this validator owns exact source bytes, counts, layers,
 * token values, hooks, and local asset closure.
 *
 * @param {unknown} value trusted CSS parser-evidence envelope
 * @param {UnknownRecord} theme checked theme
 * @param {UnknownRecord} stylingContract checked styling contract
 * @param {UnknownRecord} fixtureRelease independently validated fixture release
 * @param {ThemePackageFile[]} files checked package files
 * @param {UnknownRecord[]} assets checked manifest assets
 * @returns {void}
 */
function validateCssEvidence(
  value,
  theme,
  stylingContract,
  fixtureRelease,
  files,
  assets,
) {
  const code = 'THEME_CSS_EVIDENCE_INVALID';
  const records = requireTrustedRunnerEvidence(
    value,
    fixtureRelease,
    'css',
    code,
  );
  if (
    !Array.isArray(theme.stylesheets) ||
    !Array.isArray(theme.cssLayers) ||
    records.length !== theme.stylesheets.length
  ) {
    invalid(code);
  }
  /** @type {Record<string, number>} */
  const metricTotals = {};
  const usedHooks = new Set();
  const referencedAssets = new Set();
  const fontAssets = new Set();
  let cssBytes = 0;
  for (let index = 0; index < records.length; index += 1) {
    const path = theme.stylesheets[index];
    const layer = theme.cssLayers[index];
    if (typeof path !== 'string' || typeof layer !== 'string') invalid(code);
    const keys =
      path === 'tokens.css'
        ? [...CSS_EVIDENCE_BASE_KEYS, 'tokenDeclarations']
        : CSS_EVIDENCE_BASE_KEYS;
    const evidence = exactRecord(records[index], keys, code);
    const file = requirePackageFile(files, path, code);
    validateCssSourceBytes(file.bytes, code);
    cssBytes += file.bytes.byteLength;
    if (
      evidence.path !== path ||
      evidence.profile !== fixtureRelease.browserPolicyRef ||
      evidence.disposition !== 'accepted' ||
      evidence.byteLength !== String(file.bytes.byteLength) ||
      evidence.sha256 !== sha256Tagged(file.bytes) ||
      evidence.outerLayer !== layer
    ) {
      invalid(code);
    }
    validateCssMetrics(evidence.metrics, metricTotals, code);
    const rowHooks = requireSortedStringSet(
      evidence.usedSlotHookIds,
      0,
      64,
      (entry) => requirePlainLabel(entry, code),
      code,
    );
    const rowAssets = requireSortedStringSet(
      evidence.referencedAssetPaths,
      0,
      256,
      (entry) => requireRepositoryPath(entry, code),
      code,
    );
    const rowFonts = requireSortedStringSet(
      evidence.fontFaceAssetPaths,
      0,
      128,
      (entry) => requireRepositoryPath(entry, code),
      code,
    );
    rowHooks.forEach((hook) => usedHooks.add(hook));
    rowAssets.forEach((asset) => referencedAssets.add(asset));
    rowFonts.forEach((asset) => fontAssets.add(asset));
    if (path === 'tokens.css') {
      validateTokenDeclarations(
        evidence.tokenDeclarations,
        theme,
        stylingContract,
        code,
      );
    }
  }
  if (cssBytes > 4_194_304) invalid(code);
  for (const [key, limit] of Object.entries(CSS_METRIC_LIMITS)) {
    if ((metricTotals[key] ?? 0) > limit) invalid(code);
  }

  const hooks = [...usedHooks].sort(compareJcsStrings);
  if (!stringArrayEquals(theme.slotHooks, hooks)) invalid(code);
  const publicHooks = new Set(
    Array.isArray(stylingContract.publicThemeSlotHooks)
      ? stylingContract.publicThemeSlotHooks.map((candidate) =>
          String(exactRecord(candidate, STYLE_HOOK_KEYS, code).hookId),
        )
      : invalid(code),
  );
  if (hooks.some((hook) => !publicHooks.has(hook))) invalid(code);

  const nonCssAssets = assets.filter((asset) => asset.mediaType !== 'text/css');
  const nonCssPaths = nonCssAssets
    .map((asset) => String(asset.path))
    .sort(compareUtf8);
  if (
    !stringArrayEquals([...referencedAssets].sort(compareUtf8), nonCssPaths)
  ) {
    invalid(code);
  }
  const mediaByPath = new Map(
    nonCssAssets.map((asset) => [String(asset.path), String(asset.mediaType)]),
  );
  if (
    [...fontAssets].some((path) => mediaByPath.get(path) !== 'font/woff2') ||
    nonCssAssets
      .filter((asset) => asset.mediaType === 'font/woff2')
      .some((asset) => !fontAssets.has(String(asset.path)))
  ) {
    invalid(code);
  }
}

/**
 * Validate trusted pinned SVG/binary parser evidence against exact members.
 *
 * @param {unknown} value trusted passive parser-evidence envelope
 * @param {ThemePackageFile[]} files checked package files
 * @param {UnknownRecord[]} assets checked manifest assets
 * @param {UnknownRecord} fixtureRelease independently validated fixture release
 * @returns {void}
 */
function validatePassiveAssetEvidence(value, files, assets, fixtureRelease) {
  const code = 'THEME_PASSIVE_ASSET_EVIDENCE_INVALID';
  const records = requireTrustedRunnerEvidence(
    value,
    fixtureRelease,
    'binary',
    code,
  );
  const nonCssAssets = assets
    .filter((asset) => asset.mediaType !== 'text/css')
    .sort((left, right) => compareUtf8(String(left.path), String(right.path)));
  if (records.length !== nonCssAssets.length) invalid(code);
  for (let index = 0; index < nonCssAssets.length; index += 1) {
    const asset = nonCssAssets[index];
    if (!asset || typeof asset.path !== 'string') invalid(code);
    const evidence = exactRecord(records[index], PASSIVE_EVIDENCE_KEYS, code);
    const file = requirePackageFile(files, asset.path, code);
    const limit = PASSIVE_SOURCE_LIMITS[String(asset.mediaType)];
    if (
      limit === undefined ||
      file.bytes.byteLength === 0 ||
      file.bytes.byteLength > limit ||
      evidence.path !== asset.path ||
      evidence.mediaType !== asset.mediaType ||
      evidence.profile !==
        (asset.mediaType === 'image/svg+xml'
          ? 'gala-passive-svg-v2'
          : fixtureRelease.binaryAssetProfile) ||
      evidence.disposition !== 'accepted' ||
      evidence.byteLength !== String(file.bytes.byteLength) ||
      evidence.sha256 !== sha256Tagged(file.bytes)
    ) {
      invalid(code);
    }
  }
}

/**
 * Validate the exact closed theme package, byte budgets, manifests, licenses,
 * and trusted parser-evidence projections.
 *
 * `context.packageFiles` is the extraction layer's complete stripped-member
 * observation. `fixtureRelease` is independently validated immutable shared
 * infra state. `cssEvidence` and `passiveAssetEvidence` are retained envelopes
 * emitted by the isolated S2 runners whose exact identities appear in that
 * release; they are context, never fields invented on theme.json. The caller
 * owns the trusted execution boundary: copying a runner ledger row into an
 * envelope does not prove execution. `acceptedBudgetCeilings` is the
 * independently selected release-policy ceiling and is mandatory because
 * DEC-097 deliberately defines no evidence-free universal package ceiling.
 *
 * @param {unknown} value complete theme contract
 * @param {unknown} context package files, parser evidence, styling catalog, and policy ceilings
 * @returns {void}
 */
export function validateThemePackage(value, context) {
  validateThemeContract(value);
  const code = 'THEME_PACKAGE_INVALID';
  const theme = /** @type {UnknownRecord} */ (value);
  const retained = exactRecord(
    context,
    [
      'packageFiles',
      'cssEvidence',
      'passiveAssetEvidence',
      'stylingContract',
      'fixtureRelease',
      'acceptedBudgetCeilings',
    ],
    code,
  );
  const stylingContract = isPlainObject(retained.stylingContract)
    ? retained.stylingContract
    : invalid(code);
  const fixtureRelease = isPlainObject(retained.fixtureRelease)
    ? retained.fixtureRelease
    : invalid(code);
  try {
    validateThemeFixtureRelease(fixtureRelease, {
      bytes: canonicalizeJcsBytes(fixtureRelease),
      stylingContractDigest: theme.stylingContractDigest,
    });
  } catch {
    invalid(code);
  }
  if (
    stylingContract.catalogDigest !== theme.stylingContractDigest ||
    fixtureRelease.contractVersion !== theme.contractVersion ||
    fixtureRelease.browserPolicyRef !== theme.browserPolicyRef ||
    fixtureRelease.fixtureDigest !== theme.fixtureDigest ||
    fixtureRelease.stylingContractDigest !== theme.stylingContractDigest ||
    !Array.isArray(fixtureRelease.fixtures) ||
    !stringArrayEquals(
      theme.fixtures,
      fixtureRelease.fixtures.map((candidate) =>
        String(exactRecord(candidate, FIXTURE_DEFINITION_KEYS, code).fixtureId),
      ),
    )
  ) {
    invalid(code);
  }
  const files = validatePackageFiles(retained.packageFiles, code);
  const budgets = validateBudgets(theme.budgets, code);
  const ceilings = validateBudgets(retained.acceptedBudgetCeilings, code);
  if (
    budgets.maximumFileBytes > ceilings.maximumFileBytes ||
    budgets.maximumTotalBytes > ceilings.maximumTotalBytes ||
    budgets.maximumFiles > ceilings.maximumFiles
  ) {
    invalid(code);
  }

  let totalBytes = 0n;
  for (const file of files) {
    const byteLength = BigInt(file.bytes.byteLength);
    totalBytes += byteLength;
    if (byteLength > budgets.maximumFileBytes) invalid(code);
  }
  if (
    files.length > budgets.maximumFiles ||
    totalBytes > budgets.maximumTotalBytes
  ) {
    invalid(code);
  }

  if (!Array.isArray(theme.assets) || !Array.isArray(theme.stylesheets)) {
    invalid(code);
  }
  const assets = theme.assets.map(validatePassiveAsset);
  const stylesheetSet = new Set(theme.stylesheets.map((path) => String(path)));
  const assetByPath = new Map(
    assets.map((asset) => [String(asset.path), asset]),
  );
  if (assetByPath.size !== assets.length) invalid(code);
  for (const path of stylesheetSet) {
    const asset = assetByPath.get(path);
    if (!asset || asset.mediaType !== 'text/css') invalid(code);
  }
  const nonCssAssets = assets.filter((asset) => {
    if (typeof asset.path !== 'string') invalid(code);
    if (stylesheetSet.has(asset.path)) return false;
    if (
      asset.mediaType === 'text/css' ||
      mediaTypeForAssetPath(asset.path, code) !== asset.mediaType
    ) {
      invalid(code);
    }
    return true;
  });
  if (assets.length !== stylesheetSet.size + nonCssAssets.length) invalid(code);

  const expectedPaths = [
    'package.json',
    'theme.json',
    ...theme.stylesheets.map((path) => String(path)),
    'LICENSE',
    'README.md',
    ...nonCssAssets.map((asset) => String(asset.path)),
  ].sort(compareUtf8);
  const actualPaths = files.map((file) => file.path).sort(compareUtf8);
  if (!stringArrayEquals(actualPaths, expectedPaths)) invalid(code);

  for (const asset of assets) {
    if (typeof asset.path !== 'string') invalid(code);
    const file = requirePackageFile(files, asset.path, code);
    validateAssetBytes(asset, file, code);
    if (asset.mediaType !== 'text/css') {
      const limit = PASSIVE_SOURCE_LIMITS[String(asset.mediaType)];
      if (
        limit === undefined ||
        file.bytes.byteLength === 0 ||
        file.bytes.byteLength > limit
      ) {
        invalid(code);
      }
    }
  }

  const themeFile = requirePackageFile(files, 'theme.json', code);
  requireCanonicalBytes(themeFile.bytes, theme, code);
  const packageManifestPaths = [
    'theme.json',
    ...theme.stylesheets.map((path) => String(path)),
    ...nonCssAssets.map((asset) => String(asset.path)),
  ].sort(compareUtf8);
  const packageExpression = validatePackageJson(
    files,
    theme,
    packageManifestPaths,
    code,
  );
  validateLicenseEvidence(files, assets, packageExpression, code);
  validateCssEvidence(
    retained.cssEvidence,
    theme,
    stylingContract,
    fixtureRelease,
    files,
    assets,
  );
  validatePassiveAssetEvidence(
    retained.passiveAssetEvidence,
    files,
    assets,
    fixtureRelease,
  );

  let integrity;
  try {
    integrity = computeThemePackageIntegrity(theme, files);
  } catch {
    invalid(code);
  }
  if (theme.integrity !== integrity) invalid(code);
}

/**
 * Validate the complete DEC-097 theme composition across the selected lock,
 * template catalog, package, fixture release, and conformance result.
 *
 * The context ledger is exact and consists only of independently retained or
 * integrity-verified inputs:
 *
 * - `lockedTheme` and `lockedTemplate`: selected lock rows;
 * - styling/fixture/result objects plus their exact compact-JCS bytes;
 * - complete extracted package-file observations;
 * - pinned CSS/passive parser evidence; and
 * - selected release-policy budget ceilings.
 *
 * @param {unknown} value complete theme-contract instance
 * @param {unknown} context exact retained validation context
 * @returns {void}
 */
export function validateThemeComposition(value, context) {
  validateThemeContract(value);
  const code = 'THEME_COMPOSITION_INVALID';
  const theme = /** @type {UnknownRecord} */ (value);
  const retained = exactRecord(
    context,
    [
      'lockedTheme',
      'lockedTemplate',
      'templateStylingContract',
      'templateStylingContractBytes',
      'fixtureRelease',
      'fixtureReleaseBytes',
      'conformanceResult',
      'conformanceResultBytes',
      'packageFiles',
      'cssEvidence',
      'passiveAssetEvidence',
      'acceptedBudgetCeilings',
    ],
    code,
  );
  const lockedTheme = exactRecord(
    retained.lockedTheme,
    [
      'package',
      'version',
      'integrity',
      'registry',
      'contractVersion',
      'compatibleWith',
    ],
    code,
  );
  const lockedTemplate = exactRecord(
    retained.lockedTemplate,
    [
      'package',
      'version',
      'integrity',
      'registry',
      'contractVersion',
      'compatibleWith',
      'templateModules',
    ],
    code,
  );
  const stylingContract = isPlainObject(retained.templateStylingContract)
    ? retained.templateStylingContract
    : invalid(code);
  const fixtureRelease = isPlainObject(retained.fixtureRelease)
    ? retained.fixtureRelease
    : invalid(code);
  const conformanceResult = isPlainObject(retained.conformanceResult)
    ? retained.conformanceResult
    : invalid(code);

  const themeIdentity = parsePackageExact(theme.package, code);
  if (
    lockedTheme.package !== themeIdentity.name ||
    lockedTheme.version !== themeIdentity.version ||
    lockedTheme.contractVersion !== theme.contractVersion ||
    lockedTheme.compatibleWith !== theme.templateRange ||
    lockedTemplate.package !== '@rathnasgala2/template' ||
    !stringArrayEquals(lockedTemplate.templateModules, [])
  ) {
    invalid(code);
  }
  requireSemver(lockedTheme.version, code);
  requireDigest(lockedTheme.integrity, code);
  requireSemver(lockedTheme.contractVersion, code);
  requireSemverRange(lockedTheme.compatibleWith, code);
  requireSemver(lockedTemplate.version, code);
  requireDigest(lockedTemplate.integrity, code);
  requireSemver(lockedTemplate.contractVersion, code);
  requireSemverRange(lockedTemplate.compatibleWith, code);
  try {
    if (
      !satisfiesSemverRange(
        String(lockedTemplate.version),
        String(theme.templateRange),
      )
    ) {
      invalid(code);
    }
  } catch {
    invalid(code);
  }
  if (theme.integrity === lockedTheme.integrity) invalid(code);

  validateTemplateStylingContract(stylingContract, {
    bytes: retained.templateStylingContractBytes,
    lockedTemplate,
  });
  if (
    stylingContract.contractVersion !== lockedTemplate.contractVersion ||
    theme.stylingContractDigest !== stylingContract.catalogDigest
  ) {
    invalid(code);
  }
  validateThemeFixtureRelease(fixtureRelease, {
    bytes: retained.fixtureReleaseBytes,
    stylingContractDigest: stylingContract.catalogDigest,
  });
  if (
    theme.contractVersion !== fixtureRelease.contractVersion ||
    theme.browserPolicyRef !== fixtureRelease.browserPolicyRef ||
    theme.fixtureDigest !== fixtureRelease.fixtureDigest ||
    theme.stylingContractDigest !== fixtureRelease.stylingContractDigest ||
    !Array.isArray(fixtureRelease.fixtures) ||
    !stringArrayEquals(
      theme.fixtures,
      fixtureRelease.fixtures.map((candidate) =>
        String(exactRecord(candidate, FIXTURE_DEFINITION_KEYS, code).fixtureId),
      ),
    )
  ) {
    invalid(code);
  }

  validateThemePackage(theme, {
    packageFiles: retained.packageFiles,
    cssEvidence: retained.cssEvidence,
    passiveAssetEvidence: retained.passiveAssetEvidence,
    stylingContract,
    fixtureRelease,
    acceptedBudgetCeilings: retained.acceptedBudgetCeilings,
  });

  let inputDigest;
  try {
    inputDigest = computeThemeConformanceInputDigest(
      theme,
      retained.packageFiles,
    );
  } catch {
    invalid(code);
  }
  validateThemeConformanceResult(conformanceResult, {
    bytes: retained.conformanceResultBytes,
    fixtureRelease,
    themeConformanceInputDigest: inputDigest,
  });
  if (
    conformanceResult.overallState !== 'pass' ||
    theme.evidenceDigest !== conformanceResult.evidenceDigest
  ) {
    invalid(code);
  }
}
