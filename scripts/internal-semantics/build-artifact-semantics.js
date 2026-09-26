import {
  createHash,
  createPublicKey,
  verify as verifySignature,
} from 'node:crypto';

import {
  canonicalizeJcs,
  canonicalizeJcsBytes,
  parseDuplicateFreeIJson,
  sha256Tagged,
} from '../../src/internal/canonical-jcs.js';
import {
  ACTIVE_DIGEST_PROFILES,
  digestActionDefinitionBlob,
  digestRenderPolicyBytes,
} from '../../src/internal/digest-profiles.js';
import { validateFrozenEnvelope } from '../../src/internal/frozen-envelope.js';
import { validateRfc3339 } from '../../src/internal/portable-scalars.js';
import {
  parseSemver,
  parseSemverRange,
  satisfiesSemverRange,
} from '../../src/internal/semver.js';
import {
  validateSpdxCatalogEvidence,
  validateSpdxExpression,
} from '../../src/internal/spdx.js';
import unicodeTable from '../../src/internal/generated/unicode17.json' with { type: 'json' };
import {
  assertUnicodeScalarString,
  graphemeLength17,
  normalizeNfc17,
  unicodeCollisionKey17,
} from '../../src/internal/unicode17.js';

const FATAL_UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const GIT_OBJECT_ID_PATTERN = /^(sha1:[0-9a-f]{40}|sha256:[0-9a-f]{64})$/u;
const GITHUB_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const POSITIVE_DECIMAL_PATTERN = /^[1-9][0-9]*$/u;
const NONNEGATIVE_DECIMAL_PATTERN = /^(?:0|[1-9][0-9]*)$/u;
const STABLE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const NPM_PACKAGE_PATTERN =
  /^(?:[a-z0-9][a-z0-9._-]*|@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*)$/u;
const MAX_INT64 = 9_223_372_036_854_775_807n;
const MAX_PACKAGE_BYTES = 134_217_728n;
const MAX_SOURCE_FILE_BYTES = 10_485_760;
const MAX_SOURCE_BYTES = 536_870_912n;
const MAX_ARTIFACT_FILES = 50_000;
const MAX_ARTIFACT_BYTES = 1_073_741_824n;
const SPDX_SCHEMA_DIGEST =
  'sha256:239208b7ac287b3cf5d9a9af23f9d69863971102a5e1587a27a398b43490b89b';

const THEME_TO_ID = /** @type {Readonly<Record<string, string>>} */ (
  Object.freeze({
    '@rathnasgala2/theme-default': 'default',
    '@rathnasgala2/theme-amaze': 'amaze',
    '@rathnasgala2/theme-flashy': 'flashy',
    '@rathnasgala2/theme-minimal': 'minimal',
    '@rathnasgala2/theme-zebra': 'zebra',
  })
);

const ADAPTER_TO_ID = /** @type {Readonly<Record<string, string>>} */ (
  Object.freeze({
    '@rathnasgala2/adapter-local-directory': 'local-directory',
    '@rathnasgala2/adapter-github-pages': 'github-pages',
    '@rathnasgala2/adapter-do-spaces': 'do-spaces',
  })
);

const DIRECT_PACKAGE_NAMES = Object.freeze([
  '@rathnasgala2/schemas',
  '@rathnasgala2/template',
  null,
  '@rathnasgala2/publish-action',
  '@rathnasgala2/publish-kernel',
  '@rathnasgala2/adapter-protocol',
  null,
]);

const OIDC_CLAIMS = Object.freeze([
  'actor',
  'actor_id',
  'aud',
  'event_name',
  'iss',
  'job_workflow_ref',
  'job_workflow_sha',
  'jti',
  'ref',
  'repository',
  'repository_id',
  'repository_owner',
  'repository_owner_id',
  'run_attempt',
  'run_id',
  'run_number',
  'runner_environment',
  'sha',
  'sub',
  'workflow_ref',
  'workflow_sha',
]);

const WORKFLOW_ROLES = Object.freeze([
  'author-caller',
  'publish',
  'authorize',
  'report',
]);
const WORKFLOW_PATHS = Object.freeze([
  '.github/workflows/gala-publish-v2.yml',
  '.github/workflows/publish-v2.yml',
  '.github/workflows/authorize-v2.yml',
  '.github/workflows/report-v2.yml',
]);
const SOURCE_ROLES = Object.freeze([
  'publication',
  'author',
  'content',
  'navigation',
  'appearance',
  'asset',
]);
const MANIFEST_MEDIA_TYPES = Object.freeze([
  'text/html; charset=utf-8',
  'text/css; charset=utf-8',
  'text/plain; charset=utf-8',
  'application/javascript; charset=utf-8',
  'application/json; charset=utf-8',
  'application/manifest+json; charset=utf-8',
  'application/atom+xml; charset=utf-8',
  'application/rss+xml; charset=utf-8',
  'application/xml; charset=utf-8',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'font/woff2',
  'application/octet-stream',
]);

const LOCK_KEYS = Object.freeze([
  'schemaId',
  'schemaVersion',
  'repositorySchemaVersion',
  'resolvedAt',
  'resolver',
  'schemas',
  'template',
  'theme',
  'publisher',
  'dependencies',
  'dependencyDag',
  'lockDigest',
]);
const BUILD_INPUT_KEYS = Object.freeze([
  'schemaId',
  'schemaVersion',
  'contractVersion',
  'repository',
  'sourceRevision',
  'packages',
  'publication',
  'authors',
  'content',
  'navigation',
  'appearance',
  'modules',
  'buildEpoch',
  'baseUrl',
  'basePath',
  'destinationCapabilities',
  'placements',
  'inputDigest',
]);
const MANIFEST_KEYS = Object.freeze([
  'schemaId',
  'schemaVersion',
  'repositoryNodeId',
  'sourceCommit',
  'workflowIdentity',
  'buildToolVersions',
  'buildInputDigest',
  'artifactDigest',
  'routes',
  'assets',
  'findings',
  'measurements',
  'policyResult',
  'generatedAt',
  'reproducibilityClass',
  'artifactId',
  'artifactFileCount',
  'artifactByteCount',
  'sourceIdentity',
  'builder',
  'composition',
  'buildInputContractVersion',
  'redirects',
  'declarativeHeaders',
  'includedSources',
  'excludedInputs',
  'sourceInventoryDigest',
  'validation',
  'manifestDigest',
]);
const PROVENANCE_KEYS = Object.freeze([
  'schemaId',
  'schemaVersion',
  'assertedWorkload',
  'requiredOidcClaims',
  'workflowFiles',
  'actionPins',
  'verifiedInputHandoff',
  'unfrozenOutputHandoff',
  'rebuildRecord',
  'lockDigest',
  'packageReleaseCatalogDigest',
  'buildInputDigest',
  'artifactId',
  'artifactDigest',
  'manifestDigest',
  'sbomDigest',
  'spdxLicenseListVersion',
  'spdxLicenseListDigest',
  'spdx23JsonSchemaDigest',
  'artifactLicenseConclusions',
  'policyReleaseId',
  'buildPolicyDecisionDigest',
  'capabilityDecisionDigest',
  'stylingContractDigest',
  'renderPolicy',
  'sandbox',
  'secretInputs',
]);

/**
 * Facts that the semantic validator deliberately receives from trusted owners.
 * None of these facts is added to a portable record.
 */
export const BUILD_ARTIFACT_CONTEXT_CONSTRAINTS = Object.freeze([
  'Author-source parsing, reference resolution, route derivation, and normalized-field projection must complete before context construction.',
  'Git transport must obtain the selected commit and exact object bytes, derive sourceTree and buildEpoch, enumerate the complete source tree, and validate refs; this validator rehashes and resolves each retained action commit/tree/blob proof.',
  'Registry request/response transport, DNS/TLS limits, retained packument metadata, Sigstore admission, tar/gzip safety, package extraction, lifecycle-field exclusion, and external-import scans remain prep-owned.',
  'OIDC discovery/JWKS transport, cache single-flight behavior, and atomic jti replay consumption remain authorization-owned; this validator verifies the retained profile, key projection, compact JWS, claims, clocks, and binding.',
  'The selected render-policy catalog and deterministic renderer behavior remain template-owned; this validator verifies the exact retained policy bytes and every identity/body digest copy.',
  'Exclusion-rule catalog membership, renderer output completeness, output media classification, and execution in two distinct empty roots must be supplied as immutable evidence; this validator checks their complete projections, partition, bytes, and equality.',
  'The workflow owner must validate the verified-input and unfrozen-output carrier codecs and content closures before context construction; this validator rechecks their retained REST identities, exact bytes, lengths, digests, purposes, and names.',
  'GitHub runner release admission and carrier upload/download/one-day-expiry observations remain workflow-owned; this validator checks the retained compatibility row, executable bytes, and evidence copies.',
  'The pinned official SPDX 2.3 JSON Schema must independently accept the exact retained SBOM bytes; this validator enforces the stricter Gala projection and the pinned schema-byte digest.',
  'Optional GitHub attestations and provider upload observations remain downstream owners and must use byte-identical frozen-envelope provenance and SBOM records.',
]);

/** Stable semantic validation failure. */
export class BuildArtifactSemanticError extends TypeError {
  /**
   * @param {string} code stable diagnostic code
   */
  constructor(code) {
    super(code);
    this.name = 'BuildArtifactSemanticError';
    this.code = code;
  }
}

/**
 * @param {string} code stable diagnostic code
 * @returns {never} always throws
 */
function fail(code) {
  throw new BuildArtifactSemanticError(code);
}

/**
 * @param {unknown} value candidate object
 * @param {string} code diagnostic code
 * @returns {Record<string, unknown>} plain object
 */
function asObject(value, code) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(code);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) fail(code);
  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * @param {unknown} value candidate array
 * @param {string} code diagnostic code
 * @returns {unknown[]} array
 */
function asArray(value, code) {
  if (!Array.isArray(value)) fail(code);
  return value;
}

/**
 * @param {unknown} value candidate object
 * @param {readonly string[]} required exact member ledger
 * @param {string} code diagnostic code
 * @param {readonly string[]} [optional] optional members
 * @returns {Record<string, unknown>} validated object
 */
function ledger(value, required, code, optional = []) {
  const object = asObject(value, code);
  const allowed = new Set([...required, ...optional]);
  const keys = Object.keys(object);
  if (
    required.some((key) => !Object.hasOwn(object, key)) ||
    keys.some((key) => !allowed.has(key))
  ) {
    fail(code);
  }
  return object;
}

/**
 * @param {unknown} value candidate string
 * @param {string} code diagnostic code
 * @returns {string} string
 */
function asString(value, code) {
  if (typeof value !== 'string') fail(code);
  return value;
}

/**
 * @param {unknown} actual candidate value
 * @param {unknown} expected exact expected value
 * @param {string} code diagnostic code
 * @returns {void}
 */
function equal(actual, expected, code) {
  if (actual !== expected) fail(code);
}

/**
 * @param {unknown} actual candidate JSON value
 * @param {unknown} expected exact expected JSON value
 * @param {string} code diagnostic code
 * @returns {void}
 */
function jcsEqual(actual, expected, code) {
  try {
    if (canonicalizeJcs(actual) !== canonicalizeJcs(expected)) fail(code);
  } catch (error) {
    if (error instanceof BuildArtifactSemanticError) throw error;
    fail(code);
  }
}

/**
 * @param {unknown} value candidate digest
 * @param {string} code diagnostic code
 * @returns {string} digest
 */
function digest(value, code) {
  const source = asString(value, code);
  if (!DIGEST_PATTERN.test(source)) fail(code);
  return source;
}

/**
 * @param {unknown} value candidate Git object ID
 * @param {string} code diagnostic code
 * @returns {string} object ID
 */
function gitObjectId(value, code) {
  const source = asString(value, code);
  if (!GIT_OBJECT_ID_PATTERN.test(source)) fail(code);
  return source;
}

/**
 * @param {unknown} value raw GitHub SHA claim
 * @param {string} code diagnostic code
 * @returns {string} tagged Git object ID
 */
function githubSha(value, code) {
  const source = asString(value, code);
  if (!GITHUB_SHA_PATTERN.test(source)) fail(code);
  return `sha1:${source}`;
}

/**
 * @param {unknown} value canonical GitHub positive decimal
 * @param {string} code diagnostic code
 * @returns {string} validated decimal
 */
function githubPositiveDecimal(value, code) {
  const source = asString(value, code);
  if (
    source.length > 20 ||
    !POSITIVE_DECIMAL_PATTERN.test(source) ||
    BigInt(source) > 18_446_744_073_709_551_615n
  ) {
    fail(code);
  }
  return source;
}

/**
 * @param {unknown} value canonical UUIDv7
 * @param {string} code diagnostic code
 * @returns {string} validated identifier
 */
function stableId(value, code) {
  const source = asString(value, code);
  if (!STABLE_ID_PATTERN.test(source)) fail(code);
  return source;
}

/**
 * @param {unknown} value canonical npm package name
 * @param {string} code diagnostic code
 * @returns {string} validated package name
 */
function npmPackageName(value, code) {
  const source = asString(value, code);
  if (
    Buffer.byteLength(source, 'utf8') > 214 ||
    !NPM_PACKAGE_PATTERN.test(source)
  ) {
    fail(code);
  }
  const components = source.startsWith('@')
    ? source.slice(1).split('/')
    : [source];
  if (components.some((component) => component === '.' || component === '..')) {
    fail(code);
  }
  return source;
}

/**
 * @param {unknown} value exact GitHub repository coordinate
 * @param {string} code diagnostic code
 * @returns {{coordinate: string, owner: string, repository: string}} parsed coordinate
 */
function githubRepositoryCoordinate(value, code) {
  const coordinate = asString(value, code);
  if (
    Buffer.byteLength(coordinate, 'ascii') !==
      Buffer.byteLength(coordinate, 'utf8') ||
    Buffer.byteLength(coordinate, 'ascii') < 3 ||
    Buffer.byteLength(coordinate, 'ascii') > 140
  ) {
    fail(code);
  }
  const parts = coordinate.split('/');
  const owner = parts[0];
  const repository = parts[1];
  if (
    parts.length !== 2 ||
    !owner ||
    !repository ||
    Buffer.byteLength(owner, 'ascii') > 39 ||
    Buffer.byteLength(repository, 'ascii') > 100 ||
    !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u.test(owner) ||
    !/^[A-Za-z0-9._-]+$/u.test(repository) ||
    repository === '.' ||
    repository === '..'
  ) {
    fail(code);
  }
  return { coordinate, owner, repository };
}

/**
 * @param {unknown} value candidate bytes
 * @param {string} code diagnostic code
 * @returns {Buffer} exact byte view
 */
function bytes(value, code) {
  if (!(value instanceof Uint8Array)) fail(code);
  return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
}

/**
 * @param {unknown} value canonical nonnegative int64
 * @param {string} code diagnostic code
 * @returns {bigint} parsed value
 */
function nonnegativeInt64(value, code) {
  const source = asString(value, code);
  if (!NONNEGATIVE_DECIMAL_PATTERN.test(source)) fail(code);
  const parsed = BigInt(source);
  if (parsed > MAX_INT64) fail(code);
  return parsed;
}

/**
 * @param {unknown} value canonical positive int64
 * @param {string} code diagnostic code
 * @returns {bigint} parsed value
 */
function positiveInt64(value, code) {
  const source = asString(value, code);
  if (!POSITIVE_DECIMAL_PATTERN.test(source)) fail(code);
  const parsed = BigInt(source);
  if (parsed > MAX_INT64) fail(code);
  return parsed;
}

/**
 * @param {unknown} value canonical timestamp
 * @param {string} code diagnostic code
 * @returns {string} timestamp
 */
function timestamp(value, code) {
  const source = asString(value, code);
  try {
    validateRfc3339(source);
  } catch {
    fail(code);
  }
  return source;
}

/**
 * @param {unknown} value canonical semantic version
 * @param {string} code diagnostic code
 * @returns {string} version
 */
function semver(value, code) {
  const source = asString(value, code);
  try {
    parseSemver(source);
  } catch {
    fail(code);
  }
  return source;
}

/**
 * @param {unknown} value canonical semantic-version range
 * @param {string} code diagnostic code
 * @returns {string} range
 */
function semverRange(value, code) {
  const source = asString(value, code);
  try {
    parseSemverRange(source);
  } catch {
    fail(code);
  }
  return source;
}

/**
 * Require normalized bounded plain-label text.
 *
 * @param {unknown} value candidate label
 * @param {string} code diagnostic code
 * @returns {string} checked label
 */
function plainLabel(value, code) {
  const source = asString(value, code);
  try {
    assertUnicodeScalarString(source);
  } catch {
    fail(code);
  }
  if (
    normalizeNfc17(source) !== source ||
    graphemeLength17(source) < 1 ||
    graphemeLength17(source) > 80 ||
    source.includes('<') ||
    source.includes('>') ||
    [...source].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return (
        codePoint <= 0x1f ||
        (codePoint >= 0x7f && codePoint <= 0x9f) ||
        (codePoint >= 0x202a && codePoint <= 0x202e) ||
        (codePoint >= 0x2066 && codePoint <= 0x2069)
      );
    })
  ) {
    fail(code);
  }
  return source;
}

/**
 * @param {string} left left UTF-8 string
 * @param {string} right right UTF-8 string
 * @returns {number} byte ordering
 */
