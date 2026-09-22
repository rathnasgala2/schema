import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { format, resolveConfig } from 'prettier';
import { parseDocument } from 'yaml';

import { validateGalaFormat } from '../src/internal/format-validators.js';
import { digestPublicRuntimeOrigins } from '../src/internal/public-runtime-origins.js';
import { graphemeLength17 } from '../src/internal/unicode17.js';
import { runIfMain } from './run-if-main.mjs';

const CONTRACT_VERSION = '2.0.0';
const MANIFEST_VERSION = '1.0.0';
const CLOSED_STRING_BOUNDARY_EXCLUSIONS = new Set([
  '#/$defs/bcp47:minLength',
  '#/$defs/githubWorkflowRef:maxLength',
  '#/$defs/githubWorkflowRef:minLength',
  '#/$defs/githubWorkflowRef:x-gala-utf8ByteLength',
  '#/$defs/httpProviderLimits/properties/maximumPagesArtifactBytes:maxLength',
  '#/$defs/httpProviderLimits/properties/maximumProviderRequestBodyBytes:maxLength',
  '#/$defs/httpProviderLimits/properties/maximumProviderResponseBodyBytes:maxLength',
  '#/$defs/httpProviderLimits/properties/maximumProviderResponseWireBodyBytes:maxLength',
  '#/$defs/httpProviderLimits/properties/maximumProviderStageRequestBytes:maxLength',
  '#/$defs/httpProviderLimits/properties/maximumProviderStageResponseBytes:maxLength',
  '#/$defs/httpProviderLimits/properties/maximumProviderStageResponseWireBytes:maxLength',
  '#/$defs/managedFailureCode:maxLength',
  '#/$defs/managedFailureCode:minLength',
  '#/$defs/observedRedirectLocation:minLength',
  '#/$defs/packageExact:minLength',
  '#/$defs/packageRange:minLength',
  '#/$defs/semverRange:minLength',
  '#/$defs/spdxExpression:minLength',
  '#/$defs/verificationOrigin:maxLength',
  '#/$defs/verificationOrigin:x-gala-utf8ByteLength',
  '#/properties/spacesStagePrefix:maxLength',
  '#/properties/spacesStagePrefix:minLength',
  '#/properties/spacesStagePrefix:x-gala-utf8ByteLength',
]);
const RULE_KEYWORDS = new Set([
  'additionalProperties',
  'anyOf',
  'const',
  'contains',
  'dependentRequired',
  'enum',
  'format',
  'maxItems',
  'maxLength',
  'maxProperties',
  'maximum',
  'minItems',
  'minLength',
  'minProperties',
  'minimum',
  'not',
  'oneOf',
  'pattern',
  'required',
  'type',
  'uniqueItems',
  'x-gala-asciiByteLength',
  'x-gala-graphemeLength',
  'x-gala-maxCanonicalBytes',
  'x-gala-maximum',
  'x-gala-utf8ByteLength',
]);

const SCALAR_CODES = Object.freeze({
  bcp47: 'BCP47_INVALID',
  canonicalRoute: 'CANONICAL_ROUTE_INVALID',
  digest: 'DIGEST_INVALID',
  extensionKey: 'EXTENSION_KEY_INVALID',
  generationFence: 'EXPECTED_GENERATION_FENCE_INVALID',
  gitObjectId: 'GIT_OBJECT_ID_INVALID',
  glob: 'REPOSITORY_GLOB_INVALID',
  isoCountry: 'ISO_COUNTRY_INVALID',
  packageExact: 'PACKAGE_EXACT_INVALID',
  packageRange: 'PACKAGE_RANGE_INVALID',
  passiveVisualToken: 'PASSIVE_VISUAL_TOKEN_INVALID',
  plainLabel: 'PLAIN_LABEL_INVALID',
  plainText: 'PLAIN_TEXT_INVALID',
  publicRecoveryBase: 'HTTPS_URL_INVALID',
  repoRelativePath: 'REPOSITORY_PATH_INVALID',
  rfc3339: 'RFC3339_INVALID',
  runtimePayloadDigest: 'DIGEST_INVALID',
  semver: 'SEMVER_INVALID',
  semverRange: 'SEMVER_RANGE_INVALID',
  serviceOrigin: 'HTTPS_URL_INVALID',
  slug: 'SLUG_INVALID',
  stableId: 'STABLE_ID_INVALID',
  transactionalLinkBase: 'HTTPS_URL_INVALID',
  urlHttps: 'HTTPS_URL_INVALID',
  urn: 'URN_INVALID',
});

const KEYWORD_CODES = Object.freeze({
  additionalProperties: 'REQUEST_FIELD_UNKNOWN',
  anyOf: 'SCHEMA_UNION_INVALID',
  const: 'SCHEMA_CONSTANT_INVALID',
  contains: 'SCHEMA_ARRAY_CONTAINS_INVALID',
  dependentRequired: 'SCHEMA_DEPENDENCY_REQUIRED',
  enum: 'SCHEMA_ENUM_INVALID',
  format: 'SCHEMA_FORMAT_INVALID',
  maxItems: 'SCHEMA_ARRAY_TOO_LONG',
  maxLength: 'SCHEMA_STRING_TOO_LONG',
  maxProperties: 'SCHEMA_OBJECT_TOO_LARGE',
  maximum: 'SCHEMA_NUMBER_TOO_LARGE',
  minItems: 'SCHEMA_ARRAY_TOO_SHORT',
  minLength: 'SCHEMA_STRING_TOO_SHORT',
  minProperties: 'SCHEMA_OBJECT_TOO_SMALL',
  minimum: 'SCHEMA_NUMBER_TOO_SMALL',
  not: 'SCHEMA_NEGATED_RULE_MATCHED',
  oneOf: 'SCHEMA_UNION_INVALID',
  pattern: 'SCHEMA_PATTERN_INVALID',
  required: 'SCHEMA_REQUIRED_FIELD_MISSING',
  type: 'SCHEMA_TYPE_INVALID',
  uniqueItems: 'SCHEMA_ARRAY_DUPLICATE',
  'x-gala-asciiByteLength': 'ASCII_BYTE_LENGTH_INVALID',
  'x-gala-graphemeLength': 'GRAPHEME_LENGTH_INVALID',
  'x-gala-maxCanonicalBytes': 'CANONICAL_BYTE_LENGTH_INVALID',
  'x-gala-maximum': 'INTEGER_RANGE_INVALID',
  'x-gala-utf8ByteLength': 'UTF8_BYTE_LENGTH_INVALID',
});

const ADVERSARIAL_FIXTURES = Object.freeze([
  {
    category: 'active-content',
    expectedCode: 'ACTIVE_CONTENT_FORBIDDEN',
    validator: 'repository-loader',
    instance: {
      path: 'assets/attack.svg',
      content: '<svg onload="alert(1)"/>',
    },
  },
  {
    category: 'cyclic-references',
    expectedCode: 'REFERENCE_CYCLE',
    validator: 'repository-graph',
    instance: {
      documents: [
        { path: 'gala/a.json', references: ['gala/b.json'] },
        { path: 'gala/b.json', references: ['gala/a.json'] },
      ],
    },
  },
  {
    category: 'duplicate-keys',
    expectedCode: 'YAML_DUPLICATE_KEY',
    validator: 'frontmatter-parser',
    instance: '---\ntitle: First\ntitle: Second\n---\n',
  },
  {
    category: 'oversized-fields',
    expectedCode: 'FIELD_SIZE_EXCEEDED',
    validator: 'fixture-recipe',
    recipe: { kind: 'repeat-string', value: 'a', count: 2_000_001 },
  },
  {
    category: 'oversized-files',
    expectedCode: 'FILE_SIZE_EXCEEDED',
    validator: 'fixture-recipe',
    recipe: { kind: 'repeat-bytes', byte: 97, count: 10_485_761 },
  },
  {
    category: 'path-traversal',
    expectedCode: 'PATH_TRAVERSAL',
    validator: 'repository-loader',
    instance: '../outside.md',
  },
  {
    category: 'reserved-extension-keys',
    expectedCode: 'EXTENSION_KEY_RESERVED',
    validator: 'repository-loader',
    instance: { 'gala.core': true },
  },
  {
    category: 'symlink-escape',
    expectedCode: 'SYMLINK_ESCAPE',
    validator: 'repository-loader',
    instance: {
      root: '/fixture/repository',
      path: 'content/escape.md',
      realpath: '/fixture/outside/escape.md',
    },
  },
  {
    category: 'unicode-case-fold-collision',
    expectedCode: 'PATH_COLLISION',
    validator: 'repository-graph',
    instance: [
      'content/Résumé.md',
      'content/résumé.md',
      'content/README.md',
      'content/readme.md',
    ],
  },
  {
    category: 'unknown-module',
    expectedCode: 'MODULE_UNKNOWN',
    validator: 'repository-graph',
    instance: { module: 'custom-script' },
  },
  {
    category: 'unknown-schema-major',
    expectedCode: 'SCHEMA_VERSION_UNSUPPORTED',
    validator: 'schema-discriminator',
    instance: {
      schemaId: 'urn:gala:schema:repository:3.0.0',
      schemaVersion: '3.0.0',
    },
  },
  {
    category: 'unsafe-urls',
    expectedCode: 'HTTPS_URL_INVALID',
    validator: 'portable-scalar',
    instance: 'https://user:secret@example.com/private',
  },
  {
    category: 'yaml-aliases',
    expectedCode: 'YAML_ALIAS_FORBIDDEN',
    validator: 'frontmatter-parser',
    instance:
      '---\ndefaults: &defaults\n  status: draft\ncopy: *defaults\n---\n',
  },
  {
    category: 'yaml-exponential-expansion',
    expectedCode: 'YAML_EXPANSION_LIMIT_EXCEEDED',
    validator: 'frontmatter-parser',
    instance:
      '---\na: &a [x,x,x,x,x,x,x,x,x]\nb: &b [*a,*a,*a,*a,*a,*a,*a,*a,*a]\nc: [*b,*b,*b,*b,*b,*b,*b,*b,*b]\n---\n',
  },
]);

/** Verify the authored YAML attacks with the accepted yaml 2.9.0 oracle. */
function verifyYamlAdversarialFixtures() {
  const fixtures = new Map(
    ADVERSARIAL_FIXTURES.filter(({ category }) =>
      ['duplicate-keys', 'yaml-aliases', 'yaml-exponential-expansion'].includes(
        category,
      ),
    ).map((fixture) => [fixture.category, fixture]),
  );
  /**
   * @param {unknown} value complete frontmatter source
   * @returns {string} YAML document body
   */
  const frontmatterBody = (value) =>
    String(value)
      .replace(/^---\n/u, '')
      .replace(/\n---\n$/u, '');
  const duplicateSource = frontmatterBody(
    fixtures.get('duplicate-keys')?.instance,
  );
  const duplicateDocument = parseDocument(duplicateSource);
  if (!duplicateDocument.errors.some(({ code }) => code === 'DUPLICATE_KEY')) {
    throw new TypeError('YAML_DUPLICATE_FIXTURE_INVALID');
  }
  for (const category of ['yaml-aliases', 'yaml-exponential-expansion']) {
    const source = frontmatterBody(fixtures.get(category)?.instance);
    const document = parseDocument(source);
    if (document.errors.length > 0) {
      throw new TypeError(`YAML_ADVERSARIAL_FIXTURE_INVALID:${category}`);
    }
    try {
      document.toJS({ maxAliasCount: category === 'yaml-aliases' ? 0 : 16 });
      throw new TypeError(`YAML_ADVERSARIAL_LIMIT_NOT_TRIGGERED:${category}`);
    } catch (error) {
      if (!(error instanceof ReferenceError)) throw error;
    }
  }
}

/**
 * Escape one JSON Pointer token.
 *
 * @param {string} value pointer token
 * @returns {string} escaped token
 */
function escapePointer(value) {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

/**
 * Clone an I-JSON-compatible value.
 *
 * @template T
 * @param {T} value source value
 * @returns {T} copied value
 */
function clone(value) {
  return structuredClone(value);
}

/**
 * Resolve one local JSON Pointer.
 *
 * @param {unknown} root root schema
 * @param {string} pointer local JSON Pointer
 * @returns {unknown} resolved value
 */
function resolvePointer(root, pointer) {
  if (pointer === '#') return root;
  if (!pointer.startsWith('#/')) throw new TypeError('FIXTURE_REF_INVALID');
  return pointer
    .slice(2)
    .split('/')
    .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((value, token) => {
      if (value === null || typeof value !== 'object' || !(token in value)) {
        throw new TypeError('FIXTURE_REF_INVALID');
      }
      return /** @type {Record<string, unknown>} */ (value)[token];
    }, root);
}

/**
 * Return a deterministic short identity.
 *
 * @param {string} value identity input
 * @returns {string} first sixteen lowercase SHA-256 hex characters
 */
function shortHash(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 16);
}

/**
 * Select a canonical string that satisfies a schema's syntax.
 *
 * @param {Record<string, unknown>} schema string schema
 * @param {string} pointer schema pointer
 * @param {number} [variant] deterministic candidate variant
 * @returns {string} candidate string
 */
