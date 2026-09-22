import assert from 'node:assert/strict';
import {
  createHash,
  generateKeyPairSync,
  sign as signBytes,
} from 'node:crypto';
import test from 'node:test';

import {
  canonicalizeJcs,
  canonicalizeJcsBytes,
  sha256Tagged,
} from '../src/internal/canonical-jcs.js';
import {
  ACTIVE_DIGEST_PROFILES,
  digestActionDefinitionBlob,
  digestRenderPolicyBytes,
} from '../src/internal/digest-profiles.js';
import spdxData from '../src/internal/generated/spdx-3.28.0.json' with { type: 'json' };
import {
  BUILD_ARTIFACT_CONTEXT_CONSTRAINTS,
  BuildArtifactSemanticError,
  validateBuildArtifactSemantics,
} from '../src/internal/build-artifact-semantics.js';

/** @typedef {Record<string, unknown>} UnknownRecord */

const MAGIC = Buffer.from('GALA-FROZEN-ENVELOPE-V2\n', 'ascii');
const REGISTRY = 'https://registry.npmjs.org/';
const BUILD_EPOCH = '2026-01-01T00:00:00.000Z';
const SOURCE_COMMIT = `sha1:${'1'.repeat(40)}`;
const WORKFLOW_COMMIT = `sha1:${'2'.repeat(40)}`;
const ARTIFACT_ID = '018f47ca-4df5-7a74-b91f-0123456789ab';
const POLICY_RELEASE_ID = '018f47ca-4df5-7a74-b91f-0123456789ac';
const AUTHOR_ID = '018f47ca-4df5-7a74-b91f-0123456789ad';
const CONTENT_ID = '018f47ca-4df5-7a74-b91f-0123456789ae';
const SPDX_DIGEST =
  'sha256:293418a03e6692c44332a12eb17889af99e20a4d571adfaca4408b203f75686b';
const SPDX_SCHEMA_DIGEST =
  'sha256:239208b7ac287b3cf5d9a9af23f9d69863971102a5e1587a27a398b43490b89b';
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

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicExponent: 65_537,
});
const publicJwk = /** @type {{kty: string, n: string, e: string}} */ (
  publicKey.export({ format: 'jwk' })
);
const spdxTable = /** @type {{licenses: [string, string][]}} */ (
  /** @type {unknown} */ (spdxData)
);
const mitText = spdxTable.licenses.find(([id]) => id === 'MIT')?.[1];
if (!mitText) throw new Error('SPDX fixture lacks MIT');

/**
 * @param {string} label deterministic fixture label
 * @returns {string} tagged SHA-256
 */
function tagged(label) {
  return sha256Tagged(Buffer.from(label, 'utf8'));
}

/**
 * @param {string} name active profile name
 * @param {unknown} value complete digest owner
 * @returns {string} tagged profile digest
 */
function profile(name, value) {
  const selected = ACTIVE_DIGEST_PROFILES[name];
  if (!selected) throw new Error(`missing digest profile: ${name}`);
  return selected.digest(value);
}

/**
 * @param {unknown[]} values JSON values
 * @returns {unknown[]} JCS-byte-sorted copy
 */
function jcsSort(values) {
  return [...values].sort((left, right) =>
    Buffer.compare(canonicalizeJcsBytes(left), canonicalizeJcsBytes(right)),
  );
}

/**
 * @param {string} path path
 * @param {Uint8Array} content exact Git blob bytes
 * @returns {{path: string, mode: string, objectId: string, bytes: Buffer}}
 */
function treeEntry(path, content) {
  const bytes = Buffer.from(content);
  const objectId = createHash('sha1')
    .update(Buffer.from(`blob ${bytes.length}\0`, 'utf8'))
    .update(bytes)
    .digest('hex');
  return { path, mode: '100644', objectId: `sha1:${objectId}`, bytes };
}

/**
 * @param {'blob' | 'commit' | 'tree'} type Git object type
 * @param {Uint8Array} content exact object body
 * @returns {string} tagged SHA-1 object ID
 */
function gitObjectId(type, content) {
  const bytes = Buffer.from(content);
  const hexadecimal = createHash('sha1')
    .update(Buffer.from(`${type} ${bytes.length}\0`, 'utf8'))
    .update(bytes)
    .digest('hex');
  return `sha1:${hexadecimal}`;
}

/**
 * @param {{mode: string, name: string, objectId: string}[]} entries tree rows
 * @returns {{objectId: string, bytes: Buffer}} exact Git tree object
 */
function gitTree(entries) {
  const bytes = Buffer.concat(
    entries.map(({ mode, name, objectId }) =>
      Buffer.concat([
        Buffer.from(`${mode} ${name}\0`, 'utf8'),
        Buffer.from(objectId.slice('sha1:'.length), 'hex'),
      ]),
    ),
  );
  return { objectId: gitObjectId('tree', bytes), bytes };
}

/**
 * Build an authenticated action commit/tree/blob proof.
 *
 * @param {string} repository GitHub repository coordinate
 * @param {string | undefined} path selected repository directory
 * @param {Buffer} definitionBytes exact action definition bytes
 * @param {'action.yml' | 'action.yaml'} definitionName selected file name
 * @param {'100644' | '100755'} [definitionMode] selected blob mode
 * @returns {{use: string, context: UnknownRecord, pin: UnknownRecord}}
 */
function actionResolution(
  repository,
  path,
  definitionBytes,
  definitionName,
  definitionMode = '100644',
) {
  const definitionId = gitObjectId('blob', definitionBytes);
  let selected = gitTree([
    { mode: definitionMode, name: definitionName, objectId: definitionId },
  ]);
  const treeObjects = [selected];
  const segments = path?.split('/') ?? [];
  for (let index = segments.length - 1; index >= 0; index -= 1) {
    const name = segments[index];
    if (!name) throw new Error('invalid action fixture path');
    selected = gitTree([{ mode: '40000', name, objectId: selected.objectId }]);
    treeObjects.unshift(selected);
  }
  const commitBytes = Buffer.from(
    `tree ${selected.objectId.slice('sha1:'.length)}\nauthor Gala Fixture <fixture@example.com> 0 +0000\ncommitter Gala Fixture <fixture@example.com> 0 +0000\n\naction fixture\n`,
    'utf8',
  );
  const commit = gitObjectId('commit', commitBytes);
  const use = `${repository}${path ? `/${path}` : ''}@${commit.slice('sha1:'.length)}`;
  return {
    use,
    context: { use, commitBytes, treeObjects, definitionBytes },
    pin: {
      use,
      commit,
      actionDefinitionDigest: digestActionDefinitionBlob(definitionBytes),
    },
  };
}

/**
 * @param {number} kind record kind
 * @param {string} path record path
 * @param {Uint8Array} content record content
 * @returns {Buffer} encoded envelope record
 */
function envelopeRecord(kind, path, content) {
  const pathBytes = Buffer.from(path, 'utf8');
  const header = Buffer.alloc(13);
  header.writeUInt8(kind, 0);
  header.writeUInt32BE(pathBytes.length, 1);
  header.writeBigUInt64BE(BigInt(content.length), 5);
  return Buffer.concat([header, pathBytes, content]);
}

/**
 * @param {{path: string, bytes: Buffer}[]} payloads artifact payloads
 * @param {UnknownRecord} manifest manifest
 * @param {UnknownRecord} provenance provenance
 * @param {UnknownRecord} sbom SBOM
 * @returns {Buffer} deterministic frozen envelope
 */