function compareUtf8(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

/**
 * @param {unknown} left left JSON value
 * @param {unknown} right right JSON value
 * @returns {number} JCS member ordering
 */
function compareJcs(left, right) {
  return Buffer.compare(
    canonicalizeJcsBytes(left),
    canonicalizeJcsBytes(right),
  );
}

/**
 * @param {unknown[]} values candidate canonical set
 * @param {string} code diagnostic code
 * @param {(left: unknown, right: unknown) => number} [compare] ordering
 * @returns {void}
 */
function assertCanonicalSet(values, code, compare = compareJcs) {
  for (let index = 1; index < values.length; index += 1) {
    const prior = values[index - 1];
    const current = values[index];
    if (
      prior === undefined ||
      current === undefined ||
      compare(prior, current) >= 0
    ) {
      fail(code);
    }
  }
}

/**
 * @param {string} name active digest profile name
 * @param {unknown} value complete owner value
 * @param {string} code diagnostic code
 * @returns {string} computed digest
 */
function digestProfile(name, value, code) {
  const profile = ACTIVE_DIGEST_PROFILES[name];
  if (!profile) fail(code);
  try {
    return profile.digest(value);
  } catch {
    fail(code);
  }
}

/**
 * @param {Uint8Array} value exact bytes
 * @param {'sha1' | 'sha256'} algorithm algorithm
 * @returns {string} lowercase hash
 */
function rawHash(value, algorithm) {
  return createHash(algorithm).update(value).digest('hex');
}

/**
 * @param {Record<string, unknown>} value package record
 * @param {string} code diagnostic code
 * @returns {{package: string, version: string, integrity: string, registry: string}} identity projection
 */
function packageIdentity(value, code) {
  const packageName = npmPackageName(value.package, code);
  const version = semver(value.version, code);
  const integrity = digest(value.integrity, code);
  const registry = asString(value.registry, code);
  return { package: packageName, version, integrity, registry };
}

/**
 * @param {{package: string, version: string}} identity package identity
 * @returns {string} exact package coordinate
 */
function packageKey(identity) {
  return `${identity.package}@${identity.version}`;
}

/**
 * @param {string} path candidate path
 * @returns {string} normalized collision key
 */
function validatePortablePath(path) {
  assertUnicodeScalarString(path);
  if (
    path.length === 0 ||
    Buffer.byteLength(path, 'utf8') > 512 ||
    normalizeNfc17(path) !== path ||
    path.startsWith('/') ||
    path.endsWith('/') ||
    path.includes('//')
  ) {
    fail('PORTABLE_PATH_INVALID');
  }
  const properties =
    /** @type {{whiteSpace: [number, number, string][], noncharacter: [number, number, string][], defaultIgnorable: [number, number, string][]}} */ (
      /** @type {unknown} */ (unicodeTable)
    );
  const reserved = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9]|com[¹²³]|lpt[¹²³])$/u;
  for (const segment of path.split('/')) {
    const scalars = [...segment];
    const first = scalars[0];
    const last = scalars.at(-1);
    if (
      segment === '.' ||
      segment === '..' ||
      Buffer.byteLength(segment, 'utf8') > 128 ||
      first === undefined ||
      last === undefined ||
      last === '.'
    ) {
      fail('PORTABLE_PATH_INVALID');
    }
    const firstCodePoint = first.codePointAt(0);
    const lastCodePoint = last.codePointAt(0);
    if (
      firstCodePoint === undefined ||
      lastCodePoint === undefined ||
      inRanges(firstCodePoint, properties.whiteSpace) ||
      inRanges(lastCodePoint, properties.whiteSpace)
    ) {
      fail('PORTABLE_PATH_INVALID');
    }
    for (const character of scalars) {
      const codePoint = character.codePointAt(0);
      if (
        codePoint === undefined ||
        codePoint < 0x20 ||
        (codePoint >= 0x7f && codePoint <= 0x9f) ||
        ['%', '\\', '<', '>', ':', '"', '|', '?', '*'].includes(character) ||
        inRanges(codePoint, properties.defaultIgnorable) ||
        inRanges(codePoint, properties.noncharacter)
      ) {
        fail('PORTABLE_PATH_INVALID');
      }
    }
    const stem = segment.split('.', 1)[0];
    if (stem && reserved.test(unicodeCollisionKey17(stem))) {
      fail('PORTABLE_PATH_INVALID');
    }
  }
  return unicodeCollisionKey17(path);
}

/**
 * @param {number} codePoint Unicode scalar
 * @param {[number, number, string][]} ranges sorted ranges
 * @returns {boolean} membership
 */
function inRanges(codePoint, ranges) {
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
 * @param {string} objectId tagged Git object ID
 * @param {'blob' | 'commit' | 'tree'} type Git object type
 * @param {Uint8Array} content exact object bytes
 * @returns {boolean} whether bytes produce the object ID
 */
function gitObjectMatches(objectId, type, content) {
  const separator = objectId.indexOf(':');
  const algorithm = objectId.slice(0, separator);
  if (algorithm !== 'sha1' && algorithm !== 'sha256') return false;
  const header = Buffer.from(`${type} ${content.byteLength}\0`, 'utf8');
  const actual = createHash(algorithm)
    .update(header)
    .update(content)
    .digest('hex');
  return objectId.slice(separator + 1) === actual;
}

/**
 * @param {string} objectId tagged Git blob ID
 * @param {Uint8Array} content exact blob bytes
 * @returns {boolean} whether bytes produce the object ID
 */
function gitBlobMatches(objectId, content) {
  return gitObjectMatches(objectId, 'blob', content);
}

/**
 * @param {Record<string, unknown>} profile retained registry profile
 * @returns {void}
 */
function validateRegistryFetchProfile(profile) {
  const code = 'LOCK_REGISTRY_PROFILE_INVALID';
  ledger(
    profile,
    [
      'profile',
      'origin',
      'method',
      'httpVersion',
      'requestTargetSource',
      'requestHeaders',
      'requestBodyBytes',
      'acceptedStatus',
      'acceptedContentType',
      'maximumResponseHeadBytes',
      'maximumTarballBytes',
      'maximumResponseWireBodyBytes',
      'requestTimeoutMillis',
      'redirects',
      'retries',
      'ambientProxy',
      'netrc',
      'cookies',
      'credentials',
      'networkBoundaryProfileDigest',
      'tlsProfileDigest',
      'fixtureDigest',
      'evidenceDigest',
      'profileDigest',
    ],
    code,
  );
  const fixed = {
    profile: 'gala-npm-registry-fetch-v2',
    origin: 'https://registry.npmjs.org',
    method: 'GET',
    httpVersion: 'HTTP/1.1',
    requestTargetSource: 'catalog-entry-tarball-path',
    requestHeaders: [
      'accept: application/octet-stream',
      'accept-encoding: identity',
      'connection: close',
      'host: registry.npmjs.org',
    ],
    requestBodyBytes: 0,
    acceptedStatus: 200,
    acceptedContentType: 'application/octet-stream',
    maximumResponseHeadBytes: 32_768,
    maximumTarballBytes: 134_217_728,
    maximumResponseWireBodyBytes: 805_306_373,
    requestTimeoutMillis: 300_000,
    redirects: 'reject',
    retries: 0,
    ambientProxy: 'disabled',
    netrc: 'disabled',
    cookies: 'disabled',
    credentials: [],
  };
  for (const [key, expected] of Object.entries(fixed)) {
    jcsEqual(profile[key], expected, code);
  }
  for (const key of [
    'networkBoundaryProfileDigest',
    'tlsProfileDigest',
    'fixtureDigest',
    'evidenceDigest',
    'profileDigest',
  ]) {
    digest(profile[key], code);
  }
  equal(
    profile.profileDigest,
    digestProfile('npmRegistryFetchProfile', profile, code),
    code,
  );
}

/**
 * @param {string} path catalog tarball request target
 * @returns {void}
 */
function validateTarballPath(path) {
  if (
    Buffer.byteLength(path, 'ascii') !== Buffer.byteLength(path, 'utf8') ||
    Buffer.byteLength(path, 'ascii') > 2_048 ||
    !path.startsWith('/') ||
    path.endsWith('/') ||
    path.includes('//') ||
    /[%\\?#]/u.test(path)
  ) {
    fail('LOCK_CATALOG_INVALID');
  }
  const segments = path.slice(1).split('/');
  if (
    segments.length < 2 ||
    segments.length > 32 ||
    segments.some(
      (segment) =>
        segment.length > 255 ||
        segment === '.' ||
        segment === '..' ||
        !/^[A-Za-z0-9@._~+-]+$/u.test(segment),
    )
  ) {
    fail('LOCK_CATALOG_INVALID');
  }
}

/**
 * Resolve the only admitted first-party package-name families.
 *
 * @param {string} packageName canonical npm package name
 * @param {string} code diagnostic code
 * @returns {string} exact source repository coordinate
 */
function firstPartySourceRepository(packageName, code) {
  const suffix = packageName.slice('@rathnasgala2/'.length);
  if (suffix === 'schemas') return 'rathnasgala2/schema';
  if (suffix === 'template') return 'rathnasgala2/template';
  if (Object.hasOwn(THEME_TO_ID, packageName)) {
    return `rathnasgala2/${suffix}`;
  }
  if (
    packageName === '@rathnasgala2/publish-action' ||
    packageName === '@rathnasgala2/publish-kernel' ||
    packageName === '@rathnasgala2/adapter-protocol' ||
    Object.hasOwn(ADAPTER_TO_ID, packageName)
  ) {
    return 'rathnasgala2/publish';
  }
  fail(code);
}

/**
 * @param {Record<string, unknown>} entry catalog entry
 * @returns {void}
 */
function validateCatalogEntry(entry) {
  const code = 'LOCK_CATALOG_INVALID';
  const baseKeys = [
    'package',
    'version',
    'integrity',
    'tarballPath',
    'tarballByteCount',
    'authorityKind',
    'licenseExpression',
    'approvalEvidenceDigest',
  ];
  const provenanceKeys = [
    'sourceRepository',
    'sourceRepositoryId',
    'sourceCommit',
    'sourceRef',
    'releaseWorkflowPath',
    'releaseWorkflowCommit',
    'provenanceBundleDigest',
  ];
  const firstParty = asString(entry.package, code).startsWith('@rathnasgala2/');
  ledger(entry, firstParty ? [...baseKeys, ...provenanceKeys] : baseKeys, code);
  const packageName = npmPackageName(entry.package, code);
  semver(entry.version, code);
  digest(entry.integrity, code);
  const tarballPath = asString(entry.tarballPath, code);
  validateTarballPath(tarballPath);
  const byteCount = positiveInt64(entry.tarballByteCount, code);
  if (byteCount > MAX_PACKAGE_BYTES) fail(code);
  try {
    validateSpdxExpression(asString(entry.licenseExpression, code));
  } catch {
    fail(code);
  }
  digest(entry.approvalEvidenceDigest, code);
  if (firstParty) {
    equal(entry.authorityKind, 'rathnasgala-npm-provenance', code);
    const expectedRepository = firstPartySourceRepository(packageName, code);
    equal(entry.sourceRepository, expectedRepository, code);
    githubRepositoryCoordinate(entry.sourceRepository, code);
    githubPositiveDecimal(entry.sourceRepositoryId, code);
    gitObjectId(entry.sourceCommit, code);
    const sourceRef = asString(entry.sourceRef, code);
    if (
      !sourceRef.startsWith('refs/tags/') ||
      sourceRef.length < 11 ||
      sourceRef.length > 512
    )
      fail(code);
    equal(entry.releaseWorkflowPath, '.github/workflows/release.yaml', code);
    gitObjectId(entry.releaseWorkflowCommit, code);
    digest(entry.provenanceBundleDigest, code);
  } else {
    equal(entry.authorityKind, 'approved-upstream', code);
  }
}

/**
 * @param {Record<string, unknown>} metadata retained runtime metadata
 * @param {Map<string, Record<string, unknown>>} identities complete locked closure
 * @returns {{from: string, to: string}[]} derived dependency edges
 */
function validateRuntimeMetadata(metadata, identities) {
  const code = 'LOCK_RUNTIME_METADATA_INVALID';
  ledger(metadata, ['name', 'version', 'license', 'requirements'], code, [
    'enginesNode',
  ]);
  const name = npmPackageName(metadata.name, code);
  const version = semver(metadata.version, code);
  try {
    validateSpdxExpression(asString(metadata.license, code));
  } catch {
    fail(code);
  }
  if (Object.hasOwn(metadata, 'enginesNode')) {
    const engine = semverRange(metadata.enginesNode, code);
    if (!satisfiesSemverRange('24.18.0', engine)) fail(code);
  }
  const requirements = asArray(metadata.requirements, code).map((candidate) =>
    ledger(candidate, ['kind', 'package', 'range'], code),
  );
  if (requirements.length > 256) fail(code);
  assertCanonicalSet(requirements, code, (left, right) => {
    const a = asObject(left, code);
    const b = asObject(right, code);
    const kindComparison = compareUtf8(
      asString(a.kind, code),
      asString(b.kind, code),
    );
    return (
      kindComparison ||
      compareUtf8(asString(a.package, code), asString(b.package, code))
    );
  });
  const seenPackages = new Set();
  const edges = [];
  for (const requirement of requirements) {
    const kind = asString(requirement.kind, code);
    if (kind !== 'dependency' && kind !== 'peer') fail(code);
    const packageName = npmPackageName(requirement.package, code);
    if (seenPackages.has(packageName)) fail(code);
    seenPackages.add(packageName);
    const range = semverRange(requirement.range, code);
    const candidates = [...identities.values()].filter(
      (identity) => identity.package === packageName,
    );
    if (candidates.length !== 1) fail(code);
    const selected = candidates[0];
    if (
      !selected ||
      !satisfiesSemverRange(asString(selected.version, code), range)
    ) {
      fail(code);
    }
    edges.push({
      from: `${name}@${version}`,
      to: packageKey(packageIdentity(selected, code)),
    });
  }
  return edges;
}

/**
 * @typedef {{
 *   direct: Record<string, unknown>[],
 *   all: Record<string, unknown>[],
 *   identities: Map<string, Record<string, unknown>>,
 *   catalogByKey: Map<string, Record<string, unknown>>,
 *   artifactsByKey: Map<string, Record<string, unknown>>,
 *   catalog: Record<string, unknown>,
 *   adapterPackage: Record<string, unknown>
 * }} LockState
 */

/**
 * Validate exact resolution, catalog, bytes, runtime graph, and build-package projection.
 *
 * @param {Record<string, unknown>} lock lock record
 * @param {Record<string, unknown>} buildInput build-input record
 * @param {Record<string, unknown>} context trusted validator context
 * @returns {LockState} validated package state
 */
function validateLock(lock, buildInput, context) {
  const ledgerCode = 'LOCK_LEDGER_INVALID';
  ledger(lock, LOCK_KEYS, ledgerCode);
  equal(lock.schemaId, 'urn:gala:schema:lock:2.0.0', ledgerCode);
  equal(lock.schemaVersion, '2.0.0', ledgerCode);
  semver(lock.repositorySchemaVersion, ledgerCode);
  timestamp(lock.resolvedAt, ledgerCode);
  const resolver = asObject(lock.resolver, ledgerCode);
  const schemas = asObject(lock.schemas, ledgerCode);
  const template = asObject(lock.template, ledgerCode);
  const theme = asObject(lock.theme, ledgerCode);
  const publishers = asArray(lock.publisher, 'LOCK_ROLE_INVALID').map((row) =>
    asObject(row, 'LOCK_ROLE_INVALID'),
  );
  if (publishers.length !== 4) fail('LOCK_ROLE_INVALID');
  const adapterPackage = publishers[3];
  if (!adapterPackage) fail('LOCK_ROLE_INVALID');
  const actualNames = [
    asString(schemas.package, 'LOCK_ROLE_INVALID'),
    asString(template.package, 'LOCK_ROLE_INVALID'),
    asString(theme.package, 'LOCK_ROLE_INVALID'),
    ...publishers.map((row) => asString(row.package, 'LOCK_ROLE_INVALID')),
  ];
  const expectedNames = [...DIRECT_PACKAGE_NAMES];
  expectedNames[2] = Object.hasOwn(THEME_TO_ID, actualNames[2] ?? '')
    ? (actualNames[2] ?? null)
    : null;
  expectedNames[6] = Object.hasOwn(ADAPTER_TO_ID, actualNames[6] ?? '')
    ? (actualNames[6] ?? null)
    : null;
  if (actualNames.some((name, index) => name !== expectedNames[index])) {
    fail('LOCK_ROLE_INVALID');
  }
  for (const row of [schemas, template, theme, ...publishers]) {
    packageIdentity(row, 'LOCK_ROLE_INVALID');
    semver(row.contractVersion, 'LOCK_ROLE_INVALID');
    semverRange(row.compatibleWith, 'LOCK_ROLE_INVALID');
  }
  jcsEqual(
    packageIdentity(resolver, 'LOCK_ROLE_INVALID'),
    packageIdentity(publishers[0] ?? {}, 'LOCK_ROLE_INVALID'),
    'LOCK_ROLE_INVALID',
  );
  equal(resolver.package, '@rathnasgala2/publish-action', 'LOCK_ROLE_INVALID');
  const dependencies = asArray(lock.dependencies, 'LOCK_DAG_INVALID').map(
    (row) => asObject(row, 'LOCK_DAG_INVALID'),
  );
  if (dependencies.length > 512) fail('LOCK_DAG_INVALID');
  for (const row of dependencies) packageIdentity(row, 'LOCK_DAG_INVALID');
  assertCanonicalSet(dependencies, 'LOCK_DAG_INVALID', (left, right) => {
    const a = asObject(left, 'LOCK_DAG_INVALID');
    const b = asObject(right, 'LOCK_DAG_INVALID');
    const packageComparison = compareUtf8(
      asString(a.package, 'LOCK_DAG_INVALID'),
      asString(b.package, 'LOCK_DAG_INVALID'),
    );
    return (
      packageComparison ||
      compareUtf8(
        asString(a.version, 'LOCK_DAG_INVALID'),
        asString(b.version, 'LOCK_DAG_INVALID'),
      )
    );
  });
  const direct = [schemas, template, theme, ...publishers];
  const all = [...direct, ...dependencies];
  const identities = new Map();
  const names = new Map();
  for (const row of all) {
    const identity = packageIdentity(row, 'LOCK_DAG_INVALID');
    const key = packageKey(identity);
    if (identities.has(key) || names.has(identity.package))
      fail('LOCK_DAG_INVALID');
    identities.set(key, row);
    names.set(identity.package, identity.version);
  }

  const catalog = ledger(
    context.packageReleaseCatalog,
    [
      'profile',
      'catalogId',
      'registry',
      'registryFetchProfileDigest',
      'sigstoreTrustRootDigest',
      'entries',
      'catalogDigest',
    ],
    'LOCK_CATALOG_INVALID',
  );
  equal(
    catalog.profile,
    'gala-package-release-catalog-v2',
    'LOCK_CATALOG_INVALID',
  );
  stableId(catalog.catalogId, 'LOCK_CATALOG_INVALID');
  equal(
    catalog.registry,
    'https://registry.npmjs.org/',
    'LOCK_CATALOG_INVALID',
  );
  digest(catalog.sigstoreTrustRootDigest, 'LOCK_CATALOG_INVALID');
  const catalogEntries = asArray(catalog.entries, 'LOCK_CATALOG_INVALID').map(
    (row) => asObject(row, 'LOCK_CATALOG_INVALID'),
  );
  if (catalogEntries.length < 1 || catalogEntries.length > 4_096) {
    fail('LOCK_CATALOG_INVALID');
  }
  for (const entry of catalogEntries) validateCatalogEntry(entry);
  assertCanonicalSet(catalogEntries, 'LOCK_CATALOG_INVALID', (left, right) => {
    const a = asObject(left, 'LOCK_CATALOG_INVALID');
    const b = asObject(right, 'LOCK_CATALOG_INVALID');
    const packageComparison = compareUtf8(
      asString(a.package, 'LOCK_CATALOG_INVALID'),
      asString(b.package, 'LOCK_CATALOG_INVALID'),
    );
    return (
      packageComparison ||
      compareUtf8(
        asString(a.version, 'LOCK_CATALOG_INVALID'),
        asString(b.version, 'LOCK_CATALOG_INVALID'),
      )
    );
  });
  equal(
    catalog.catalogDigest,
    digestProfile('packageReleaseCatalog', catalog, 'LOCK_CATALOG_INVALID'),
    'LOCK_CATALOG_INVALID',
  );
  const registryProfile = asObject(
    context.registryFetchProfile,
    'LOCK_REGISTRY_PROFILE_INVALID',
  );
  validateRegistryFetchProfile(registryProfile);
  equal(
    catalog.registryFetchProfileDigest,
    registryProfile.profileDigest,
    'LOCK_REGISTRY_PROFILE_INVALID',
  );
  const catalogByKey = new Map(
    catalogEntries.map((entry) => [
      `${asString(entry.package, 'LOCK_CATALOG_INVALID')}@${asString(entry.version, 'LOCK_CATALOG_INVALID')}`,
      entry,
    ]),
  );
  const packageArtifacts = asArray(
    context.packageArtifacts,
    'LOCK_PACKAGE_BYTES_INVALID',
  ).map((row) =>
    ledger(
      row,
      ['package', 'version', 'bytes', 'runtimeMetadata'],
      'LOCK_PACKAGE_BYTES_INVALID',
    ),
  );
  const artifactsByKey = new Map();
  for (const artifact of packageArtifacts) {
    const key = `${asString(artifact.package, 'LOCK_PACKAGE_BYTES_INVALID')}@${semver(artifact.version, 'LOCK_PACKAGE_BYTES_INVALID')}`;
    if (artifactsByKey.has(key)) fail('LOCK_PACKAGE_BYTES_INVALID');
    artifactsByKey.set(key, artifact);
  }
  if (artifactsByKey.size !== identities.size)
    fail('LOCK_PACKAGE_BYTES_INVALID');
  for (const [key, row] of identities) {
    const identity = packageIdentity(row, 'LOCK_CATALOG_INVALID');
    const entry = catalogByKey.get(key);
    const artifact = artifactsByKey.get(key);
    if (!entry || !artifact) fail('LOCK_CATALOG_INVALID');
    equal(identity.registry, catalog.registry, 'LOCK_CATALOG_INVALID');
    equal(identity.integrity, entry.integrity, 'LOCK_CATALOG_INVALID');
    const tarball = bytes(artifact.bytes, 'LOCK_PACKAGE_BYTES_INVALID');
    equal(
      identity.integrity,
      sha256Tagged(tarball),
      'LOCK_PACKAGE_BYTES_INVALID',
    );
    equal(
      BigInt(tarball.length),
      positiveInt64(entry.tarballByteCount, 'LOCK_PACKAGE_BYTES_INVALID'),
      'LOCK_PACKAGE_BYTES_INVALID',
    );
    const metadata = asObject(
      artifact.runtimeMetadata,
      'LOCK_RUNTIME_METADATA_INVALID',
    );
    equal(metadata.name, identity.package, 'LOCK_RUNTIME_METADATA_INVALID');
    equal(metadata.version, identity.version, 'LOCK_RUNTIME_METADATA_INVALID');
    equal(
      metadata.license,
      entry.licenseExpression,
      'LOCK_RUNTIME_METADATA_INVALID',
    );
  }

  const derivedEdges = [];
  for (const [key, artifact] of artifactsByKey) {
    const metadata = asObject(
      artifact.runtimeMetadata,
      'LOCK_RUNTIME_METADATA_INVALID',
    );
    const edges = validateRuntimeMetadata(metadata, identities);
    if (`${metadata.name}@${metadata.version}` !== key)
      fail('LOCK_RUNTIME_METADATA_INVALID');
    derivedEdges.push(...edges);
  }
  const sortedEdges = [...derivedEdges].sort(compareJcs);
  assertCanonicalSet(sortedEdges, 'LOCK_DAG_INVALID');
  const dag = asArray(lock.dependencyDag, 'LOCK_DAG_INVALID').map((edge) =>
    ledger(edge, ['from', 'to'], 'LOCK_DAG_INVALID'),
  );
  if (dag.length > 512) fail('LOCK_DAG_INVALID');
  assertCanonicalSet(dag, 'LOCK_DAG_INVALID');
  jcsEqual(dag, sortedEdges, 'LOCK_DAG_INVALID');
  const adjacency = new Map(
    [...identities.keys()].map((key) => [key, /** @type {string[]} */ ([])]),
  );
  for (const edge of sortedEdges) {
    const from = asString(edge.from, 'LOCK_DAG_INVALID');
    const to = asString(edge.to, 'LOCK_DAG_INVALID');
    const targets = adjacency.get(from);
    if (!targets || !adjacency.has(to)) fail('LOCK_DAG_INVALID');
    targets.push(to);
  }
  const directKeys = new Set(
    direct.map((row) => packageKey(packageIdentity(row, 'LOCK_DAG_INVALID'))),
  );
  const reachable = new Set(directKeys);
  const queue = [...directKeys];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const target of adjacency.get(current) ?? []) {
      if (!reachable.has(target)) {
        reachable.add(target);
        queue.push(target);
      }
    }
  }
  if (
    dependencies.some(
      (row) =>
        !reachable.has(packageKey(packageIdentity(row, 'LOCK_DAG_INVALID'))),
    )
  ) {
    fail('LOCK_DAG_INVALID');
  }
  const visiting = new Set();
  const visited = new Set();
  /** @param {string} node graph node @returns {void} */
  const visit = (node) => {
    if (visiting.has(node)) fail('LOCK_DAG_INVALID');
    if (visited.has(node)) return;
    visiting.add(node);
    for (const target of adjacency.get(node) ?? []) visit(target);
    visiting.delete(node);
    visited.add(node);
  };
  for (const key of adjacency.keys()) visit(key);
  equal(
    lock.lockDigest,
    digestProfile('lock', lock, 'LOCK_DIGEST_INVALID'),
    'LOCK_DIGEST_INVALID',
  );

  const packages = ledger(
    buildInput.packages,
    ['schemas', 'template', 'theme', 'publisher', 'dependencies'],
    'BUILD_PACKAGE_MISMATCH',
  );
  const expectedBuildPackages = {
    schemas: packageIdentity(schemas, 'BUILD_PACKAGE_MISMATCH'),
    template: packageIdentity(template, 'BUILD_PACKAGE_MISMATCH'),
    theme: packageIdentity(theme, 'BUILD_PACKAGE_MISMATCH'),
    publisher: publishers.map((row) =>
      packageIdentity(row, 'BUILD_PACKAGE_MISMATCH'),
    ),
    dependencies: dependencies.map((row) =>
      packageIdentity(row, 'BUILD_PACKAGE_MISMATCH'),
    ),
  };
  jcsEqual(packages, expectedBuildPackages, 'BUILD_PACKAGE_MISMATCH');

  return {
    direct,
    all,
    identities,
    catalogByKey,
    artifactsByKey,
    catalog,
    adapterPackage,
  };
}