function stringValue(schema, pointer, variant = 0) {
  const definition = /\/\$defs\/([^/]+)/u.exec(pointer)?.[1];
  /** @type {Record<string, string>} */
  const byDefinition = {
    bcp47: 'en-US',
    canonicalRoute: '/',
    digest: `sha256:${'01'.repeat(32)}`,
    extensionKey: 'com.example.fixture',
    githubActionsOidcOrigin: 'https://pipelines.actions.githubusercontent.com',
    gitObjectId: `sha1:${'01'.repeat(20)}`,
    glob: '**',
    isoCountry: 'US',
    packageExact: '@rathnasgala2/fixture@2.0.0',
    packageRange: '@rathnasgala2/fixture@^2.0.0',
    plainLabel: 'fixture',
    plainText: 'fixture',
    problemHttpsType: 'https://errors.example.com/problem',
    problemUrn: 'urn:gala:problem:fixture',
    publicRecoveryBase: 'https://recover.example.com/account/recover',
    repoRelativePath: 'content/fixture.md',
    rfc3339: '2026-09-13T12:00:00.000Z',
    runtimePayloadDigest: `sha256:${'A'.repeat(43)}`,
    semver: '2.0.0',
    semverRange: '^2.0.0',
    serviceOrigin: 'https://example.com',
    slug: 'fixture',
    stableId: '019c0000-0000-7000-8000-000000000001',
    transactionalLinkBase: 'https://links.example.com/t',
    urlHttps: 'https://example.com/',
    urn: 'urn:gala:fixture:value',
  };
  /** @type {Record<string, string>} */
  const byDefinitionVariant = {
    canonicalRoute: `/fixture-${variant + 1}`,
    digest: `sha256:${(variant + 1).toString(16).padStart(64, '0')}`,
    extensionKey: `com.example.fixture-${variant + 1}`,
    gitObjectId: `sha1:${(variant + 1).toString(16).padStart(40, '0')}`,
    githubActionsOidcOrigin:
      variant === 0
        ? 'https://pipelines.actions.githubusercontent.com'
        : `https://pipelinesgh${(variant + 1).toString(36)}.actions.githubusercontent.com`,
    plainLabel: `fixture-${variant + 1}`,
    plainText: `fixture-${variant + 1}`,
    observedRedirectLocation: `https://fixture-${variant + 1}.example.com/redirect`,
    packageExact: `@rathnasgala2/fixture-${variant + 1}@2.0.0`,
    packageRange: `@rathnasgala2/fixture-${variant + 1}@^2.0.0`,
    probeRegion: `region-${variant + 1}`,
    repoRelativePath: `content/fixture-${variant + 1}.md`,
    serviceOrigin: `https://fixture-${variant + 1}.example.com`,
    slug: `fixture-${variant + 1}`,
    stableId: `019c0000-0000-7000-8000-${(variant + 1)
      .toString(16)
      .padStart(12, '0')}`,
    urn: `urn:gala:fixture:value-${variant + 1}`,
    urlHttps: `https://fixture-${variant + 1}.example.com/`,
    verificationOrigin: `https://fixture-${variant + 1}.example.com`,
    verificationUrl: `https://fixture-${variant + 1}.example.com/.well-known/gala`,
  };
  /** @type {Record<string, string>} */
  const byFormat = {
    'date-time': '2026-09-13T12:00:00.000Z',
    uri: pointer.includes('problemUrn')
      ? 'urn:gala:problem:fixture'
      : 'https://example.com/',
    'gala-base64url-32-byte': `${'A'.repeat(42)}A`,
    'gala-bcp47': 'en-US',
    'gala-extension-key': 'com.example.fixture',
    'gala-github-action-coordinate': `fixture/actions/test@${'01'.repeat(20)}`,
    'gala-github-positive-uint64': '1',
    'gala-github-repository-coordinate': 'fixture-owner/fixture-repository',
    'gala-int64': '1',
    'gala-iso-country': 'US',
    'gala-nonnegative-int64': '0',
    'gala-observed-redirect-location': 'https://example.com/redirect',
    'gala-package-exact': '@rathnasgala2/fixture@2.0.0',
    'gala-package-range': '@rathnasgala2/fixture@^2.0.0',
    'gala-plain-label': 'fixture',
    'gala-plain-text': 'fixture',
    'gala-positive-int64': '1',
    'gala-repository-glob': '**',
    'gala-repository-relative-path': 'content/fixture.md',
    'gala-semver-range': '^2.0.0',
    'gala-spdx-expression': 'MIT',
    'gala-unsigned-64-bit-decimal': '1',
    'gala-verification-origin': 'https://example.com',
    'gala-verification-url': 'https://example.com/.well-known/gala',
  };
  const candidates = [
    ...(definition !== undefined && definition in byDefinitionVariant
      ? [/** @type {string} */ (byDefinitionVariant[definition])]
      : []),
    ...(definition !== undefined && definition in byDefinition
      ? [/** @type {string} */ (byDefinition[definition])]
      : []),
    ...(typeof schema.format === 'string' && schema.format in byFormat
      ? [/** @type {string} */ (byFormat[schema.format])]
      : []),
    `fixture-${variant + 1}`,
    `@fixture/synthesized-${variant + 1}`,
    'fixture',
    'FIXTURE',
    'fixture_value',
    'fixture-value',
    '1',
    '0',
    'MIT',
    'nyc3',
    '#000000',
    '1px',
    '400',
    'system-ui',
    'QQ==',
    'https://example.com/',
    'mailto:fixture@example.com',
    'urn:gala:fixture:value',
    `sha256:${'01'.repeat(32)}`,
    `sha1:${'01'.repeat(20)}`,
    '01'.repeat(16),
    '01'.repeat(20),
    '01'.repeat(32),
    '019c0000-0000-7000-8000-000000000001',
    `_gala/staged/v2/${'019c0000-0000-7000-8000-000000000001/'.repeat(3)}`,
    'fixture-owner/fixture-repository',
    'fixture-owner/fixture-repository/.github/workflows/gala-publish-v2.yml@refs/heads/gala/publish/019c0000-0000-7000-8000-000000000001',
    'fixture/.',
    'fixture/..',
    '@rathnasgala2/fixture@2.0.0',
    '@rathnasgala2/schemas@2.0.0',
    '@rathnasgala2/template@2.0.0',
    '@rathnasgala2/theme-default@2.0.0',
    '@rathnasgala2/theme-amaze@2.0.0',
    '@rathnasgala2/theme-flashy@2.0.0',
    '@rathnasgala2/theme-minimal@2.0.0',
    '@rathnasgala2/theme-zebra@2.0.0',
    '@rathnasgala2/publish-action@2.0.0',
    '@rathnasgala2/publish-kernel@2.0.0',
    '@rathnasgala2/adapter-protocol@2.0.0',
    '@rathnasgala2/adapter-local-directory@2.0.0',
    '^2.0.0',
    '/',
    '**',
  ];
  const pattern =
    typeof schema.pattern === 'string'
      ? new RegExp(schema.pattern, 'u')
      : undefined;
  const minimum = typeof schema.minLength === 'number' ? schema.minLength : 0;
  const maximum =
    typeof schema.maxLength === 'number' ? schema.maxLength : Infinity;
  const candidate = candidates.find(
    (value) =>
      value.length >= minimum &&
      value.length <= maximum &&
      (pattern === undefined || pattern.test(value)) &&
      (typeof schema.format !== 'string' ||
        validateGalaFormat(schema.format, value)),
  );
  if (candidate !== undefined) return candidate;
  const repeated = 'a'.repeat(Math.max(1, minimum));
  if (
    repeated.length <= maximum &&
    (pattern === undefined || pattern.test(repeated)) &&
    (typeof schema.format !== 'string' ||
      validateGalaFormat(schema.format, repeated))
  ) {
    return repeated;
  }
  throw new TypeError(`FIXTURE_STRING_UNSYNTHESIZABLE:${pointer}`);
}

/**
 * Produce an exact-length slash-separated ASCII path with 128-byte segments.
 *
 * @param {number} length required byte length
 * @returns {string} repository-relative path
 */
function segmentedAsciiPath(length) {
  if (!Number.isInteger(length) || length < 1) {
    throw new TypeError('FIXTURE_PATH_LENGTH_INVALID');
  }
  const segments = [];
  let remaining = length;
  while (remaining > 128) {
    const segmentLength = remaining === 129 ? 127 : 128;
    segments.push('a'.repeat(segmentLength));
    remaining -= segmentLength + 1;
  }
  segments.push('a'.repeat(remaining));
  return segments.join('/');
}

/**
 * Produce an exact-length ASCII witness that preserves sibling syntax rules.
 *
 * @param {Record<string, unknown>} schema string schema
 * @param {string} pointer schema pointer
 * @param {number} length required code-point length
 * @returns {string} exact-length witness
 */
function exactBoundaryStringValue(schema, pointer, length) {
  const canonical = stringValue(schema, pointer);
  const definition = /\/\$defs\/([^/]+)/u.exec(pointer)?.[1];
  const enumValues = Array.isArray(schema.enum)
    ? schema.enum.filter((value) => typeof value === 'string')
    : [];
  const galaMaximum =
    typeof schema['x-gala-maximum'] === 'string'
      ? schema['x-gala-maximum']
      : undefined;
  const oidcPrefix = 'https://pipelines';
  const oidcSuffix = '.actions.githubusercontent.com';
  const oidcTenantLength =
    length - oidcPrefix.length - 'gh'.length - oidcSuffix.length;
  const workflowTail =
    '/.github/workflows/gala-publish-v2.yml@refs/heads/gala/publish/019c0000-0000-7000-8000-000000000001';
  const workflowCoordinate = (() => {
    const componentLength = length - 1 - workflowTail.length;
    if (componentLength < 2 || componentLength > 139) return '';
    const ownerLength = Math.min(39, Math.max(1, componentLength - 100));
    const repositoryLength = componentLength - ownerLength;
    if (repositoryLength < 1 || repositoryLength > 100) return '';
    return `${'a'.repeat(ownerLength)}/${'a'.repeat(repositoryLength)}${workflowTail}`;
  })();
  const actionCoordinate = (() => {
    const pathLength = length - 45;
    if (pathLength < 0) return '';
    return pathLength === 0
      ? `a/a@${'0'.repeat(40)}`
      : `a/a/${segmentedAsciiPath(pathLength)}@${'0'.repeat(40)}`;
  })();
  const verificationUrl =
    length >= 10 ? `https://a/${'a'.repeat(length - 10)}` : '';
  const observedRedirectLocation = verificationUrl;
  const maximumBcp47 =
    length === 255
      ? `en-x-${Array.from({ length: 28 }, (_, index) =>
          'a'.repeat(index === 27 ? 7 : 8),
        ).join('-')}`
      : '';
  const maximumGlob =
    length === 256 ? `${'a'.repeat(128)}/${'a'.repeat(127)}` : '';
  const maximumRepositoryPath =
    length === 512
      ? [128, 128, 128, 125]
          .map((segmentLength) => 'a'.repeat(segmentLength))
          .join('/')
      : '';
  const maximumSpdxExpression =
    length === 128
      ? '(((BSD-3-Clause-No-Nuclear-License-2014 OR BSD-3-Clause-No-Nuclear-License-2014) OR BSD-2-Clause-Darwin) OR BSD-2-Clause-Darwin)'
      : '';
  const fillers = [
    ...enumValues,
    ...(galaMaximum === undefined ? [] : [galaMaximum]),
    canonical,
    actionCoordinate,
    maximumBcp47,
    maximumGlob,
    maximumRepositoryPath,
    maximumSpdxExpression,
    'a'.repeat(length),
    'A'.repeat(length),
    '1'.repeat(length),
    '0'.repeat(length),
    length === 0 ? '' : `/${'a'.repeat(Math.max(0, length - 1))}`,
    length >= 10 ? `urn:gala:${'a'.repeat(length - 9)}` : '',
    length >= 12 ? `https://${'a'.repeat(length - 12)}a.co` : '',
    length === 9 ? 'https://a' : '',
    verificationUrl,
    observedRedirectLocation,
    length >= 8 ? `http://${'a'.repeat(length - 8)}a` : '',
    length >= 3 ? `a/${'a'.repeat(length - 2)}` : '',
    length >= 3 ? `a@${'a'.repeat(length - 2)}` : '',
    length >= 7 ? `0.0.0-${'a'.repeat(length - 6)}` : '',
    length === oidcPrefix.length + oidcSuffix.length ||
    (oidcTenantLength >= 1 && oidcTenantLength <= 32)
      ? oidcTenantLength >= 1
        ? `${oidcPrefix}gh${'a'.repeat(oidcTenantLength)}${oidcSuffix}`
        : `${oidcPrefix}${oidcSuffix}`
      : '',
    length >= 44 ? `a/${'a'.repeat(length - 43)}@${'0'.repeat(40)}` : '',
  ];
  if (definition === 'digest' && length === 71) {
    fillers.unshift(`sha256:${'0'.repeat(64)}`);
  }
  if (definition === 'gitObjectId') {
    if (length === 45) fillers.unshift(`sha1:${'0'.repeat(40)}`);
    if (length === 71) fillers.unshift(`sha256:${'0'.repeat(64)}`);
  }
  if (definition === 'stableId' && length === 36) {
    fillers.unshift('019c0000-0000-7000-8000-000000000001');
  }
  if (definition === 'rfc3339' && length === 24) {
    fillers.unshift('2026-09-13T12:00:00.000Z');
  }
  if (definition === 'githubRepositoryCoordinate') {
    if (length === 3) fillers.unshift('a/a');
    if (length === 140) {
      fillers.unshift(`${'a'.repeat(39)}/${'a'.repeat(100)}`);
    }
  }
  if (definition === 'githubWorkflowRef' && workflowCoordinate !== '') {
    fillers.unshift(workflowCoordinate);
  }
  if (definition === 'spacesRegion') {
    if (length === 4) fillers.unshift('nyc3');
    if (length === 5) fillers.unshift('nyc10');
  }
  const pattern =
    typeof schema.pattern === 'string'
      ? new RegExp(schema.pattern, 'u')
      : undefined;
  const candidate = fillers.find(
    (value) =>
      value.length === length &&
      (enumValues.length === 0 || enumValues.includes(value)) &&
      (typeof schema.const !== 'string' || schema.const === value) &&
      (galaMaximum === undefined ||
        (/^[0-9]+$/u.test(value) && BigInt(value) <= BigInt(galaMaximum))) &&
      (pattern === undefined || pattern.test(value)) &&
      (typeof schema.format !== 'string' ||
        validateGalaFormat(schema.format, value)),
  );
  if (candidate !== undefined) return candidate;
  throw new TypeError(`FIXTURE_BOUNDARY_STRING_UNSYNTHESIZABLE:${pointer}`);
}

/**
 * Produce an exact valid witness at a declared string bound.
 *
 * @param {Record<string, unknown>} schema string schema
 * @param {unknown} root root schema
 * @param {string} pointer schema pointer
 * @param {number} length declared bound
 * @returns {string} exact-boundary witness
 */
function boundaryStringValue(schema, root, pointer, length) {
  const effectiveSchema = Array.isArray(schema.allOf)
    ? schema.allOf.reduce(
        (merged, entry) => {
          if (
            entry !== null &&
            typeof entry === 'object' &&
            !Array.isArray(entry) &&
            typeof entry.$ref === 'string'
          ) {
            return {
              ...merged,
              .../** @type {Record<string, unknown>} */ (
                resolvePointer(root, entry.$ref)
              ),
            };
          }
          return {
            ...merged,
            .../** @type {Record<string, unknown>} */ (entry),
          };
        },
        { ...schema },
      )
    : schema;
  return exactBoundaryStringValue(effectiveSchema, pointer, length);
}

/**
 * Produce an exact-length array witness with valid elements.
 *
 * @param {Record<string, unknown>} schema array schema
 * @param {unknown} root root schema
 * @param {string} pointer schema pointer
 * @param {number} length required item count
 * @returns {unknown[]} exact-length witness
 */
function boundaryArrayValue(schema, root, pointer, length) {
  if (Array.isArray(schema.const)) {
    if (schema.const.length !== length) {
      throw new TypeError(`FIXTURE_BOUNDARY_ARRAY_UNSYNTHESIZABLE:${pointer}`);
    }
    return clone(schema.const);
  }
  const prefixItems = Array.isArray(schema.prefixItems)
    ? schema.prefixItems
    : [];
  const value = Array.from({ length }, (_, index) => {
    const child = prefixItems[index] ?? schema.items ?? true;
    const variant = schema.uniqueItems === true ? index : 0;
    return synthesize(child, root, `${pointer}/items`, variant);
  });
  const conformed = /** @type {unknown[]} */ (
    conform(value, schema, root, pointer, 0)
  );
  if (conformed.length > length) {
    const retainedPrefix = conformed.slice(
      0,
      Math.min(prefixItems.length, length),
    );
    const tailCount = length - retainedPrefix.length;
    return [
      ...retainedPrefix,
      ...conformed.slice(
        Math.max(retainedPrefix.length, conformed.length - tailCount),
      ),
    ];
  }
  while (conformed.length < length) {
    const index = conformed.length;
    conformed.push(
      synthesize(schema.items ?? true, root, `${pointer}/items`, index),
    );
  }
  return conformed;
}