function frozenEnvelope(payloads, manifest, provenance, sbom) {
  const records = [
    ...payloads.map(({ path, bytes }) => envelopeRecord(0x01, path, bytes)),
    envelopeRecord(
      0x02,
      'metadata/artifact-manifest.jcs',
      canonicalizeJcsBytes(manifest),
    ),
    envelopeRecord(
      0x03,
      'metadata/provenance.jcs',
      canonicalizeJcsBytes(provenance),
    ),
    envelopeRecord(0x04, 'metadata/sbom.spdx.json', canonicalizeJcsBytes(sbom)),
  ];
  const count = Buffer.alloc(4);
  count.writeUInt32BE(records.length);
  return Buffer.concat([MAGIC, count, ...records]);
}

/**
 * @param {string} packageName package name
 * @param {Buffer} bytes exact tarball bytes
 * @param {boolean} [template] template role
 * @returns {UnknownRecord} locked package row
 */
function lockedPackage(packageName, bytes, template = false) {
  return {
    package: packageName,
    version: '2.0.0',
    integrity: sha256Tagged(bytes),
    registry: REGISTRY,
    contractVersion: '2.0.0',
    compatibleWith: '^2.0.0',
    ...(template ? { templateModules: [] } : {}),
  };
}

/**
 * @param {UnknownRecord} row locked package
 * @returns {UnknownRecord} package identity
 */
function identity(row) {
  return {
    package: row.package,
    version: row.version,
    integrity: row.integrity,
    registry: row.registry,
  };
}

/**
 * @param {UnknownRecord} row locked package
 * @param {Buffer} bytes exact tarball bytes
 * @returns {UnknownRecord} release-catalog row
 */
function catalogEntry(row, bytes) {
  const packageName = String(row.package);
  const suffix = packageName.slice('@rathnasgala2/'.length);
  const sourceRepository =
    suffix === 'schemas'
      ? 'rathnasgala2/schema'
      : suffix === 'template'
        ? 'rathnasgala2/template'
        : suffix.startsWith('theme-')
          ? `rathnasgala2/${suffix}`
          : 'rathnasgala2/publish';
  return {
    package: packageName,
    version: row.version,
    integrity: row.integrity,
    tarballPath: `/${suffix}/${suffix}-2.0.0.tgz`,
    tarballByteCount: String(bytes.length),
    authorityKind: 'rathnasgala-npm-provenance',
    licenseExpression: 'MIT',
    approvalEvidenceDigest: tagged(`${packageName}:approval`),
    sourceRepository,
    sourceRepositoryId: '100',
    sourceCommit: SOURCE_COMMIT,
    sourceRef: 'refs/tags/v2.0.0',
    releaseWorkflowPath: '.github/workflows/release.yaml',
    releaseWorkflowCommit: SOURCE_COMMIT,
    provenanceBundleDigest: tagged(`${packageName}:provenance`),
  };
}

/**
 * @param {string} value string JSON value
 * @returns {string} unpadded base64url
 */