/**
 * Validate the exact theme/adapter contract projections.
 *
 * @param {Record<string, unknown>} lock lock record
 * @param {Record<string, unknown>} buildInput build input
 * @param {Record<string, unknown>} context trusted context
 * @param {LockState} lockState package state
 * @returns {void}
 */
function validateContractProjections(lock, buildInput, context, lockState) {
  const code = 'BUILD_CONTRACT_PROJECTION_INVALID';
  const theme = asObject(lock.theme, code);
  const template = asObject(lock.template, code);
  const publishers = asArray(lock.publisher, code).map((row) =>
    asObject(row, code),
  );
  const protocol = publishers[2];
  const adapterPackage = lockState.adapterPackage;
  if (!protocol) fail(code);
  const buildPackages = ledger(
    buildInput.packages,
    ['schemas', 'template', 'theme', 'publisher', 'dependencies'],
    code,
  );
  const expectedBuildPackages = {
    schemas: packageIdentity(asObject(lock.schemas, code), code),
    template: packageIdentity(template, code),
    theme: packageIdentity(theme, code),
    publisher: publishers.map((row) => packageIdentity(row, code)),
    dependencies: asArray(lock.dependencies, code).map((row) =>
      packageIdentity(asObject(row, code), code),
    ),
  };
  jcsEqual(buildPackages, expectedBuildPackages, code);
  equal(buildInput.contractVersion, '2.0.0', code);
  equal(template.contractVersion, '2.0.0', code);
  equal(theme.contractVersion, '2.0.0', code);

  const themeContract = asObject(context.themeContract, code);
  const themePackage = asString(theme.package, code);
  const expectedThemeId = THEME_TO_ID[themePackage];
  if (!expectedThemeId) fail(code);
  equal(themeContract.themeId, expectedThemeId, code);
  equal(themeContract.package, packageKey(packageIdentity(theme, code)), code);
  equal(themeContract.contractVersion, theme.contractVersion, code);
  equal(themeContract.templateRange, theme.compatibleWith, code);
  const themeRange = semverRange(themeContract.templateRange, code);
  if (!satisfiesSemverRange(asString(template.version, code), themeRange))
    fail(code);
  const appearance = asObject(buildInput.appearance, code);
  equal(appearance.theme, packageKey(packageIdentity(theme, code)), code);

  const adapterCapability = asObject(context.adapterCapability, code);
  const adapter = asObject(adapterCapability.adapter, code);
  const adapterPackageName = asString(adapterPackage.package, code);
  const expectedAdapterId = ADAPTER_TO_ID[adapterPackageName];
  if (!expectedAdapterId) fail(code);
  equal(adapter.adapterId, expectedAdapterId, code);
  equal(adapter.adapterVersion, adapterPackage.version, code);
  equal(adapter.adapterDigest, adapterPackage.integrity, code);
  equal(
    adapterCapability.contractVersion,
    adapterPackage.contractVersion,
    code,
  );
  equal(adapterCapability.protocolRange, adapterPackage.compatibleWith, code);
  const protocolRange = semverRange(adapterCapability.protocolRange, code);
  if (!satisfiesSemverRange(asString(protocol.version, code), protocolRange))
    fail(code);
  equal(
    adapterCapability.capabilityDigest,
    digestProfile('adapterCapability', adapterCapability, code),
    code,
  );
  const destination = ledger(
    buildInput.destinationCapabilities,
    ['adapter', 'baseUrl', 'capabilityDigest'],
    code,
  );
  jcsEqual(destination.adapter, adapter, code);
  equal(destination.capabilityDigest, adapterCapability.capabilityDigest, code);
}

/**
 * @typedef {{
 *   repositoryContext: Record<string, unknown>,
 *   treeFiles: Map<string, {path: string, mode: string, objectId: string, bytes: Buffer}>,
 *   includedSources: Record<string, unknown>[],
 *   exclusions: Record<string, unknown>[],
 *   renderPolicy: Record<string, unknown>
 * }} SourceState
 */

/**
 * @param {unknown} value context tree entry
 * @returns {{path: string, mode: string, objectId: string, bytes: Buffer}} validated entry
 */
function validateTreeEntry(value) {
  const code = 'BUILD_SOURCE_TREE_INVALID';
  const entry = ledger(value, ['path', 'mode', 'objectId', 'bytes'], code);
  const path = asString(entry.path, code);
  validatePortablePath(path);
  const mode = asString(entry.mode, code);
  if (mode !== '100644' && mode !== '100755') fail(code);
  const objectId = gitObjectId(entry.objectId, code);
  const content = bytes(entry.bytes, code);
  if (
    content.length > MAX_SOURCE_FILE_BYTES ||
    !gitBlobMatches(objectId, content)
  ) {
    fail(code);
  }
  return { path, mode, objectId, bytes: content };
}

/**
 * @param {Record<string, unknown>} body renderable body owner
 * @param {Record<string, unknown>} renderPolicy global render policy
 * @param {Map<string, {path: string, mode: string, objectId: string, bytes: Buffer}>} treeFiles source tree
 * @param {(path: string, digestValue: string, role: string) => void} addSource source closure sink
 * @returns {void}
 */
function validateRenderableBody(body, renderPolicy, treeFiles, addSource) {
  const code = 'BUILD_RENDER_POLICY_INVALID';
  const sourcePath = asString(body.sourcePath, code);
  const sourceDigest = digest(body.sourceDigest, code);
  addSource(sourcePath, sourceDigest, 'content');
  equal(body.bodyMediaType, 'text/html', code);
  const rendered = asString(body.body, code);
  equal(body.bodyDigest, sha256Tagged(Buffer.from(rendered, 'utf8')), code);
  jcsEqual(body.renderPolicy, renderPolicy, code);
  if (!treeFiles.has(sourcePath)) fail(code);
}

/**
 * @param {unknown} candidate resolved-file value
 * @param {(path: string, digestValue: string, role: string) => void} addSource source closure sink
 * @returns {void}
 */
function validateResolvedFile(candidate, addSource) {
  const file = ledger(
    candidate,
    ['path', 'sourceDigest'],
    'BUILD_SOURCE_REFERENCE_INVALID',
  );
  addSource(
    asString(file.path, 'BUILD_SOURCE_REFERENCE_INVALID'),
    digest(file.sourceDigest, 'BUILD_SOURCE_REFERENCE_INVALID'),
    'asset',
  );
}

/**
 * Require a canonical string set.
 *
 * @param {unknown} value candidate array
 * @param {string} code diagnostic
 * @returns {string[]} strings
 */
function canonicalStringSet(value, code) {
  const values = asArray(value, code).map((entry) => asString(entry, code));
  assertCanonicalSet(values, code, (left, right) =>
    compareUtf8(asString(left, code), asString(right, code)),
  );
  return values;
}

/**
 * Validate repository/source normalization, lifecycle, author closure, and build digest.
 *
 * @param {Record<string, unknown>} lock lock record
 * @param {Record<string, unknown>} buildInput build-input record
 * @param {Record<string, unknown>} context trusted context
 * @returns {SourceState} validated source state
 */