/**
 * Produce an exact-length array without applying the owner's count bounds.
 * Elements still satisfy their item schemas so the named count rule is the
 * intentional structural failure.
 *
 * @param {Record<string, unknown>} schema array schema
 * @param {unknown} root root schema
 * @param {string} pointer schema pointer
 * @param {number} length required item count
 * @returns {unknown[]} exact-length witness
 */
function arrayItemsValue(schema, root, pointer, length) {
  const prefixItems = Array.isArray(schema.prefixItems)
    ? schema.prefixItems
    : [];
  return Array.from({ length }, (_, index) => {
    const child = prefixItems[index] ?? schema.items ?? true;
    if (child === false) return null;
    const variant = schema.uniqueItems === true ? index : 0;
    return synthesize(child, root, `${pointer}/items`, variant);
  });
}

/**
 * Return a deterministic string that violates a pattern.
 *
 * @param {string} source regular-expression source
 * @param {string} pointer schema pointer for diagnostics
 * @returns {string} rejected string
 */
function invalidPatternValue(source, pointer) {
  const pattern = new RegExp(source, 'u');
  const candidates = [
    '',
    '\u0000',
    '\n\n',
    ' ',
    '!',
    'A',
    '0',
    '/',
    'https://',
    '__invalid_pattern__',
  ];
  const candidate = candidates.find((value) => !pattern.test(value));
  if (candidate !== undefined) return candidate;
  throw new TypeError(`FIXTURE_PATTERN_UNSYNTHESIZABLE:${pointer}`);
}

/**
 * Return a string that satisfies the owner's non-format siblings while the
 * named format rejects it. Undefined proves that the format is redundant with
 * those siblings for this closed schema.
 *
 * @param {Record<string, unknown>} schema string schema
 * @returns {string | undefined} isolated invalid format witness
 */
function isolatedInvalidFormatValue(schema) {
  const formatName = String(schema.format);
  /** @type {Record<string, string>} */
  const byFormat = {
    'date-time': '2026-02-31T12:00:00.000Z',
    'gala-bcp47': 'en-us',
    'gala-canonical-route': '/../x',
    'gala-extension-key': 'gala.core',
    'gala-github-action-coordinate': `a/${'a'.repeat(101)}@${'0'.repeat(40)}`,
    'gala-int64': '9223372036854775808',
    'gala-observed-redirect-location': 'https://%/',
    'gala-package-exact': 'a@latest',
    'gala-package-range': 'a@latest',
    'gala-plain-label': '<',
    'gala-plain-text': '\u0000',
    'gala-repository-glob': '../a',
    'gala-repository-relative-path': '../a',
    'gala-semver-range': 'latest',
    'gala-spdx-expression': 'NOT-A-LICENSE',
    'gala-verification-origin': 'https://%',
    'gala-verification-url': 'https://%/',
  };
  const candidates = [
    ...(formatName in byFormat
      ? [/** @type {string} */ (byFormat[formatName])]
      : []),
    '',
    'a',
    '0',
    'invalid',
    'https://%/',
  ];
  const pattern =
    typeof schema.pattern === 'string'
      ? new RegExp(schema.pattern, 'u')
      : undefined;
  const asciiBounds =
    schema['x-gala-asciiByteLength'] !== null &&
    typeof schema['x-gala-asciiByteLength'] === 'object' &&
    !Array.isArray(schema['x-gala-asciiByteLength'])
      ? /** @type {{minimum?: number, maximum?: number}} */ (
          schema['x-gala-asciiByteLength']
        )
      : undefined;
  const utf8Bounds =
    schema['x-gala-utf8ByteLength'] !== null &&
    typeof schema['x-gala-utf8ByteLength'] === 'object' &&
    !Array.isArray(schema['x-gala-utf8ByteLength'])
      ? /** @type {{minimum?: number, maximum?: number}} */ (
          schema['x-gala-utf8ByteLength']
        )
      : undefined;
  const graphemeBounds =
    schema['x-gala-graphemeLength'] !== null &&
    typeof schema['x-gala-graphemeLength'] === 'object' &&
    !Array.isArray(schema['x-gala-graphemeLength'])
      ? /** @type {{minimum?: number, maximum?: number}} */ (
          schema['x-gala-graphemeLength']
        )
      : undefined;
  return candidates.find((value) => {
    if (
      (Object.hasOwn(schema, 'const') && schema.const !== value) ||
      (Array.isArray(schema.enum) && !schema.enum.includes(value)) ||
      (typeof schema.minLength === 'number' &&
        value.length < schema.minLength) ||
      (typeof schema.maxLength === 'number' &&
        value.length > schema.maxLength) ||
      (pattern !== undefined && !pattern.test(value)) ||
      (asciiBounds !== undefined &&
        (![...value].every((character) => character.charCodeAt(0) <= 0x7f) ||
          (asciiBounds.minimum !== undefined &&
            value.length < asciiBounds.minimum) ||
          (asciiBounds.maximum !== undefined &&
            value.length > asciiBounds.maximum))) ||
      (utf8Bounds !== undefined &&
        ((utf8Bounds.minimum !== undefined &&
          Buffer.byteLength(value, 'utf8') < utf8Bounds.minimum) ||
          (utf8Bounds.maximum !== undefined &&
            Buffer.byteLength(value, 'utf8') > utf8Bounds.maximum))) ||
      (graphemeBounds !== undefined &&
        ((graphemeBounds.minimum !== undefined &&
          graphemeLength17(value) < graphemeBounds.minimum) ||
          (graphemeBounds.maximum !== undefined &&
            graphemeLength17(value) > graphemeBounds.maximum))) ||
      validateGalaFormat(formatName, value)
    ) {
      return false;
    }
    if (schema['x-gala-maximum'] !== undefined) {
      try {
        if (BigInt(value) > BigInt(String(schema['x-gala-maximum']))) {
          return false;
        }
      } catch {
        return false;
      }
    }
    return true;
  });
}

/**
 * Score how closely one union branch matches discriminators already in a value.
 * Missing required properties are intentionally neutral because conformance adds them.
 *
 * @param {unknown} value candidate value
 * @param {unknown} sourceSchema union branch
 * @param {unknown} root root schema
 * @returns {number} match score, or negative infinity for a contradicted discriminator
 */
function discriminatorScore(value, sourceSchema, root) {
  if (sourceSchema === null || typeof sourceSchema !== 'object') return 0;
  const schema = /** @type {Record<string, unknown>} */ (sourceSchema);
  if (typeof schema.$ref === 'string') {
    return discriminatorScore(value, resolvePointer(root, schema.$ref), root);
  }
  if (Array.isArray(schema.allOf)) {
    return schema.allOf.reduce((score, entry) => {
      const childScore = discriminatorScore(value, entry, root);
      return score === Number.NEGATIVE_INFINITY ||
        childScore === Number.NEGATIVE_INFINITY
        ? Number.NEGATIVE_INFINITY
        : score + childScore;
    }, 0);
  }
  let score = 0;
  if (schema.const !== undefined) {
    return JSON.stringify(value) === JSON.stringify(schema.const) ? 4 : -4;
  }
  if (Array.isArray(schema.enum)) {
    return schema.enum.includes(value) ? 2 : -2;
  }
  if (
    schema.properties !== undefined &&
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    const record = /** @type {Record<string, unknown>} */ (value);
    for (const [key, child] of Object.entries(
      /** @type {Record<string, unknown>} */ (schema.properties),
    )) {
      if (!Object.hasOwn(record, key)) continue;
      const childScore = discriminatorScore(record[key], child, root);
      const weight =
        key === 'outcome' ? 4 : key === 'type' || key.endsWith('Class') ? 2 : 1;
      score += childScore * weight;
    }
  }
  return score;
}

/**
 * Select the union branch consistent with discriminators already in a value.
 *
 * @param {unknown} value candidate value
 * @param {unknown[]} branches union branches
 * @param {unknown} root root schema
 * @param {number} variant deterministic fallback variant
 * @returns {number} selected branch index
 */
function selectBranch(value, branches, root, variant) {
  const scores = branches.map((branch) =>
    discriminatorScore(value, branch, root),
  );
  const maximum = Math.max(...scores);
  return maximum !== 0 ? scores.indexOf(maximum) : variant % branches.length;
}

/**
 * Populate the discriminator-shaped properties declared by a union branch.
 *
 * @param {unknown} sourceValue current union witness
 * @param {unknown} sourceBranch selected union branch
 * @param {unknown} root root schema
 * @param {string} pointer branch pointer
 * @param {number} variant deterministic variant
 * @returns {unknown} witness with branch selectors present
 */
function seedUnionBranch(sourceValue, sourceBranch, root, pointer, variant) {
  if (
    sourceBranch === null ||
    typeof sourceBranch !== 'object' ||
    Array.isArray(sourceBranch)
  ) {
    return sourceValue;
  }
  const branch = /** @type {Record<string, unknown>} */ (sourceBranch);
  if (typeof branch.$ref === 'string') {
    return seedUnionBranch(
      sourceValue,
      resolvePointer(root, branch.$ref),
      root,
      branch.$ref,
      variant,
    );
  }
  if (
    branch.properties === null ||
    typeof branch.properties !== 'object' ||
    Array.isArray(branch.properties)
  ) {
    return sourceValue;
  }
  const record =
    sourceValue !== null &&
    typeof sourceValue === 'object' &&
    !Array.isArray(sourceValue)
      ? /** @type {Record<string, unknown>} */ (clone(sourceValue))
      : {};
  for (const [name, child] of Object.entries(branch.properties)) {
    if (child === false || Object.hasOwn(record, name)) continue;
    record[name] = synthesize(
      child,
      root,
      `${pointer}/properties/${escapePointer(name)}`,
      variant,
    );
  }
  return record;
}

/**
 * Remove properties forbidden by boolean-false schemas in the active branch.
 *
 * @param {unknown} value witness value
 * @param {unknown} sourceSchema schema node
 * @param {unknown} root root schema
 * @returns {void}
 */
function pruneFalseSchemas(value, sourceSchema, root) {
  if (
    sourceSchema === null ||
    typeof sourceSchema !== 'object' ||
    Array.isArray(sourceSchema)
  ) {
    return;
  }
  const schema = /** @type {Record<string, unknown>} */ (sourceSchema);
  if (typeof schema.$ref === 'string') {
    pruneFalseSchemas(value, resolvePointer(root, schema.$ref), root);
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const record = /** @type {Record<string, unknown>} */ (value);
    const properties =
      schema.properties === null ||
      typeof schema.properties !== 'object' ||
      Array.isArray(schema.properties)
        ? {}
        : /** @type {Record<string, unknown>} */ (schema.properties);
    for (const [name, child] of Object.entries(properties)) {
      if (!Object.hasOwn(record, name)) continue;
      if (child === false) delete record[name];
      else pruneFalseSchemas(record[name], child, root);
    }
  }
  if (Array.isArray(value)) {
    if (Array.isArray(schema.prefixItems)) {
      schema.prefixItems.forEach((child, index) => {
        if (index < value.length) pruneFalseSchemas(value[index], child, root);
      });
    }
    if (schema.items !== undefined && schema.items !== false) {
      value.forEach((item) => pruneFalseSchemas(item, schema.items, root));
    }
  }
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    const index = selectBranch(value, schema.oneOf, root, 0);
    pruneFalseSchemas(value, schema.oneOf[index], root);
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    const index = selectBranch(value, schema.anyOf, root, 0);
    pruneFalseSchemas(value, schema.anyOf[index], root);
  }
  if (Array.isArray(schema.allOf)) {
    for (const entry of schema.allOf) {
      if (entry === null || typeof entry !== 'object') continue;
      const overlay = /** @type {Record<string, unknown>} */ (entry);
      if (overlay.if !== undefined) {
        const selected = matchesCondition(value, overlay.if, root)
          ? overlay.then
          : overlay.else;
        if (selected !== undefined) pruneFalseSchemas(value, selected, root);
      } else {
        pruneFalseSchemas(value, overlay, root);
      }
    }
  }
}

/**
 * Test the simple discriminator conditions emitted by the schema generators.
 *
 * @param {unknown} value candidate value
 * @param {unknown} condition condition schema
 * @param {unknown} root root schema
 * @returns {boolean} match result
 */