function jsonSegment(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

/**
 * @param {UnknownRecord} claims signed claims
 * @returns {string} compact RS256 JWS
 */
function compactJwt(claims) {
  const header = jsonSegment(canonicalizeJcs({ alg: 'RS256', kid: 'fixture' }));
  const payload = jsonSegment(canonicalizeJcs(claims));
  const input = `${header}.${payload}`;
  const signature = signBytes('RSA-SHA256', Buffer.from(input, 'ascii'), {
    key: privateKey,
  }).toString('base64url');
  return `${input}.${signature}`;
}

/**
 * @param {Buffer} content exact file content
 * @param {'sha1' | 'sha256'} algorithm hash algorithm
 * @returns {string} lowercase digest
 */
function rawHash(content, algorithm) {
  return createHash(algorithm).update(content).digest('hex');
}

/**
 * @param {UnknownRecord} row package row
 * @param {string} SPDXID assigned SPDX ID
 * @returns {UnknownRecord} SPDX dependency package
 */
function spdxPackage(row, SPDXID) {
  return {
    SPDXID,
    name: row.package,
    versionInfo: row.version,
    downloadLocation: 'NOASSERTION',
    filesAnalyzed: false,
    checksums: [
      {
        algorithm: 'SHA256',
        checksumValue: String(row.integrity).slice('sha256:'.length),
      },
    ],
    licenseConcluded: 'MIT',
    licenseDeclared: 'MIT',
    copyrightText: 'NOASSERTION',
  };
}

/**
 * Build one complete, independently projected accepted fixture.
 *
 * @returns {{records: UnknownRecord, context: UnknownRecord}}
 */
function makeFixture() {
  const packageNames = [
    '@rathnasgala2/schemas',
    '@rathnasgala2/template',
    '@rathnasgala2/theme-default',
    '@rathnasgala2/publish-action',
    '@rathnasgala2/publish-kernel',
    '@rathnasgala2/adapter-protocol',
    '@rathnasgala2/adapter-local-directory',
  ];
  const tarballs = packageNames.map((name) =>
    Buffer.from(`immutable tarball for ${name}\n`, 'utf8'),
  );
  const locked = packageNames.map((name, index) => {
    const tarball = tarballs[index];
    if (!tarball) throw new Error('incomplete tarball fixture');
    return lockedPackage(name, tarball, index === 1);
  });
  const schemas = locked[0];
  const template = locked[1];
  const theme = locked[2];
  const publishers = locked.slice(3);
  if (!schemas || !template || !theme || publishers.length !== 4) {
    throw new Error('incomplete package fixture');
  }

  const registryFetchProfile = {
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
    networkBoundaryProfileDigest: tagged('registry-network'),
    tlsProfileDigest: tagged('registry-tls'),
    fixtureDigest: tagged('registry-fixture'),
    evidenceDigest: tagged('registry-evidence'),
    profileDigest: '',
  };
  registryFetchProfile.profileDigest = profile(
    'npmRegistryFetchProfile',
    registryFetchProfile,
  );
  const entries = locked
    .map((row, index) => {
      const tarball = tarballs[index];
      if (!tarball) throw new Error('incomplete catalog fixture');
      return catalogEntry(row, tarball);
    })
    .sort((left, right) =>
      Buffer.compare(
        Buffer.from(String(left.package)),
        Buffer.from(String(right.package)),
      ),
    );
  const packageReleaseCatalog = {
    profile: 'gala-package-release-catalog-v2',
    catalogId: '018f47ca-4df5-7a74-b91f-0123456789af',
    registry: REGISTRY,
    registryFetchProfileDigest: registryFetchProfile.profileDigest,
    sigstoreTrustRootDigest: tagged('sigstore-root'),
    entries,
    catalogDigest: '',
  };
  packageReleaseCatalog.catalogDigest = profile(
    'packageReleaseCatalog',
    packageReleaseCatalog,
  );
  const packageArtifacts = locked.map((row, index) => {
    const bytes = tarballs[index];
    if (!bytes) throw new Error('incomplete package byte fixture');
    return {
      package: row.package,
      version: row.version,
      bytes,
      runtimeMetadata: {
        name: row.package,
        version: row.version,
        license: 'MIT',
        requirements: [],
      },
    };
  });
  const lock = {
    schemaId: 'urn:gala:schema:lock:2.0.0',
    schemaVersion: '2.0.0',
    repositorySchemaVersion: '2.0.0',
    resolvedAt: BUILD_EPOCH,
    resolver: identity(publishers[0] ?? {}),
    schemas,
    template,
    theme,
    publisher: publishers,
    dependencies: [],
    dependencyDag: [],
    lockDigest: '',
  };
  lock.lockDigest = profile('lock', lock);

  const renderPolicyFile = {
    name: 'gala-render-policy',
    version: '2.0.0',
  };
  const renderPolicyBytes = canonicalizeJcsBytes(renderPolicyFile);
  const renderPolicy = {
    name: 'gala-render-policy',
    version: '2.0.0',
    digest: digestRenderPolicyBytes(renderPolicyBytes),
  };
  const leafAction = actionResolution(
    'actions/cache',
    'internal/cache',
    Buffer.from('name: cache\nruns:\n  using: node24\n  main: dist/index.js\n'),
    'action.yaml',
    '100755',
  );
  const rootAction = actionResolution(
    'actions/checkout',
    undefined,
    Buffer.from(
      `name: checkout\nruns:\n  using: composite\n  steps:\n    - uses: ${leafAction.use}\n`,
    ),
    'action.yml',
  );
  const sourceBytes = {
    publication: Buffer.from('{"publication":true}\n'),
    author: Buffer.from('{"author":true}\n'),
    content: Buffer.from('# Source content\n'),
    caller: Buffer.from(
      `name: Gala caller\njobs:\n  build:\n    steps:\n      - run: |\n          printf '%s\\n' 'uses: ignored/example@${'5'.repeat(40)}'\n      - uses: ${rootAction.use}\n`,
    ),
  };
  const publication = {
    id: '018f47ca-4df5-7a74-b91f-0123456789b0',
    slug: 'fixture',
    title: 'Fixture publication',
    description: 'Semantic validator fixture',
    canonicalBase: 'https://example.com/',
    defaultLanguage: 'en',
    authorIds: [AUTHOR_ID],
    socialLinks: [],
    sourcePath: 'publication.json',
    sourceDigest: sha256Tagged(sourceBytes.publication),
  };
  const authors = [
    {
      id: AUTHOR_ID,
      displayName: 'Example Author',
      biography: '',
      links: [],
      localized: [],
      sourcePath: 'authors/example.json',
      sourceDigest: sha256Tagged(sourceBytes.author),
    },
  ];
  const renderedBody = '<p>Fixture</p>\n';
  const content = [
    {
      frontmatter: {
        id: CONTENT_ID,
        kind: 'article',
        title: 'Fixture',
        language: 'en',
        authorIds: [AUTHOR_ID],
        tags: [],
        status: 'published',
        createdAt: BUILD_EPOCH,
        publishedAt: BUILD_EPOCH,
        slug: 'fixture',
        redirects: [],
      },
      body: renderedBody,
      bodyMediaType: 'text/html',
      bodyDigest: sha256Tagged(Buffer.from(renderedBody, 'utf8')),
      renderPolicy,
      sourcePath: 'content/fixture.md',
      sourceRevision: SOURCE_COMMIT,
      sourceDigest: sha256Tagged(sourceBytes.content),
      resolvedAuthorIds: [AUTHOR_ID],
    },
  ];
  const navigation = {
    items: [],
    footerItems: [],
    source: {
      kind: 'built-in-default',
      defaultId: 'urn:gala:normalized-default:navigation:2.0.0',
      defaultDigest: '',
    },
  };
  navigation.source.defaultDigest = profile('navigationDefault', navigation);
  const appearance = {
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
  appearance.source.defaultDigest = profile('appearanceDefault', appearance);

  const themeBytes = Buffer.from(':root { color: black; }\n', 'utf8');
  const themeContract = {
    themeId: 'default',
    package: '@rathnasgala2/theme-default@2.0.0',
    contractVersion: '2.0.0',
    templateRange: '^2.0.0',
    stylesheets: ['styles/theme.css'],
    assets: [
      {
        path: 'styles/theme.css',
        mediaType: 'text/css; charset=utf-8',
        byteLength: String(themeBytes.length),
        sha256: sha256Tagged(themeBytes),
        license: 'MIT',
      },
    ],
    stylingContractDigest: tagged('styling-contract'),
  };
  const adapter = {
    adapterId: 'local-directory',
    adapterVersion: '2.0.0',
    adapterDigest: publishers[3]?.integrity,
  };
  const adapterCapability = {
    adapter,
    contractVersion: '2.0.0',
    protocolRange: '^2.0.0',
    capabilityDigest: '',
  };
  adapterCapability.capabilityDigest = profile(
    'adapterCapability',
    adapterCapability,
  );
  const treeEntries = [
    treeEntry('authors/example.json', sourceBytes.author),
    treeEntry('content/fixture.md', sourceBytes.content),
    treeEntry('.github/workflows/gala-publish-v2.yml', sourceBytes.caller),
    treeEntry('publication.json', sourceBytes.publication),
  ];
  const repositoryRootEntries = treeEntries
    .map(({ path, mode, objectId }) => ({ path, mode, objectId }))
    .sort((left, right) =>
      Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)),
    );
  const rootDigest = profile('repositoryRoot', repositoryRootEntries);
  const repository = {
    coordinate: 'owner/repository',
    repositoryId: '1001',
    repositoryOwnerId: '1002',
    sourceRevision: SOURCE_COMMIT,
    sourceTree: `sha1:${'3'.repeat(40)}`,
    buildEpoch: BUILD_EPOCH,
    treeEntries,
    routeNormalizationProfile: 'directory-index',
    contentRoutes: [{ contentId: CONTENT_ID, route: '/fixture/' }],
    exclusions: [
      {
        path: '.github/workflows/gala-publish-v2.yml',
        ruleId: 'workflow-source',
        reason: 'non-artifact-source',
      },
    ],
  };
  const buildInput = {
    schemaId: 'urn:gala:schema:build-input:2.0.0',
    schemaVersion: '2.0.0',
    contractVersion: '2.0.0',
    repository: {
      repositoryId: repository.repositoryId,
      repositoryOwnerId: repository.repositoryOwnerId,
      sourceRevision: SOURCE_COMMIT,
      rootDigest,
    },
    sourceRevision: SOURCE_COMMIT,
    packages: {
      schemas: identity(schemas),
      template: identity(template),
      theme: identity(theme),
      publisher: publishers.map(identity),
      dependencies: [],
    },
    publication,
    authors,
    content,
    navigation,
    appearance,
    modules: {},
    buildEpoch: BUILD_EPOCH,
    baseUrl: 'https://example.com',
    basePath: '/',
    destinationCapabilities: {
      adapter,
      baseUrl: 'https://example.com/',
      capabilityDigest: adapterCapability.capabilityDigest,
    },
    placements: [],
    inputDigest: '',
  };
  buildInput.inputDigest = profile('buildInput', buildInput);

  const workflowFilesContext = [
    {
      role: 'author-caller',
      repositoryId: repository.repositoryId,
      path: '.github/workflows/gala-publish-v2.yml',
      commit: WORKFLOW_COMMIT,
      identitySource: 'declared-graph',
      bytes: sourceBytes.caller,
    },
    {
      role: 'publish',
      repositoryId: '2001',
      path: '.github/workflows/publish-v2.yml',
      commit: WORKFLOW_COMMIT,
      identitySource: 'locked-release',
      bytes: Buffer.from(
        `name: publish\njobs:\n  authorize:\n    uses: rathnasgala2/publish/.github/workflows/authorize-v2.yml@${'2'.repeat(40)}\n`,
      ),
    },
    {
      role: 'authorize',
      repositoryId: '2001',
      path: '.github/workflows/authorize-v2.yml',
      commit: WORKFLOW_COMMIT,
      identitySource: 'locked-release',
      bytes: Buffer.from('name: authorize\n'),
    },
    {
      role: 'report',
      repositoryId: '2001',
      path: '.github/workflows/report-v2.yml',
      commit: WORKFLOW_COMMIT,
      identitySource: 'locked-release',
      bytes: Buffer.from('name: report\n'),
    },
  ];
  const workflowFiles = workflowFilesContext.map((row) => ({
    role: row.role,
    repositoryId: row.repositoryId,
    path: row.path,
    commit: row.commit,
    fileDigest: sha256Tagged(row.bytes),
    identitySource: row.identitySource,
  }));
  const actionsContext = [rootAction.context, leafAction.context];
  const actionPins = /** @type {UnknownRecord[]} */ (
    jcsSort([rootAction.pin, leafAction.pin])
  );
  const workflowIdentity = profile('buildWorkflowIdentity', { workflowFiles });

  const oidcProfile = {
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
    networkBoundaryProfileDigest: tagged('oidc-network'),
    tlsProfileDigest: tagged('oidc-tls'),
    discoveryEvidenceDigest: tagged('oidc-discovery'),
    fixtureDigest: tagged('oidc-fixture'),
    profileDigest: '',
  };
  oidcProfile.profileDigest = profile(
    'githubWorkloadOidcVerificationProfile',
    oidcProfile,
  );
  const issuerKeys = [
    {
      kty: 'RSA',
      alg: 'RS256',
      use: 'sig',
      kid: 'fixture',
      n: publicJwk.n,
      e: publicJwk.e,
    },
  ];
  const keySetDigest = profile('githubWorkloadOidcKeySet', issuerKeys);
  const workflowSha = WORKFLOW_COMMIT.slice('sha1:'.length);
  const expectedClaims = {
    actor: 'fixture-user',
    actor_id: '1003',
    aud: 'urn:gala:workload:deployment-intent:v2',
    event_name: 'workflow_dispatch',
    iss: 'https://token.actions.githubusercontent.com',
    job_workflow_ref: `rathnasgala2/publish/.github/workflows/authorize-v2.yml@${workflowSha}`,
    job_workflow_sha: workflowSha,
    jti: 'fixture-jti',
    ref: 'refs/heads/gala/publish/018f47ca-4df5-7a74-b91f-0123456789ab',
    repository: repository.coordinate,
    repository_id: repository.repositoryId,
    repository_owner: 'owner',
    repository_owner_id: repository.repositoryOwnerId,
    run_attempt: '1',
    run_id: '3001',
    run_number: '41',
    runner_environment: 'github-hosted',
    sha: workflowSha,
    sub: `repo:${repository.coordinate}:ref:refs/heads/gala/publish/018f47ca-4df5-7a74-b91f-0123456789ab`,
    workflow_ref: `${repository.coordinate}/.github/workflows/gala-publish-v2.yml@refs/heads/gala/publish/018f47ca-4df5-7a74-b91f-0123456789ab`,
    workflow_sha: workflowSha,
  };
  const now = Date.parse(BUILD_EPOCH) / 1_000;
  const jwtClaims = {
    ...expectedClaims,
    nbf: now - 1,
    iat: now,
    exp: now + 600,
  };
  const verifiedBinding = {
    issuer: expectedClaims.iss,
    audience: expectedClaims.aud,
    repository: expectedClaims.repository,
    repositoryId: expectedClaims.repository_id,
    repositoryOwner: expectedClaims.repository_owner,
    repositoryOwnerId: expectedClaims.repository_owner_id,
    ref: expectedClaims.ref,
    sourceCommit: SOURCE_COMMIT,
    workflowTriggerCommit: WORKFLOW_COMMIT,
    runId: expectedClaims.run_id,
    runNumber: expectedClaims.run_number,
    runAttempt: 1,
    eventName: expectedClaims.event_name,
    actor: expectedClaims.actor,
    actorId: expectedClaims.actor_id,
    callerWorkflow: workflowFiles[0],
    publishWorkflow: workflowFiles[1],
    authorizeWorkflow: workflowFiles[2],
    oidcVerificationProfileDigest: oidcProfile.profileDigest,
    issuerKeySetDigest: keySetDigest,
    issuerKeySetObservedAt: BUILD_EPOCH,
    verifiedAt: BUILD_EPOCH,
    workloadBindingDigest: '',
  };
  verifiedBinding.workloadBindingDigest = profile(
    'verifiedWorkloadBinding',
    verifiedBinding,
  );
  const workload = {
    compactJwt: compactJwt(jwtClaims),
    expectedClaims,
    verificationProfile: oidcProfile,
    issuerKeys,
    issuerKeySetObservedAt: BUILD_EPOCH,
    trustedNowEpochSeconds: String(now),
    commitNowEpochSeconds: String(now),
    authorizedAt: BUILD_EPOCH,
    verifiedBinding,
  };

  const runnerRow = {
    profile: 'gala-github-hosted-runner-compatibility-v2',
    runnerEnvironment: 'github-hosted',
    runnerImageRelease: 'ubuntu-24.04-20260901.1',
    softwareManifestDigest: tagged('runner-software'),
    sandboxPolicyDigest: tagged('runner-sandbox'),
    toolCatalogDigest: tagged('runner-tools'),
    fixtureDigest: tagged('runner-fixture'),
    evidenceDigest: tagged('runner-evidence'),
    rowDigest: '',
  };
  runnerRow.rowDigest = profile('githubHostedRunnerCompatibility', runnerRow);
  const nodeBytes = Buffer.from('node-24.18.0');
  const npmBytes = Buffer.from('npm-11.16.0');
  const runner = {
    compatibilityRow: runnerRow,
    nodeExecutableBytes: nodeBytes,
    npmExecutableBytes: npmBytes,
    networkPolicyDigest: tagged('sandbox-network'),
    filesystemPolicyDigest: tagged('sandbox-filesystem'),
    sandboxPolicyDigest: runnerRow.sandboxPolicyDigest,
    toolCatalogDigest: runnerRow.toolCatalogDigest,
  };
  const sandbox = {
    runnerEnvironment: 'github-hosted',
    runnerImageRelease: runnerRow.runnerImageRelease,
    runnerImageReleaseDigest: runnerRow.rowDigest,
    nodeVersion: '24.18.0',
    nodeExecutableDigest: sha256Tagged(nodeBytes),
    npmVersion: '11.16.0',
    npmExecutableDigest: sha256Tagged(npmBytes),
    locale: 'C.UTF-8',
    timezone: 'UTC',
    sourceDateEpoch: BUILD_EPOCH,
    networkPolicyDigest: runner.networkPolicyDigest,
    filesystemPolicyDigest: runner.filesystemPolicyDigest,
  };

  const routeBytes = Buffer.from('<!doctype html><p>Fixture</p>\n', 'utf8');
  const payloads = [
    { path: 'assets/theme.css', bytes: themeBytes },
    { path: 'fixture/index.html', bytes: routeBytes },
  ];
  const artifactOutputs = [
    {
      kind: 'asset',
      path: 'assets/theme.css',
      mediaType: 'text/css; charset=utf-8',
      sourceKind: 'theme-passive-asset',
      immutable: true,
      themeAssetPath: 'styles/theme.css',
    },
    {
      kind: 'route',
      path: 'fixture/index.html',
      mediaType: 'text/html; charset=utf-8',
      sourceKind: 'generated',
      routeClass: 'html',
      stableContentId: CONTENT_ID,
      sourceRevision: SOURCE_COMMIT,
    },
  ];
  const assets = [
    {
      path: 'assets/theme.css',
      mediaType: 'text/css; charset=utf-8',
      byteLength: String(themeBytes.length),
      sha256: sha256Tagged(themeBytes),
      immutable: true,
    },
  ];
  const routes = [
    {
      path: 'fixture/index.html',
      mediaType: 'text/html; charset=utf-8',
      byteLength: String(routeBytes.length),
      sha256: sha256Tagged(routeBytes),
      routeClass: 'html',
      stableContentId: CONTENT_ID,
      sourceRevision: SOURCE_COMMIT,
      interactionBearing: false,
    },
  ];
  const artifactProjection = [...assets, ...routes]
    .map(({ path, byteLength, sha256 }) => ({ path, byteLength, sha256 }))
    .sort((left, right) =>
      Buffer.compare(Buffer.from(left.path), Buffer.from(right.path)),
    );
  const artifactDigest = profile('artifact', artifactProjection);
  const includedSources = /** @type {UnknownRecord[]} */ (
    jcsSort([
      {
        path: publication.sourcePath,
        sha256: publication.sourceDigest,
        sourceRevision: SOURCE_COMMIT,
        role: 'publication',
      },
      {
        path: authors[0]?.sourcePath,
        sha256: authors[0]?.sourceDigest,
        sourceRevision: SOURCE_COMMIT,
        role: 'author',
      },
      {
        path: content[0]?.sourcePath,
        sha256: content[0]?.sourceDigest,
        sourceRevision: SOURCE_COMMIT,
        role: 'content',
      },
    ])
  );
  const excludedInputs = /** @type {UnknownRecord[]} */ (
    jcsSort([
      {
        path: '.github/workflows/gala-publish-v2.yml',
        sha256: sha256Tagged(sourceBytes.caller),
        ruleId: 'workflow-source',
        reason: 'non-artifact-source',
      },
    ])
  );
  const sourceInventoryDigest = profile('sourceInventory', {
    includedSources,
    excludedInputs,
  });
  const manifest = {
    schemaId: 'urn:gala:schema:artifact-manifest:2.0.0',
    schemaVersion: '2.0.0',
    repositoryNodeId: repository.repositoryId,
    sourceCommit: SOURCE_COMMIT,
    workflowIdentity,
    buildToolVersions: jcsSort([
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
      ...locked.map((row) => ({
        kind: 'package',
        package: row.package,
        version: row.version,
        digest: row.integrity,
      })),
    ]),
    buildInputDigest: buildInput.inputDigest,
    artifactDigest,
    routes,
    assets,
    findings: [],
    measurements: [],
    policyResult: 'pass',
    generatedAt: BUILD_EPOCH,
    reproducibilityClass: 'byte-identical',
    artifactId: ARTIFACT_ID,
    artifactFileCount: '2',
    artifactByteCount: String(themeBytes.length + routeBytes.length),
    sourceIdentity: {
      provider: 'github',
      repository: repository.coordinate,
      repositoryId: repository.repositoryId,
      repositoryOwnerId: repository.repositoryOwnerId,
      commit: SOURCE_COMMIT,
      treeDigest: rootDigest,
    },
    builder: identity(publishers[0] ?? {}),
    composition: {
      schemas: identity(schemas),
      template: identity(template),
      theme: identity(theme),
      publisher: publishers.map(identity),
      enabledModuleConfigurationDigests: [],
    },
    buildInputContractVersion: '2.0.0',
    redirects: [],
    declarativeHeaders: [],
    includedSources,
    excludedInputs,
    sourceInventoryDigest,
    validation: {
      profile: 'gala-artifact-validation-v2',
      version: '2.0.0',
      findingCount: 0,
      evidenceDigest: '',
    },
    manifestDigest: '',
  };
  manifest.validation.evidenceDigest = profile(
    'artifactValidationEvidence',
    manifest,
  );
  manifest.manifestDigest = profile('artifactManifest', manifest);

  const buildPolicyRelease = {
    policyReleaseId: POLICY_RELEASE_ID,
    policyProfile: 'gala-build-policy-v2',
    policyVersion: '2.0.0',
  };
  const buildPolicyDecision = {
    profile: 'gala-build-policy-decision-v2',
    policyReleaseId: POLICY_RELEASE_ID,
    policyProfile: buildPolicyRelease.policyProfile,
    policyVersion: buildPolicyRelease.policyVersion,
    approvedOverrides: [],
    manifestDigest: manifest.manifestDigest,
    policyResult: 'pass',
    findings: [],
    decisionDigest: '',
  };
  buildPolicyDecision.decisionDigest = profile(
    'buildPolicyDecision',
    buildPolicyDecision,
  );
  const carriersContext = [
    {
      purpose: 'verified-inputs',
      artifactId: '5001',
      expiresAt: '2026-01-02T00:00:00.000Z',
      bytes: Buffer.from('verified inputs'),
    },
    {
      purpose: 'unfrozen-output',
      artifactId: '5002',
      expiresAt: '2026-01-02T00:00:00.000Z',
      bytes: Buffer.from('unfrozen output'),
    },
  ];
  const carrierEvidence = carriersContext.map((carrier) => ({
    purpose: carrier.purpose,
    artifactId: carrier.artifactId,
    name: `gala-r${expectedClaims.run_id}-a1-${carrier.purpose}-v2.bin`,
    byteCount: String(carrier.bytes.length),
    digest: sha256Tagged(carrier.bytes),
    expiresAt: carrier.expiresAt,
  }));
  const assertedWorkload = {
    repository: expectedClaims.repository,
    repositoryId: expectedClaims.repository_id,
    repositoryOwner: expectedClaims.repository_owner,
    repositoryOwnerId: expectedClaims.repository_owner_id,
    ref: expectedClaims.ref,
    sourceCommit: SOURCE_COMMIT,
    workflowTriggerCommit: WORKFLOW_COMMIT,
    runId: expectedClaims.run_id,
    runNumber: expectedClaims.run_number,
    runAttempt: 1,
    eventName: expectedClaims.event_name,
    actor: expectedClaims.actor,
    actorId: expectedClaims.actor_id,
    callerPath: '.github/workflows/gala-publish-v2.yml',
    verificationState: 'pending-authorize-oidc',
  };
  const artifactLicenseConclusions = [
    {
      artifactPath: 'assets/theme.css',
      licenseConcluded: 'MIT',
      sourceKind: 'theme-passive-asset',
      themeAssetPath: 'styles/theme.css',
    },
    {
      artifactPath: 'fixture/index.html',
      licenseConcluded: 'NOASSERTION',
      sourceKind: 'generated',
    },
  ];
  const rebuildRecord = {
    repositoryId: repository.repositoryId,
    sourceCommit: SOURCE_COMMIT,
    sourceTree: repository.sourceTree,
    repositoryRootDigest: rootDigest,
    buildEpoch: BUILD_EPOCH,
    contractVersion: '2.0.0',
    builder: identity(publishers[0] ?? {}),
    schemas: identity(schemas),
    template: identity(template),
    theme: identity(theme),
    dependencyLockDigest: lock.lockDigest,
    packageReleaseCatalogDigest: packageReleaseCatalog.catalogDigest,
    buildInputDigest: buildInput.inputDigest,
    baseUrl: buildInput.baseUrl,
    basePath: buildInput.basePath,
    destinationCapabilityDigest: adapterCapability.capabilityDigest,
    policyReleaseId: POLICY_RELEASE_ID,
    buildPolicyDecisionDigest: buildPolicyDecision.decisionDigest,
    stylingContractDigest: themeContract.stylingContractDigest,
    renderPolicy,
    workflowIdentity,
  };
  const provenance = {
    schemaId: 'urn:gala:metadata:build-provenance:2.0.0',
    schemaVersion: '2.0.0',
    assertedWorkload,
    requiredOidcClaims: [...OIDC_CLAIMS],
    workflowFiles,
    actionPins,
    verifiedInputHandoff: carrierEvidence[0],
    unfrozenOutputHandoff: carrierEvidence[1],
    rebuildRecord,
    lockDigest: lock.lockDigest,
    packageReleaseCatalogDigest: packageReleaseCatalog.catalogDigest,
    buildInputDigest: buildInput.inputDigest,
    artifactId: ARTIFACT_ID,
    artifactDigest,
    manifestDigest: manifest.manifestDigest,
    sbomDigest: '',
    spdxLicenseListVersion: '3.28.0',
    spdxLicenseListDigest: SPDX_DIGEST,
    spdx23JsonSchemaDigest: SPDX_SCHEMA_DIGEST,
    artifactLicenseConclusions,
    policyReleaseId: POLICY_RELEASE_ID,
    buildPolicyDecisionDigest: buildPolicyDecision.decisionDigest,
    capabilityDecisionDigest: tagged('capability-decision'),
    stylingContractDigest: themeContract.stylingContractDigest,
    renderPolicy,
    sandbox,
    secretInputs: [],
  };

  const artifactHex = String(artifactDigest).slice('sha256:'.length);
  const sbomName = `galascribe-artifact-${artifactHex}`;
  const spdxFiles = payloads.map(({ path, bytes }, index) => ({
    SPDXID: `SPDXRef-File-${String(index + 1).padStart(6, '0')}`,
    fileName: `./${path}`,
    checksums: [
      { algorithm: 'SHA1', checksumValue: rawHash(bytes, 'sha1') },
      { algorithm: 'SHA256', checksumValue: rawHash(bytes, 'sha256') },
    ],
    licenseConcluded:
      artifactLicenseConclusions[index]?.licenseConcluded ?? 'NOASSERTION',
    copyrightText: 'NOASSERTION',
  }));
  const verificationCode = rawHash(
    Buffer.from(
      spdxFiles
        .map((file) => file.checksums[0]?.checksumValue ?? '')
        .sort()
        .join(''),
      'ascii',
    ),
    'sha1',
  );
  const spdxPackages = [
    {
      SPDXID: 'SPDXRef-Package-Artifact',
      name: sbomName,
      versionInfo: SOURCE_COMMIT,
      downloadLocation: 'NOASSERTION',
      filesAnalyzed: true,
      packageVerificationCode: {
        packageVerificationCodeValue: verificationCode,
      },
      licenseConcluded: 'NOASSERTION',
      licenseDeclared: 'NOASSERTION',
      copyrightText: 'NOASSERTION',
    },
    ...locked.map((row, index) =>
      spdxPackage(
        row,
        `SPDXRef-Package-Direct-${String(index).padStart(2, '0')}`,
      ),
    ),
  ];
  const relationships = [
    {
      spdxElementId: 'SPDXRef-DOCUMENT',
      relationshipType: 'DESCRIBES',
      relatedSpdxElement: 'SPDXRef-Package-Artifact',
    },
    ...spdxFiles.map((file) => ({
      spdxElementId: 'SPDXRef-Package-Artifact',
      relationshipType: 'CONTAINS',
      relatedSpdxElement: file.SPDXID,
    })),
    ...locked.map((_, index) => ({
      spdxElementId: 'SPDXRef-Package-Artifact',
      relationshipType: 'DEPENDS_ON',
      relatedSpdxElement: `SPDXRef-Package-Direct-${String(index).padStart(2, '0')}`,
    })),
  ].sort((left, right) => {
    const element = Buffer.compare(
      Buffer.from(left.spdxElementId),
      Buffer.from(right.spdxElementId),
    );
    if (element !== 0) return element;
    const type = Buffer.compare(
      Buffer.from(left.relationshipType),
      Buffer.from(right.relationshipType),
    );
    return (
      type ||
      Buffer.compare(
        Buffer.from(left.relatedSpdxElement),
        Buffer.from(right.relatedSpdxElement),
      )
    );
  });
  const sbom = {
    SPDXID: 'SPDXRef-DOCUMENT',
    spdxVersion: 'SPDX-2.3',
    dataLicense: 'CC0-1.0',
    name: sbomName,
    documentNamespace: `urn:gala:spdx:2:${artifactHex}`,
    creationInfo: {
      created: BUILD_EPOCH,
      creators: ['Tool: @rathnasgala2/publish-action-2.0.0'],
      licenseListVersion: '3.28.0',
    },
    documentDescribes: ['SPDXRef-Package-Artifact'],
    packages: spdxPackages,
    files: spdxFiles,
    relationships,
  };
  provenance.sbomDigest = sha256Tagged(canonicalizeJcsBytes(sbom));

  const reproducibilityRuns = [0, 1].map((index) => ({
    rootIdentity: tagged(`reproducibility-root-${String(index + 1)}`),
    initialEntries: [],
    files: payloads.map(({ path, bytes }) => ({ path, bytes })),
    indexProjection: structuredClone(artifactOutputs),
    findings: [],
    measurements: [],
  }));
  const context = {
    packageReleaseCatalog,
    registryFetchProfile,
    packageArtifacts,
    themeContract,
    adapterCapability,
    repository,
    normalizedSource: {
      publication,
      authors,
      content,
      navigation,
      appearance,
    },
    renderPolicyBytes,
    frozenEnvelopeBytes: frozenEnvelope(payloads, manifest, provenance, sbom),
    artifactOutputs,
    reproducibilityRuns,
    buildPolicyRelease,
    buildPolicyDecision,
    workflowFiles: workflowFilesContext,
    actions: actionsContext,
    workload,
    carriers: carriersContext,
    runner,
    themeFiles: [{ path: 'styles/theme.css', bytes: themeBytes }],
    capabilityDecisionDigest: provenance.capabilityDecisionDigest,
    spdxCatalogEntries: [{ kind: 'license', id: 'MIT', text: mitText }],
    officialSpdxValidation: {
      schemaDigest: SPDX_SCHEMA_DIGEST,
      accepted: true,
    },
  };
  const records = {
    lock,
    buildInput,
    artifactManifest: manifest,
    buildProvenance: provenance,
    sbom,
  };
  return { records, context };
}