function validateBuildInput(lock, buildInput, context) {
  const code = 'BUILD_INPUT_INVALID';
  ledger(buildInput, BUILD_INPUT_KEYS, code);
  equal(buildInput.schemaId, 'urn:gala:schema:build-input:2.0.0', code);
  equal(buildInput.schemaVersion, '2.0.0', code);
  equal(buildInput.contractVersion, '2.0.0', code);
  jcsEqual(buildInput.modules, {}, code);
  jcsEqual(buildInput.placements, [], code);
  timestamp(buildInput.buildEpoch, code);

  const repositoryContext = ledger(
    context.repository,
    [
      'coordinate',
      'repositoryId',
      'repositoryOwnerId',
      'sourceRevision',
      'sourceTree',
      'buildEpoch',
      'treeEntries',
      'routeNormalizationProfile',
      'contentRoutes',
      'exclusions',
    ],
    'BUILD_SOURCE_TREE_INVALID',
  );
  githubRepositoryCoordinate(
    repositoryContext.coordinate,
    'BUILD_SOURCE_TREE_INVALID',
  );
  githubPositiveDecimal(
    repositoryContext.repositoryId,
    'BUILD_SOURCE_TREE_INVALID',
  );
  githubPositiveDecimal(
    repositoryContext.repositoryOwnerId,
    'BUILD_SOURCE_TREE_INVALID',
  );
  gitObjectId(repositoryContext.sourceRevision, 'BUILD_SOURCE_TREE_INVALID');
  const snapshot = ledger(
    buildInput.repository,
    ['repositoryId', 'repositoryOwnerId', 'sourceRevision', 'rootDigest'],
    'BUILD_SOURCE_TREE_INVALID',
  );
  equal(
    snapshot.repositoryId,
    repositoryContext.repositoryId,
    'BUILD_SOURCE_TREE_INVALID',
  );
  equal(
    snapshot.repositoryOwnerId,
    repositoryContext.repositoryOwnerId,
    'BUILD_SOURCE_TREE_INVALID',
  );
  equal(
    snapshot.sourceRevision,
    repositoryContext.sourceRevision,
    'BUILD_SOURCE_TREE_INVALID',
  );
  equal(
    buildInput.sourceRevision,
    snapshot.sourceRevision,
    'BUILD_SOURCE_TREE_INVALID',
  );
  equal(
    buildInput.buildEpoch,
    repositoryContext.buildEpoch,
    'BUILD_SOURCE_TREE_INVALID',
  );
  gitObjectId(repositoryContext.sourceTree, 'BUILD_SOURCE_TREE_INVALID');
  const treeEntries = asArray(
    repositoryContext.treeEntries,
    'BUILD_SOURCE_TREE_INVALID',
  ).map(validateTreeEntry);
  const treeFiles = new Map();
  const collisionKeys = new Set();
  let totalSourceBytes = 0n;
  for (const entry of treeEntries) {
    const collisionKey = unicodeCollisionKey17(entry.path);
    if (treeFiles.has(entry.path) || collisionKeys.has(collisionKey)) {
      fail('BUILD_SOURCE_TREE_INVALID');
    }
    treeFiles.set(entry.path, entry);
    collisionKeys.add(collisionKey);
    totalSourceBytes += BigInt(entry.bytes.length);
  }
  if (totalSourceBytes > MAX_SOURCE_BYTES) fail('BUILD_SOURCE_TREE_INVALID');
  const rootEntries = treeEntries
    .map(({ path, mode, objectId }) => ({ path, mode, objectId }))
    .sort((left, right) => compareUtf8(left.path, right.path));
  equal(
    snapshot.rootDigest,
    digestProfile('repositoryRoot', rootEntries, 'BUILD_SOURCE_TREE_INVALID'),
    'BUILD_SOURCE_TREE_INVALID',
  );

  const policyBytes = bytes(
    context.renderPolicyBytes,
    'BUILD_RENDER_POLICY_INVALID',
  );
  let policyFile;
  try {
    policyFile = asObject(
      parseDuplicateFreeIJson(policyBytes),
      'BUILD_RENDER_POLICY_INVALID',
    );
    if (!Buffer.from(policyBytes).equals(canonicalizeJcsBytes(policyFile))) {
      fail('BUILD_RENDER_POLICY_INVALID');
    }
  } catch (error) {
    if (error instanceof BuildArtifactSemanticError) throw error;
    fail('BUILD_RENDER_POLICY_INVALID');
  }
  equal(policyFile.name, 'gala-render-policy', 'BUILD_RENDER_POLICY_INVALID');
  equal(
    policyFile.version,
    asObject(lock.template, code).contractVersion,
    'BUILD_RENDER_POLICY_INVALID',
  );
  if (Object.hasOwn(policyFile, 'digest')) fail('BUILD_RENDER_POLICY_INVALID');
  const renderPolicy = {
    name: 'gala-render-policy',
    version: asString(policyFile.version, 'BUILD_RENDER_POLICY_INVALID'),
    digest: digestRenderPolicyBytes(policyBytes),
  };

  /** @type {Map<string, {digest: string, role: string}>} */
  const sourceClosure = new Map();
  /**
   * @param {string} path source path
   * @param {string} digestValue source digest
   * @param {string} role semantic role
   * @returns {void}
   */
  const addSource = (path, digestValue, role) => {
    validatePortablePath(path);
    const file = treeFiles.get(path);
    if (!file || sha256Tagged(file.bytes) !== digestValue) {
      fail('BUILD_SOURCE_REFERENCE_INVALID');
    }
    const prior = sourceClosure.get(path);
    if (prior && prior.digest !== digestValue)
      fail('BUILD_SOURCE_REFERENCE_INVALID');
    if (!SOURCE_ROLES.includes(role)) fail('BUILD_SOURCE_REFERENCE_INVALID');
    if (
      !prior ||
      SOURCE_ROLES.indexOf(role) < SOURCE_ROLES.indexOf(prior.role)
    ) {
      sourceClosure.set(path, { digest: digestValue, role });
    }
  };

  const publication = asObject(buildInput.publication, code);
  addSource(
    asString(publication.sourcePath, 'BUILD_SOURCE_REFERENCE_INVALID'),
    digest(publication.sourceDigest, 'BUILD_SOURCE_REFERENCE_INVALID'),
    'publication',
  );
  if (Object.hasOwn(publication, 'defaultImage')) {
    validateResolvedFile(publication.defaultImage, addSource);
  }
  if (Object.hasOwn(publication, 'profile')) {
    const profile = asObject(publication.profile, code);
    validateRenderableBody(
      asObject(profile.body, code),
      renderPolicy,
      treeFiles,
      addSource,
    );
  }
  if (Object.hasOwn(publication, 'footerCard')) {
    const footer = asObject(publication.footerCard, code);
    validateRenderableBody(
      asObject(footer.body, code),
      renderPolicy,
      treeFiles,
      addSource,
    );
  }

  const authors = asArray(buildInput.authors, 'BUILD_AUTHOR_SET_INVALID').map(
    (row) => asObject(row, 'BUILD_AUTHOR_SET_INVALID'),
  );
  const authorIds = new Set();
  let priorAuthorId;
  for (const author of authors) {
    const id = asString(author.id, 'BUILD_AUTHOR_SET_INVALID');
    if (
      authorIds.has(id) ||
      (priorAuthorId !== undefined && compareUtf8(priorAuthorId, id) >= 0)
    ) {
      fail('BUILD_AUTHOR_SET_INVALID');
    }
    priorAuthorId = id;
    authorIds.add(id);
    addSource(
      asString(author.sourcePath, 'BUILD_SOURCE_REFERENCE_INVALID'),
      digest(author.sourceDigest, 'BUILD_SOURCE_REFERENCE_INVALID'),
      'author',
    );
    if (Object.hasOwn(author, 'avatar'))
      validateResolvedFile(author.avatar, addSource);
  }

  const content = asArray(buildInput.content, 'BUILD_LIFECYCLE_INVALID').map(
    (row) => asObject(row, 'BUILD_LIFECYCLE_INVALID'),
  );
  const referencedAuthors = new Set();
  for (const id of asArray(publication.authorIds, 'BUILD_AUTHOR_SET_INVALID')) {
    referencedAuthors.add(asString(id, 'BUILD_AUTHOR_SET_INVALID'));
  }
  for (const optional of ['contactAuthorId']) {
    if (Object.hasOwn(publication, optional)) {
      referencedAuthors.add(
        asString(publication[optional], 'BUILD_AUTHOR_SET_INVALID'),
      );
    }
  }
  if (Object.hasOwn(publication, 'footerCard')) {
    const footer = asObject(publication.footerCard, 'BUILD_AUTHOR_SET_INVALID');
    for (const id of asArray(footer.authorIds, 'BUILD_AUTHOR_SET_INVALID')) {
      referencedAuthors.add(asString(id, 'BUILD_AUTHOR_SET_INVALID'));
    }
  }
  let previousContentKey;
  const contentIds = new Set();
  for (const record of content) {
    const frontmatter = asObject(record.frontmatter, 'BUILD_LIFECYCLE_INVALID');
    const id = asString(frontmatter.id, 'BUILD_LIFECYCLE_INVALID');
    const sourcePath = asString(
      record.sourcePath,
      'BUILD_SOURCE_REFERENCE_INVALID',
    );
    const key = `${id}\0${sourcePath}`;
    if (
      contentIds.has(id) ||
      (previousContentKey !== undefined &&
        compareUtf8(previousContentKey, key) >= 0)
    ) {
      fail('BUILD_LIFECYCLE_INVALID');
    }
    previousContentKey = key;
    contentIds.add(id);
    const status = asString(frontmatter.status, 'BUILD_LIFECYCLE_INVALID');
    if (status !== 'published' && status !== 'unlisted')
      fail('BUILD_LIFECYCLE_INVALID');
    if (!Object.hasOwn(frontmatter, 'publishedAt'))
      fail('BUILD_LIFECYCLE_INVALID');
    const createdAt = timestamp(
      frontmatter.createdAt,
      'BUILD_LIFECYCLE_INVALID',
    );
    const publishedAt = timestamp(
      frontmatter.publishedAt,
      'BUILD_LIFECYCLE_INVALID',
    );
    if (publishedAt < createdAt) fail('BUILD_LIFECYCLE_INVALID');
    if (Object.hasOwn(frontmatter, 'updatedAt')) {
      const updatedAt = timestamp(
        frontmatter.updatedAt,
        'BUILD_LIFECYCLE_INVALID',
      );
      if (updatedAt < createdAt || updatedAt < publishedAt)
        fail('BUILD_LIFECYCLE_INVALID');
    }
    if (
      Object.hasOwn(frontmatter, 'seriesOrder') &&
      !Object.hasOwn(frontmatter, 'series')
    ) {
      fail('BUILD_LIFECYCLE_INVALID');
    }
    canonicalStringSet(frontmatter.tags, 'BUILD_LIFECYCLE_INVALID');
    canonicalStringSet(frontmatter.redirects, 'BUILD_LIFECYCLE_INVALID');
    const frontmatterAuthors = asArray(
      frontmatter.authorIds,
      'BUILD_AUTHOR_SET_INVALID',
    ).map((authorId) => asString(authorId, 'BUILD_AUTHOR_SET_INVALID'));
    jcsEqual(
      record.resolvedAuthorIds,
      frontmatterAuthors,
      'BUILD_AUTHOR_SET_INVALID',
    );
    for (const authorId of frontmatterAuthors) referencedAuthors.add(authorId);
    equal(
      record.sourceRevision,
      buildInput.sourceRevision,
      'BUILD_SOURCE_TREE_INVALID',
    );
    const sourceDigest = digest(
      record.sourceDigest,
      'BUILD_SOURCE_REFERENCE_INVALID',
    );
    addSource(sourcePath, sourceDigest, 'content');
    validateRenderableBody(record, renderPolicy, treeFiles, addSource);
    if (Object.hasOwn(frontmatter, 'hero')) {
      const hero = asObject(frontmatter.hero, 'BUILD_SOURCE_REFERENCE_INVALID');
      validateResolvedFile(hero.file, addSource);
      if (
        (hero.role === 'decorative' && hero.alt !== '') ||
        (hero.role === 'informative' &&
          asString(hero.alt, 'BUILD_SOURCE_REFERENCE_INVALID').length === 0)
      ) {
        fail('BUILD_SOURCE_REFERENCE_INVALID');
      }
    }
    if (Object.hasOwn(frontmatter, 'socialImage')) {
      validateResolvedFile(frontmatter.socialImage, addSource);
    }
  }
  if (
    referencedAuthors.size !== authorIds.size ||
    [...referencedAuthors].some((id) => !authorIds.has(id))
  ) {
    fail('BUILD_AUTHOR_SET_INVALID');
  }

  const navigation = asObject(buildInput.navigation, code);
  const navigationSource = asObject(navigation.source, code);
  if (navigationSource.kind === 'authored') {
    addSource(
      asString(navigationSource.sourcePath, 'BUILD_SOURCE_REFERENCE_INVALID'),
      digest(navigationSource.sourceDigest, 'BUILD_SOURCE_REFERENCE_INVALID'),
      'navigation',
    );
  } else {
    const expectedNavigation = {
      items: [],
      footerItems: [],
      source: {
        kind: 'built-in-default',
        defaultId: 'urn:gala:normalized-default:navigation:2.0.0',
        defaultDigest: '',
      },
    };
    expectedNavigation.source.defaultDigest = digestProfile(
      'navigationDefault',
      expectedNavigation,
      code,
    );
    jcsEqual(navigation, expectedNavigation, code);
  }
  const appearance = asObject(buildInput.appearance, code);
  const appearanceSource = asObject(appearance.source, code);
  const colorMode = asObject(appearance.colorMode, code);
  const allowedColorModes = canonicalStringSet(colorMode.allowed, code);
  if (
    !allowedColorModes.includes(asString(colorMode.default, code)) ||
    allowedColorModes.some(
      (mode) => !['dark', 'light', 'system'].includes(mode),
    )
  ) {
    fail(code);
  }
  for (const key of ['brandMark', 'wordmark']) {
    if (Object.hasOwn(appearance, key))
      validateResolvedFile(appearance[key], addSource);
  }
  for (const file of asArray(
    appearance.fontAssets,
    'BUILD_SOURCE_REFERENCE_INVALID',
  )) {
    validateResolvedFile(file, addSource);
  }
  if (appearanceSource.kind === 'authored') {
    addSource(
      asString(appearanceSource.sourcePath, 'BUILD_SOURCE_REFERENCE_INVALID'),
      digest(appearanceSource.sourceDigest, 'BUILD_SOURCE_REFERENCE_INVALID'),
      'appearance',
    );
  } else {
    const expectedAppearance = {
      theme: '@rathnasgala2/theme-default@2.0.0',
      colorMode: { allowed: ['dark', 'light', 'system'], default: 'system' },
      headerComposition: 'name-only',
      footerComposition: 'compact',
      typeScale: 'standard',
      fontAssets: [],
      tokens: {},
      source: {
        kind: 'built-in-default',
        defaultId: 'urn:gala:normalized-default:appearance:2.0.0',
        defaultDigest: '',
      },
    };
    expectedAppearance.source.defaultDigest = digestProfile(
      'appearanceDefault',
      expectedAppearance,
      code,
    );
    jcsEqual(appearance, expectedAppearance, code);
  }

  const normalizedSource = ledger(
    context.normalizedSource,
    ['publication', 'authors', 'content', 'navigation', 'appearance'],
    'BUILD_SOURCE_PROJECTION_INVALID',
  );
  for (const key of [
    'publication',
    'authors',
    'content',
    'navigation',
    'appearance',
  ]) {
    jcsEqual(
      buildInput[key],
      normalizedSource[key],
      'BUILD_SOURCE_PROJECTION_INVALID',
    );
  }

  const baseUrl = asString(buildInput.baseUrl, code);
  let parsedBase;
  try {
    parsedBase = new URL(baseUrl);
  } catch {
    fail(code);
  }
  if (
    parsedBase.protocol !== 'https:' ||
    parsedBase.username !== '' ||
    parsedBase.password !== '' ||
    parsedBase.origin !== baseUrl ||
    parsedBase.pathname !== '/' ||
    parsedBase.search !== '' ||
    parsedBase.hash !== ''
  ) {
    fail(code);
  }
  const basePath = asString(buildInput.basePath, code);
  if (
    !basePath.startsWith('/') ||
    !basePath.endsWith('/') ||
    basePath.includes('//')
  ) {
    if (basePath !== '/') fail(code);
  }
  const publicRoot = `${baseUrl}${basePath}`;
  equal(publication.canonicalBase, publicRoot, code);
  const destination = asObject(buildInput.destinationCapabilities, code);
  equal(destination.baseUrl, publicRoot, code);

  const includedSources = [...sourceClosure.entries()]
    .map(([path, owner]) => ({
      path,
      sha256: owner.digest,
      sourceRevision: asString(buildInput.sourceRevision, code),
      role: owner.role,
    }))
    .sort(compareJcs);
  const exclusions = asArray(
    repositoryContext.exclusions,
    'ARTIFACT_SOURCE_PARTITION_INVALID',
  ).map((candidate) =>
    ledger(
      candidate,
      ['path', 'ruleId', 'reason'],
      'ARTIFACT_SOURCE_PARTITION_INVALID',
    ),
  );
  const excludedPaths = new Set();
  for (const exclusion of exclusions) {
    const path = asString(exclusion.path, 'ARTIFACT_SOURCE_PARTITION_INVALID');
    if (
      excludedPaths.has(path) ||
      sourceClosure.has(path) ||
      !treeFiles.has(path)
    ) {
      fail('ARTIFACT_SOURCE_PARTITION_INVALID');
    }
    excludedPaths.add(path);
  }
  if (
    sourceClosure.size + excludedPaths.size !== treeFiles.size ||
    [...treeFiles.keys()].some(
      (path) => !sourceClosure.has(path) && !excludedPaths.has(path),
    )
  ) {
    fail('ARTIFACT_SOURCE_PARTITION_INVALID');
  }
  equal(
    buildInput.inputDigest,
    digestProfile('buildInput', buildInput, 'BUILD_DIGEST_INVALID'),
    'BUILD_DIGEST_INVALID',
  );
  return {
    repositoryContext,
    treeFiles,
    includedSources,
    exclusions,
    renderPolicy,
  };
}

/**
 * Decode one canonical unpadded base64url value.
 *
 * @param {unknown} value candidate value
 * @param {string} code diagnostic
 * @returns {Buffer} decoded bytes
 */
function decodeBase64url(value, code) {
  const source = asString(value, code);
  if (!/^[A-Za-z0-9_-]+$/u.test(source)) fail(code);
  const decoded = Buffer.from(source, 'base64url');
  if (decoded.length === 0 || decoded.toString('base64url') !== source)
    fail(code);
  return decoded;
}

/**
 * Convert a canonical Gala timestamp to whole seconds since Unix epoch.
 *
 * @param {string} value canonical timestamp
 * @returns {bigint} epoch seconds
 */
function timestampSeconds(value) {
  validateRfc3339(value);
  const year = BigInt(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const hour = BigInt(value.slice(11, 13));
  const minute = BigInt(value.slice(14, 16));
  const second = BigInt(value.slice(17, 19));
  /**
   * @param {bigint} candidateYear proleptic Gregorian year
   * @returns {bigint} days before year
   */
  const daysBeforeYear = (candidateYear) =>
    365n * candidateYear +
    (candidateYear + 3n) / 4n -
    (candidateYear + 99n) / 100n +
    (candidateYear + 399n) / 400n;
  const leap = year % 4n === 0n && (year % 100n !== 0n || year % 400n === 0n);
  const monthLengths = [
    31,
    leap ? 29 : 28,
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
  const priorMonthDays = monthLengths
    .slice(0, month - 1)
    .reduce((total, length) => total + BigInt(length), 0n);
  const days =
    daysBeforeYear(year) -
    daysBeforeYear(1970n) +
    priorMonthDays +
    BigInt(day - 1);
  return days * 86_400n + hour * 3_600n + minute * 60n + second;
}

/**
 * Parse and validate a projected OIDC key.
 *
 * @param {unknown} value candidate key
 * @returns {Record<string, unknown>} projected key
 */
function validateOidcKey(value) {
  const code = 'WORKLOAD_KEY_SET_INVALID';
  const source = asObject(value, code);
  const optional = Object.hasOwn(source, 'x5t') ? ['x5t'] : [];
  const key = ledger(
    source,
    ['kty', 'alg', 'use', 'kid', 'n', 'e'],
    code,
    optional,
  );
  equal(key.kty, 'RSA', code);
  equal(key.alg, 'RS256', code);
  equal(key.use, 'sig', code);
  const kid = asString(key.kid, code);
  if (kid.length < 1 || kid.length > 128 || !/^[\x21-\x7e]+$/u.test(kid))
    fail(code);
  const modulus = decodeBase64url(key.n, code);
  if (
    modulus.length < 256 ||
    modulus.length > 512 ||
    modulus[0] === 0 ||
    ((modulus.at(-1) ?? 0) & 1) === 0
  ) {
    fail(code);
  }
  equal(key.e, 'AQAB', code);
  if (
    Object.hasOwn(key, 'x5t') &&
    decodeBase64url(key.x5t, code).length !== 20
  ) {
    fail(code);
  }
  return key;
}

/**
 * Validate the exact retained OIDC verification profile.
 *
 * @param {unknown} value candidate profile
 * @returns {Record<string, unknown>} validated profile
 */
function validateOidcProfile(value) {
  const code = 'WORKLOAD_PROFILE_INVALID';
  const profile = ledger(
    value,
    [
      'profile',
      'issuer',
      'discoveryUrl',
      'jwksUrl',
      'signingAlgorithm',
      'maximumKeyCount',
      'maximumJwksEntityBytes',
      'maximumJwksWireBodyBytes',
      'maximumResponseHeadBytes',
      'requestTimeoutMillis',
      'cacheFreshSeconds',
      'maximumClockSkewSeconds',
      'maximumTokenLifetimeSeconds',
      'staleKeyUse',
      'unknownKidRefreshesPerExchange',
      'redirects',
      'ambientProxy',
      'netrc',
      'cookies',
      'credentials',
      'networkBoundaryProfileDigest',
      'tlsProfileDigest',
      'discoveryEvidenceDigest',
      'fixtureDigest',
      'profileDigest',
    ],
    code,
  );
  const fixed = {
    profile: 'gala-github-workload-oidc-verification-v2',
    issuer: 'https://token.actions.githubusercontent.com',
    discoveryUrl:
      'https://token.actions.githubusercontent.com/.well-known/openid-configuration',
    jwksUrl: 'https://token.actions.githubusercontent.com/.well-known/jwks',
    signingAlgorithm: 'RS256',
    maximumKeyCount: 32,
    maximumJwksEntityBytes: 262_144,
    maximumJwksWireBodyBytes: 1_572_869,
    maximumResponseHeadBytes: 32_768,
    requestTimeoutMillis: 5_000,
    cacheFreshSeconds: 300,
    maximumClockSkewSeconds: 60,
    maximumTokenLifetimeSeconds: 600,
    staleKeyUse: 'reject',
    unknownKidRefreshesPerExchange: 1,
    redirects: 'reject',
    ambientProxy: 'disabled',
    netrc: 'disabled',
    cookies: 'disabled',
    credentials: [],
  };
  for (const [key, expected] of Object.entries(fixed))
    jcsEqual(profile[key], expected, code);
  for (const key of [
    'networkBoundaryProfileDigest',
    'tlsProfileDigest',
    'discoveryEvidenceDigest',
    'fixtureDigest',
    'profileDigest',
  ]) {
    digest(profile[key], code);
  }
  equal(
    profile.profileDigest,
    digestProfile('githubWorkloadOidcVerificationProfile', profile, code),
    code,
  );
  return profile;
}

/**
 * Validate the authority-bearing GitHub claim spellings and their exact
 * workflow-ledger projections.
 *
 * @param {Record<string, unknown>} claims exact retained claim projection
 * @param {Record<string, unknown>} profile accepted OIDC profile
 * @param {Record<string, unknown>[]} workflowFiles retained workflow evidence
 * @param {Record<string, unknown>} repositoryContext repository facts
 * @returns {{workflowTriggerCommit: string, runAttempt: number}} normalized authority values
 */
function validateWorkloadClaims(
  claims,
  profile,
  workflowFiles,
  repositoryContext,
) {
  const code = 'WORKLOAD_INVALID';
  equal(claims.iss, profile.issuer, code);
  equal(claims.aud, 'urn:gala:workload:deployment-intent:v2', code);
  const repository = githubRepositoryCoordinate(claims.repository, code);
  equal(repository.coordinate, repositoryContext.coordinate, code);
  equal(claims.repository_owner, repository.owner, code);
  equal(
    githubPositiveDecimal(claims.repository_id, code),
    repositoryContext.repositoryId,
    code,
  );
  equal(
    githubPositiveDecimal(claims.repository_owner_id, code),
    repositoryContext.repositoryOwnerId,
    code,
  );
  githubPositiveDecimal(claims.actor_id, code);
  githubPositiveDecimal(claims.run_id, code);
  githubPositiveDecimal(claims.run_number, code);
  const attemptSource = asString(claims.run_attempt, code);
  if (!POSITIVE_DECIMAL_PATTERN.test(attemptSource)) fail(code);
  const runAttempt = Number(attemptSource);
  if (!Number.isInteger(runAttempt) || runAttempt < 1 || runAttempt > 51) {
    fail(code);
  }
  const actor = asString(claims.actor, code);
  if (
    Buffer.byteLength(actor, 'ascii') !== Buffer.byteLength(actor, 'utf8') ||
    Buffer.byteLength(actor, 'ascii') > 100 ||
    !/^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,98}[A-Za-z0-9])?|[A-Za-z0-9](?:[A-Za-z0-9-]{0,92}[A-Za-z0-9])?\[bot\])$/u.test(
      actor,
    )
  ) {
    fail(code);
  }
  if (
    !['create', 'workflow_dispatch'].includes(asString(claims.event_name, code))
  ) {
    fail(code);
  }
  equal(claims.runner_environment, 'github-hosted', code);
  const ref = asString(claims.ref, code);
  const prefix = 'refs/heads/gala/publish/';
  if (
    Buffer.byteLength(ref, 'ascii') !== Buffer.byteLength(ref, 'utf8') ||
    ref.length > 512 ||
    !ref.startsWith(prefix)
  ) {
    fail(code);
  }
  stableId(ref.slice(prefix.length), code);
  const workflowTriggerCommit = githubSha(claims.sha, code);
  equal(githubSha(claims.workflow_sha, code), workflowTriggerCommit, code);
  const caller = workflowFiles[0];
  const publish = workflowFiles[1];
  const authorize = workflowFiles[2];
  const report = workflowFiles[3];
  if (!caller || !publish || !authorize || !report) fail(code);
  equal(caller.commit, workflowTriggerCommit, code);
  equal(
    claims.workflow_ref,
    `${repository.coordinate}/${asString(caller.path, code)}@${ref}`,
    code,
  );
  const calledCommit = githubSha(claims.job_workflow_sha, code);
  equal(authorize.commit, calledCommit, code);
  equal(
    claims.job_workflow_ref,
    `rathnasgala2/publish/${asString(authorize.path, code)}@${asString(claims.job_workflow_sha, code)}`,
    code,
  );
  equal(publish.repositoryId, authorize.repositoryId, code);
  equal(report.repositoryId, authorize.repositoryId, code);
  equal(publish.commit, authorize.commit, code);
  equal(report.commit, authorize.commit, code);
  const expectedSubjects = [
    `repo:${repository.coordinate}:ref:${ref}`,
    `repo:${repository.owner}@${asString(claims.repository_owner_id, code)}/${repository.repository}@${asString(claims.repository_id, code)}:ref:${ref}`,
  ];
  if (!expectedSubjects.includes(asString(claims.sub, code))) fail(code);
  const jti = asString(claims.jti, code);
  if (jti.length === 0) fail(code);
  return { workflowTriggerCommit, runAttempt };
}