function matchesCondition(value, condition, root) {
  if (condition === true) return true;
  if (
    condition === false ||
    condition === null ||
    typeof condition !== 'object'
  ) {
    return false;
  }
  const schema = /** @type {Record<string, unknown>} */ (condition);
  if (typeof schema.$ref === 'string') {
    return matchesCondition(value, resolvePointer(root, schema.$ref), root);
  }
  if (Array.isArray(schema.allOf)) {
    return schema.allOf.every((entry) => matchesCondition(value, entry, root));
  }
  if (schema.not !== undefined && matchesCondition(value, schema.not, root)) {
    return false;
  }
  if (
    schema.type === 'object' &&
    (value === null || typeof value !== 'object' || Array.isArray(value))
  ) {
    return false;
  }
  if (schema.type === 'array' && !Array.isArray(value)) return false;
  if (schema.type === 'string' && typeof value !== 'string') return false;
  if (schema.type === 'boolean' && typeof value !== 'boolean') return false;
  if (
    (schema.type === 'integer' || schema.type === 'number') &&
    typeof value !== 'number'
  ) {
    return false;
  }
  if (schema.const !== undefined && value !== schema.const) return false;
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) return false;
  if (
    typeof schema.pattern === 'string' &&
    (typeof value !== 'string' || !new RegExp(schema.pattern, 'u').test(value))
  ) {
    return false;
  }
  if (Array.isArray(schema.required)) {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
      return false;
    if (!schema.required.every((key) => Object.hasOwn(value, String(key))))
      return false;
  }
  if (schema.properties !== undefined) {
    if (value === null || typeof value !== 'object' || Array.isArray(value))
      return false;
    const record = /** @type {Record<string, unknown>} */ (value);
    for (const [key, child] of Object.entries(
      /** @type {Record<string, unknown>} */ (schema.properties),
    )) {
      if (
        Object.hasOwn(record, key) &&
        !matchesCondition(record[key], child, root)
      ) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Produce a deterministic structurally valid witness for a schema node.
 *
 * @param {unknown} sourceSchema schema node
 * @param {unknown} root root schema
 * @param {string} pointer schema pointer
 * @param {number} [variant] deterministic enum/tuple variant
 * @returns {unknown} witness value
 */
function synthesize(sourceSchema, root, pointer, variant = 0) {
  if (sourceSchema === true) return null;
  if (sourceSchema === false) {
    throw new TypeError(`FALSE_SCHEMA_ACCEPTS_NO_INSTANCE:${pointer}`);
  }
  if (sourceSchema === null || typeof sourceSchema !== 'object') return null;
  const schema = /** @type {Record<string, unknown>} */ (sourceSchema);
  if (schema.const !== undefined) return clone(schema.const);
  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    return clone(schema.enum[variant % schema.enum.length]);
  }
  if (typeof schema.$ref === 'string') {
    return synthesize(
      resolvePointer(root, schema.$ref),
      root,
      schema.$ref,
      variant,
    );
  }
  const hasStructuralBase =
    schema.type !== undefined ||
    schema.properties !== undefined ||
    schema.required !== undefined;
  if (
    !hasStructuralBase &&
    Array.isArray(schema.oneOf) &&
    schema.oneOf.length > 0
  ) {
    const index = variant % schema.oneOf.length;
    const branch = schema.oneOf[index];
    return conform(
      seedUnionBranch({}, branch, root, `${pointer}/oneOf/${index}`, variant),
      /** @type {Record<string, unknown>} */ (branch),
      root,
      `${pointer}/oneOf/${index}`,
      variant,
    );
  }
  if (
    !hasStructuralBase &&
    Array.isArray(schema.anyOf) &&
    schema.anyOf.length > 0
  ) {
    const index = variant % schema.anyOf.length;
    const branch = schema.anyOf[index];
    return conform(
      seedUnionBranch({}, branch, root, `${pointer}/anyOf/${index}`, variant),
      /** @type {Record<string, unknown>} */ (branch),
      root,
      `${pointer}/anyOf/${index}`,
      variant,
    );
  }

  let value;
  if (
    schema.type === 'object' ||
    schema.properties !== undefined ||
    schema.required !== undefined
  ) {
    /** @type {Record<string, unknown>} */
    const record = {};
    const properties =
      schema.properties === undefined
        ? {}
        : /** @type {Record<string, unknown>} */ (schema.properties);
    for (const key of Array.isArray(schema.required) ? schema.required : []) {
      record[String(key)] = synthesize(
        properties[String(key)] ?? true,
        root,
        `${pointer}/properties/${escapePointer(String(key))}`,
        variant,
      );
    }
    value = record;
  } else if (
    schema.type === 'array' ||
    schema.items !== undefined ||
    schema.prefixItems !== undefined
  ) {
    const prefixItems = Array.isArray(schema.prefixItems)
      ? schema.prefixItems
      : [];
    value = prefixItems.map((item, index) =>
      synthesize(item, root, `${pointer}/prefixItems/${index}`, index),
    );
    const minimum = typeof schema.minItems === 'number' ? schema.minItems : 0;
    const containsMinimum = schema.contains === undefined ? 0 : 1;
    const maximum =
      typeof schema.maxItems === 'number' ? schema.maxItems : Infinity;
    const canonicalMinimum = maximum === 0 ? 0 : 1;
    const targetLength = Math.max(
      minimum,
      containsMinimum,
      canonicalMinimum,
      value.length,
    );
    while (value.length < targetLength) {
      const itemSchema = schema.items ?? schema.contains ?? true;
      value.push(
        synthesize(itemSchema, root, `${pointer}/items`, value.length),
      );
    }
    if (schema.contains !== undefined && value.length > 0) {
      value[0] = synthesize(
        schema.contains,
        root,
        `${pointer}/contains`,
        variant,
      );
    }
  } else if (schema.type === 'integer' || schema.type === 'number') {
    const minimum = typeof schema.minimum === 'number' ? schema.minimum : 0;
    const maximum =
      typeof schema.maximum === 'number' ? schema.maximum : Infinity;
    value = Number.isFinite(maximum)
      ? minimum + (variant % (maximum - minimum + 1))
      : minimum + variant;
  } else if (schema.type === 'boolean') {
    value = false;
  } else if (schema.type === 'null') {
    value = null;
  } else if (
    schema.type === 'string' ||
    schema.pattern !== undefined ||
    schema.format !== undefined
  ) {
    value = stringValue(schema, pointer, variant);
  } else if (schema.not !== undefined) {
    const negated = /** @type {Record<string, unknown>} */ (schema.not);
    value = negated.contains === undefined ? {} : [];
  } else if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    const first = schema.allOf.find(
      (entry) =>
        entry !== null &&
        typeof entry === 'object' &&
        !Object.hasOwn(/** @type {Record<string, unknown>} */ (entry), 'if'),
    );
    value = synthesize(first ?? true, root, `${pointer}/allOf/0`, variant);
  } else {
    value = null;
  }
  const conformed = conform(value, schema, root, pointer, variant);
  pruneFalseSchemas(conformed, schema, root);
  return conformed;
}

/**
 * Apply direct object properties and closed-object semantics.
 *
 * @param {Record<string, unknown>} record witness object
 * @param {Record<string, unknown>} schema schema node
 * @param {unknown} root root schema
 * @param {string} pointer schema pointer
 * @param {number} variant deterministic variant
 * @param {boolean} addRequired whether to synthesize absent required members
 * @param {boolean} [onlyNull] whether to conform only null child placeholders
 * @param {Record<string, unknown>} [structuralContext] owning base schema
 * @returns {void}
 */
function conformObject(
  record,
  schema,
  root,
  pointer,
  variant,
  addRequired,
  onlyNull = false,
  structuralContext = schema,
) {
  const directProperties =
    schema.properties === undefined
      ? {}
      : /** @type {Record<string, unknown>} */ (schema.properties);
  const contextProperties =
    structuralContext.properties === null ||
    typeof structuralContext.properties !== 'object' ||
    Array.isArray(structuralContext.properties)
      ? {}
      : /** @type {Record<string, unknown>} */ (structuralContext.properties);
  const properties = onlyNull
    ? { ...contextProperties, ...directProperties }
    : directProperties;
  if (addRequired) {
    for (const key of Array.isArray(schema.required) ? schema.required : []) {
      const name = String(key);
      if (!Object.hasOwn(record, name)) {
        record[name] = synthesize(
          properties[name] ?? true,
          root,
          `${pointer}/properties/${escapePointer(name)}`,
          variant,
        );
      }
    }
  }
  for (const [key, child] of Object.entries(properties)) {
    if (!Object.hasOwn(record, key)) continue;
    if (child === false) {
      delete record[key];
      continue;
    }
    if (onlyNull && record[key] !== null) continue;
    const contextChild = contextProperties[key];
    let effectiveChild = child;
    const childSchema = /** @type {Record<string, unknown>} */ (child);
    const contextChildSchema = /** @type {Record<string, unknown>} */ (
      contextChild
    );
    if (
      child !== null &&
      typeof child === 'object' &&
      !Array.isArray(child) &&
      childSchema.items !== undefined &&
      contextChild !== null &&
      typeof contextChild === 'object' &&
      !Array.isArray(contextChild) &&
      contextChildSchema.items !== undefined
    ) {
      effectiveChild = {
        ...contextChildSchema,
        ...childSchema,
        items: { allOf: [childSchema.items, contextChildSchema.items] },
      };
    } else if (
      child !== null &&
      typeof child === 'object' &&
      !Array.isArray(child) &&
      childSchema.contains !== undefined &&
      childSchema.items === undefined &&
      contextChild !== null &&
      typeof contextChild === 'object' &&
      !Array.isArray(contextChild) &&
      contextChildSchema.items !== undefined
    ) {
      effectiveChild = { ...contextChildSchema, ...childSchema };
    }
    record[key] = conform(
      record[key],
      /** @type {Record<string, unknown>} */ (effectiveChild),
      root,
      `${pointer}/properties/${escapePointer(key)}`,
      variant,
      /** @type {Record<string, unknown>} */ (contextChild ?? effectiveChild),
    );
  }
  if (schema.additionalProperties !== false) return;
  const patterns = Object.keys(
    schema.patternProperties === null ||
      typeof schema.patternProperties !== 'object'
      ? {}
      : /** @type {Record<string, unknown>} */ (schema.patternProperties),
  ).map((pattern) => new RegExp(pattern, 'u'));
  for (const key of Object.keys(record)) {
    if (
      !Object.hasOwn(properties, key) &&
      !patterns.some((pattern) => pattern.test(key))
    ) {
      delete record[key];
    }
  }
}

/**
 * Conform a witness to overlays and generator-emitted conditionals.
 *
 * @param {unknown} sourceValue current witness
 * @param {Record<string, unknown>} schema schema node
 * @param {unknown} root root schema
 * @param {string} pointer schema pointer
 * @param {number} variant deterministic variant
 * @param {Record<string, unknown>} [structuralContext] owning base schema
 * @returns {unknown} conformed witness
 */
function conform(
  sourceValue,
  schema,
  root,
  pointer,
  variant,
  structuralContext = schema,
) {
  let value = clone(sourceValue);
  if (typeof schema.$ref === 'string') {
    value = conform(
      value,
      /** @type {Record<string, unknown>} */ (
        resolvePointer(root, schema.$ref)
      ),
      root,
      schema.$ref,
      variant,
      /** @type {Record<string, unknown>} */ (
        resolvePointer(root, schema.$ref)
      ),
    );
  }
  if (schema.const !== undefined) return clone(schema.const);
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    value = clone(schema.enum[variant % schema.enum.length]);
  }
  if (schema.type === 'string' && typeof value !== 'string') {
    value = stringValue(schema, pointer, variant);
  } else if (
    (schema.type === 'integer' || schema.type === 'number') &&
    typeof value !== 'number'
  ) {
    value = typeof schema.minimum === 'number' ? schema.minimum : 0;
  } else if (schema.type === 'boolean' && typeof value !== 'boolean') {
    value = false;
  } else if (schema.type === 'array' && !Array.isArray(value)) {
    value = [];
  } else if (
    schema.type === 'object' &&
    (value === null || typeof value !== 'object' || Array.isArray(value))
  ) {
    value = {};
  } else if (schema.type === 'null' && value !== null) {
    value = null;
  }
  if (
    typeof value === 'string' &&
    ((typeof schema.pattern === 'string' &&
      !new RegExp(schema.pattern, 'u').test(value)) ||
      (typeof schema.format === 'string' &&
        !validateGalaFormat(schema.format, value)) ||
      (typeof schema.minLength === 'number' &&
        value.length < schema.minLength) ||
      (typeof schema.maxLength === 'number' && value.length > schema.maxLength))
  ) {
    value = stringValue(schema, pointer, variant);
  }
  if (typeof value === 'number') {
    let numericValue = value;
    if (typeof schema.minimum === 'number' && numericValue < schema.minimum)
      numericValue = schema.minimum;
    if (typeof schema.maximum === 'number' && numericValue > schema.maximum)
      numericValue = schema.maximum;
    value = numericValue;
  }
  if (Array.isArray(value)) {
    let arrayValue = value;
    if (Array.isArray(schema.prefixItems)) {
      for (const [index, child] of schema.prefixItems.entries()) {
        if (index >= arrayValue.length) {
          arrayValue.push(
            synthesize(child, root, `${pointer}/prefixItems/${index}`, index),
          );
        } else {
          arrayValue[index] = conform(
            arrayValue[index],
            /** @type {Record<string, unknown>} */ (child),
            root,
            `${pointer}/prefixItems/${index}`,
            index,
          );
        }
      }
    }
    if (schema.items !== undefined) {
      arrayValue = arrayValue.map((item, index) =>
        conform(
          item,
          /** @type {Record<string, unknown>} */ (schema.items),
          root,
          `${pointer}/items`,
          index,
        ),
      );
    }
    const minimum = typeof schema.minItems === 'number' ? schema.minItems : 0;
    while (arrayValue.length < minimum) {
      arrayValue.push(
        synthesize(
          schema.items ?? schema.contains ?? true,
          root,
          `${pointer}/items`,
          arrayValue.length,
        ),
      );
    }
    if (typeof schema.maxItems === 'number')
      arrayValue = arrayValue.slice(0, schema.maxItems);
    if (schema.contains !== undefined) {
      if (
        !arrayValue.some((item) =>
          matchesCondition(item, schema.contains, root),
        )
      ) {
        let contained = synthesize(
          schema.contains,
          root,
          `${pointer}/contains`,
          variant,
        );
        contained = seedUnionBranch(
          contained,
          schema.contains,
          root,
          `${pointer}/contains`,
          variant,
        );
        if (schema.items !== undefined && schema.items !== false) {
          contained = conform(
            contained,
            /** @type {Record<string, unknown>} */ (schema.items),
            root,
            `${pointer}/items`,
            variant,
          );
          contained = conform(
            contained,
            /** @type {Record<string, unknown>} */ (schema.contains),
            root,
            `${pointer}/contains`,
            variant,
          );
        }
        arrayValue.push(contained);
      }
    }
    if (schema.uniqueItems === true) {
      const seen = new Set();
      arrayValue = arrayValue.map((item, index) => {
        let candidate = item;
        let candidateVariant = index;
        let attempts = 0;
        while (seen.has(JSON.stringify(candidate))) {
          attempts += 1;
          if (attempts > 1_024) {
            throw new TypeError(
              `FIXTURE_UNIQUE_ITEMS_UNSYNTHESIZABLE:${pointer}`,
            );
          }
          candidateVariant += arrayValue.length;
          candidate = synthesize(
            schema.items ?? true,
            root,
            `${pointer}/items`,
            candidateVariant,
          );
        }
        seen.add(JSON.stringify(candidate));
        return candidate;
      });
    }
    value = arrayValue;
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    conformObject(
      /** @type {Record<string, unknown>} */ (value),
      schema,
      root,
      pointer,
      variant,
      true,
      false,
      structuralContext,
    );
  }
  if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
    const index = selectBranch(value, schema.oneOf, root, variant);
    value = seedUnionBranch(
      value,
      schema.oneOf[index],
      root,
      `${pointer}/oneOf/${index}`,
      variant,
    );
    value = conform(
      value,
      /** @type {Record<string, unknown>} */ (schema.oneOf[index]),
      root,
      `${pointer}/oneOf/${index}`,
      variant,
      structuralContext,
    );
    pruneFalseSchemas(value, schema.oneOf[index], root);
  }
  if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
    const index = selectBranch(value, schema.anyOf, root, variant);
    value = seedUnionBranch(
      value,
      schema.anyOf[index],
      root,
      `${pointer}/anyOf/${index}`,
      variant,
    );
    value = conform(
      value,
      /** @type {Record<string, unknown>} */ (schema.anyOf[index]),
      root,
      `${pointer}/anyOf/${index}`,
      variant,
      structuralContext,
    );
    pruneFalseSchemas(value, schema.anyOf[index], root);
  }
  if (Array.isArray(schema.allOf)) {
    for (const [index, entry] of schema.allOf.entries()) {
      if (entry === null || typeof entry !== 'object') continue;
      const overlay = /** @type {Record<string, unknown>} */ (entry);
      if (overlay.if !== undefined) {
        const selected = matchesCondition(value, overlay.if, root)
          ? overlay.then
          : overlay.else;
        if (selected !== undefined && selected !== false) {
          value = conform(
            value,
            /** @type {Record<string, unknown>} */ (selected),
            root,
            `${pointer}/allOf/${index}`,
            variant,
            structuralContext,
          );
        }
      } else if (overlay.not === undefined) {
        const effectiveOverlay =
          Array.isArray(value) &&
          overlay.contains !== undefined &&
          overlay.items === undefined &&
          schema.items !== undefined
            ? { ...overlay, items: schema.items }
            : overlay;
        if (typeof overlay.$ref === 'string') {
          value = conform(
            value,
            /** @type {Record<string, unknown>} */ (
              resolvePointer(root, overlay.$ref)
            ),
            root,
            overlay.$ref,
            variant,
            structuralContext,
          );
        }
        value = conform(
          value,
          effectiveOverlay,
          root,
          `${pointer}/allOf/${index}`,
          variant,
          structuralContext,
        );
      }
    }
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    conformObject(
      /** @type {Record<string, unknown>} */ (value),
      schema,
      root,
      pointer,
      variant,
      false,
      true,
      structuralContext,
    );
  }
  return value;
}