/**
 * Rebuild the frozen carrier after a coordinated metadata substitution.
 *
 * @param {ReturnType<typeof makeFixture>} fixture complete fixture
 * @returns {void}
 */
function refreeze(fixture) {
  const runs = /** @type {UnknownRecord[]} */ (
    fixture.context.reproducibilityRuns
  );
  const files = /** @type {{path: string, bytes: Buffer}[]} */ (runs[0]?.files);
  fixture.context.frozenEnvelopeBytes = frozenEnvelope(
    files,
    /** @type {UnknownRecord} */ (fixture.records.artifactManifest),
    /** @type {UnknownRecord} */ (fixture.records.buildProvenance),
    /** @type {UnknownRecord} */ (fixture.records.sbom),
  );
}

/**
 * Recompute every package-catalog digest copy after a catalog mutation.
 *
 * @param {ReturnType<typeof makeFixture>} fixture complete fixture
 * @returns {void}
 */
function recatalog(fixture) {
  const catalog = /** @type {UnknownRecord} */ (
    fixture.context.packageReleaseCatalog
  );
  catalog.catalogDigest = profile('packageReleaseCatalog', catalog);
  const provenance = /** @type {UnknownRecord} */ (
    fixture.records.buildProvenance
  );
  provenance.packageReleaseCatalogDigest = catalog.catalogDigest;
  const rebuild = /** @type {UnknownRecord} */ (provenance.rebuildRecord);
  rebuild.packageReleaseCatalogDigest = catalog.catalogDigest;
  refreeze(fixture);
}