/**
 * Validate compact JWS, rotating-key evidence, required claims, and binding.
 *
 * @param {Record<string, unknown>} workload workload context
 * @param {Record<string, unknown>[]} workflowFiles exact workflow records
 * @param {SourceState} sourceState source state
 * @returns {{binding: Record<string, unknown>, claims: Record<string, unknown>, workflowTriggerCommit: string}} workload state
 */
function validateWorkload(workload, workflowFiles, sourceState) {
  const code = 'WORKLOAD_INVALID';
  ledger(
    workload,
    [
      'compactJwt',
      'expectedClaims',
      'verificationProfile',
      'issuerKeys',
      'issuerKeySetObservedAt',
      'trustedNowEpochSeconds',
      'commitNowEpochSeconds',
      'authorizedAt',
      'verifiedBinding',
    ],
    code,
  );
  const profile = validateOidcProfile(workload.verificationProfile);
  const keys = asArray(workload.issuerKeys, 'WORKLOAD_KEY_SET_INVALID').map(
    validateOidcKey,
  );
  if (keys.length < 1 || keys.length > 32) fail('WORKLOAD_KEY_SET_INVALID');
  assertCanonicalSet(keys, 'WORKLOAD_KEY_SET_INVALID', (left, right) =>
    compareUtf8(
      asString(asObject(left, code).kid, code),
      asString(asObject(right, code).kid, code),
    ),
  );
  const semanticKeys = new Set();
  for (const key of keys) {
    const semantic = canonicalizeJcs({
      n: key.n,
      e: key.e,
      x5t: key.x5t ?? null,
    });
    if (semanticKeys.has(semantic)) fail('WORKLOAD_KEY_SET_INVALID');
    semanticKeys.add(semantic);
  }
  const keySetDigest = digestProfile(
    'githubWorkloadOidcKeySet',
    keys,
    'WORKLOAD_KEY_SET_INVALID',
  );
  const observedAt = timestamp(workload.issuerKeySetObservedAt, code);
  let now;
  try {
    now = BigInt(asString(workload.trustedNowEpochSeconds, code));
  } catch {
    fail(code);
  }
  const observedSeconds = timestampSeconds(observedAt);
  if (now < observedSeconds || now > observedSeconds + 300n) fail(code);

  const compact = asString(workload.compactJwt, code);
  const segments = compact.split('.');
  if (segments.length !== 3) fail(code);
  const headerSegment = segments[0];
  const payloadSegment = segments[1];
  const signatureSegment = segments[2];
  if (!headerSegment || !payloadSegment || !signatureSegment) fail(code);
  let header;
  let claims;
  try {
    header = asObject(
      parseDuplicateFreeIJson(decodeBase64url(headerSegment, code)),
      code,
    );
    claims = asObject(
      parseDuplicateFreeIJson(decodeBase64url(payloadSegment, code)),
      code,
    );
  } catch (error) {
    if (error instanceof BuildArtifactSemanticError) throw error;
    fail(code);
  }
  ledger(header, ['alg', 'kid'], code, ['typ', 'x5t']);
  equal(header.alg, 'RS256', code);
  if (Object.hasOwn(header, 'typ')) equal(header.typ, 'JWT', code);
  const key = keys.find((candidate) => candidate.kid === header.kid);
  if (!key) fail(code);
  if (Object.hasOwn(header, 'x5t')) {
    decodeBase64url(header.x5t, code);
    equal(header.x5t, key.x5t, code);
  }
  const signature = decodeBase64url(signatureSegment, code);
  const modulus = decodeBase64url(key.n, code);
  if (signature.length !== modulus.length) fail(code);
  let signatureValid = false;
  try {
    const publicKey = createPublicKey({
      key: { kty: 'RSA', n: asString(key.n, code), e: 'AQAB' },
      format: 'jwk',
    });
    signatureValid = verifySignature(
      'RSA-SHA256',
      Buffer.from(`${headerSegment}.${payloadSegment}`, 'ascii'),
      publicKey,
      signature,
    );
  } catch {
    fail(code);
  }
  if (!signatureValid) fail(code);

  const expectedClaims = ledger(workload.expectedClaims, OIDC_CLAIMS, code);
  for (const claim of OIDC_CLAIMS) {
    equal(claims[claim], expectedClaims[claim], code);
    asString(claims[claim], code);
  }
  const authority = validateWorkloadClaims(
    expectedClaims,
    profile,
    workflowFiles,
    sourceState.repositoryContext,
  );
  for (const claim of ['nbf', 'iat', 'exp']) {
    if (!Object.hasOwn(claims, claim)) fail(code);
  }
  const nbf = claims.nbf;
  const iat = claims.iat;
  const exp = claims.exp;
  if (
    typeof nbf !== 'number' ||
    typeof iat !== 'number' ||
    typeof exp !== 'number' ||
    !Number.isSafeInteger(nbf) ||
    !Number.isSafeInteger(iat) ||
    !Number.isSafeInteger(exp)
  ) {
    fail(code);
  }
  const nbfSeconds = BigInt(nbf);
  const iatSeconds = BigInt(iat);
  const expSeconds = BigInt(exp);
  if (
    nbfSeconds > iatSeconds ||
    iatSeconds >= expSeconds ||
    iatSeconds < now - 60n ||
    iatSeconds > now + 60n ||
    nbfSeconds > now + 60n ||
    expSeconds <= now ||
    expSeconds - iatSeconds > 600n
  ) {
    fail(code);
  }
  let commitNow;
  try {
    commitNow = BigInt(asString(workload.commitNowEpochSeconds, code));
  } catch {
    fail(code);
  }
  if (commitNow >= expSeconds) fail(code);

  const binding = ledger(
    workload.verifiedBinding,
    [
      'issuer',
      'audience',
      'repository',
      'repositoryId',
      'repositoryOwner',
      'repositoryOwnerId',
      'ref',
      'sourceCommit',
      'workflowTriggerCommit',
      'runId',
      'runNumber',
      'runAttempt',
      'eventName',
      'actor',
      'actorId',
      'callerWorkflow',
      'publishWorkflow',
      'authorizeWorkflow',
      'oidcVerificationProfileDigest',
      'issuerKeySetDigest',
      'issuerKeySetObservedAt',
      'verifiedAt',
      'workloadBindingDigest',
    ],
    code,
  );
  const repositoryContext = sourceState.repositoryContext;
  const expectedBinding = {
    issuer: expectedClaims.iss,
    audience: expectedClaims.aud,
    repository: expectedClaims.repository,
    repositoryId: expectedClaims.repository_id,
    repositoryOwner: expectedClaims.repository_owner,
    repositoryOwnerId: expectedClaims.repository_owner_id,
    ref: expectedClaims.ref,
    sourceCommit: repositoryContext.sourceRevision,
    workflowTriggerCommit: authority.workflowTriggerCommit,
    runId: expectedClaims.run_id,
    runNumber: expectedClaims.run_number,
    runAttempt: authority.runAttempt,
    eventName: expectedClaims.event_name,
    actor: expectedClaims.actor,
    actorId: expectedClaims.actor_id,
    callerWorkflow: workflowFiles[0],
    publishWorkflow: workflowFiles[1],
    authorizeWorkflow: workflowFiles[2],
    oidcVerificationProfileDigest: profile.profileDigest,
    issuerKeySetDigest: keySetDigest,
    issuerKeySetObservedAt: observedAt,
    verifiedAt: timestamp(workload.authorizedAt, code),
    workloadBindingDigest: '',
  };
  expectedBinding.workloadBindingDigest = digestProfile(
    'verifiedWorkloadBinding',
    expectedBinding,
    code,
  );
  jcsEqual(binding, expectedBinding, code);
  equal(binding.repository, repositoryContext.coordinate, code);
  equal(binding.repositoryId, repositoryContext.repositoryId, code);
  equal(binding.repositoryOwnerId, repositoryContext.repositoryOwnerId, code);
  return {
    binding,
    claims,
    workflowTriggerCommit: authority.workflowTriggerCommit,
  };
}

/**
 * Remove a YAML comment without interpreting hashes inside quoted scalars.
 *
 * @param {string} line one physical YAML line
 * @returns {string} code portion of the line
 */
function yamlCodeLine(line) {
  let singleQuoted = false;
  let doubleQuoted = false;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (doubleQuoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') doubleQuoted = false;
      continue;
    }
    if (singleQuoted) {
      if (character !== "'") continue;
      if (line[index + 1] === "'") index += 1;
      else singleQuoted = false;
      continue;
    }
    if (character === '"') doubleQuoted = true;
    else if (character === "'") singleQuoted = true;
    else if (
      character === '#' &&
      (index === 0 || /\s/u.test(line[index - 1] ?? ''))
    ) {
      return line.slice(0, index);
    }
  }
  return line;
}

/**
 * Mask quoted YAML scalar content for unsupported-flow-key detection.
 *
 * @param {string} line comment-free YAML line
 * @returns {string} equal-length syntax mask
 */
function maskYamlQuotedContent(line) {
  const masked = line.split('');
  let quote;
  let escaped = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quote === '"') {
      masked[index] = ' ';
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quote = undefined;
    } else if (quote === "'") {
      masked[index] = ' ';
      if (character === "'") {
        if (line[index + 1] === "'") {
          masked[index + 1] = ' ';
          index += 1;
        } else {
          quote = undefined;
        }
      }
    } else if (character === '"' || character === "'") {
      masked[index] = ' ';
      quote = character;
    }
  }
  return masked.join('');
}

/**
 * Decode the scalar spelling accepted for an action use.
 *
 * @param {string} value YAML scalar source
 * @param {string} code diagnostic code
 * @returns {string} decoded scalar
 */
function yamlUsesScalar(value, code) {
  const source = value.trim();
  if (source.startsWith("'")) {
    if (source.length < 2 || !source.endsWith("'")) fail(code);
    return source.slice(1, -1).replaceAll("''", "'");
  }
  if (source.startsWith('"')) {
    try {
      const decoded = JSON.parse(source);
      return asString(decoded, code);
    } catch {
      fail(code);
    }
  }
  if (source.length === 0 || /\s/u.test(source)) fail(code);
  return source;
}

/**
 * Parse one immutable GitHub action or reusable-workflow coordinate.
 *
 * @param {unknown} value coordinate value
 * @param {string} code diagnostic code
 * @returns {{use: string, repository: string, path: string | undefined, commit: string}}
 */
function parseActionCoordinate(value, code) {
  const use = asString(value, code);
  if (
    Buffer.byteLength(use, 'ascii') !== Buffer.byteLength(use, 'utf8') ||
    Buffer.byteLength(use, 'ascii') > 512
  ) {
    fail(code);
  }
  const separator = use.lastIndexOf('@');
  const revision = use.slice(separator + 1);
  const location = use.slice(0, separator);
  if (separator < 0 || !GITHUB_SHA_PATTERN.test(revision)) fail(code);
  const parts = location.split('/');
  const owner = parts.shift();
  const repositoryName = parts.shift();
  if (!owner || !repositoryName) fail(code);
  const repository = `${owner}/${repositoryName}`;
  githubRepositoryCoordinate(repository, code);
  const path = parts.length === 0 ? undefined : parts.join('/');
  if (path !== undefined) {
    try {
      validatePortablePath(path);
    } catch {
      fail(code);
    }
  }
  return { use, repository, path, commit: `sha1:${revision}` };
}

/**
 * Derive the action coordinates occurring in one validated YAML document.
 * Block scalars are skipped and flow-style `uses` mappings reject so an action
 * can never disappear behind a line-oriented interpretation.
 *
 * @param {Uint8Array} content exact workflow or action-definition bytes
 * @param {string} code diagnostic code
 * @returns {string[]} action coordinates in occurrence order
 */