/**
 * Walk every executable rule in one root schema.
 *
 * @param {string} contract contract name
 * @param {unknown} schema root schema
 * @returns {Array<Record<string, unknown>>} sorted rule descriptors
 */
function collectRules(contract, schema) {
  /** @type {Array<Record<string, unknown>>} */
  const rules = [];
  /** @type {Set<string>} */
  const seen = new Set();

  /**
   * Visit one schema node.
   *
   * @param {unknown} node schema node
   * @param {string} pointer schema pointer
   * @param {string} closedPointer nearest closed-object pointer
   * @returns {void}
   */
  function visit(node, pointer, closedPointer) {
    if (node === false) {
      rules.push({
        contract,
        ruleId: `${contract}:${pointer}:false`,
        schemaPointer: pointer,
        keyword: 'false',
        ruleValue: false,
        unknownPointer: closedPointer,
      });
      return;
    }
    if (node === null || typeof node !== 'object' || Array.isArray(node))
      return;
    if (seen.has(pointer)) return;
    seen.add(pointer);
    const record = /** @type {Record<string, unknown>} */ (node);
    const nextClosed =
      record.additionalProperties === false ? pointer : closedPointer;
    for (const keyword of [...RULE_KEYWORDS].sort()) {
      if (!Object.hasOwn(record, keyword)) continue;
      if (keyword === 'additionalProperties' && record[keyword] !== false)
        continue;
      if (keyword === 'required') {
        for (const name of /** @type {unknown[]} */ (record.required)) {
          rules.push({
            contract,
            ruleId: `${contract}:${pointer}:required:${String(name)}`,
            schemaPointer: pointer,
            keyword,
            requiredName: String(name),
            ruleValue: [String(name)],
            unknownPointer: nextClosed,
          });
        }
        continue;
      }
      rules.push({
        contract,
        ruleId: `${contract}:${pointer}:${keyword}`,
        schemaPointer: pointer,
        keyword,
        ruleValue: clone(record[keyword]),
        unknownPointer: nextClosed,
      });
    }
    const childMaps = ['$defs', 'properties', 'patternProperties'];
    for (const childMap of childMaps) {
      const entries = record[childMap];
      if (
        entries === null ||
        typeof entries !== 'object' ||
        Array.isArray(entries)
      )
        continue;
      for (const [name, child] of Object.entries(entries).sort(
        ([left], [right]) => left.localeCompare(right),
      )) {
        visit(
          child,
          `${pointer}/${childMap}/${escapePointer(name)}`,
          nextClosed,
        );
      }
    }
    for (const childName of [
      'additionalProperties',
      'contains',
      'else',
      'if',
      'items',
      'not',
      'then',
    ]) {
      const child = record[childName];
      if (child !== undefined && child !== true && child !== false) {
        visit(child, `${pointer}/${childName}`, nextClosed);
      }
    }
    for (const childName of ['allOf', 'anyOf', 'oneOf', 'prefixItems']) {
      const children = record[childName];
      if (!Array.isArray(children)) continue;
      children.forEach((child, index) =>
        visit(child, `${pointer}/${childName}/${index}`, nextClosed),
      );
    }
  }

  visit(schema, '#', '#');
  return rules.sort((left, right) =>
    String(left.ruleId).localeCompare(String(right.ruleId)),
  );
}

/**
 * Return the stable diagnostic for one schema rule.
 *
 * @param {Record<string, unknown>} rule rule descriptor
 * @returns {string} stable diagnostic code
 */
function diagnosticCode(rule) {
  const definition = /#\/\$defs\/([^/]+)/u.exec(
    String(rule.schemaPointer),
  )?.[1];
  if (definition !== undefined && definition in SCALAR_CODES)
    return /** @type {string} */ (
      /** @type {Record<string, string>} */ (SCALAR_CODES)[definition]
    );
  if (
    rule.keyword === 'const' &&
    (String(rule.schemaPointer).endsWith('/properties/schemaVersion') ||
      String(rule.schemaPointer).endsWith('/properties/schemaId'))
  ) {
    return 'SCHEMA_VERSION_UNSUPPORTED';
  }
  if (rule.keyword === 'false') {
    return String(rule.schemaPointer) === '#/$defs/passiveVisualToken'
      ? 'PASSIVE_VISUAL_TOKEN_INVALID'
      : 'REQUEST_FIELD_UNKNOWN';
  }
  return (
    /** @type {Record<string, string>} */ (KEYWORD_CODES)[
      String(rule.keyword)
    ] ?? 'SCHEMA_RULE_INVALID'
  );
}

/**
 * Describe one literal or bounded-size fixture value.
 *
 * @param {unknown} value literal value
 * @returns {{instance: unknown}} literal descriptor
 */
function literal(value) {
  return { instance: value };
}

/**
 * Build a valid or exact-boundary witness for one rule.
 *
 * @param {Record<string, unknown>} rule rule descriptor
 * @param {unknown} root root schema
 * @param {boolean} boundary whether to select the named boundary
 * @returns {Record<string, unknown>} fixture materialization
 */
function acceptedCase(rule, root, boundary) {
  const owner = resolvePointer(root, String(rule.schemaPointer));
  if (owner === false)
    return { notApplicable: 'FALSE_SCHEMA_ACCEPTS_NO_INSTANCE' };
  const value = synthesize(owner, root, String(rule.schemaPointer));
  if (!boundary) return literal(value);
  const keyword = String(rule.keyword);
  const ruleValue = rule.ruleValue;
  if (keyword === 'minimum' || keyword === 'maximum') return literal(ruleValue);
  if (keyword === 'minLength' || keyword === 'maxLength') {
    try {
      boundaryStringValue(
        /** @type {Record<string, unknown>} */ (owner),
        root,
        String(rule.schemaPointer),
        Number(ruleValue),
      );
    } catch (error) {
      if (
        error instanceof TypeError &&
        error.message.startsWith('FIXTURE_BOUNDARY_STRING_UNSYNTHESIZABLE:') &&
        CLOSED_STRING_BOUNDARY_EXCLUSIONS.has(
          `${String(rule.schemaPointer)}:${keyword}`,
        )
      ) {
        return {
          notApplicable: 'STRING_DOMAIN_EXCLUDES_DECLARED_BOUNDARY',
        };
      }
      throw error;
    }
    return {
      recipe: {
        kind: 'schema-string-boundary',
        schemaPointer: rule.schemaPointer,
        length: Number(ruleValue),
        direction: keyword === 'minLength' ? 'minimum' : 'maximum',
      },
    };
  }
  if (keyword === 'minItems' || keyword === 'maxItems') {
    const ownerRecord = /** @type {Record<string, unknown>} */ (owner);
    const itemValue = ownerRecord.items;
    const itemRecord =
      itemValue !== null &&
      typeof itemValue === 'object' &&
      !Array.isArray(itemValue)
        ? /** @type {Record<string, unknown>} */ (itemValue)
        : undefined;
    const itemReference =
      typeof itemRecord?.$ref === 'string' ? itemRecord.$ref : undefined;
    const itemSchemaValue =
      itemReference === undefined
        ? undefined
        : resolvePointer(root, itemReference);
    const itemSchema =
      itemSchemaValue !== null &&
      typeof itemSchemaValue === 'object' &&
      !Array.isArray(itemSchemaValue)
        ? /** @type {Record<string, unknown>} */ (itemSchemaValue)
        : undefined;
    const itemPropertiesValue = itemSchema?.properties;
    const itemPropertySchemas =
      itemPropertiesValue !== null &&
      typeof itemPropertiesValue === 'object' &&
      !Array.isArray(itemPropertiesValue)
        ? /** @type {Record<string, unknown>} */ (itemPropertiesValue)
        : {};
    const itemProperties =
      itemSchema === undefined ? [] : Object.keys(itemPropertySchemas);
    const itemBranches = Array.isArray(itemSchema?.oneOf)
      ? itemSchema.oneOf
      : [];
    const hasFiniteSingletonItemDomain =
      ownerRecord.uniqueItems === true &&
      itemSchema !== undefined &&
      itemSchema.additionalProperties === false &&
      itemProperties.length > 0 &&
      itemBranches.length > 0 &&
      itemBranches.every((branch) => {
        if (
          branch === null ||
          typeof branch !== 'object' ||
          Array.isArray(branch)
        ) {
          return false;
        }
        const branchPropertiesValue = branch.properties;
        if (
          branchPropertiesValue === null ||
          typeof branchPropertiesValue !== 'object' ||
          Array.isArray(branchPropertiesValue)
        ) {
          return false;
        }
        const branchProperties = /** @type {Record<string, unknown>} */ (
          branchPropertiesValue
        );
        return itemProperties.every((name) => {
          const property = branchProperties[name];
          return (
            property !== null &&
            typeof property === 'object' &&
            !Array.isArray(property) &&
            Object.hasOwn(property, 'const')
          );
        });
      });
    if (
      keyword === 'maxItems' &&
      hasFiniteSingletonItemDomain &&
      Number(ruleValue) > itemBranches.length
    ) {
      return {
        notApplicable: 'FINITE_UNIQUE_ITEM_DOMAIN_BELOW_BOUNDARY',
      };
    }
    return {
      recipe: {
        kind: 'schema-array-boundary',
        schemaPointer: rule.schemaPointer,
        length: Number(ruleValue),
      },
    };
  }
  if (keyword === 'minProperties' || keyword === 'maxProperties') {
    return {
      recipe: {
        kind: 'numbered-object',
        schemaPointer: rule.schemaPointer,
        count: Number(ruleValue),
      },
    };
  }
  const customBound =
    ruleValue !== null && typeof ruleValue === 'object'
      ? /** @type {Record<string, unknown>} */ (ruleValue)
      : undefined;
  if (
    customBound !== undefined &&
    (typeof customBound.maximum === 'number' ||
      typeof customBound.minimum === 'number')
  ) {
    const count = Number(customBound.maximum ?? customBound.minimum);
    try {
      boundaryStringValue(
        /** @type {Record<string, unknown>} */ (owner),
        root,
        String(rule.schemaPointer),
        count,
      );
    } catch (error) {
      if (
        error instanceof TypeError &&
        error.message.startsWith('FIXTURE_BOUNDARY_STRING_UNSYNTHESIZABLE:') &&
        CLOSED_STRING_BOUNDARY_EXCLUSIONS.has(
          `${String(rule.schemaPointer)}:${keyword}`,
        )
      ) {
        return {
          notApplicable: 'STRING_DOMAIN_EXCLUDES_DECLARED_BOUNDARY',
        };
      }
      throw error;
    }
    return {
      recipe: {
        kind: 'schema-string-boundary',
        schemaPointer: rule.schemaPointer,
        length: count,
        direction:
          typeof customBound.maximum === 'number' ? 'maximum' : 'minimum',
      },
    };
  }
  if (
    keyword === 'x-gala-maximum' &&
    (typeof ruleValue === 'number' || typeof ruleValue === 'string')
  ) {
    return literal(ruleValue);
  }
  return literal(value);
}

/**
 * Build a witness that violates the named rule.
 *
 * @param {Record<string, unknown>} rule rule descriptor
 * @param {unknown} root root schema
 * @returns {Record<string, unknown>} fixture materialization or non-applicability
 */
function rejectedCase(rule, root) {
  const owner = resolvePointer(root, String(rule.schemaPointer));
  const keyword = String(rule.keyword);
  if (keyword === 'false') {
    if (String(rule.schemaPointer) === '#/$defs/passiveVisualToken') {
      return literal(null);
    }
    const propertyMatch = /^(.*)\/properties\/([^/]+)$/u.exec(
      String(rule.schemaPointer),
    );
    if (propertyMatch === null) {
      throw new TypeError(
        `FIXTURE_FALSE_CONTEXT_INVALID:${rule.schemaPointer}`,
      );
    }
    const parentPointer = String(propertyMatch[1]);
    const property = String(propertyMatch[2])
      .replaceAll('~1', '/')
      .replaceAll('~0', '~');
    const parent = /** @type {Record<string, unknown>} */ (
      synthesize(resolvePointer(root, parentPointer), root, parentPointer)
    );
    parent[property] = null;
    return { instance: parent, validationPointer: parentPointer };
  }
  const value = synthesize(owner, root, String(rule.schemaPointer));
  if (keyword === 'type') {
    const type = rule.ruleValue;
    return literal(type === 'object' ? [] : type === 'array' ? {} : null);
  }
  if (keyword === 'const') {
    const expected = rule.ruleValue;
    return literal(typeof expected === 'string' ? `${expected}-invalid` : null);
  }
  if (keyword === 'enum') return literal('__invalid_enum__');
  if (keyword === 'required') {
    const copy = /** @type {Record<string, unknown>} */ (clone(value));
    delete copy[String(rule.requiredName)];
    return literal(copy);
  }
  if (keyword === 'additionalProperties') {
    return literal({
      .../** @type {Record<string, unknown>} */ (value),
      unexpected: true,
    });
  }
  if (keyword === 'minimum') return literal(Number(rule.ruleValue) - 1);
  if (keyword === 'maximum') return literal(Number(rule.ruleValue) + 1);
  if (
    keyword === 'minLength' ||
    keyword === 'minItems' ||
    keyword === 'minProperties'
  ) {
    const minimum = Number(rule.ruleValue);
    if (minimum === 0)
      return { notApplicable: 'ZERO_LOWER_BOUND_REJECTS_NO_INSTANCE' };
    if (keyword === 'minLength') return literal('a'.repeat(minimum - 1));
    if (keyword === 'minItems') {
      return {
        recipe: {
          kind: 'schema-array-count',
          schemaPointer: rule.schemaPointer,
          length: minimum - 1,
        },
      };
    }
    return literal(
      Object.fromEntries(
        Array.from({ length: minimum - 1 }, (_, index) => [`p${index}`, null]),
      ),
    );
  }
  if (keyword === 'maxLength') {
    return {
      recipe: {
        kind: 'repeat-string',
        value: 'a',
        count: Number(rule.ruleValue) + 1,
      },
    };
  }
  if (keyword === 'maxItems') {
    return {
      recipe: {
        kind: 'schema-array-count',
        schemaPointer: rule.schemaPointer,
        length: Number(rule.ruleValue) + 1,
      },
    };
  }
  if (keyword === 'maxProperties') {
    return {
      recipe: {
        kind: 'numbered-object',
        schemaPointer: rule.schemaPointer,
        count: Number(rule.ruleValue) + 1,
      },
    };
  }
  if (keyword === 'uniqueItems') return literal([null, null]);
  if (keyword === 'pattern') {
    return literal(
      invalidPatternValue(String(rule.ruleValue), String(rule.schemaPointer)),
    );
  }
  if (keyword === 'format') {
    const ownerSchema = /** @type {Record<string, unknown>} */ (owner);
    const invalidValue = isolatedInvalidFormatValue(ownerSchema);
    return invalidValue === undefined
      ? { notApplicable: 'FORMAT_REDUNDANT_WITH_SIBLING_RULES' }
      : literal(invalidValue);
  }
  if (keyword === 'dependentRequired') {
    const dependencies = /** @type {Record<string, unknown[]>} */ (
      rule.ruleValue
    );
    const trigger = Object.keys(dependencies).sort()[0];
    return literal(trigger === undefined ? {} : { [trigger]: null });
  }
  if (keyword === 'contains') return literal([]);
  if (keyword === 'not')
    return literal(
      synthesize(rule.ruleValue, root, `${rule.schemaPointer}/not`),
    );
  if (keyword === 'oneOf') return literal({ outcome: '__invalid_union__' });
  if (keyword === 'anyOf') return literal({});
  if (keyword.startsWith('x-gala-')) {
    if (keyword === 'x-gala-maxCanonicalBytes') {
      return {
        recipe: {
          kind: 'repeat-string',
          value: 'a',
          count: Number(rule.ruleValue) + 1,
        },
      };
    }
    if (
      keyword === 'x-gala-maximum' &&
      (typeof rule.ruleValue === 'number' || typeof rule.ruleValue === 'string')
    ) {
      return literal((BigInt(rule.ruleValue) + 1n).toString());
    }
    if (typeof rule.ruleValue === 'number') {
      return literal(rule.ruleValue + 1);
    }
    const bound = /** @type {Record<string, number>} */ (rule.ruleValue);
    return {
      recipe: {
        kind: 'repeat-string',
        value: 'a',
        count: Number(bound.maximum ?? 0) + 1,
      },
    };
  }
  return literal(null);
}