/**
 * @param {() => unknown} action operation expected to fail
 * @param {string} code exact semantic code
 * @returns {void}
 */
function assertCode(action, code) {
  assert.throws(
    action,
    (error) =>
      error instanceof BuildArtifactSemanticError &&
      error.code === code &&
      error.message === code,
  );
}

test('accepts the complete minimal lock/build/artifact/provenance/SPDX closure', () => {
  const fixture = makeFixture();
  const result = validateBuildArtifactSemantics(
    fixture.records,
    fixture.context,
  );
  const manifest = /** @type {UnknownRecord} */ (
    fixture.records.artifactManifest
  );
  const provenance = /** @type {UnknownRecord} */ (
    fixture.records.buildProvenance
  );
  const binding = /** @type {UnknownRecord} */ (
    /** @type {UnknownRecord} */ (fixture.context.workload).verifiedBinding
  );
  const actionPins = /** @type {UnknownRecord[]} */ (provenance.actionPins);
  const runs = /** @type {UnknownRecord[]} */ (
    fixture.context.reproducibilityRuns
  );

  assert.deepEqual(result, {
    lockDigest: /** @type {UnknownRecord} */ (fixture.records.lock).lockDigest,
    buildInputDigest: /** @type {UnknownRecord} */ (fixture.records.buildInput)
      .inputDigest,
    artifactDigest: manifest.artifactDigest,
    sourceInventoryDigest: manifest.sourceInventoryDigest,
    validationEvidenceDigest: /** @type {UnknownRecord} */ (manifest.validation)
      .evidenceDigest,
    manifestDigest: manifest.manifestDigest,
    buildPolicyDecisionDigest: /** @type {UnknownRecord} */ (
      fixture.context.buildPolicyDecision
    ).decisionDigest,
    provenanceDigest: profile('buildProvenance', provenance),
    sbomDigest: provenance.sbomDigest,
    workloadBindingDigest: binding.workloadBindingDigest,
    artifactFileCount: 2,
  });
  assert.equal(actionPins.length, 2);
  assert.notEqual(runs[0]?.rootIdentity, runs[1]?.rootIdentity);
  assert.deepEqual(runs[0]?.indexProjection, fixture.context.artifactOutputs);
  assert.deepEqual(runs[1]?.indexProjection, fixture.context.artifactOutputs);
});