function actionUsesFromYaml(content, code) {
  let source;
  try {
    source = FATAL_UTF8_DECODER.decode(content);
  } catch {
    fail(code);
  }
  if (source.startsWith('\uFEFF')) source = source.slice(1);
  const uses = [];
  let blockIndent;
  for (const physicalLine of source.split('\n')) {
    const line = physicalLine.endsWith('\r')
      ? physicalLine.slice(0, -1)
      : physicalLine;
    if (line.trim().length === 0) continue;
    const indentation = /^ */u.exec(line)?.[0].length ?? 0;
    if (blockIndent !== undefined && indentation > blockIndent) continue;
    blockIndent = undefined;
    if (line.slice(0, indentation).includes('\t')) fail(code);
    const codeLine = yamlCodeLine(line).trimEnd();
    if (codeLine.trim().length === 0) continue;
    const body = codeLine.slice(indentation);
    const match = /^(?:-\s+)?(?:uses|'uses'|"uses")\s*:\s*(.*)$/u.exec(body);
    if (match) {
      const scalar = match[1];
      if (scalar === undefined || /^[|>]/u.test(scalar.trim())) fail(code);
      const parsed = parseActionCoordinate(yamlUsesScalar(scalar, code), code);
      if (!parsed.path?.startsWith('.github/workflows/')) {
        uses.push(parsed.use);
      }
    } else {
      const syntax = maskYamlQuotedContent(body);
      if (
        /(?:^|\s|[{},?]|\[)uses\s*:/u.test(syntax) ||
        /(?:^|[,{])\s*(?:'uses'|"uses")\s*:/u.test(body) ||
        /^\?\s*(?:uses|'uses'|"uses")\s*$/u.test(body)
      ) {
        fail(code);
      }
    }
    if (/:\s*[|>](?:[1-9][+-]?|[+-][1-9]?|[+-])?\s*$/u.test(codeLine)) {
      blockIndent = indentation;
    }
  }
  return uses;
}

/**
 * Parse one SHA-1 Git tree object.
 *
 * @param {Buffer} content exact tree-object body
 * @param {string} code diagnostic code
 * @returns {{mode: string, name: Buffer, objectId: string}[]} entries
 */
function parseGitTree(content, code) {
  const entries = [];
  const names = new Set();
  let offset = 0;
  while (offset < content.length) {
    const space = content.indexOf(0x20, offset);
    const nul = content.indexOf(0x00, space + 1);
    if (space <= offset || nul <= space + 1 || nul + 21 > content.length) {
      fail(code);
    }
    const mode = content.subarray(offset, space).toString('ascii');
    const name = content.subarray(space + 1, nul);
    if (!/^(?:40000|100644|100755|120000|160000)$/u.test(mode)) fail(code);
    if (name.includes(0x2f)) fail(code);
    const nameKey = name.toString('hex');
    if (names.has(nameKey)) fail(code);
    names.add(nameKey);
    const objectId = `sha1:${content.subarray(nul + 1, nul + 21).toString('hex')}`;
    entries.push({ mode, name, objectId });
    offset = nul + 21;
  }
  return entries;
}

/**
 * Resolve one action definition through its authenticated commit/tree proof.
 *
 * @param {Record<string, unknown>} evidence action evidence row
 * @param {ReturnType<typeof parseActionCoordinate>} coordinate parsed use
 * @param {string} code diagnostic code
 * @returns {Buffer} exact selected action-definition bytes
 */
function resolveActionDefinition(evidence, coordinate, code) {
  const commitBytes = bytes(evidence.commitBytes, code);
  if (!gitObjectMatches(coordinate.commit, 'commit', commitBytes)) fail(code);
  const treeHeader = /^tree ([0-9a-f]{40})\n/u.exec(
    commitBytes.subarray(0, 46).toString('ascii'),
  );
  if (!treeHeader?.[1]) fail(code);
  const segments = coordinate.path?.split('/') ?? [];
  const treeObjects = asArray(evidence.treeObjects, code);
  if (treeObjects.length !== segments.length + 1) fail(code);
  let expectedTree = `sha1:${treeHeader[1]}`;
  /** @type {{mode: string, name: Buffer, objectId: string}[]} */
  let selectedEntries = [];
  for (let index = 0; index < treeObjects.length; index += 1) {
    const object = ledger(treeObjects[index], ['objectId', 'bytes'], code);
    const objectId = gitObjectId(object.objectId, code);
    equal(objectId, expectedTree, code);
    const treeBytes = bytes(object.bytes, code);
    if (
      !objectId.startsWith('sha1:') ||
      !gitObjectMatches(objectId, 'tree', treeBytes)
    ) {
      fail(code);
    }
    selectedEntries = parseGitTree(treeBytes, code);
    const segment = segments[index];
    if (segment === undefined) continue;
    const encoded = Buffer.from(segment, 'utf8');
    const matches = selectedEntries.filter(({ name }) => name.equals(encoded));
    const selected = matches[0];
    if (matches.length !== 1 || !selected || selected.mode !== '40000') {
      fail(code);
    }
    expectedTree = selected.objectId;
  }
  const candidates = selectedEntries.filter(
    ({ name }) =>
      name.equals(Buffer.from('action.yml')) ||
      name.equals(Buffer.from('action.yaml')),
  );
  const selected = candidates[0];
  if (
    candidates.length !== 1 ||
    !selected ||
    (selected.mode !== '100644' && selected.mode !== '100755')
  ) {
    fail(code);
  }
  const definitionBytes = bytes(evidence.definitionBytes, code);
  if (!gitObjectMatches(selected.objectId, 'blob', definitionBytes)) fail(code);
  return definitionBytes;
}

/**
 * Validate exact workflow-file and action-definition closure.
 *
 * @param {Record<string, unknown>} provenance provenance record
 * @param {Record<string, unknown>} context trusted context
 * @param {SourceState} sourceState source state
 * @returns {{workflowFiles: Record<string, unknown>[], actions: Record<string, unknown>[]}}
 */
function validateWorkflowEvidence(provenance, context, sourceState) {
  const code = 'PROVENANCE_WORKFLOW_INVALID';
  const workflowRows = asArray(context.workflowFiles, code).map(
    (candidate, index) => {
      const row = ledger(
        candidate,
        ['role', 'repositoryId', 'path', 'commit', 'identitySource', 'bytes'],
        code,
      );
      equal(row.role, WORKFLOW_ROLES[index], code);
      equal(row.path, WORKFLOW_PATHS[index], code);
      equal(
        row.identitySource,
        index === 0 ? 'declared-graph' : 'locked-release',
        code,
      );
      if (index === 0)
        equal(
          row.repositoryId,
          sourceState.repositoryContext.repositoryId,
          code,
        );
      validatePortablePath(asString(row.path, code));
      const fileBytes = bytes(row.bytes, code);
      return {
        evidence: {
          role: row.role,
          repositoryId: row.repositoryId,
          path: row.path,
          commit: gitObjectId(row.commit, code),
          fileDigest: sha256Tagged(fileBytes),
          identitySource: row.identitySource,
        },
        bytes: fileBytes,
      };
    },
  );
  if (workflowRows.length !== 4) fail(code);
  const contextFiles = workflowRows.map(({ evidence }) => evidence);
  jcsEqual(provenance.workflowFiles, contextFiles, code);
  const rawActions = asArray(context.actions, code);
  if (rawActions.length < 1 || rawActions.length > 32) fail(code);
  const evidenceByUse = new Map();
  for (const candidate of rawActions) {
    const row = ledger(
      candidate,
      ['use', 'commitBytes', 'treeObjects', 'definitionBytes'],
      code,
    );
    const coordinate = parseActionCoordinate(row.use, code);
    if (evidenceByUse.has(coordinate.use)) fail(code);
    evidenceByUse.set(coordinate.use, { row, coordinate });
  }
  const pending = workflowRows.flatMap(({ bytes: content }) =>
    actionUsesFromYaml(content, code),
  );
  const visited = new Set();
  const contextActions = [];
  while (pending.length > 0) {
    const use = pending.shift();
    if (use === undefined || visited.has(use)) continue;
    if (visited.size >= 32) fail(code);
    const action = evidenceByUse.get(use);
    if (!action) fail(code);
    visited.add(use);
    const definitionBytes = resolveActionDefinition(
      action.row,
      action.coordinate,
      code,
    );
    contextActions.push({
      use,
      commit: action.coordinate.commit,
      actionDefinitionDigest: digestActionDefinitionBlob(definitionBytes),
    });
    pending.push(...actionUsesFromYaml(definitionBytes, code));
  }
  if (visited.size !== evidenceByUse.size) fail(code);
  const sortedActions = contextActions.sort(compareJcs);
  jcsEqual(provenance.actionPins, sortedActions, code);
  return { workflowFiles: contextFiles, actions: sortedActions };
}

/**
 * @param {string} segment NFC artifact path segment
 * @returns {string} RFC 3986 segment encoding
 */
function encodeRouteSegment(segment) {
  let encoded = '';
  for (const byte of Buffer.from(segment, 'utf8')) {
    const character = String.fromCharCode(byte);
    encoded += /^[A-Za-z0-9._~-]$/u.test(character)
      ? character
      : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return encoded;
}

/**
 * @param {string} path artifact backing path
 * @param {string} basePath directory-form public base path
 * @param {string} profile route normalization profile
 * @returns {string} projected canonical public route
 */
function projectArtifactRoute(path, basePath, profile) {
  validatePortablePath(path);
  if (!basePath.startsWith('/') || !basePath.endsWith('/')) {
    fail('ARTIFACT_REDIRECT_INVALID');
  }
  const segments = path.split('/').map(encodeRouteSegment);
  if (profile === 'directory-index' && segments.at(-1) === 'index.html') {
    segments.pop();
    const suffix = segments.length === 0 ? '' : `${segments.join('/')}/`;
    return `${basePath}${suffix}`;
  }
  if (profile !== 'directory-index' && profile !== 'explicit-file') {
    fail('ARTIFACT_REDIRECT_INVALID');
  }
  return `${basePath}${segments.join('/')}`;
}

/**
 * @param {string} targetRoute redirect target
 * @returns {Buffer} exact generated redirect bytes
 */
function redirectBytes(targetRoute) {
  const escaped = targetRoute
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
  return Buffer.from(
    `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta http-equiv="refresh" content="0;url=${escaped}">\n<link rel="canonical" href="${escaped}">\n<title>Redirecting...</title>\n</head>\n<body>\n<p>This page has moved to <a href="${escaped}">${escaped}</a>.</p>\n</body>\n</html>\n`,
    'utf8',
  );
}

/**
 * Validate and decode the exact frozen handoff.
 *
 * @param {Record<string, unknown>} records semantic record bundle
 * @param {Record<string, unknown>} context trusted context
 * @returns {{payloads: Map<string, Buffer>, envelope: ReturnType<typeof validateFrozenEnvelope>}}
 */
function validateFrozen(records, context) {
  const code = 'FROZEN_ENVELOPE_SEMANTICS_INVALID';
  asObject(records, code);
  let envelope;
  try {
    envelope = validateFrozenEnvelope(bytes(context.frozenEnvelopeBytes, code));
  } catch {
    fail(code);
  }
  const payloads = new Map();
  for (const record of envelope.records) {
    if (record.kind !== 0x01) continue;
    if (payloads.has(record.path)) fail(code);
    payloads.set(record.path, Buffer.from(record.content));
  }
  return { payloads, envelope };
}

/**
 * Check byte-semantic parity after each external record has passed its owning
 * semantic validator, so a malformed record receives its precise diagnostic.
 *
 * @param {Record<string, unknown>} records semantic record bundle
 * @param {ReturnType<typeof validateFrozenEnvelope>} envelope frozen records
 * @returns {void}
 */
function validateFrozenRecordParity(records, envelope) {
  const code = 'FROZEN_ENVELOPE_SEMANTICS_INVALID';
  jcsEqual(envelope.artifactManifest, records.artifactManifest, code);
  jcsEqual(envelope.buildProvenance, records.buildProvenance, code);
  jcsEqual(envelope.sbom, records.sbom, code);
}

/**
 * @typedef {{
 *   output: Record<string, unknown>,
 *   path: string,
 *   kind: string,
 *   bytes: Buffer,
 *   manifestEntry: Record<string, unknown>
 * }} ArtifactOutput
 */

/**
 * Validate the output-index context and construct exact manifest entries.
 *
 * @param {Record<string, unknown>} context context
 * @param {Map<string, Buffer>} payloads frozen payload bytes
 * @returns {ArtifactOutput[]} outputs in context order
 */
function validateArtifactOutputs(context, payloads) {
  const code = 'ARTIFACT_INVENTORY_INVALID';
  const rawOutputs = asArray(context.artifactOutputs, code);
  if (
    rawOutputs.length < 1 ||
    rawOutputs.length > MAX_ARTIFACT_FILES ||
    rawOutputs.length !== payloads.size
  ) {
    fail(code);
  }
  const paths = new Set();
  const collisions = new Set();
  return rawOutputs.map((candidate) => {
    const output = asObject(candidate, code);
    const kind = asString(output.kind, code);
    const common = ['kind', 'path', 'mediaType', 'sourceKind'];
    if (kind === 'route') {
      ledger(output, [...common, 'routeClass'], code, [
        'stableContentId',
        'sourceRevision',
        'themeAssetPath',
      ]);
    } else if (kind === 'asset') {
      ledger(output, [...common, 'immutable'], code, ['themeAssetPath']);
    } else {
      fail(code);
    }
    const path = asString(output.path, code);
    const collision = validatePortablePath(path);
    if (paths.has(path) || collisions.has(collision)) fail(code);
    paths.add(path);
    collisions.add(collision);
    const content = payloads.get(path);
    if (!content) fail(code);
    const mediaType = asString(output.mediaType, code);
    if (!MANIFEST_MEDIA_TYPES.includes(mediaType)) fail(code);
    const commonEntry = {
      path,
      mediaType,
      byteLength: String(content.length),
      sha256: sha256Tagged(content),
    };
    let manifestEntry;
    if (kind === 'route') {
      manifestEntry = {
        ...commonEntry,
        routeClass: output.routeClass,
        ...(Object.hasOwn(output, 'stableContentId')
          ? { stableContentId: output.stableContentId }
          : {}),
        ...(Object.hasOwn(output, 'sourceRevision')
          ? { sourceRevision: output.sourceRevision }
          : {}),
        interactionBearing: false,
      };
    } else {
      manifestEntry = { ...commonEntry, immutable: output.immutable };
    }
    return { output, path, kind, bytes: content, manifestEntry };
  });
}

/**
 * Validate distinct empty roots and two-run payload/index/diagnostic identity.
 *
 * @param {unknown} value reproducibility runs
 * @param {ArtifactOutput[]} outputs frozen outputs
 * @param {Record<string, unknown>} manifest manifest
 * @returns {void}
 */
function validateReproducibility(value, outputs, manifest) {
  const code = 'ARTIFACT_REPRODUCIBILITY_INVALID';
  const runs = asArray(value, code);
  if (runs.length !== 2) fail(code);
  const expectedFiles = [...outputs]
    .sort((left, right) => compareUtf8(left.path, right.path))
    .map(({ path, bytes: content }) => ({ path, bytes: content }));
  const expectedIndexProjection = outputs.map(({ output }) => output);
  const roots = new Set();
  for (const candidate of runs) {
    const run = ledger(
      candidate,
      [
        'rootIdentity',
        'initialEntries',
        'files',
        'indexProjection',
        'findings',
        'measurements',
      ],
      code,
    );
    const rootIdentity = digest(run.rootIdentity, code);
    if (roots.has(rootIdentity)) fail(code);
    roots.add(rootIdentity);
    jcsEqual(run.initialEntries, [], code);
    const files = asArray(run.files, code).map((file) =>
      ledger(file, ['path', 'bytes'], code),
    );
    if (files.length !== expectedFiles.length) fail(code);
    for (let index = 0; index < files.length; index += 1) {
      const actual = files[index];
      const expected = expectedFiles[index];
      if (!actual || !expected) fail(code);
      equal(actual.path, expected.path, code);
      if (!bytes(actual.bytes, code).equals(expected.bytes)) fail(code);
    }
    jcsEqual(run.indexProjection, expectedIndexProjection, code);
    jcsEqual(run.findings, manifest.findings, code);
    jcsEqual(run.measurements, manifest.measurements, code);
  }
  equal(manifest.reproducibilityClass, 'byte-identical', code);
}

/**
 * Build exact included/excluded source rows.
 *
 * @param {SourceState} sourceState validated source state
 * @returns {{included: Record<string, unknown>[], excluded: Record<string, unknown>[]}}
 */
function sourceInventory(sourceState) {
  const code = 'ARTIFACT_SOURCE_PARTITION_INVALID';
  const revision = sourceState.repositoryContext.sourceRevision;
  const included = sourceState.includedSources.map((row) => ({
    path: row.path,
    sha256: row.sha256,
    sourceRevision: revision,
    role: row.role,
  }));
  const exclusionByPath = new Map();
  for (const candidate of sourceState.exclusions) {
    const exclusion = ledger(candidate, ['path', 'ruleId', 'reason'], code);
    const path = asString(exclusion.path, code);
    if (exclusionByPath.has(path)) fail(code);
    const reason = asString(exclusion.reason, code);
    if (
      ![
        'not-referenced-by-build-input',
        'deferred-capability-absent',
        'non-artifact-source',
        'policy-excluded',
      ].includes(reason)
    ) {
      fail(code);
    }
    exclusionByPath.set(path, exclusion);
  }
  const includedPaths = new Set(
    included.map((row) => asString(row.path, code)),
  );
  const excluded = [];
  for (const [path, file] of sourceState.treeFiles) {
    if (includedPaths.has(path)) {
      if (exclusionByPath.has(path)) fail(code);
      continue;
    }
    const exclusion = exclusionByPath.get(path);
    if (!exclusion) fail(code);
    excluded.push({
      path,
      sha256: sha256Tagged(file.bytes),
      ruleId: exclusion.ruleId,
      reason: exclusion.reason,
    });
    exclusionByPath.delete(path);
  }
  if (exclusionByPath.size !== 0) fail(code);
  included.sort(compareJcs);
  excluded.sort(compareJcs);
  return { included, excluded };
}

/**
 * Validate and derive redirect rows.
 *
 * @param {Record<string, unknown>} buildInput build input
 * @param {SourceState} sourceState source state
 * @param {ArtifactOutput[]} outputs artifact outputs
 * @returns {Record<string, unknown>[]} exact redirect rows
 */
function expectedRedirects(buildInput, sourceState, outputs) {
  const code = 'ARTIFACT_REDIRECT_INVALID';
  const contentRoutes = asArray(
    sourceState.repositoryContext.contentRoutes,
    code,
  ).map((row) => ledger(row, ['contentId', 'route'], code));
  const routesByContent = new Map();
  const canonicalRoutes = new Set();
  for (const row of contentRoutes) {
    const id = asString(row.contentId, code);
    const route = asString(row.route, code);
    if (routesByContent.has(id) || canonicalRoutes.has(route)) fail(code);
    routesByContent.set(id, route);
    canonicalRoutes.add(route);
  }
  const manifestRoutes = outputs.filter(({ kind }) => kind === 'route');
  const normalization = asString(
    sourceState.repositoryContext.routeNormalizationProfile,
    code,
  );
  const basePath = asString(buildInput.basePath, code);
  const redirects = [];
  const sources = new Set();
  const content = asArray(buildInput.content, code);
  if (contentRoutes.length !== content.length) fail(code);
  const selectedContentIds = new Set();
  for (const candidate of content) {
    const record = asObject(candidate, code);
    const frontmatter = asObject(record.frontmatter, code);
    const contentId = asString(frontmatter.id, code);
    if (selectedContentIds.has(contentId)) fail(code);
    selectedContentIds.add(contentId);
    const targetRoute = routesByContent.get(contentId);
    if (!targetRoute) fail(code);
    if (Object.hasOwn(frontmatter, 'route'))
      equal(frontmatter.route, targetRoute, code);
    const canonicalOutput = manifestRoutes.filter(
      ({ output, path }) =>
        output.stableContentId === contentId &&
        projectArtifactRoute(path, basePath, normalization) === targetRoute,
    );
    if (canonicalOutput.length !== 1) fail(code);
    const selectedOutput = canonicalOutput[0];
    if (!selectedOutput) fail(code);
    equal(selectedOutput.output.sourceKind, 'generated', code);
    equal(
      selectedOutput.output.sourceRevision,
      buildInput.sourceRevision,
      code,
    );
    for (const sourceRouteValue of asArray(frontmatter.redirects, code)) {
      const sourceRoute = asString(sourceRouteValue, code);
      if (sources.has(sourceRoute) || canonicalRoutes.has(sourceRoute)) {
        fail(code);
      }
      sources.add(sourceRoute);
      const matches = manifestRoutes.filter(
        ({ path }) =>
          projectArtifactRoute(path, basePath, normalization) === sourceRoute,
      );
      if (matches.length !== 1) fail(code);
      const backing = matches[0];
      if (!backing || !backing.bytes.equals(redirectBytes(targetRoute)))
        fail(code);
      redirects.push({
        sourceRoute,
        targetRoute,
        status: 200,
        backingPath: backing.path,
        sha256: sha256Tagged(backing.bytes),
      });
    }
  }
  if (
    selectedContentIds.size !== routesByContent.size ||
    [...routesByContent.keys()].some((id) => !selectedContentIds.has(id))
  ) {
    fail(code);
  }
  if (redirects.some((row) => sources.has(asString(row.targetRoute, code))))
    fail(code);
  redirects.sort((left, right) =>
    compareUtf8(
      asString(left.sourceRoute, code),
      asString(right.sourceRoute, code),
    ),
  );
  return redirects;
}

/**
 * Validate exact manifest inventory, identities, policy facts, and digests.
 *
 * @param {Record<string, unknown>} manifest artifact manifest
 * @param {Record<string, unknown>} lock lock record
 * @param {Record<string, unknown>} buildInput build input
 * @param {Record<string, unknown>} provenance build provenance
 * @param {Record<string, unknown>} context trusted context
 * @param {LockState} lockState package state
 * @param {SourceState} sourceState source state
 * @param {{binding: Record<string, unknown>}} workload workload state
 * @param {Record<string, unknown>[]} workflowFiles workflow evidence
 * @param {Map<string, Buffer>} payloads frozen payload bytes
 * @returns {{outputs: ArtifactOutput[], buildPolicyDecision: Record<string, unknown>}}
 */
function validateArtifactManifest(
  manifest,
  lock,
  buildInput,
  provenance,
  context,
  lockState,
  sourceState,
  workload,
  workflowFiles,
  payloads,
) {
  const code = 'ARTIFACT_MANIFEST_INVALID';
  ledger(manifest, MANIFEST_KEYS, code);
  equal(manifest.schemaId, 'urn:gala:schema:artifact-manifest:2.0.0', code);
  equal(manifest.schemaVersion, '2.0.0', code);
  const outputs = validateArtifactOutputs(context, payloads);
  const expectedRoutes = outputs
    .filter(({ kind }) => kind === 'route')
    .map(({ manifestEntry }) => manifestEntry)
    .sort((left, right) =>
      compareUtf8(asString(left.path, code), asString(right.path, code)),
    );
  const expectedAssets = outputs
    .filter(({ kind }) => kind === 'asset')
    .map(({ manifestEntry }) => manifestEntry)
    .sort((left, right) =>
      compareUtf8(asString(left.path, code), asString(right.path, code)),
    );
  jcsEqual(manifest.routes, expectedRoutes, 'ARTIFACT_INVENTORY_INVALID');
  jcsEqual(manifest.assets, expectedAssets, 'ARTIFACT_INVENTORY_INVALID');
  let artifactBytes = 0n;
  for (const output of outputs) artifactBytes += BigInt(output.bytes.length);
  equal(
    positiveInt64(manifest.artifactFileCount, 'ARTIFACT_INVENTORY_INVALID'),
    BigInt(outputs.length),
    'ARTIFACT_INVENTORY_INVALID',
  );
  equal(
    positiveInt64(manifest.artifactByteCount, 'ARTIFACT_INVENTORY_INVALID'),
    artifactBytes,
    'ARTIFACT_INVENTORY_INVALID',
  );
  if (
    outputs.length > MAX_ARTIFACT_FILES ||
    artifactBytes > MAX_ARTIFACT_BYTES
  ) {
    fail('ARTIFACT_INVENTORY_INVALID');
  }
  const artifactEntries = outputs
    .map(({ manifestEntry }) => ({
      path: manifestEntry.path,
      byteLength: manifestEntry.byteLength,
      sha256: manifestEntry.sha256,
    }))
    .sort((left, right) =>
      compareUtf8(asString(left.path, code), asString(right.path, code)),
    );
  equal(
    manifest.artifactDigest,
    digestProfile('artifact', artifactEntries, 'ARTIFACT_DIGEST_INVALID'),
    'ARTIFACT_DIGEST_INVALID',
  );

  const repository = asObject(buildInput.repository, code);
  equal(manifest.repositoryNodeId, repository.repositoryId, code);
  equal(manifest.sourceCommit, buildInput.sourceRevision, code);
  equal(manifest.buildInputDigest, buildInput.inputDigest, code);
  equal(manifest.generatedAt, buildInput.buildEpoch, code);
  equal(manifest.buildInputContractVersion, buildInput.contractVersion, code);
  const sourceIdentity = {
    provider: 'github',
    repository: workload.binding.repository,
    repositoryId: repository.repositoryId,
    repositoryOwnerId: repository.repositoryOwnerId,
    commit: buildInput.sourceRevision,
    treeDigest: repository.rootDigest,
  };
  jcsEqual(manifest.sourceIdentity, sourceIdentity, code);
  const publishers = asArray(lock.publisher, code).map((row) =>
    asObject(row, code),
  );
  jcsEqual(manifest.builder, packageIdentity(publishers[0] ?? {}, code), code);
  const expectedComposition = {
    schemas: packageIdentity(asObject(lock.schemas, code), code),
    template: packageIdentity(asObject(lock.template, code), code),
    theme: packageIdentity(asObject(lock.theme, code), code),
    publisher: publishers.map((row) => packageIdentity(row, code)),
    enabledModuleConfigurationDigests: [],
  };
  jcsEqual(manifest.composition, expectedComposition, code);
  equal(
    manifest.workflowIdentity,
    digestProfile(
      'buildWorkflowIdentity',
      { workflowFiles },
      'PROVENANCE_WORKFLOW_INVALID',
    ),
    'PROVENANCE_WORKFLOW_INVALID',
  );
  const sandbox = asObject(provenance.sandbox, 'PROVENANCE_SANDBOX_INVALID');
  const expectedTools = [
    {
      kind: 'runtime',
      name: 'node',
      version: '24.18.0',
      digest: sandbox.nodeExecutableDigest,
    },
    {
      kind: 'runtime',
      name: 'npm',
      version: '11.16.0',
      digest: sandbox.npmExecutableDigest,
    },
    ...lockState.all.map((row) => {
      const identity = packageIdentity(row, code);
      return {
        kind: 'package',
        package: identity.package,
        version: identity.version,
        digest: identity.integrity,
      };
    }),
  ].sort(compareJcs);
  jcsEqual(
    manifest.buildToolVersions,
    expectedTools,
    'ARTIFACT_TOOL_IDENTITY_INVALID',
  );

  const findings = asArray(manifest.findings, 'ARTIFACT_POLICY_INVALID');
  const measurements = asArray(
    manifest.measurements,
    'ARTIFACT_POLICY_INVALID',
  );
  assertCanonicalSet(findings, 'ARTIFACT_POLICY_INVALID');
  assertCanonicalSet(measurements, 'ARTIFACT_POLICY_INVALID');
  const hasError = findings.some(
    (finding) =>
      asObject(finding, 'ARTIFACT_POLICY_INVALID').severity === 'error',
  );
  const hasWarning = findings.some(
    (finding) =>
      asObject(finding, 'ARTIFACT_POLICY_INVALID').severity === 'warning',
  );
  const expectedResult = hasError
    ? 'fail'
    : hasWarning
      ? 'pass-with-warnings'
      : 'pass';
  equal(manifest.policyResult, expectedResult, 'ARTIFACT_POLICY_INVALID');
  if (expectedResult === 'fail') fail('ARTIFACT_POLICY_INVALID');
  validateReproducibility(context.reproducibilityRuns, outputs, manifest);
  jcsEqual(manifest.declarativeHeaders, [], code);

  const inventory = sourceInventory(sourceState);
  jcsEqual(
    manifest.includedSources,
    inventory.included,
    'ARTIFACT_SOURCE_PARTITION_INVALID',
  );
  jcsEqual(
    manifest.excludedInputs,
    inventory.excluded,
    'ARTIFACT_SOURCE_PARTITION_INVALID',
  );
  const sourceProjection = {
    includedSources: inventory.included,
    excludedInputs: inventory.excluded,
  };
  equal(
    manifest.sourceInventoryDigest,
    digestProfile(
      'sourceInventory',
      sourceProjection,
      'ARTIFACT_SOURCE_PARTITION_INVALID',
    ),
    'ARTIFACT_SOURCE_PARTITION_INVALID',
  );
  jcsEqual(
    manifest.redirects,
    expectedRedirects(buildInput, sourceState, outputs),
    'ARTIFACT_REDIRECT_INVALID',
  );
  const validation = ledger(
    manifest.validation,
    ['profile', 'version', 'findingCount', 'evidenceDigest'],
    'ARTIFACT_VALIDATION_INVALID',
  );
  equal(
    validation.profile,
    'gala-artifact-validation-v2',
    'ARTIFACT_VALIDATION_INVALID',
  );
  equal(validation.version, '2.0.0', 'ARTIFACT_VALIDATION_INVALID');
  equal(
    validation.findingCount,
    findings.length,
    'ARTIFACT_VALIDATION_INVALID',
  );
  equal(
    validation.evidenceDigest,
    digestProfile(
      'artifactValidationEvidence',
      manifest,
      'ARTIFACT_VALIDATION_INVALID',
    ),
    'ARTIFACT_VALIDATION_INVALID',
  );
  equal(
    manifest.manifestDigest,
    digestProfile('artifactManifest', manifest, 'ARTIFACT_DIGEST_INVALID'),
    'ARTIFACT_DIGEST_INVALID',
  );

  const policyRelease = ledger(
    context.buildPolicyRelease,
    ['policyReleaseId', 'policyProfile', 'policyVersion'],
    'ARTIFACT_POLICY_INVALID',
  );
  plainLabel(policyRelease.policyProfile, 'ARTIFACT_POLICY_INVALID');
  semver(policyRelease.policyVersion, 'ARTIFACT_POLICY_INVALID');
  const decision = ledger(
    context.buildPolicyDecision,
    [
      'profile',
      'policyReleaseId',
      'policyProfile',
      'policyVersion',
      'approvedOverrides',
      'manifestDigest',
      'policyResult',
      'findings',
      'decisionDigest',
    ],
    'ARTIFACT_POLICY_INVALID',
  );
  plainLabel(decision.policyProfile, 'ARTIFACT_POLICY_INVALID');
  const expectedDecision = {
    profile: 'gala-build-policy-decision-v2',
    policyReleaseId: policyRelease.policyReleaseId,
    policyProfile: policyRelease.policyProfile,
    policyVersion: policyRelease.policyVersion,
    approvedOverrides: [],
    manifestDigest: manifest.manifestDigest,
    policyResult: manifest.policyResult,
    findings,
    decisionDigest: '',
  };
  expectedDecision.decisionDigest = digestProfile(
    'buildPolicyDecision',
    expectedDecision,
    'ARTIFACT_POLICY_INVALID',
  );
  jcsEqual(decision, expectedDecision, 'ARTIFACT_POLICY_INVALID');
  return { outputs, buildPolicyDecision: decision };
}

/**
 * Validate exact carrier bytes and retained REST facts.
 *
 * @param {unknown} value carrier context rows
 * @param {Record<string, unknown>} asserted asserted workload
 * @returns {Record<string, unknown>[]} carrier evidence by semantic purpose
 */
function validateCarriers(value, asserted) {
  const code = 'PROVENANCE_CARRIER_INVALID';
  const contexts = asArray(value, code).map((candidate) =>
    ledger(candidate, ['purpose', 'artifactId', 'expiresAt', 'bytes'], code),
  );
  if (contexts.length !== 2) fail(code);
  const expectedPurposes = ['verified-inputs', 'unfrozen-output'];
  const runAttempt = asserted.runAttempt;
  if (
    typeof runAttempt !== 'number' ||
    !Number.isInteger(runAttempt) ||
    runAttempt < 1 ||
    runAttempt > 51
  ) {
    fail(code);
  }
  return contexts.map((carrier, index) => {
    const purpose = expectedPurposes[index];
    equal(carrier.purpose, purpose, code);
    const content = bytes(carrier.bytes, code);
    return {
      purpose,
      artifactId: githubPositiveDecimal(carrier.artifactId, code),
      name: `gala-r${asString(asserted.runId, code)}-a${String(runAttempt)}-${purpose}-v2.bin`,
      byteCount: String(content.length),
      digest: sha256Tagged(content),
      expiresAt: timestamp(carrier.expiresAt, code),
    };
  });
}

/**
 * Validate runner compatibility and exact executable/sandbox evidence.
 *
 * @param {Record<string, unknown>} provenance provenance
 * @param {Record<string, unknown>} context trusted context
 * @param {Record<string, unknown>} buildInput build input
 * @returns {Record<string, unknown>} validated sandbox
 */
function validateSandbox(provenance, context, buildInput) {
  const code = 'PROVENANCE_SANDBOX_INVALID';
  const runner = ledger(
    context.runner,
    [
      'compatibilityRow',
      'nodeExecutableBytes',
      'npmExecutableBytes',
      'networkPolicyDigest',
      'filesystemPolicyDigest',
      'sandboxPolicyDigest',
      'toolCatalogDigest',
    ],
    code,
  );
  const row = ledger(
    runner.compatibilityRow,
    [
      'profile',
      'runnerEnvironment',
      'runnerImageRelease',
      'softwareManifestDigest',
      'sandboxPolicyDigest',
      'toolCatalogDigest',
      'fixtureDigest',
      'evidenceDigest',
      'rowDigest',
    ],
    code,
  );
  equal(row.profile, 'gala-github-hosted-runner-compatibility-v2', code);
  equal(row.runnerEnvironment, 'github-hosted', code);
  for (const key of [
    'softwareManifestDigest',
    'sandboxPolicyDigest',
    'toolCatalogDigest',
    'fixtureDigest',
    'evidenceDigest',
    'rowDigest',
  ]) {
    digest(row[key], code);
  }
  equal(row.sandboxPolicyDigest, runner.sandboxPolicyDigest, code);
  equal(row.toolCatalogDigest, runner.toolCatalogDigest, code);
  equal(
    row.rowDigest,
    digestProfile('githubHostedRunnerCompatibility', row, code),
    code,
  );
  const sandbox = ledger(
    provenance.sandbox,
    [
      'runnerEnvironment',
      'runnerImageRelease',
      'runnerImageReleaseDigest',
      'nodeVersion',
      'nodeExecutableDigest',
      'npmVersion',
      'npmExecutableDigest',
      'locale',
      'timezone',
      'sourceDateEpoch',
      'networkPolicyDigest',
      'filesystemPolicyDigest',
    ],
    code,
  );
  const expected = {
    runnerEnvironment: 'github-hosted',
    runnerImageRelease: row.runnerImageRelease,
    runnerImageReleaseDigest: row.rowDigest,
    nodeVersion: '24.18.0',
    nodeExecutableDigest: sha256Tagged(bytes(runner.nodeExecutableBytes, code)),
    npmVersion: '11.16.0',
    npmExecutableDigest: sha256Tagged(bytes(runner.npmExecutableBytes, code)),
    locale: 'C.UTF-8',
    timezone: 'UTC',
    sourceDateEpoch: buildInput.buildEpoch,
    networkPolicyDigest: digest(runner.networkPolicyDigest, code),
    filesystemPolicyDigest: digest(runner.filesystemPolicyDigest, code),
  };
  jcsEqual(sandbox, expected, code);
  return sandbox;
}

/**
 * Derive and validate the per-artifact license rows.
 *
 * @param {ArtifactOutput[]} outputs artifact outputs
 * @param {Record<string, unknown>} context trusted context
 * @returns {{conclusions: Record<string, unknown>[], expressions: string[]}}
 */
function validateArtifactLicenses(outputs, context) {
  const code = 'PROVENANCE_LICENSE_INVALID';
  const themeContract = asObject(context.themeContract, code);
  const themeAssets = asArray(themeContract.assets, code).map((candidate) =>
    asObject(candidate, code),
  );
  const assetsByPath = new Map();
  const expressions = [];
  for (const asset of themeAssets) {
    const path = asString(asset.path, code);
    if (assetsByPath.has(path)) fail(code);
    const expression = asString(asset.license, code);
    try {
      validateSpdxExpression(expression);
    } catch {
      fail(code);
    }
    expressions.push(expression);
    assetsByPath.set(path, asset);
  }
  for (const stylesheet of asArray(themeContract.stylesheets, code)) {
    if (!assetsByPath.has(asString(stylesheet, code))) fail(code);
  }
  const themeFiles = new Map();
  for (const candidate of asArray(context.themeFiles, code)) {
    const file = ledger(candidate, ['path', 'bytes'], code);
    const path = asString(file.path, code);
    if (themeFiles.has(path)) fail(code);
    themeFiles.set(path, bytes(file.bytes, code));
  }
  if (
    themeFiles.size !== assetsByPath.size ||
    [...assetsByPath.keys()].some((path) => !themeFiles.has(path))
  ) {
    fail(code);
  }
  for (const [path, asset] of assetsByPath) {
    const content = themeFiles.get(path);
    if (!content) fail(code);
    equal(
      nonnegativeInt64(asset.byteLength, code),
      BigInt(content.length),
      code,
    );
    equal(asset.sha256, sha256Tagged(content), code);
  }

  const usedThemePaths = new Set();
  const conclusions = outputs.map(
    ({ output, path, kind, bytes: outputBytes }) => {
      const sourceKind = asString(output.sourceKind, code);
      if (sourceKind === 'generated') {
        if (Object.hasOwn(output, 'themeAssetPath')) fail(code);
        return {
          artifactPath: path,
          licenseConcluded: 'NOASSERTION',
          sourceKind,
        };
      }
      if (sourceKind !== 'theme-passive-asset' || kind !== 'asset') fail(code);
      const themeAssetPath = asString(output.themeAssetPath, code);
      const asset = assetsByPath.get(themeAssetPath);
      const themeBytes = themeFiles.get(themeAssetPath);
      if (!asset || !themeBytes || usedThemePaths.has(themeAssetPath))
        fail(code);
      usedThemePaths.add(themeAssetPath);
      if (!outputBytes.equals(themeBytes)) fail(code);
      return {
        artifactPath: path,
        licenseConcluded: asset.license,
        sourceKind,
        themeAssetPath,
      };
    },
  );
  if (
    usedThemePaths.size !== assetsByPath.size ||
    [...assetsByPath.keys()].some((path) => !usedThemePaths.has(path))
  ) {
    fail(code);
  }
  conclusions.sort((left, right) =>
    compareUtf8(
      asString(left.artifactPath, code),
      asString(right.artifactPath, code),
    ),
  );
  return { conclusions, expressions };
}

/**
 * Validate every build-provenance equality and context-backed evidence row.
 *
 * @param {Record<string, unknown>} provenance provenance record
 * @param {Record<string, unknown>} manifest manifest
 * @param {Record<string, unknown>} lock lock
 * @param {Record<string, unknown>} buildInput build input
 * @param {Record<string, unknown>} context trusted context
 * @param {LockState} lockState lock state
 * @param {SourceState} sourceState source state
 * @param {{binding: Record<string, unknown>, claims: Record<string, unknown>, workflowTriggerCommit: string}} workload workload state
 * @param {{workflowFiles: Record<string, unknown>[], actions: Record<string, unknown>[]}} workflow workflow state
 * @param {{outputs: ArtifactOutput[], buildPolicyDecision: Record<string, unknown>}} artifact artifact state
 * @returns {{provenanceDigest: string, licenseExpressions: string[]}}
 */
function validateBuildProvenance(
  provenance,
  manifest,
  lock,
  buildInput,
  context,
  lockState,
  sourceState,
  workload,
  workflow,
  artifact,
) {
  const code = 'PROVENANCE_INVALID';
  ledger(provenance, PROVENANCE_KEYS, code);
  equal(provenance.schemaId, 'urn:gala:metadata:build-provenance:2.0.0', code);
  equal(provenance.schemaVersion, '2.0.0', code);
  jcsEqual(provenance.requiredOidcClaims, OIDC_CLAIMS, code);
  jcsEqual(provenance.workflowFiles, workflow.workflowFiles, code);
  jcsEqual(provenance.actionPins, workflow.actions, code);
  const workloadContext = asObject(context.workload, code);
  const expectedClaims = asObject(workloadContext.expectedClaims, code);
  const asserted = {
    repository: expectedClaims.repository,
    repositoryId: expectedClaims.repository_id,
    repositoryOwner: expectedClaims.repository_owner,
    repositoryOwnerId: expectedClaims.repository_owner_id,
    ref: expectedClaims.ref,
    sourceCommit: buildInput.sourceRevision,
    workflowTriggerCommit: workload.workflowTriggerCommit,
    runId: expectedClaims.run_id,
    runNumber: expectedClaims.run_number,
    runAttempt: Number(asString(expectedClaims.run_attempt, code)),
    eventName: expectedClaims.event_name,
    actor: expectedClaims.actor,
    actorId: expectedClaims.actor_id,
    callerPath: '.github/workflows/gala-publish-v2.yml',
    verificationState: 'pending-authorize-oidc',
  };
  jcsEqual(provenance.assertedWorkload, asserted, code);
  equal(asserted.repository, sourceState.repositoryContext.coordinate, code);
  jcsEqual(workload.binding.callerWorkflow, workflow.workflowFiles[0], code);

  const carriers = validateCarriers(context.carriers, asserted);
  const verifiedCarrier = carriers[0];
  const unfrozenCarrier = carriers[1];
  if (!verifiedCarrier || !unfrozenCarrier) fail(code);
  jcsEqual(
    provenance.verifiedInputHandoff,
    verifiedCarrier,
    'PROVENANCE_CARRIER_INVALID',
  );
  jcsEqual(
    provenance.unfrozenOutputHandoff,
    unfrozenCarrier,
    'PROVENANCE_CARRIER_INVALID',
  );
  const sandbox = validateSandbox(provenance, context, buildInput);

  const publishers = asArray(lock.publisher, code).map((row) =>
    asObject(row, code),
  );
  const policyDecision = artifact.buildPolicyDecision;
  const themeContract = asObject(context.themeContract, code);
  const repository = asObject(buildInput.repository, code);
  const destinationCapabilities = asObject(
    buildInput.destinationCapabilities,
    code,
  );
  const rebuild = {
    repositoryId: repository.repositoryId,
    sourceCommit: buildInput.sourceRevision,
    sourceTree: sourceState.repositoryContext.sourceTree,
    repositoryRootDigest: repository.rootDigest,
    buildEpoch: buildInput.buildEpoch,
    contractVersion: buildInput.contractVersion,
    builder: packageIdentity(publishers[0] ?? {}, code),
    schemas: packageIdentity(asObject(lock.schemas, code), code),
    template: packageIdentity(asObject(lock.template, code), code),
    theme: packageIdentity(asObject(lock.theme, code), code),
    dependencyLockDigest: lock.lockDigest,
    packageReleaseCatalogDigest: lockState.catalog.catalogDigest,
    buildInputDigest: buildInput.inputDigest,
    baseUrl: buildInput.baseUrl,
    basePath: buildInput.basePath,
    destinationCapabilityDigest: destinationCapabilities.capabilityDigest,
    policyReleaseId: policyDecision.policyReleaseId,
    buildPolicyDecisionDigest: policyDecision.decisionDigest,
    stylingContractDigest: themeContract.stylingContractDigest,
    renderPolicy: sourceState.renderPolicy,
    workflowIdentity: manifest.workflowIdentity,
  };
  jcsEqual(provenance.rebuildRecord, rebuild, code);
  equal(provenance.lockDigest, lock.lockDigest, code);
  equal(
    provenance.packageReleaseCatalogDigest,
    lockState.catalog.catalogDigest,
    code,
  );
  equal(provenance.buildInputDigest, buildInput.inputDigest, code);
  equal(provenance.artifactId, manifest.artifactId, code);
  equal(provenance.artifactDigest, manifest.artifactDigest, code);
  equal(provenance.manifestDigest, manifest.manifestDigest, code);
  equal(provenance.policyReleaseId, policyDecision.policyReleaseId, code);
  equal(
    provenance.buildPolicyDecisionDigest,
    policyDecision.decisionDigest,
    code,
  );
  equal(
    provenance.capabilityDecisionDigest,
    digest(context.capabilityDecisionDigest, code),
    code,
  );
  equal(
    provenance.stylingContractDigest,
    themeContract.stylingContractDigest,
    code,
  );
  jcsEqual(provenance.renderPolicy, sourceState.renderPolicy, code);
  jcsEqual(provenance.sandbox, sandbox, code);
  jcsEqual(provenance.secretInputs, [], code);
  equal(provenance.spdx23JsonSchemaDigest, SPDX_SCHEMA_DIGEST, code);

  const licenses = validateArtifactLicenses(artifact.outputs, context);
  jcsEqual(
    provenance.artifactLicenseConclusions,
    licenses.conclusions,
    'PROVENANCE_LICENSE_INVALID',
  );
  const packageExpressions = [...lockState.catalogByKey.values()]
    .filter((entry) =>
      lockState.identities.has(
        `${asString(entry.package, code)}@${asString(entry.version, code)}`,
      ),
    )
    .map((entry) => asString(entry.licenseExpression, code));
  const licenseExpressions = [...packageExpressions, ...licenses.expressions];
  try {
    validateSpdxCatalogEvidence(licenseExpressions, {
      licenseListVersion: provenance.spdxLicenseListVersion,
      licenseListDigest: provenance.spdxLicenseListDigest,
      catalogEntries: context.spdxCatalogEntries,
    });
  } catch {
    fail('PROVENANCE_LICENSE_INVALID');
  }
  return {
    provenanceDigest: digestProfile('buildProvenance', provenance, code),
    licenseExpressions,
  };
}

/**
 * @param {string} tagged tagged SHA-256
 * @param {string} code diagnostic
 * @returns {string} untagged hexadecimal digest
 */
function untagSha256(tagged, code) {
  const value = digest(tagged, code);
  return value.slice('sha256:'.length);
}

/**
 * @param {number} index one-based index
 * @param {number} width decimal width
 * @returns {string} zero-padded index
 */
function paddedIndex(index, width) {
  return String(index).padStart(width, '0');
}

/**
 * Validate the exact deterministic SPDX 2.3 projection.
 *
 * @param {Record<string, unknown>} sbom SPDX document
 * @param {Record<string, unknown>} manifest manifest
 * @param {Record<string, unknown>} provenance provenance
 * @param {Record<string, unknown>} lock lock
 * @param {LockState} lockState lock state
 * @param {ArtifactOutput[]} outputs artifact outputs
 * @param {Record<string, unknown>} context trusted context
 * @param {Uint8Array} sbomBytes exact retained JCS bytes
 * @returns {string} exact SBOM digest
 */
function validateSbom(
  sbom,
  manifest,
  provenance,
  lock,
  lockState,
  outputs,
  context,
  sbomBytes,
) {
  const code = 'SPDX_SBOM_INVALID';
  ledger(
    sbom,
    [
      'SPDXID',
      'spdxVersion',
      'dataLicense',
      'name',
      'documentNamespace',
      'creationInfo',
      'documentDescribes',
      'packages',
      'files',
      'relationships',
    ],
    code,
  );
  const artifactHex = untagSha256(
    asString(manifest.artifactDigest, code),
    code,
  );
  const name = `galascribe-artifact-${artifactHex}`;
  const publishers = asArray(lock.publisher, code).map((row) =>
    asObject(row, code),
  );
  const publishAction = publishers[0];
  if (!publishAction) fail(code);
  const creationInfo = {
    created: manifest.generatedAt,
    creators: [
      `Tool: @rathnasgala2/publish-action-${asString(publishAction.version, code)}`,
    ],
    licenseListVersion: provenance.spdxLicenseListVersion,
  };

  const packageIds = new Map();
  const directRows = [
    asObject(lock.schemas, code),
    asObject(lock.template, code),
    asObject(lock.theme, code),
    ...publishers,
  ];
  const dependencyRows = asArray(lock.dependencies, code).map((row) =>
    asObject(row, code),
  );
  const artifactPackage = {
    SPDXID: 'SPDXRef-Package-Artifact',
    name,
    versionInfo: manifest.sourceCommit,
    downloadLocation: 'NOASSERTION',
    filesAnalyzed: true,
    packageVerificationCode: { packageVerificationCodeValue: '' },
    licenseConcluded: 'NOASSERTION',
    licenseDeclared: 'NOASSERTION',
    copyrightText: 'NOASSERTION',
  };
  /** @type {Record<string, unknown>[]} */
  const expectedPackages = [artifactPackage];
  for (let index = 0; index < directRows.length; index += 1) {
    const row = directRows[index];
    if (!row) fail(code);
    const id = `SPDXRef-Package-Direct-${paddedIndex(index, 2)}`;
    packageIds.set(packageKey(packageIdentity(row, code)), id);
    expectedPackages.push(spdxDependencyPackage(row, id, lockState, code));
  }
  for (let index = 0; index < dependencyRows.length; index += 1) {
    const row = dependencyRows[index];
    if (!row) fail(code);
    const id = `SPDXRef-Package-Dependency-${paddedIndex(index + 1, 6)}`;
    packageIds.set(packageKey(packageIdentity(row, code)), id);
    expectedPackages.push(spdxDependencyPackage(row, id, lockState, code));
  }

  const conclusionByPath = new Map(
    asArray(provenance.artifactLicenseConclusions, code).map((candidate) => {
      const row = asObject(candidate, code);
      return [
        asString(row.artifactPath, code),
        asString(row.licenseConcluded, code),
      ];
    }),
  );
  const sortedOutputs = [...outputs].sort((left, right) =>
    compareUtf8(left.path, right.path),
  );
  const expectedFiles = sortedOutputs.map((output, index) => ({
    SPDXID: `SPDXRef-File-${paddedIndex(index + 1, 6)}`,
    fileName: `./${output.path}`,
    checksums: [
      { algorithm: 'SHA1', checksumValue: rawHash(output.bytes, 'sha1') },
      { algorithm: 'SHA256', checksumValue: rawHash(output.bytes, 'sha256') },
    ],
    licenseConcluded: conclusionByPath.get(output.path),
    copyrightText: 'NOASSERTION',
  }));
  if (expectedFiles.some((file) => typeof file.licenseConcluded !== 'string'))
    fail(code);
  const sortedFileSha1 = expectedFiles
    .map((file) => file.checksums[0]?.checksumValue ?? '')
    .sort(compareUtf8)
    .join('');
  artifactPackage.packageVerificationCode.packageVerificationCodeValue =
    rawHash(Buffer.from(sortedFileSha1, 'ascii'), 'sha1');

  const relationships = [
    {
      spdxElementId: 'SPDXRef-DOCUMENT',
      relationshipType: 'DESCRIBES',
      relatedSpdxElement: 'SPDXRef-Package-Artifact',
    },
    ...expectedFiles.map((file) => ({
      spdxElementId: 'SPDXRef-Package-Artifact',
      relationshipType: 'CONTAINS',
      relatedSpdxElement: file.SPDXID,
    })),
    ...directRows.map((row) => ({
      spdxElementId: 'SPDXRef-Package-Artifact',
      relationshipType: 'DEPENDS_ON',
      relatedSpdxElement: packageIds.get(
        packageKey(packageIdentity(row, code)),
      ),
    })),
    ...asArray(lock.dependencyDag, code).map((candidate) => {
      const edge = asObject(candidate, code);
      const from = packageIds.get(asString(edge.from, code));
      const to = packageIds.get(asString(edge.to, code));
      if (!from || !to) fail(code);
      return {
        spdxElementId: from,
        relationshipType: 'DEPENDS_ON',
        relatedSpdxElement: to,
      };
    }),
  ];
  const relationshipMap = new Map(
    relationships.map((relationship) => [
      canonicalizeJcs(relationship),
      relationship,
    ]),
  );
  const expectedRelationships = [...relationshipMap.values()].sort(
    (left, right) => {
      const element = compareUtf8(
        asString(left.spdxElementId, code),
        asString(right.spdxElementId, code),
      );
      if (element) return element;
      const type = compareUtf8(
        asString(left.relationshipType, code),
        asString(right.relationshipType, code),
      );
      return (
        type ||
        compareUtf8(
          asString(left.relatedSpdxElement, code),
          asString(right.relatedSpdxElement, code),
        )
      );
    },
  );
  const expected = {
    SPDXID: 'SPDXRef-DOCUMENT',
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    name,
    documentNamespace: `urn:gala:spdx:2:${artifactHex}`,
    creationInfo,
    documentDescribes: ['SPDXRef-Package-Artifact'],
    packages: expectedPackages,
    files: expectedFiles,
    relationships: expectedRelationships,
  };
  jcsEqual(sbom, expected, code);
  const retainedBytes = bytes(sbomBytes, code);
  if (
    retainedBytes.length > 16_777_216 ||
    !retainedBytes.equals(canonicalizeJcsBytes(sbom))
  ) {
    fail(code);
  }
  const official = ledger(
    context.officialSpdxValidation,
    ['schemaDigest', 'accepted'],
    code,
  );
  equal(official.schemaDigest, SPDX_SCHEMA_DIGEST, code);
  equal(official.accepted, true, code);
  const sbomDigest = sha256Tagged(retainedBytes);
  equal(provenance.sbomDigest, sbomDigest, code);
  return sbomDigest;
}

/**
 * Build one exact SPDX dependency-package row.
 *
 * @param {Record<string, unknown>} row locked package row
 * @param {string} id assigned SPDX ID
 * @param {LockState} lockState package state
 * @param {string} code diagnostic
 * @returns {Record<string, unknown>} SPDX package
 */
function spdxDependencyPackage(row, id, lockState, code) {
  const identity = packageIdentity(row, code);
  const catalog = lockState.catalogByKey.get(packageKey(identity));
  if (!catalog) fail(code);
  return {
    SPDXID: id,
    name: identity.package,
    versionInfo: identity.version,
    downloadLocation: 'NOASSERTION',
    filesAnalyzed: false,
    checksums: [
      {
        algorithm: 'SHA256',
        checksumValue: untagSha256(identity.integrity, code),
      },
    ],
    licenseConcluded: catalog.licenseExpression,
    licenseDeclared: catalog.licenseExpression,
    copyrightText: 'NOASSERTION',
  };
}

/**
 * Validate the complete accepted S0-T03 lock/build/artifact record family.
 *
 * Structural JSON Schema validation is a required predecessor. This function
 * then enforces DEC-097 cross-schema invariants 1, 2, 5, 6, and 7 against
 * exact retained context bytes without adding context facts to wire records.
 *
 * @param {unknown} recordBundle exact record bundle
 * @param {unknown} validatorContext trusted validation context
 * @returns {{
 *   lockDigest: string,
 *   buildInputDigest: string,
 *   artifactDigest: string,
 *   sourceInventoryDigest: string,
 *   validationEvidenceDigest: string,
 *   manifestDigest: string,
 *   buildPolicyDecisionDigest: string,
 *   provenanceDigest: string,
 *   sbomDigest: string,
 *   workloadBindingDigest: string,
 *   artifactFileCount: number
 * }} independently recomputed semantic identities
 */
export function validateBuildArtifactSemantics(recordBundle, validatorContext) {
  const records = ledger(
    recordBundle,
    ['lock', 'buildInput', 'artifactManifest', 'buildProvenance', 'sbom'],
    'BUILD_ARTIFACT_RECORD_BUNDLE_INVALID',
  );
  const context = ledger(
    validatorContext,
    [
      'packageReleaseCatalog',
      'registryFetchProfile',
      'packageArtifacts',
      'themeContract',
      'adapterCapability',
      'repository',
      'normalizedSource',
      'renderPolicyBytes',
      'frozenEnvelopeBytes',
      'artifactOutputs',
      'reproducibilityRuns',
      'buildPolicyRelease',
      'buildPolicyDecision',
      'workflowFiles',
      'actions',
      'workload',
      'carriers',
      'runner',
      'themeFiles',
      'capabilityDecisionDigest',
      'spdxCatalogEntries',
      'officialSpdxValidation',
    ],
    'BUILD_ARTIFACT_CONTEXT_INVALID',
  );
  const lock = asObject(records.lock, 'LOCK_LEDGER_INVALID');
  const buildInput = asObject(records.buildInput, 'BUILD_INPUT_INVALID');
  const manifest = asObject(
    records.artifactManifest,
    'ARTIFACT_MANIFEST_INVALID',
  );
  const provenance = asObject(records.buildProvenance, 'PROVENANCE_INVALID');
  const sbom = asObject(records.sbom, 'SPDX_SBOM_INVALID');
  const frozen = validateFrozen(records, context);
  const lockState = validateLock(lock, buildInput, context);
  equal(
    lock.lockDigest,
    digestProfile('lock', lock, 'LOCK_DIGEST_INVALID'),
    'LOCK_DIGEST_INVALID',
  );
  const sourceState = validateBuildInput(lock, buildInput, context);
  validateContractProjections(lock, buildInput, context, lockState);
  ledger(provenance, PROVENANCE_KEYS, 'PROVENANCE_INVALID');
  const workflow = validateWorkflowEvidence(provenance, context, sourceState);
  const workload = validateWorkload(
    asObject(context.workload, 'WORKLOAD_INVALID'),
    workflow.workflowFiles,
    sourceState,
  );
  const artifact = validateArtifactManifest(
    manifest,
    lock,
    buildInput,
    provenance,
    context,
    lockState,
    sourceState,
    workload,
    workflow.workflowFiles,
    frozen.payloads,
  );
  const provenanceState = validateBuildProvenance(
    provenance,
    manifest,
    lock,
    buildInput,
    context,
    lockState,
    sourceState,
    workload,
    workflow,
    artifact,
  );
  const sbomRecord = frozen.envelope.records.find(
    (record) => record.kind === 0x04,
  );
  if (!sbomRecord) fail('SPDX_SBOM_INVALID');
  const sbomDigest = validateSbom(
    sbom,
    manifest,
    provenance,
    lock,
    lockState,
    artifact.outputs,
    context,
    sbomRecord.content,
  );
  validateFrozenRecordParity(records, frozen.envelope);
  return {
    lockDigest: asString(lock.lockDigest, 'LOCK_DIGEST_INVALID'),
    buildInputDigest: asString(buildInput.inputDigest, 'BUILD_DIGEST_INVALID'),
    artifactDigest: asString(
      manifest.artifactDigest,
      'ARTIFACT_DIGEST_INVALID',
    ),
    sourceInventoryDigest: asString(
      manifest.sourceInventoryDigest,
      'ARTIFACT_SOURCE_PARTITION_INVALID',
    ),
    validationEvidenceDigest: asString(
      asObject(manifest.validation, 'ARTIFACT_VALIDATION_INVALID')
        .evidenceDigest,
      'ARTIFACT_VALIDATION_INVALID',
    ),
    manifestDigest: asString(
      manifest.manifestDigest,
      'ARTIFACT_DIGEST_INVALID',
    ),
    buildPolicyDecisionDigest: asString(
      artifact.buildPolicyDecision.decisionDigest,
      'ARTIFACT_POLICY_INVALID',
    ),
    provenanceDigest: provenanceState.provenanceDigest,
    sbomDigest,
    workloadBindingDigest: asString(
      workload.binding.workloadBindingDigest,
      'WORKLOAD_INVALID',
    ),
    artifactFileCount: artifact.outputs.length,
  };
}