/**
 * Add a case once and return its manifest reference.
 *
 * @param {Map<string, Array<Record<string, unknown>>>} files cases grouped by file
 * @param {string} file output file
 * @param {string} caseId case identity
 * @param {Record<string, unknown>} data case data
 * @param {string} [expectedCode] expected invalid code
 * @returns {Record<string, unknown>} manifest coverage reference
 */
function addCase(files, file, caseId, data, expectedCode) {
  if (!files.has(file)) files.set(file, []);
  const cases = /** @type {Array<Record<string, unknown>>} */ (files.get(file));
  const existing = cases.find((entry) => entry.caseId === caseId);
  if (existing === undefined) {
    cases.push({
      caseId,
      ...data,
      ...(expectedCode === undefined ? {} : { expectedCodes: [expectedCode] }),
    });
  } else if (Array.isArray(data.coveredRuleIds)) {
    existing.coveredRuleIds = [
      ...new Set([
        .../** @type {string[]} */ (existing.coveredRuleIds),
        .../** @type {string[]} */ (data.coveredRuleIds),
      ]),
    ].sort();
  }
  return {
    file,
    caseId,
    ...(expectedCode === undefined ? {} : { expectedCode }),
  };
}

/**
 * Replace a very large deterministic witness with an equivalent recipe.
 *
 * @param {Record<string, unknown>} materialization literal or recipe
 * @param {string} schemaPointer witness owner
 * @param {Record<string, unknown>} [mutation] deterministic post-synthesis mutation
 * @returns {Record<string, unknown>} compact fixture materialization
 */
function compactWitness(materialization, schemaPointer, mutation) {
  if (
    materialization.instance === undefined ||
    JSON.stringify(materialization.instance).length <= 16_384
  ) {
    return materialization;
  }
  return {
    ...(materialization.validationPointer === undefined
      ? {}
      : { validationPointer: materialization.validationPointer }),
    recipe: {
      kind: 'schema-witness',
      schemaPointer,
      variant: 0,
      ...(mutation === undefined ? {} : { mutation }),
    },
  };
}

/**
 * Materialize one literal or version-1 fixture recipe.
 *
 * @param {Record<string, unknown>} fixture fixture case
 * @param {unknown} root owning root schema
 * @returns {unknown} materialized instance
 */
export function materializeFixture(fixture, root) {
  if (Object.hasOwn(fixture, 'instance')) return clone(fixture.instance);
  const recipe = /** @type {Record<string, unknown>} */ (fixture.recipe);
  if (recipe === null || typeof recipe !== 'object') {
    throw new TypeError('FIXTURE_RECIPE_INVALID');
  }
  if (recipe.kind === 'repeat-string') {
    return String(recipe.value).repeat(Number(recipe.count));
  }
  if (recipe.kind === 'repeat-array') {
    return Array.from({ length: Number(recipe.count) }, () =>
      clone(recipe.value),
    );
  }
  if (recipe.kind === 'numbered-object') {
    const schemaPointer = String(recipe.schemaPointer);
    const schema = /** @type {Record<string, unknown>} */ (
      resolvePointer(root, schemaPointer)
    );
    return Object.fromEntries(
      Array.from({ length: Number(recipe.count) }, (_, index) => [
        schema.propertyNames === undefined
          ? `p${index}`
          : String(
              synthesize(
                schema.propertyNames,
                root,
                `${schemaPointer}/propertyNames`,
                index,
              ),
            ),
        null,
      ]),
    );
  }
  if (recipe.kind === 'schema-string-boundary') {
    const schemaPointer = String(recipe.schemaPointer);
    return boundaryStringValue(
      /** @type {Record<string, unknown>} */ (
        resolvePointer(root, schemaPointer)
      ),
      root,
      schemaPointer,
      Number(recipe.length),
    );
  }
  if (recipe.kind === 'schema-array-boundary') {
    const schemaPointer = String(recipe.schemaPointer);
    return boundaryArrayValue(
      /** @type {Record<string, unknown>} */ (
        resolvePointer(root, schemaPointer)
      ),
      root,
      schemaPointer,
      Number(recipe.length),
    );
  }
  if (recipe.kind === 'schema-array-count') {
    const schemaPointer = String(recipe.schemaPointer);
    return arrayItemsValue(
      /** @type {Record<string, unknown>} */ (
        resolvePointer(root, schemaPointer)
      ),
      root,
      schemaPointer,
      Number(recipe.length),
    );
  }
  if (recipe.kind !== 'schema-witness') {
    throw new TypeError('FIXTURE_RECIPE_INVALID');
  }
  const schemaPointer = String(recipe.schemaPointer);
  let value = synthesize(
    resolvePointer(root, schemaPointer),
    root,
    schemaPointer,
    Number(recipe.variant),
  );
  if (recipe.mutation === undefined) return value;
  const mutation = /** @type {Record<string, unknown>} */ (recipe.mutation);
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('FIXTURE_MUTATION_TARGET_INVALID');
  }
  if (mutation.kind === 'delete-property') {
    delete (
      /** @type {Record<string, unknown>} */ (value)[String(mutation.property)]
    );
    return value;
  }
  if (mutation.kind === 'add-property') {
    /** @type {Record<string, unknown>} */ (value)[String(mutation.property)] =
      clone(mutation.value);
    return value;
  }
  throw new TypeError('FIXTURE_MUTATION_INVALID');
}

/**
 * Recursively enumerate files under a generated root.
 *
 * @param {string} directory directory to walk
 * @returns {Promise<string[]>} repository-relative file paths
 */
async function listFiles(directory) {
  /** @type {string[]} */
  const files = [];
  /**
   * Visit one directory.
   *
   * @param {string} current directory path
   * @returns {Promise<void>} completion
   */
  async function visit(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT')
        return;
      throw error;
    }
    for (const entry of entries.sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(target);
      else files.push(target.split(path.sep).join('/'));
    }
  }
  await visit(directory);
  return files;
}

/**
 * Build one closed public structural fixture case.
 *
 * @param {string} caseId stable case identity
 * @param {Record<string, unknown>} instance complete registered document
 * @param {Array<{code: string, instancePointer: string}>} expectedDiagnostics exact public validator result
 * @returns {Record<string, unknown>} fixture case
 */
function s2Case(caseId, instance, expectedDiagnostics = []) {
  return {
    caseId,
    schemaId: instance.schemaId,
    instance,
    expectedDiagnostics,
  };
}

/**
 * Require one object value while constructing the closed S2 corpus.
 *
 * @param {unknown} value candidate object
 * @param {string} code stable generator failure code
 * @returns {Record<string, unknown>} required object
 */
function requireS2Record(value, code) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(code);
  }
  return /** @type {Record<string, unknown>} */ (value);
}

/**
 * Require the first object in one canonical array.
 *
 * @param {unknown} value candidate array
 * @param {string} code stable generator failure code
 * @returns {Record<string, unknown>} first object
 */
function firstS2Record(value, code) {
  if (!Array.isArray(value)) throw new TypeError(code);
  return requireS2Record(value[0], code);
}

/**
 * Add the separate S2 consumer corpus without changing the legacy corpus.
 * Semantic contexts remain internal and are referenced by exact existing test
 * names instead of being serialized as a new public fixture format.
 *
 * @param {Map<string, unknown>} outputs generated files
 * @param {Map<string, unknown>} schemas registered schemas by contract
 * @param {Map<string, Record<string, unknown>>} canonicalDocuments cloned canonical documents by contract
 * @returns {void}
 */