test('fails closed on every exact root and context ledger', () => {
  const fixture = makeFixture();
  const records = structuredClone(fixture.records);
  records.extra = true;
  assertCode(
    () => validateBuildArtifactSemantics(records, fixture.context),
    'BUILD_ARTIFACT_RECORD_BUNDLE_INVALID',
  );

  const context = structuredClone(fixture.context);
  delete context.officialSpdxValidation;
  assertCode(
    () => validateBuildArtifactSemantics(fixture.records, context),
    'BUILD_ARTIFACT_CONTEXT_INVALID',
  );
});

test('rejects independently substituted lock, package-byte, and source facts', () => {
  {
    const fixture = makeFixture();
    const lock = /** @type {UnknownRecord} */ (fixture.records.lock);
    lock.lockDigest = tagged('substituted-lock');
    assertCode(
      () => validateBuildArtifactSemantics(fixture.records, fixture.context),
      'LOCK_DIGEST_INVALID',
    );
  }
  {
    const fixture = makeFixture();
    const artifacts = /** @type {UnknownRecord[]} */ (
      fixture.context.packageArtifacts
    );
    const artifact = artifacts[0];
    if (!artifact) throw new Error('missing artifact fixture');
    artifact.bytes = Buffer.from('repacked');
    assertCode(
      () => validateBuildArtifactSemantics(fixture.records, fixture.context),
      'LOCK_PACKAGE_BYTES_INVALID',
    );
  }
  {
    const fixture = makeFixture();
    const repository = /** @type {UnknownRecord} */ (
      fixture.context.repository
    );
    const entries = /** @type {UnknownRecord[]} */ (repository.treeEntries);
    const source = entries.find((entry) => entry.path === 'content/fixture.md');
    if (!source) throw new Error('missing source fixture');
    source.bytes = Buffer.from('substituted source');
    assertCode(
      () => validateBuildArtifactSemantics(fixture.records, fixture.context),
      'BUILD_SOURCE_TREE_INVALID',
    );
  }
});