function addS2Corpus(outputs, schemas, canonicalDocuments) {
  /** @type {(contract: string) => Record<string, unknown>} */
  const canonical = (contract) => {
    const document = canonicalDocuments.get(contract);
    if (document === undefined) {
      throw new TypeError(`S2_CANONICAL_DOCUMENT_ABSENT:${contract}`);
    }
    return clone(document);
  };
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const families = new Map();

  const composition = canonical('template-composition');
  const compositionUnknown = canonical('template-composition');
  compositionUnknown.newsletter = {};
  families.set('discriminator-only-composition', [
    s2Case('composition-valid-discriminator-only', composition),
    s2Case('composition-rejects-unknown-field', compositionUnknown, [
      { code: 'REQUEST_FIELD_UNKNOWN', instancePointer: '/newsletter' },
    ]),
  ]);

  const emptyBuildInput = canonical('build-input');
  const nonemptyModules = canonical('build-input');
  nonemptyModules.modules = { unexpected: {} };
  const nonemptyPlacements = canonical('build-input');
  nonemptyPlacements.placements = [{}];
  families.set('empty-modules-placements', [
    s2Case('build-input-valid-empty-modules-placements', emptyBuildInput),
    s2Case('build-input-rejects-nonempty-modules', nonemptyModules, [
      { code: 'SCHEMA_OBJECT_TOO_LARGE', instancePointer: '/modules' },
      {
        code: 'REQUEST_FIELD_UNKNOWN',
        instancePointer: '/modules/unexpected',
      },
    ]),
    s2Case('build-input-rejects-nonempty-placements', nonemptyPlacements, [
      { code: 'SCHEMA_CONSTANT_INVALID', instancePointer: '/placements' },
    ]),
  ]);

  const normalizedInput = canonical('build-input');
  const missingNormalizedSourceDigest = canonical('build-input');
  const normalizedPublication = /** @type {Record<string, unknown>} */ (
    missingNormalizedSourceDigest.publication
  );
  delete normalizedPublication.sourceDigest;
  families.set('normalized-inputs', [
    s2Case('normalized-build-input-valid', normalizedInput),
    s2Case(
      'normalized-publication-missing-source-digest-invalid',
      missingNormalizedSourceDigest,
      [
        {
          code: 'SCHEMA_REQUIRED_FIELD_MISSING',
          instancePointer: '/publication/sourceDigest',
        },
      ],
    ),
  ]);

  const unicodePath = canonical('repository');
  firstS2Record(
    unicodePath.assetRoots,
    'S2_REPOSITORY_ASSET_ROOT_ABSENT',
  ).path = 'content/café.md';
  const uppercasePercentRoute = canonical('build-input');
  const uppercasePercentFrontmatter = requireS2Record(
    firstS2Record(uppercasePercentRoute.content, 'S2_BUILD_CONTENT_ABSENT')
      .frontmatter,
    'S2_BUILD_FRONTMATTER_ABSENT',
  );
  uppercasePercentFrontmatter.redirects = ['/caf%C3%A9'];
  const nonNfcPath = canonical('repository');
  firstS2Record(nonNfcPath.assetRoots, 'S2_REPOSITORY_ASSET_ROOT_ABSENT').path =
    'content/café.md';
  const invalidUnicodeRoute = canonical('build-input');
  const unicodeFrontmatter = requireS2Record(
    firstS2Record(invalidUnicodeRoute.content, 'S2_BUILD_CONTENT_ABSENT')
      .frontmatter,
    'S2_BUILD_FRONTMATTER_ABSENT',
  );
  unicodeFrontmatter.redirects = ['/café'];
  families.set('unicode17-paths-routes', [
    s2Case('unicode17-nfc-repository-path-valid', unicodePath),
    s2Case('unicode17-uppercase-percent-route-valid', uppercasePercentRoute),
    s2Case('unicode17-non-nfc-repository-path-invalid', nonNfcPath, [
      {
        code: 'REPOSITORY_PATH_INVALID',
        instancePointer: '/assetRoots/0/path',
      },
    ]),
    s2Case('unicode17-unencoded-route-invalid', invalidUnicodeRoute, [
      {
        code: 'CANONICAL_ROUTE_INVALID',
        instancePointer: '/content/0/frontmatter/redirects/0',
      },
    ]),
  ]);

  const rootRedirect = canonical('artifact-manifest');
  const rootRedirectRecord = firstS2Record(
    rootRedirect.redirects,
    'S2_ARTIFACT_REDIRECT_ABSENT',
  );
  rootRedirectRecord.sourceRoute = '/old-home';
  rootRedirectRecord.targetRoute = '/';
  rootRedirectRecord.backingPath = 'old-home/index.html';
  const nonRootRedirect = canonical('artifact-manifest');
  const nonRootRedirectRecord = firstS2Record(
    nonRootRedirect.redirects,
    'S2_ARTIFACT_REDIRECT_ABSENT',
  );
  nonRootRedirectRecord.sourceRoute = '/blog/old';
  nonRootRedirectRecord.targetRoute = '/blog/new';
  nonRootRedirectRecord.backingPath = 'blog/old/index.html';
  const invalidRedirectStatus = canonical('artifact-manifest');
  firstS2Record(
    invalidRedirectStatus.redirects,
    'S2_ARTIFACT_REDIRECT_ABSENT',
  ).status = 301;
  const invalidBackingPath = canonical('artifact-manifest');
  firstS2Record(
    invalidBackingPath.redirects,
    'S2_ARTIFACT_REDIRECT_ABSENT',
  ).backingPath = '../index.html';
  families.set('artifact-static-redirects', [
    s2Case('artifact-static-root-redirect-valid', rootRedirect),
    s2Case('artifact-static-non-root-redirect-valid', nonRootRedirect),
    s2Case('artifact-static-redirect-status-invalid', invalidRedirectStatus, [
      {
        code: 'SCHEMA_CONSTANT_INVALID',
        instancePointer: '/redirects/0/status',
      },
    ]),
    s2Case(
      'artifact-static-redirect-backing-path-invalid',
      invalidBackingPath,
      [
        {
          code: 'REPOSITORY_PATH_INVALID',
          instancePointer: '/redirects/0/backingPath',
        },
      ],
    ),
  ]);

  const themeContract = canonical('theme-contract');
  themeContract.fixtureDigest = `sha256:${'02'.repeat(32)}`;
  themeContract.evidenceDigest = `sha256:${'03'.repeat(32)}`;
  themeContract.stylingContractDigest = `sha256:${'04'.repeat(32)}`;
  const themeContractUnknown = canonical('theme-contract');
  themeContractUnknown.unexpected = true;
  families.set('theme-contracts-digest-cycle', [
    s2Case('theme-contract-valid-structural', themeContract),
    s2Case('theme-contract-unknown-field-invalid', themeContractUnknown, [
      { code: 'REQUEST_FIELD_UNKNOWN', instancePointer: '/unexpected' },
    ]),
  ]);

  const capabilitySchemaValue = schemas.get('adapter-capability');
  if (
    capabilitySchemaValue === undefined ||
    capabilitySchemaValue === null ||
    typeof capabilitySchemaValue !== 'object' ||
    Array.isArray(capabilitySchemaValue)
  ) {
    throw new TypeError('S2_ADAPTER_CAPABILITY_SCHEMA_ABSENT');
  }
  const capabilitySchema = /** @type {Record<string, unknown>} */ (
    capabilitySchemaValue
  );
  const capabilityBranches = /** @type {Array<Record<string, unknown>>} */ (
    capabilitySchema.oneOf
  );
  const branchPropertyNames = new Set(
    capabilityBranches.flatMap((branch) =>
      Object.keys(/** @type {Record<string, unknown>} */ (branch.properties)),
    ),
  );
  const capabilities = [0, 1, 2].map((variant) => {
    const base = /** @type {Record<string, unknown>} */ (
      synthesize(capabilitySchema, capabilitySchema, '#', variant)
    );
    for (const propertyName of branchPropertyNames) delete base[propertyName];
    const seeded = seedUnionBranch(
      base,
      capabilityBranches[variant],
      capabilitySchema,
      `#/oneOf/${variant}`,
      variant,
    );
    return /** @type {Record<string, unknown>} */ (
      conform(seeded, capabilitySchema, capabilitySchema, '#', variant)
    );
  });
  const uppercaseCapability = canonical('adapter-capability');
  const operations = /** @type {string[]} */ (uppercaseCapability.operations);
  operations[0] = 'Activate';
  families.set('lowercase-capabilities', [
    s2Case(
      'capability-local-directory-valid-lowercase',
      requireS2Record(capabilities[0], 'S2_CAPABILITY_VARIANT_ABSENT'),
    ),
    s2Case(
      'capability-github-pages-valid-lowercase',
      requireS2Record(capabilities[1], 'S2_CAPABILITY_VARIANT_ABSENT'),
    ),
    s2Case(
      'capability-do-spaces-valid-lowercase',
      requireS2Record(capabilities[2], 'S2_CAPABILITY_VARIANT_ABSENT'),
    ),
    s2Case('capability-uppercase-invalid', uppercaseCapability, [
      { code: 'SCHEMA_UNION_INVALID', instancePointer: '' },
      { code: 'SCHEMA_ENUM_INVALID', instancePointer: '/operations/0' },
    ]),
  ]);

  const providerIdentity = canonical('artifact-manifest');
  const uppercaseProvider = canonical('artifact-manifest');
  const uppercaseSourceIdentity = /** @type {Record<string, unknown>} */ (
    uppercaseProvider.sourceIdentity
  );
  uppercaseSourceIdentity.provider = 'GitHub';
  const unknownProviderField = canonical('artifact-manifest');
  const unknownSourceIdentity = /** @type {Record<string, unknown>} */ (
    unknownProviderField.sourceIdentity
  );
  unknownSourceIdentity.unexpected = true;
  families.set('provider-identities', [
    s2Case('provider-identity-valid-github', providerIdentity),
    s2Case('provider-identity-uppercase-invalid', uppercaseProvider, [
      {
        code: 'SCHEMA_CONSTANT_INVALID',
        instancePointer: '/sourceIdentity/provider',
      },
    ]),
    s2Case('provider-identity-unknown-field-invalid', unknownProviderField, [
      {
        code: 'REQUEST_FIELD_UNKNOWN',
        instancePointer: '/sourceIdentity/unexpected',
      },
    ]),
  ]);

  /** @type {Array<Record<string, unknown>>} */
  const deploymentCases = [];
  for (const contract of [
    'deployment-intent',
    'deployment-observation',
    'deployment-receipt',
  ]) {
    const recordName = contract.replace('deployment-', '');
    deploymentCases.push(
      s2Case(`deployment-${recordName}-valid`, canonical(contract)),
    );
    const invalidOperationId = canonical(contract);
    invalidOperationId.operationId = String(
      invalidOperationId.operationId,
    ).replace('c', 'C');
    deploymentCases.push(
      s2Case(
        `deployment-${recordName}-operation-id-invalid`,
        invalidOperationId,
        [{ code: 'STABLE_ID_INVALID', instancePointer: '/operationId' }],
      ),
    );
  }
  families.set('deployment-records', deploymentCases);

  const semanticCoverage = {
    'discriminator-only-composition': [
      {
        file: 'test/t03-theme-composition-semantics.test.js',
        testName:
          'template-composition admits only its two exact discriminator fields',
      },
    ],
    'empty-modules-placements': [
      {
        file: 'test/t03-build-artifact-semantics.test.js',
        testName:
          'accepts the complete minimal lock/build/artifact/provenance/SPDX closure',
      },
    ],
    'normalized-inputs': [
      {
        file: 'test/t03-build-artifact-semantics.test.js',
        testName: 'fails closed on every exact root and context ledger',
      },
      {
        file: 'test/t03-build-artifact-semantics.test.js',
        testName:
          'rejects independently substituted lock, package-byte, and source facts',
      },
    ],
    'unicode17-paths-routes': [
      {
        file: 'test/t03-unicode17.test.js',
        testName:
          'Unicode 17 NFC and default case folding use generated pinned data',
      },
      {
        file: 'test/t03-portable-scalars.test.js',
        testName:
          'include/exclude selection deduplicates and sorts by unsigned UTF-8 bytes',
      },
    ],
    'artifact-static-redirects': [
      {
        file: 'test/t03-build-artifact-semantics.test.js',
        testName:
          'rejects output, reproducibility, policy, theme-license, and SPDX substitutions',
      },
    ],
    'theme-contracts-digest-cycle': [
      {
        file: 'test/t03-theme-composition-semantics.test.js',
        testName:
          'the five identities and exact 35-token order, types, grammars, and palettes are closed',
      },
      {
        file: 'test/t03-theme-composition-semantics.test.js',
        testName:
          'the template styling contract closes every catalog, hook atom, constant, digest, and byte copy',
      },
      {
        file: 'test/t03-theme-composition-semantics.test.js',
        testName:
          'fixture release and conformance rows enforce sort, set equality, derived state, and self-excluding digests',
      },
      {
        file: 'test/t03-theme-composition-semantics.test.js',
        testName:
          'the complete package and composition validate with acyclic distinct digest projections',
      },
      {
        file: 'test/t03-theme-composition-semantics.test.js',
        testName:
          'fixture, conformance-input, evidence, and final integrity copies cannot substitute for one another',
      },
    ],
    'lowercase-capabilities': [
      {
        file: 'test/t03-deployment-record-semantics.test.js',
        testName:
          'intent validates the full verified workload, source owners, plan, and digest',
      },
    ],
    'provider-identities': [
      {
        file: 'test/t03-deployment-record-semantics.test.js',
        testName:
          'provider activation and public verification validate against real stage evidence',
      },
    ],
    'deployment-records': [
      {
        file: 'test/t03-deployment-record-semantics.test.js',
        testName:
          'intent validates the full verified workload, source owners, plan, and digest',
      },
      {
        file: 'test/t03-deployment-record-semantics.test.js',
        testName:
          'provider activation and public verification validate against real stage evidence',
      },
      {
        file: 'test/t03-deployment-record-semantics.test.js',
        testName:
          'a candidate-complete receipt validates through operation journals and retained submission',
      },
    ],
  };

  const manifestFamilies = [];
  for (const [family, cases] of families) {
    const file = `fixtures/s2/${family}.json`;
    outputs.set(file, { family, cases });
    manifestFamilies.push({
      family,
      file,
      caseIds: cases.map(({ caseId }) => caseId),
      publicCoverage: 'registered-schema-structural-vectors',
      internalSemanticCoverage:
        semanticCoverage[/** @type {keyof typeof semanticCoverage} */ (family)],
    });
  }
  outputs.set('fixtures/s2/manifest.json', {
    schemaVersion: MANIFEST_VERSION,
    contractVersion: CONTRACT_VERSION,
    fixtureScope: 'S2 schema-owned consumer fixtures',
    coverageModel:
      'Family files contain only public registered-schema structural vectors. Cross-document semantic contexts are internal implementation coverage and are referenced by exact test file and test name; they are not a public serialized format.',
    families: manifestFamilies,
  });
}

/**
 * Add the separate S4 deployment/certification consumer corpus without
 * changing the legacy corpus or the S2 family. Semantic contexts remain
 * internal and are referenced by exact existing test names instead of being
 * serialized as a new public fixture format.
 *
 * @param {Map<string, unknown>} outputs generated files
 * @param {Map<string, unknown>} schemas registered schemas by contract
 * @param {Map<string, Record<string, unknown>>} canonicalDocuments cloned canonical documents by contract
 * @returns {void}
 */
function addS4Corpus(outputs, schemas, canonicalDocuments) {
  /** @type {(contract: string) => Record<string, unknown>} */
  const canonical = (contract) => {
    const document = canonicalDocuments.get(contract);
    if (document === undefined) {
      throw new TypeError(`S4_CANONICAL_DOCUMENT_ABSENT:${contract}`);
    }
    return clone(document);
  };
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const families = new Map();

  // -- deployment-intent-destinations ---------------------------------------

  const intentLocal = canonical('deployment-intent');
  intentLocal.adapter = {
    adapterId: 'local-directory',
    adapterVersion: '2.0.0',
    adapterDigest: `sha256:${'01'.repeat(32)}`,
  };
  intentLocal.destination = {
    environment: 'local-directory',
    adapterId: 'local-directory',
    adapterVersion: '2.0.0',
    targetDigest: `sha256:${'01'.repeat(32)}`,
    baseUrl: 'https://fixture-1.example.com/',
  };
  intentLocal.destinationMutationAuthority = {
    ...requireS2Record(
      intentLocal.destinationMutationAuthority,
      'S4_INTENT_MUTATION_AUTHORITY_ABSENT',
    ),
    destination: intentLocal.destination,
  };

  const intentPages = canonical('deployment-intent');
  intentPages.adapter = {
    adapterId: 'github-pages',
    adapterVersion: '2.0.0',
    adapterDigest: `sha256:${'02'.repeat(32)}`,
  };
  intentPages.destination = {
    environment: 'github-pages',
    adapterId: 'github-pages',
    adapterVersion: '2.0.0',
    targetDigest: `sha256:${'02'.repeat(32)}`,
    baseUrl: 'https://fixture-2.example.com/',
  };
  intentPages.destinationMutationAuthority = {
    ...requireS2Record(
      intentPages.destinationMutationAuthority,
      'S4_INTENT_MUTATION_AUTHORITY_ABSENT',
    ),
    destination: intentPages.destination,
  };
  intentPages.pagesBuildVersion = 'a'.repeat(40);

  const intentSpaces = canonical('deployment-intent');
  intentSpaces.adapter = {
    adapterId: 'do-spaces',
    adapterVersion: '2.0.0',
    adapterDigest: `sha256:${'03'.repeat(32)}`,
  };
  intentSpaces.destination = {
    environment: 'do-spaces',
    adapterId: 'do-spaces',
    adapterVersion: '2.0.0',
    targetDigest: `sha256:${'03'.repeat(32)}`,
    baseUrl: 'https://fixture-3.example.com/',
  };
  intentSpaces.destinationMutationAuthority = {
    ...requireS2Record(
      intentSpaces.destinationMutationAuthority,
      'S4_INTENT_MUTATION_AUTHORITY_ABSENT',
    ),
    destination: intentSpaces.destination,
  };
  intentSpaces.spacesStagePrefix =
    '_gala/staged/v2/019c0000-0000-7000-8000-000000000001/019c0000-0000-7000-8000-000000000001/019c0000-0000-7000-8000-000000000001/';

  const intentBadProfile = canonical('deployment-intent');
  intentBadProfile.activationDetectionProfile =
    'gala-public-activation-detection-v1';

  families.set('deployment-intent-destinations', [
    s2Case('deployment-intent-local-directory-valid', intentLocal),
    s2Case('deployment-intent-github-pages-valid', intentPages),
    s2Case('deployment-intent-do-spaces-valid', intentSpaces),
    s2Case(
      'deployment-intent-activation-detection-profile-invalid',
      intentBadProfile,
      [
        {
          code: 'SCHEMA_CONSTANT_INVALID',
          instancePointer: '/activationDetectionProfile',
        },
      ],
    ),
  ]);

  // -- deployment-observation-matrix ----------------------------------------

  const observationRequestNotStarted = canonical('deployment-observation');
  observationRequestNotStarted.observationClass = 'request-not-started';
  observationRequestNotStarted.outcome = 'rejected';
  observationRequestNotStarted.destinationChanged = 'no';
  observationRequestNotStarted.probes = [];
  delete observationRequestNotStarted.generationId;
  delete observationRequestNotStarted.observedArtifactDigest;
  delete observationRequestNotStarted.providerObjectIdDigest;
  delete observationRequestNotStarted.providerVersion;

  const observationProviderState = canonical('deployment-observation');
  observationProviderState.observationClass = 'provider-state';
  observationProviderState.outcome = 'succeeded';
  observationProviderState.destinationChanged = 'yes';
  observationProviderState.probes = [];
  observationProviderState.generationId =
    '019c0000-0000-7000-8000-000000000001';
  observationProviderState.observedArtifactDigest = `sha256:${'01'.repeat(32)}`;
  observationProviderState.providerObjectIdDigest = `sha256:${'01'.repeat(32)}`;
  observationProviderState.providerVersion = 'fixture-1';

  const observationBadMatrix = clone(observationProviderState);
  observationBadMatrix.outcome = 'rejected';
  observationBadMatrix.destinationChanged = 'yes';

  families.set('deployment-observation-matrix', [
    s2Case(
      'deployment-observation-request-not-started-valid',
      observationRequestNotStarted,
    ),
    s2Case(
      'deployment-observation-provider-state-valid',
      observationProviderState,
    ),
    s2Case(
      'deployment-observation-class-outcome-matrix-invalid',
      observationBadMatrix,
      [{ code: 'SCHEMA_UNION_INVALID', instancePointer: '' }],
    ),
  ]);

  // -- deployment-receipt-no-signatures -------------------------------------

  const receiptValid = canonical('deployment-receipt');
  const receiptWithSignatures = clone(receiptValid);
  receiptWithSignatures.signatures = [];

  families.set('deployment-receipt-no-signatures', [
    s2Case('deployment-receipt-managed-no-signatures-valid', receiptValid),
    s2Case(
      'deployment-receipt-signatures-member-rejected',
      receiptWithSignatures,
      [{ code: 'REQUEST_FIELD_UNKNOWN', instancePointer: '/signatures' }],
    ),
  ]);

  // -- public-generation-marker-closed --------------------------------------

  const markerValid = canonical('public-generation-marker');
  const markerWithPublicationId = clone(markerValid);
  markerWithPublicationId.publicationId =
    '019c0000-0000-7000-8000-000000000001';

  families.set('public-generation-marker-closed', [
    s2Case('public-generation-marker-valid', markerValid),
    s2Case(
      'public-generation-marker-publication-id-rejected',
      markerWithPublicationId,
      [{ code: 'REQUEST_FIELD_UNKNOWN', instancePointer: '/publicationId' }],
    ),
  ]);

  // -- adapter-capability-destinations --------------------------------------

  const capabilitySchemaValue = schemas.get('adapter-capability');
  if (
    capabilitySchemaValue === undefined ||
    capabilitySchemaValue === null ||
    typeof capabilitySchemaValue !== 'object' ||
    Array.isArray(capabilitySchemaValue)
  ) {
    throw new TypeError('S4_ADAPTER_CAPABILITY_SCHEMA_ABSENT');
  }
  const capabilitySchema = /** @type {Record<string, unknown>} */ (
    capabilitySchemaValue
  );
  const capabilityBranches = /** @type {Array<Record<string, unknown>>} */ (
    capabilitySchema.oneOf
  );
  const branchPropertyNames = new Set(
    capabilityBranches.flatMap((branch) =>
      Object.keys(/** @type {Record<string, unknown>} */ (branch.properties)),
    ),
  );
  const capabilities = [0, 1, 2].map((variant) => {
    const base = /** @type {Record<string, unknown>} */ (
      synthesize(capabilitySchema, capabilitySchema, '#', variant)
    );
    for (const propertyName of branchPropertyNames) delete base[propertyName];
    const seeded = seedUnionBranch(
      base,
      capabilityBranches[variant],
      capabilitySchema,
      `#/oneOf/${variant}`,
      variant,
    );
    return /** @type {Record<string, unknown>} */ (
      conform(seeded, capabilitySchema, capabilitySchema, '#', variant)
    );
  });

  const capabilityBadRollback = clone(
    requireS2Record(capabilities[0], 'S4_CAPABILITY_VARIANT_ABSENT'),
  );
  capabilityBadRollback.rollback = 'reactivate';

  families.set('adapter-capability-destinations', [
    s2Case(
      'adapter-capability-local-directory-valid',
      requireS2Record(capabilities[0], 'S4_CAPABILITY_VARIANT_ABSENT'),
    ),
    s2Case(
      'adapter-capability-github-pages-valid',
      requireS2Record(capabilities[1], 'S4_CAPABILITY_VARIANT_ABSENT'),
    ),
    s2Case(
      'adapter-capability-do-spaces-valid',
      requireS2Record(capabilities[2], 'S4_CAPABILITY_VARIANT_ABSENT'),
    ),
    s2Case(
      'adapter-capability-rollback-constant-invalid',
      capabilityBadRollback,
      [
        { code: 'SCHEMA_UNION_INVALID', instancePointer: '' },
        { code: 'SCHEMA_CONSTANT_INVALID', instancePointer: '/rollback' },
      ],
    ),
  ]);

  const semanticCoverage = {
    'deployment-intent-destinations': [
      {
        file: 'test/t03-deployment-record-semantics.test.js',
        testName:
          'intent validates the full verified workload, source owners, plan, and digest',
      },
    ],
    'deployment-observation-matrix': [
      {
        file: 'test/t03-deployment-record-semantics.test.js',
        testName:
          'provider activation and public verification validate against real stage evidence',
      },
    ],
    'deployment-receipt-no-signatures': [
      {
        file: 'test/t03-managed-evidence-journal.test.js',
        testName:
          'a complete mixed journal validates to its receipt-bound head',
      },
    ],
    'public-generation-marker-closed': [
      {
        file: 'test/t03-public-verification-semantics.test.js',
        testName:
          'canonical origin-route joining enforces byte normalization and the 2048 bound',
      },
    ],
    'adapter-capability-destinations': [
      {
        file: 'test/t03-deployment-record-semantics.test.js',
        testName:
          'intent reservation derives consumed attempts, slots, and stream count from retained owners',
      },
    ],
  };

  const manifestFamilies = [];
  for (const [family, cases] of families) {
    const file = `fixtures/s4/${family}.json`;
    outputs.set(file, { family, cases });
    manifestFamilies.push({
      family,
      file,
      caseIds: cases.map(({ caseId }) => caseId),
      publicCoverage: 'registered-schema-structural-vectors',
      internalSemanticCoverage:
        semanticCoverage[/** @type {keyof typeof semanticCoverage} */ (family)],
    });
  }
  outputs.set('fixtures/s4/manifest.json', {
    schemaVersion: MANIFEST_VERSION,
    contractVersion: CONTRACT_VERSION,
    fixtureScope: 'S4 schema-owned deployment/certification fixtures',
    coverageModel:
      'Family files contain only public registered-schema structural vectors. Cross-document semantic contexts are internal implementation coverage and are referenced by exact test file and test name; they are not a public serialized format.',
    families: manifestFamilies,
  });
}

/**
 * Build every generated fixture file in memory.
 *
 * @param {Map<string, unknown>} schemas schemas by contract
 * @param {Map<string, string>} schemaHashes SHA-256 of committed schema bytes by contract
 * @returns {Map<string, unknown>} output values by repository-relative path
 */
function createCorpus(schemas, schemaHashes) {
  verifyYamlAdversarialFixtures();
  /** @type {Map<string, unknown>} */
  const outputs = new Map();
  /** @type {Map<string, Array<Record<string, unknown>>>} */
  const caseFiles = new Map();
  /** @type {Array<Record<string, unknown>>} */
  const schemaEntries = [];
  /** @type {Array<Record<string, unknown>>} */
  const coverage = [];
  /** @type {Map<string, Record<string, unknown>>} */
  const canonicalDocuments = new Map();
  /** @type {Record<string, unknown>} */
  const decisionFixtures = {};

  for (const [contract, root] of [...schemas].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    const schema = /** @type {Record<string, unknown>} */ (root);
    const canonical = /** @type {Record<string, unknown>} */ (
      synthesize(schema, schema, '#')
    );
    if (contract === 'public-runtime-origins') {
      canonical.expiresAt = '2026-09-13T12:05:00.000Z';
      canonical.payloadDigest = digestPublicRuntimeOrigins(canonical);
    }
    canonicalDocuments.set(contract, clone(canonical));
    const validExample = `examples/valid/${contract}/canonical.json`;
    const boundaryFixture = `fixtures/boundary/${contract}/root.json`;
    const unknownFieldFixture = `fixtures/unknown-field/${contract}/root.json`;
    outputs.set(validExample, canonical);
    outputs.set(boundaryFixture, canonical);
    outputs.set(unknownFieldFixture, { ...canonical, unexpected: true });
    if (contract === 'problem') {
      const httpsFile = 'examples/valid/problem/type-https.json';
      const urnFile = 'examples/valid/problem/type-gala-urn.json';
      const invalidFile =
        'fixtures/invalid/problem/SCHEMA_UNION_INVALID/dec-100-cases.json';
      outputs.set(httpsFile, {
        ...canonical,
        type: 'https://errors.example.com/not-found',
      });
      outputs.set(urnFile, {
        ...canonical,
        type: 'urn:gala:problem:not-found',
      });
      const rejectedTypes = {
        relative: '/problems/not-found',
        'other-scheme': 'http://errors.example.com/not-found',
        'other-gala-namespace': 'urn:gala:schema:not-found',
        'uppercase-urn-name': 'urn:gala:problem:Not-Found',
        'empty-urn-name': 'urn:gala:problem:',
        credentials: 'https://user:secret@errors.example.com/not-found',
        fragment: 'https://errors.example.com/not-found#details',
        'query-only': '?type=not-found',
      };
      outputs.set(
        invalidFile,
        Object.entries(rejectedTypes).map(([name, type]) => ({
          caseId: `problem-type-${name}`,
          instance: { ...canonical, type },
          expectedCodes: ['SCHEMA_UNION_INVALID'],
        })),
      );
      decisionFixtures.problemType = {
        authority: 'DEC-100',
        valid: [httpsFile, urnFile],
        invalid: invalidFile,
      };
    }
    const rules = collectRules(contract, schema);
    schemaEntries.push({
      contract,
      schemaId: schema.$id,
      schemaSha256: schemaHashes.get(contract),
      ruleCount: rules.length,
      validExample,
      boundaryFixture,
      unknownFieldFixture,
    });

    for (const rule of rules) {
      const validMaterialization = compactWitness(
        acceptedCase(rule, schema, false),
        String(rule.schemaPointer),
      );
      const boundaryMaterialization = compactWitness(
        acceptedCase(rule, schema, true),
        String(rule.schemaPointer),
      );
      const rejectedMaterialization = rejectedCase(rule, schema);
      const invalidMutation =
        rule.keyword === 'required'
          ? { kind: 'delete-property', property: rule.requiredName }
          : rule.keyword === 'additionalProperties'
            ? { kind: 'add-property', property: 'unexpected', value: true }
            : rule.keyword === 'false' &&
                String(rule.schemaPointer) !== '#/$defs/passiveVisualToken'
              ? {
                  kind: 'add-property',
                  property: String(String(rule.schemaPointer).split('/').at(-1))
                    .replaceAll('~1', '/')
                    .replaceAll('~0', '~'),
                  value: null,
                }
              : undefined;
      const invalidMaterialization = compactWitness(
        rejectedMaterialization,
        String(rejectedMaterialization.validationPointer ?? rule.schemaPointer),
        invalidMutation,
      );
      const baseData = {
        coveredRuleIds: [rule.ruleId],
        schemaId: schema.$id,
        schemaPointer: rule.schemaPointer,
        keyword: rule.keyword,
      };
      const valid =
        validMaterialization.notApplicable === undefined
          ? addCase(
              caseFiles,
              `examples/valid/${contract}/rules.json`,
              `${contract}-valid-${shortHash(String(rule.schemaPointer))}`,
              { ...baseData, ...validMaterialization },
            )
          : validMaterialization;
      const boundary =
        boundaryMaterialization.notApplicable === undefined
          ? addCase(
              caseFiles,
              `fixtures/boundary/${contract}/rules.json`,
              `${contract}-boundary-${shortHash(
                JSON.stringify([rule.schemaPointer, boundaryMaterialization]),
              )}`,
              { ...baseData, ...boundaryMaterialization },
            )
          : boundaryMaterialization;
      const code = diagnosticCode(rule);
      const invalid =
        invalidMaterialization.notApplicable === undefined
          ? addCase(
              caseFiles,
              `fixtures/invalid/${contract}/${code}/cases.json`,
              `${contract}-invalid-${shortHash(String(rule.ruleId))}`,
              { ...baseData, ...invalidMaterialization },
              code,
            )
          : invalidMaterialization;
      const unknownPointer = String(rule.unknownPointer);
      const unknownOwner = resolvePointer(schema, unknownPointer);
      const unknownBase = /** @type {Record<string, unknown>} */ (
        synthesize(unknownOwner, schema, unknownPointer)
      );
      const unknownMaterialization = compactWitness(
        {
          instance: { ...unknownBase, unexpected: true },
        },
        unknownPointer,
        { kind: 'add-property', property: 'unexpected', value: true },
      );
      const unknownField = addCase(
        caseFiles,
        `fixtures/unknown-field/${contract}/rules.json`,
        `${contract}-unknown-${shortHash(unknownPointer)}`,
        {
          ...baseData,
          schemaPointer: unknownPointer,
          ...unknownMaterialization,
          expectedCodes: ['REQUEST_FIELD_UNKNOWN'],
        },
      );
      coverage.push({
        contract: rule.contract,
        ruleId: rule.ruleId,
        schemaPointer: rule.schemaPointer,
        keyword: rule.keyword,
        valid,
        boundary,
        invalid,
        unknownField,
      });
    }
  }

  for (const [file, cases] of caseFiles) {
    outputs.set(
      file,
      cases.sort((left, right) =>
        String(left.caseId).localeCompare(String(right.caseId)),
      ),
    );
  }
  const adversarial = ADVERSARIAL_FIXTURES.map((fixture) => {
    const file = `fixtures/adversarial/${fixture.category}.json`;
    outputs.set(file, fixture);
    return {
      category: fixture.category,
      file,
      expectedCode: fixture.expectedCode,
      validator: fixture.validator,
    };
  });
  outputs.set('fixtures/manifest.json', {
    schemaVersion: MANIFEST_VERSION,
    contractVersion: CONTRACT_VERSION,
    fixtureModel:
      'Rule cases identify a root schema and JSON Pointer. Version 1 recipes are deterministically materialized before validation. Logical non-applicability is explicit and closed.',
    fixtureRecipeVersion: '1.0.0',
    schemas: schemaEntries,
    rules: coverage,
    adversarial,
    decisionFixtures,
  });
  addS2Corpus(outputs, schemas, canonicalDocuments);
  addS4Corpus(outputs, schemas, canonicalDocuments);
  return outputs;
}

/**
 * Generate or verify the complete T04 fixture corpus.
 *
 * @param {boolean} check verify committed files instead of writing them
 * @returns {Promise<void>} completion
 */
async function generateFixtureCorpus(check) {
  const schemaFiles = (await readdir('schemas'))
    .filter((name) => name.endsWith('.schema.json'))
    .sort();
  /** @type {Map<string, unknown>} */
  const schemas = new Map();
  /** @type {Map<string, string>} */
  const schemaHashes = new Map();
  for (const file of schemaFiles) {
    const contract = file.replace(/\.schema\.json$/u, '');
    const bytes = await readFile(path.join('schemas', file));
    schemas.set(contract, JSON.parse(bytes.toString('utf8')));
    schemaHashes.set(
      contract,
      createHash('sha256').update(bytes).digest('hex'),
    );
  }
  if (schemas.size !== 20)
    throw new TypeError('FIXTURE_SCHEMA_INVENTORY_INVALID');
  const outputs = createCorpus(schemas, schemaHashes);
  const expectedFiles = [...outputs.keys()].sort();
  const actualFiles = [
    ...(await listFiles('examples/valid')),
    ...(await listFiles('fixtures')),
  ].sort();
  if (check && JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error(
      'Fixture inventory is stale; run npm run fixtures:generate',
    );
  }
  if (!check) {
    for (const staleFile of actualFiles.filter((file) => !outputs.has(file))) {
      await rm(staleFile);
    }
  }
  const prettierConfiguration = (await resolveConfig(process.cwd())) ?? {};
  for (const [file, value] of outputs) {
    const expected = await format(JSON.stringify(value), {
      ...prettierConfiguration,
      parser: 'json',
    });
    if (check) {
      if ((await readFile(file, 'utf8')) !== expected) {
        throw new Error(`${file} is stale; run npm run fixtures:generate`);
      }
    } else {
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, expected, 'utf8');
    }
  }
  process.stdout.write(
    check
      ? `Committed fixture corpus covers ${schemas.size} schemas and ${outputs.size} files.\n`
      : `Generated fixture corpus for ${schemas.size} schemas in ${outputs.size} files.\n`,
  );
}

await runIfMain(import.meta.url, async () => {
  await generateFixtureCorpus(process.argv.includes('--check'));
});