test('rejects workload signature, workflow, carrier, and runner substitutions', () => {
  /** @type {{code: string, mutate: (fixture: ReturnType<typeof makeFixture>) => void}[]} */
  const mutations = [
    {
      code: 'WORKLOAD_INVALID',
      mutate(fixture) {
        const workload = /** @type {UnknownRecord} */ (
          fixture.context.workload
        );
        const segments = String(workload.compactJwt).split('.');
        const signature = segments[2];
        if (!segments[0] || !segments[1] || !signature) {
          throw new Error('missing JWT fixture');
        }
        workload.compactJwt = `${segments[0]}.${segments[1]}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`;
      },
    },
    {
      code: 'PROVENANCE_WORKFLOW_INVALID',
      mutate(fixture) {
        const workflows = /** @type {UnknownRecord[]} */ (
          fixture.context.workflowFiles
        );
        const workflow = workflows[0];
        if (!workflow) throw new Error('missing workflow fixture');
        workflow.bytes = Buffer.from('changed workflow');
      },
    },
    {
      code: 'PROVENANCE_CARRIER_INVALID',
      mutate(fixture) {
        const carriers = /** @type {UnknownRecord[]} */ (
          fixture.context.carriers
        );
        const carrier = carriers[0];
        if (!carrier) throw new Error('missing carrier fixture');
        carrier.bytes = Buffer.from('changed carrier');
      },
    },
    {
      code: 'PROVENANCE_SANDBOX_INVALID',
      mutate(fixture) {
        const runner = /** @type {UnknownRecord} */ (fixture.context.runner);
        runner.nodeExecutableBytes = Buffer.from('changed node');
      },
    },
  ];
  for (const { code, mutate } of mutations) {
    const fixture = makeFixture();
    mutate(fixture);
    assertCode(
      () => validateBuildArtifactSemantics(fixture.records, fixture.context),
      code,
    );
  }
});

test('rejects output, reproducibility, policy, theme-license, and SPDX substitutions', () => {
  /** @type {{code: string, mutate: (fixture: ReturnType<typeof makeFixture>) => void}[]} */
  const mutations = [
    {
      code: 'ARTIFACT_INVENTORY_INVALID',
      mutate(fixture) {
        const outputs = /** @type {UnknownRecord[]} */ (
          fixture.context.artifactOutputs
        );
        const output = outputs[0];
        if (!output) throw new Error('missing output fixture');
        output.path = 'assets/changed.css';
      },
    },
    {
      code: 'ARTIFACT_REPRODUCIBILITY_INVALID',
      mutate(fixture) {
        const runs = /** @type {UnknownRecord[]} */ (
          fixture.context.reproducibilityRuns
        );
        const run = runs[1];
        const files = /** @type {UnknownRecord[]} */ (run?.files);
        const file = files[0];
        if (!file) throw new Error('missing reproducibility fixture');
        file.bytes = Buffer.from('changed run');
      },
    },
    {
      code: 'ARTIFACT_POLICY_INVALID',
      mutate(fixture) {
        const decision = /** @type {UnknownRecord} */ (
          fixture.context.buildPolicyDecision
        );
        decision.policyVersion = '2.0.1';
      },
    },
    {
      code: 'PROVENANCE_LICENSE_INVALID',
      mutate(fixture) {
        const files = /** @type {UnknownRecord[]} */ (
          fixture.context.themeFiles
        );
        const file = files[0];
        if (!file) throw new Error('missing theme fixture');
        file.bytes = Buffer.from('changed theme');
      },
    },
    {
      code: 'SPDX_SBOM_INVALID',
      mutate(fixture) {
        const official = /** @type {UnknownRecord} */ (
          fixture.context.officialSpdxValidation
        );
        official.accepted = false;
      },
    },
  ];
  for (const { code, mutate } of mutations) {
    const fixture = makeFixture();
    mutate(fixture);
    assertCode(
      () => validateBuildArtifactSemantics(fixture.records, fixture.context),
      code,
    );
  }
});

test('rejects coordinated action-definition and duplicate-coordinate substitutions', () => {
  {
    const fixture = makeFixture();
    const actions = /** @type {UnknownRecord[]} */ (fixture.context.actions);
    const action = actions[0];
    if (!action) throw new Error('missing action fixture');
    const substitution = actionResolution(
      'actions/checkout',
      undefined,
      Buffer.from('name: substituted checkout\n'),
      'action.yml',
    );
    const substitutedContext = /** @type {UnknownRecord} */ (
      substitution.context
    );
    action.commitBytes = substitutedContext.commitBytes;
    action.treeObjects = substitutedContext.treeObjects;
    action.definitionBytes = substitutedContext.definitionBytes;
    const provenance = /** @type {UnknownRecord} */ (
      fixture.records.buildProvenance
    );
    const pins = /** @type {UnknownRecord[]} */ (provenance.actionPins);
    const pin = pins.find((candidate) => candidate.use === action.use);
    if (!pin) throw new Error('missing action pin fixture');
    pin.actionDefinitionDigest = digestActionDefinitionBlob(
      /** @type {Buffer} */ (action.definitionBytes),
    );
    refreeze(fixture);
    assertCode(
      () => validateBuildArtifactSemantics(fixture.records, fixture.context),
      'PROVENANCE_WORKFLOW_INVALID',
    );
  }
  {
    const fixture = makeFixture();
    const actions = /** @type {UnknownRecord[]} */ (fixture.context.actions);
    const action = actions[0];
    if (!action) throw new Error('missing action fixture');
    const duplicate = structuredClone(action);
    duplicate.definitionBytes = Buffer.from('name: duplicate checkout\n');
    actions.push(duplicate);
    const provenance = /** @type {UnknownRecord} */ (
      fixture.records.buildProvenance
    );
    const pins = /** @type {UnknownRecord[]} */ (provenance.actionPins);
    const originalPin = pins.find(
      (candidate) => candidate.use === duplicate.use,
    );
    if (!originalPin) throw new Error('missing duplicate action pin fixture');
    pins.push({
      use: duplicate.use,
      commit: originalPin.commit,
      actionDefinitionDigest: digestActionDefinitionBlob(
        /** @type {Buffer} */ (duplicate.definitionBytes),
      ),
    });
    provenance.actionPins = jcsSort(pins);
    refreeze(fixture);
    assertCode(
      () => validateBuildArtifactSemantics(fixture.records, fixture.context),
      'PROVENANCE_WORKFLOW_INVALID',
    );
  }
});

test('rejects action evidence and pins not derived from workflow bytes', () => {
  const fixture = makeFixture();
  const unreferenced = actionResolution(
    'actions/setup-node',
    undefined,
    Buffer.from('name: setup-node\nruns:\n  using: node24\n  main: index.js\n'),
    'action.yml',
  );
  const actions = /** @type {UnknownRecord[]} */ (fixture.context.actions);
  actions.push(unreferenced.context);
  const provenance = /** @type {UnknownRecord} */ (
    fixture.records.buildProvenance
  );
  const pins = /** @type {UnknownRecord[]} */ (provenance.actionPins);
  provenance.actionPins = jcsSort([...pins, unreferenced.pin]);
  refreeze(fixture);
  assertCode(
    () => validateBuildArtifactSemantics(fixture.records, fixture.context),
    'PROVENANCE_WORKFLOW_INVALID',
  );
});

test('rejects indistinguishable roots and coordinated unfrozen-index substitutions', () => {
  {
    const fixture = makeFixture();
    const runs = /** @type {UnknownRecord[]} */ (
      fixture.context.reproducibilityRuns
    );
    const first = runs[0];
    const second = runs[1];
    if (!first || !second) throw new Error('missing reproducibility fixture');
    second.rootIdentity = first.rootIdentity;
    assertCode(
      () => validateBuildArtifactSemantics(fixture.records, fixture.context),
      'ARTIFACT_REPRODUCIBILITY_INVALID',
    );
  }
  {
    const fixture = makeFixture();
    const runs = /** @type {UnknownRecord[]} */ (
      fixture.context.reproducibilityRuns
    );
    for (const run of runs) run.indexProjection = [];
    assertCode(
      () => validateBuildArtifactSemantics(fixture.records, fixture.context),
      'ARTIFACT_REPRODUCIBILITY_INVALID',
    );
  }
  {
    const fixture = makeFixture();
    const runs = /** @type {UnknownRecord[]} */ (
      fixture.context.reproducibilityRuns
    );
    const first = runs[0];
    if (!first) throw new Error('missing reproducibility fixture');
    first.initialEntries = ['preexisting-file'];
    assertCode(
      () => validateBuildArtifactSemantics(fixture.records, fixture.context),
      'ARTIFACT_REPRODUCIBILITY_INVALID',
    );
  }
});

test('rejects coordinated unrecognized first-party and empty-tag catalog rows', () => {
  {
    const fixture = makeFixture();
    const catalog = /** @type {UnknownRecord} */ (
      fixture.context.packageReleaseCatalog
    );
    const entries = /** @type {UnknownRecord[]} */ (catalog.entries);
    const unknown = structuredClone(entries[0]);
    if (!unknown) throw new Error('missing catalog fixture');
    unknown.package = '@rathnasgala2/publish-unrecognized';
    unknown.tarballPath =
      '/publish-unrecognized/publish-unrecognized-2.0.0.tgz';
    unknown.sourceRepository = 'rathnasgala2/publish';
    unknown.approvalEvidenceDigest = tagged('unrecognized:approval');
    unknown.provenanceBundleDigest = tagged('unrecognized:provenance');
    entries.push(unknown);
    entries.sort((left, right) =>
      Buffer.compare(
        Buffer.from(String(left.package)),
        Buffer.from(String(right.package)),
      ),
    );
    recatalog(fixture);
    assertCode(
      () => validateBuildArtifactSemantics(fixture.records, fixture.context),
      'LOCK_CATALOG_INVALID',
    );
  }
  {
    const fixture = makeFixture();
    const catalog = /** @type {UnknownRecord} */ (
      fixture.context.packageReleaseCatalog
    );
    const entries = /** @type {UnknownRecord[]} */ (catalog.entries);
    const entry = entries[0];
    if (!entry) throw new Error('missing catalog fixture');
    entry.sourceRef = 'refs/tags/';
    recatalog(fixture);
    assertCode(
      () => validateBuildArtifactSemantics(fixture.records, fixture.context),
      'LOCK_CATALOG_INVALID',
    );
  }
});

test('rejects coordinated non-plain policy profile substitutions', () => {
  const malformed = [
    { substituted: true },
    '',
    'x'.repeat(81),
    '<policy>',
    'policy\u202e',
    'e\u0301',
  ];
  for (const profileValue of malformed) {
    const fixture = makeFixture();
    const release = /** @type {UnknownRecord} */ (
      fixture.context.buildPolicyRelease
    );
    const decision = /** @type {UnknownRecord} */ (
      fixture.context.buildPolicyDecision
    );
    release.policyProfile = profileValue;
    decision.policyProfile = release.policyProfile;
    decision.decisionDigest = profile('buildPolicyDecision', decision);
    const provenance = /** @type {UnknownRecord} */ (
      fixture.records.buildProvenance
    );
    provenance.buildPolicyDecisionDigest = decision.decisionDigest;
    const rebuild = /** @type {UnknownRecord} */ (provenance.rebuildRecord);
    rebuild.buildPolicyDecisionDigest = decision.decisionDigest;
    refreeze(fixture);
    assertCode(
      () => validateBuildArtifactSemantics(fixture.records, fixture.context),
      'ARTIFACT_POLICY_INVALID',
    );
  }
});

test('publishes the explicit external-owner constraint ledger', () => {
  assert.ok(Object.isFrozen(BUILD_ARTIFACT_CONTEXT_CONSTRAINTS));
  assert.equal(BUILD_ARTIFACT_CONTEXT_CONSTRAINTS.length, 10);
  assert.equal(
    new Set(BUILD_ARTIFACT_CONTEXT_CONSTRAINTS).size,
    BUILD_ARTIFACT_CONTEXT_CONSTRAINTS.length,
  );
  assert.equal(
    BUILD_ARTIFACT_CONTEXT_CONSTRAINTS[1],
    'Git transport must obtain the selected commit and exact object bytes, derive sourceTree and buildEpoch, enumerate the complete source tree, and validate refs; this validator rehashes and resolves each retained action commit/tree/blob proof.',
  );
  assert.equal(
    BUILD_ARTIFACT_CONTEXT_CONSTRAINTS[5],
    'Exclusion-rule catalog membership, renderer output completeness, output media classification, and execution in two distinct empty roots must be supplied as immutable evidence; this validator checks their complete projections, partition, bytes, and equality.',
  );
});
