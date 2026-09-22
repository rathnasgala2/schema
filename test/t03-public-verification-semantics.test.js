import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { decodeUtf8 } from '../src/internal/bytes.js';
import {
  canonicalizeJcsBytes,
  sha256Tagged,
} from '../src/internal/canonical-jcs.js';
import {
  ACTIVE_DIGEST_PROFILES,
  derivePublicProbeRetryDelay,
} from '../src/internal/digest-profiles.js';
import { NETWORK_BOUNDARY_PROFILE_DIGEST } from '../src/internal/network-boundary.js';
import {
  canonicalizePublicDnsResolution,
  createPublicVerifierRequest,
  decodePublicHttpEntity,
  deriveMaximumRequiredHeadBytes,
  FORBIDDEN_VERIFICATION_HEADERS,
  isPublicTlsCertificateRevoked,
  joinVerificationUrl,
  LIVE_PUBLIC_VERIFICATION_BOUNDARIES,
  parsePublicTlsRevocationSet,
  parsePublicTlsTrustStore,
  PUBLIC_HTTP_LIMITS,
  PUBLIC_TLS_PROFILE_CONSTANTS,
  PUBLIC_VERIFIER_REQUEST_PROFILE,
  selectPublicHttpBodyFraming,
  validateCanonicalVerificationRoute,
  validateObservedRedirectLocation,
  validatePublicActivationDetectionObservation,
  validatePublicActivationDetectionPlan,
  validatePublicProbeAttempt,
  validatePublicTlsHandshakeEvidence,
  validatePublicTlsPeerIdentity,
  validatePublicTlsProfile,
  validatePublicTlsRevocationWindow,
  validatePublicVerificationBindings,
  validateVerificationContentType,
  validateVerificationHeaderExpectations,
  validateVerificationHeaderName,
  validateVerificationHeaderValue,
  validateVerificationPlan,
} from '../src/internal/public-verification-semantics.js';

const CANDIDATE_GENERATION = '018f2f2e-7b9a-7abc-8def-0123456789ab';
const PRIOR_GENERATION = '018f2f2e-7b9a-7abc-9def-0123456789ab';
const OPERATION_ID = '018f2f2e-7b9a-7abc-adef-0123456789ab';
const ATTEMPT_ID = '018f2f2e-7b9a-7abc-bdef-0123456789ab';
const ARTIFACT_ID = '018f2f2e-7b9a-7abc-8def-1123456789ab';
const AUTHORITY_ID = '018f2f2e-7b9a-7abc-8def-2123456789ab';
const ARTIFACT_DIGEST = sha256Tagged(Buffer.from('artifact'));
const PUBLIC_GENERATION_MARKER = Object.freeze({
  schemaId: 'urn:gala:schema:public-generation-marker:2.0.0',
  schemaVersion: '2.0.0',
  artifactId: ARTIFACT_ID,
  artifactDigest: ARTIFACT_DIGEST,
  generationId: CANDIDATE_GENERATION,
});
const MARKER_BYTES = canonicalizeJcsBytes(PUBLIC_GENERATION_MARKER);
const DIGEST_CANDIDATE = sha256Tagged(MARKER_BYTES);
const DIGEST_HTTP_OK = sha256Tagged(Buffer.from('ok'));
const DIGEST_PRIOR = sha256Tagged(Buffer.from('old'));
const TIMESTAMP_START = '2026-09-13T12:00:00.000Z';
const TIMESTAMP_END = '2026-09-13T12:05:00.000Z';
const OPERATION_DEADLINE = '2026-09-13T12:10:00.000Z';

/**
 * Assert a stable semantic error code.
 *
 * @param {() => unknown} callback failing operation
 * @param {string} code expected code
 * @returns {void}
 */
function assertCode(callback, code) {
  assert.throws(callback, (error) => {
    assert.equal(error instanceof Error, true);
    assert.equal(/** @type {Error} */ (error).message, code);
    return true;
  });
}

/**
 * Encode trust anchors in their supplied order.
 *
 * @param {Buffer[]} certificates exact DER fixtures
 * @returns {Buffer} framed store
 */
function encodeTrustStore(certificates) {
  const count = Buffer.alloc(4);
  count.writeUInt32BE(certificates.length);
  const rows = certificates.flatMap((certificate) => {
    const length = Buffer.alloc(4);
    length.writeUInt32BE(certificate.length);
    return [length, certificate];
  });
  return Buffer.concat([count, ...rows]);
}

/**
 * Sort fixture certificate bytes by their raw SHA-256 digest.
 *
 * @param {Buffer[]} certificates source certificates
 * @returns {Buffer[]} sorted certificates
 */
function sortCertificates(certificates) {
  return [...certificates].sort((left, right) =>
    Buffer.compare(
      createHash('sha256').update(left).digest(),
      createHash('sha256').update(right).digest(),
    ),
  );
}

/**
 * Create one accepted compact revocation set.
 *
 * @param {{issuerSpkiDigest: string, serialHex: string}[]} entries sorted entries
 * @returns {Uint8Array} exact compact JCS bytes
 */
function revocationBytes(entries = []) {
  return canonicalizeJcsBytes({
    validFrom: TIMESTAMP_START,
    validUntil: TIMESTAMP_END,
    entries,
  });
}

/**
 * Construct the exact public TLS profile around parsed source bindings.
 *
 * @param {ReturnType<typeof parsePublicTlsTrustStore>} trustStore parsed roots
 * @param {ReturnType<typeof parsePublicTlsRevocationSet>} revocationSet parsed revocations
 * @returns {Record<string, unknown>} TLS profile
 */
function tlsProfile(trustStore, revocationSet) {
  return {
    profile: PUBLIC_TLS_PROFILE_CONSTANTS.profile,
    trustStoreDigest: trustStore.trustStoreDigest,
    revocationSetDigest: revocationSet.revocationSetDigest,
    revocationValidUntil: revocationSet.value.validUntil,
    versions: [...PUBLIC_TLS_PROFILE_CONSTANTS.versions],
    cipherSuites: [...PUBLIC_TLS_PROFILE_CONSTANTS.cipherSuites],
    maximumHandshakeBytes: PUBLIC_TLS_PROFILE_CONSTANTS.maximumHandshakeBytes,
    maximumPresentedCertificates:
      PUBLIC_TLS_PROFILE_CONSTANTS.maximumPresentedCertificates,
    maximumCertificateBytes:
      PUBLIC_TLS_PROFILE_CONSTANTS.maximumCertificateBytes,
    maximumCertificateChainBytes:
      PUBLIC_TLS_PROFILE_CONSTANTS.maximumCertificateChainBytes,
    maximumCertificateExtensions:
      PUBLIC_TLS_PROFILE_CONSTANTS.maximumCertificateExtensions,
  };
}

/**
 * Construct one plan and its retained policy/history context.
 *
 * @param {boolean} [withRedirect] include one redirect hop
 * @returns {{plan: Record<string, unknown>[], context: {verificationOrigins: string[], verificationPlanDigest: string, maximumRedirectHops: number, maximumAttemptsPerTarget: number, maximumConcurrentStreams: number, maximumPublicResponseBytes: string, requestTimeoutSeconds: number, retainedPriorGenerationIdsByTargetId: Record<string, string[]>, authoritativeTargets: unknown[], marker: {origin: string, basePath: string, value: typeof PUBLIC_GENERATION_MARKER}}}} fixture
 */
function planFixture(withRedirect = false) {
  const origin = 'https://example.com';
  const route = '/.well-known/gala-generation.json';
  const initialUrl = `${origin}${route}`;
  const terminalUrl = withRedirect
    ? 'https://www.example.com/final'
    : initialUrl;
  const redirectChain = withRedirect
    ? [
        {
          hopNumber: 0,
          requestUrl: initialUrl,
          expectedStatus: 308,
          expectedLocation: terminalUrl,
        },
      ]
    : [];
  const expectedHeaders = [
    { name: 'content-type', value: 'application/json; charset=utf-8' },
  ];
  const priorHeaders = [
    { name: 'content-type', value: 'application/json; charset=utf-8' },
    { name: 'etag', value: '"old"' },
  ];
  const maximumResponseBytes = String(Math.max(MARKER_BYTES.length, 3));
  const maximumResponseWireBytes = String(6 * Number(maximumResponseBytes) + 5);
  const plan = [
    {
      targetId: 1,
      origin,
      route,
      requiredProbeRegions: ['us-east', 'us-west'],
      redirectChain,
      terminalRequestUrl: terminalUrl,
      expectedTerminalStatus: 200,
      expectedByteLength: String(MARKER_BYTES.length),
      maximumResponseBytes,
      maximumResponseWireBytes,
      requestTimeoutSeconds: 30,
      requestProfile: 'gala-public-verifier-v2',
      retryProfile: 'gala-public-probe-retry-v2',
      maximumAttempts: 4,
      maximumConcurrentStreams: 2,
      expectedHeaders,
      expectedCandidateDigest: DIGEST_CANDIDATE,
      recognizedPriorContracts: [
        {
          generationId: PRIOR_GENERATION,
          redirectChain,
          terminalRequestUrl: terminalUrl,
          expectedTerminalStatus: 200,
          expectedByteLength: '3',
          expectedHeaders: priorHeaders,
          expectedDigest: DIGEST_PRIOR,
        },
      ],
    },
  ];
  const profile = ACTIVE_DIGEST_PROFILES.verificationPlan;
  assert.ok(profile);
  const authoritativeTargets = plan.map((target) => {
    const authority = /** @type {Record<string, unknown>} */ ({ ...target });
    for (const key of [
      'targetId',
      'maximumResponseBytes',
      'maximumResponseWireBytes',
      'requestTimeoutSeconds',
      'requestProfile',
      'retryProfile',
      'maximumAttempts',
      'maximumConcurrentStreams',
    ]) {
      delete authority[key];
    }
    return authority;
  });
  const context = {
    verificationOrigins: [origin],
    verificationPlanDigest: profile.digest(plan),
    maximumRedirectHops: withRedirect ? 1 : 0,
    maximumAttemptsPerTarget: 4,
    maximumConcurrentStreams: 2,
    maximumPublicResponseBytes: maximumResponseBytes,
    requestTimeoutSeconds: 30,
    retainedPriorGenerationIdsByTargetId: { 1: [PRIOR_GENERATION] },
    authoritativeTargets,
    marker: { origin, basePath: '/', value: PUBLIC_GENERATION_MARKER },
  };
  return { plan, context };
}

/**
 * Construct a two-target plan with an exact operation-wide probe-slot demand.
 *
 * @param {number} baseProbeStreamCount sum of required region cardinalities
 * @param {number} maximumAttemptsPerTarget accepted attempt ceiling
 * @param {number} maximumRedirectHops accepted redirect ceiling
 * @returns {ReturnType<typeof planFixture>} capacity fixture
 */
function capacityPlanFixture(
  baseProbeStreamCount,
  maximumAttemptsPerTarget,
  maximumRedirectHops,
) {
  assert.ok(
    baseProbeStreamCount >= 9 && baseProbeStreamCount <= 16,
    'capacity fixture requires two valid region ledgers',
  );
  const fixture = planFixture();
  const markerTarget = fixture.plan[0];
  const markerAuthority = /** @type {Record<string, unknown>} */ (
    fixture.context.authoritativeTargets[0]
  );
  assert.ok(markerTarget);

  const markerRegions = Array.from(
    { length: 8 },
    (_, index) => `marker-${index + 1}`,
  );
  const additionalRegions = Array.from(
    { length: baseProbeStreamCount - markerRegions.length },
    (_, index) => `asset-${index + 1}`,
  );
  markerTarget.requiredProbeRegions = markerRegions;
  markerTarget.maximumAttempts = maximumAttemptsPerTarget;
  markerAuthority.requiredProbeRegions = markerRegions;

  const assetUrl = 'https://example.com/asset.txt';
  const assetTarget = /** @type {Record<string, unknown>} */ (
    structuredClone(markerTarget)
  );
  assetTarget.targetId = 2;
  assetTarget.route = '/asset.txt';
  assetTarget.requiredProbeRegions = additionalRegions;
  assetTarget.terminalRequestUrl = assetUrl;
  assetTarget.recognizedPriorContracts =
    /** @type {Record<string, unknown>[]} */ (
      assetTarget.recognizedPriorContracts
    ).map((prior) => ({ ...prior, terminalRequestUrl: assetUrl }));
  fixture.plan.push(assetTarget);

  const assetAuthority = /** @type {Record<string, unknown>} */ (
    structuredClone(markerAuthority)
  );
  assetAuthority.route = '/asset.txt';
  assetAuthority.requiredProbeRegions = additionalRegions;
  assetAuthority.terminalRequestUrl = assetUrl;
  assetAuthority.recognizedPriorContracts = /** @type {Record<
    string,
    unknown
  >[]} */ (assetAuthority.recognizedPriorContracts).map((prior) => ({
    ...prior,
    terminalRequestUrl: assetUrl,
  }));
  fixture.context.authoritativeTargets.push(assetAuthority);
  fixture.context.maximumAttemptsPerTarget = maximumAttemptsPerTarget;
  fixture.context.maximumRedirectHops = maximumRedirectHops;
  fixture.context.retainedPriorGenerationIdsByTargetId['2'] = [
    PRIOR_GENERATION,
  ];
  fixture.context.verificationPlanDigest =
    ACTIVE_DIGEST_PROFILES.verificationPlan?.digest(fixture.plan) ?? '';
  return fixture;
}

/**
 * Attach the exact public-probe evidence digest.
 *
 * @param {Record<string, unknown>} probe digest-less probe
 * @returns {Record<string, unknown>} complete probe
 */
function digestProbe(probe) {
  const profile = ACTIVE_DIGEST_PROFILES.publicProbeObservation;
  assert.ok(profile);
  return { ...probe, evidenceDigest: profile.digest(probe) };
}

/**
 * Replace a probe digest after changing retained facts.
 *
 * @param {Record<string, unknown>} probe previously digested probe
 * @returns {Record<string, unknown>} redigested probe
 */
function redigestProbe(probe) {
  const body = { ...probe };
  delete body.evidenceDigest;
  return digestProbe(body);
}

/**
 * Construct immutable ordinary-attempt authority for a fixture stream.
 *
 * @param {ReturnType<typeof planFixture>} fixture plan fixture
 * @param {Partial<{targetId: number, probeRegion: string, attemptNumber: number, priorAttempts: unknown[], activationObservedAt: string, verificationDeadlineAt: string, operationDeadline: string, leaseAuthority: Record<string, unknown>}>} [overrides] selected deviations
 * @returns {Parameters<typeof validatePublicProbeAttempt>[1]} attempt context
 */
function attemptContext(fixture, overrides = {}) {
  const { leaseAuthority: leaseOverrides = {}, ...contextOverrides } =
    overrides;
  const targetId = contextOverrides.targetId ?? 1;
  const probeRegion = contextOverrides.probeRegion ?? 'us-east';
  const attemptNumber = contextOverrides.attemptNumber ?? 1;
  return {
    plan: fixture.plan,
    planContext: fixture.context,
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    targetId,
    probeRegion,
    attemptNumber,
    proposedGenerationId: CANDIDATE_GENERATION,
    activationObservedAt: TIMESTAMP_START,
    verificationDeadlineAt: TIMESTAMP_END,
    operationDeadline: OPERATION_DEADLINE,
    priorAttempts: [],
    leaseAuthority: {
      operationId: OPERATION_ID,
      attemptId: ATTEMPT_ID,
      verificationPlanDigest: fixture.context.verificationPlanDigest,
      targetId,
      probeRegion,
      attemptNumber,
      leaseCurrent: true,
      cancelled: false,
      superseded: false,
      terminalIntegrityMismatch: false,
      ...leaseOverrides,
    },
    ...contextOverrides,
  };
}

/**
 * Attach the activation-detection probe digest.
 *
 * @param {Record<string, unknown>} probe digest-less probe
 * @returns {Record<string, unknown>} complete probe
 */
function digestDetectionProbe(probe) {
  const profile = ACTIVE_DIGEST_PROFILES.publicActivationDetectionProbe;
  assert.ok(profile);
  return { ...probe, evidenceDigest: profile.digest(probe) };
}

/**
 * Attach the activation-detection observation digest.
 *
 * @param {Record<string, unknown>} observation digest-less observation
 * @returns {Record<string, unknown>} complete observation
 */
function digestDetectionObservation(observation) {
  const profile = ACTIVE_DIGEST_PROFILES.publicActivationDetectionObservation;
  assert.ok(profile);
  return { ...observation, evidenceDigest: profile.digest(observation) };
}

test('canonical origin-route joining enforces byte normalization and the 2048 bound', () => {
  assert.equal(
    joinVerificationUrl('https://example.com', '/'),
    'https://example.com/',
  );
  assert.equal(
    joinVerificationUrl('https://example.com', '/caf%C3%A9/'),
    'https://example.com/caf%C3%A9/',
  );
  assert.equal(validateCanonicalVerificationRoute('/a%2Fb'), '/a%2Fb');
  const exactRoute = `/${'a'.repeat(2_048 - 'https://example.com'.length - 1)}`;
  assert.equal(
    joinVerificationUrl('https://example.com', exactRoute).length,
    2_048,
  );
  assertCode(
    () => joinVerificationUrl('https://example.com', `${exactRoute}a`),
    'VERIFICATION_URL_INVALID',
  );
  for (const route of ['/a//b', '/.', '/%7E', '/caf%c3%a9', '/caf%C3']) {
    assertCode(
      () => validateCanonicalVerificationRoute(route),
      'CANONICAL_ROUTE_INVALID',
    );
  }
  assertCode(
    () => joinVerificationUrl('https://example.com/path', '/again'),
    'VERIFICATION_URL_INVALID',
  );
});

test('observed redirect locations admit canonical HTTP evidence but not unsafe forms', () => {
  assert.equal(
    validateObservedRedirectLocation('http://example.com/path'),
    'http://example.com/path',
  );
  assert.equal(
    validateObservedRedirectLocation('http://example.com:443/path'),
    'http://example.com:443/path',
  );
  assert.equal(
    validateObservedRedirectLocation('http://127.0.0.1/path'),
    'http://127.0.0.1/path',
  );
  for (const value of [
    'http://example.com:80/path',
    'HTTP://example.com/path',
    'http://user@example.com/path',
    'http://example.com/path?secret=x',
  ]) {
    assert.throws(() => validateObservedRedirectLocation(value));
  }
});

test('the credential-free request bytes and immutable transport constants are exact', () => {
  assert.equal(
    PUBLIC_VERIFIER_REQUEST_PROFILE.requestProfile,
    'gala-public-verifier-v2',
  );
  assert.deepEqual(PUBLIC_TLS_PROFILE_CONSTANTS.versions, [
    'TLSv1.3',
    'TLSv1.2',
  ]);
  assert.deepEqual(PUBLIC_HTTP_LIMITS, {
    maximumStatusLineBytes: 1_024,
    maximumHeaderFields: 128,
    maximumHeaderFieldLineBytes: 8_192,
    maximumResponseHeadBytes: 32_768,
    maximumInformationalHeads: 4,
    maximumLocationBytes: 2_048,
  });
  assert.equal(LIVE_PUBLIC_VERIFICATION_BOUNDARIES.length, 11);
  assert.equal(
    decodeUtf8(
      createPublicVerifierRequest('https://example.com:8443', '/probe'),
    ),
    'GET /probe HTTP/1.1\r\nHost: example.com:8443\r\nAccept: */*\r\nAccept-Encoding: identity\r\nUser-Agent: gala-public-verifier/2.0.0\r\nConnection: close\r\n\r\n',
  );
});

test('trust-store framing enforces bounds, digest order, duplicates, and exact EOF', () => {
  const certificates = sortCertificates([
    Buffer.from([0x30, 0x01, 0x01]),
    Buffer.from([0x30, 0x01, 0x02]),
  ]);
  const bytes = encodeTrustStore(certificates);
  const parsed = parsePublicTlsTrustStore(bytes);
  assert.equal(parsed.trustStoreDigest, sha256Tagged(bytes));
  assert.deepEqual(
    parsed.anchors.map(({ der }) => der),
    certificates.map((certificate) => Uint8Array.from(certificate)),
  );

  assertCode(
    () => parsePublicTlsTrustStore(Buffer.alloc(4)),
    'TRUST_STORE_INVALID',
  );
  assertCode(
    () =>
      parsePublicTlsTrustStore(encodeTrustStore([...certificates].reverse())),
    'TRUST_STORE_INVALID',
  );
  assertCode(() => {
    const firstCertificate = certificates[0];
    assert.ok(firstCertificate);
    parsePublicTlsTrustStore(
      encodeTrustStore([firstCertificate, firstCertificate]),
    );
  }, 'TRUST_STORE_INVALID');
  assertCode(
    () => parsePublicTlsTrustStore(bytes.subarray(0, -1)),
    'TRUST_STORE_INVALID',
  );
  assertCode(
    () => parsePublicTlsTrustStore(Buffer.concat([bytes, Buffer.from([0])])),
    'TRUST_STORE_INVALID',
  );

  const boundary = sortCertificates(
    Array.from({ length: 512 }, (_, index) =>
      Buffer.from([index >> 8, index & 0xff]),
    ),
  );
  assert.equal(
    parsePublicTlsTrustStore(encodeTrustStore(boundary)).anchors.length,
    512,
  );
});

test('revocation sets require compact duplicate-free ordered JCS and exact validity bindings', () => {
  const issuerSpkiDer = Buffer.from('issuer-spki');
  const entry = {
    issuerSpkiDigest: sha256Tagged(issuerSpkiDer),
    serialHex: '01',
  };
  const parsed = parsePublicTlsRevocationSet(revocationBytes([entry]));
  const profile = ACTIVE_DIGEST_PROFILES.tlsRevocationSet;
  assert.ok(profile);
  assert.equal(parsed.revocationSetDigest, profile.digest(parsed.value));
  validatePublicTlsRevocationWindow(parsed, {
    connectionStartedAt: TIMESTAMP_END,
    expectedDigest: parsed.revocationSetDigest,
    expectedValidUntil: TIMESTAMP_END,
  });
  assert.equal(
    isPublicTlsCertificateRevoked(parsed, {
      issuerSpkiDer,
      serialBytes: Buffer.from([1]),
    }),
    true,
  );
  assert.equal(
    isPublicTlsCertificateRevoked(parsed, {
      issuerSpkiDer,
      serialBytes: Buffer.from([2]),
    }),
    false,
  );

  const pretty = Buffer.from(JSON.stringify(parsed.value, null, 2), 'utf8');
  assertCode(
    () => parsePublicTlsRevocationSet(pretty),
    'TLS_REVOCATION_SET_INVALID',
  );
  const unordered = revocationBytes([
    { issuerSpkiDigest: `sha256:${'ff'.repeat(32)}`, serialHex: '01' },
    { issuerSpkiDigest: `sha256:${'00'.repeat(32)}`, serialHex: '01' },
  ]);
  assertCode(
    () => parsePublicTlsRevocationSet(unordered),
    'TLS_REVOCATION_SET_INVALID',
  );
  assertCode(
    () =>
      parsePublicTlsRevocationSet(
        Buffer.from(
          `{"validFrom":"${TIMESTAMP_START}","validFrom":"${TIMESTAMP_START}","validUntil":"${TIMESTAMP_END}","entries":[]}`,
        ),
      ),
    'TLS_REVOCATION_SET_INVALID',
  );
  assertCode(
    () =>
      validatePublicTlsRevocationWindow(parsed, {
        connectionStartedAt: '2026-09-13T12:05:00.001Z',
        expectedDigest: parsed.revocationSetDigest,
        expectedValidUntil: TIMESTAMP_END,
      }),
    'TLS_REVOCATION_SET_INVALID',
  );
});

test('TLS profile and negotiation validation bind every exact constant and reject forbidden features', () => {
  const trustStore = parsePublicTlsTrustStore(
    encodeTrustStore(sortCertificates([Buffer.from([0x30, 0x00])])),
  );
  const revocationSet = parsePublicTlsRevocationSet(revocationBytes());
  const profile = tlsProfile(trustStore, revocationSet);
  const digest = validatePublicTlsProfile(profile, {
    trustStoreDigest: trustStore.trustStoreDigest,
    revocationSetDigest: revocationSet.revocationSetDigest,
    revocationValidUntil: revocationSet.value.validUntil,
  });
  assert.equal(
    digest,
    ACTIVE_DIGEST_PROFILES.publicTlsProfile?.digest(profile),
  );

  const evidence = {
    offeredVersions: [...PUBLIC_TLS_PROFILE_CONSTANTS.versions],
    offeredCipherSuites: [...PUBLIC_TLS_PROFILE_CONSTANTS.cipherSuites],
    offeredAlpnProtocols: ['http/1.1'],
    negotiatedVersion: 'TLSv1.3',
    negotiatedCipherSuite: 'TLS_AES_128_GCM_SHA256',
    negotiatedAlpnProtocol: 'http/1.1',
    handshakeByteCount: 524_288,
    presentedCertificates: [{ der: Buffer.from([0x30]), extensionCount: 64 }],
    compressionUsed: false,
    renegotiationUsed: false,
    earlyDataUsed: false,
    sessionResumed: false,
    postHandshakeAuthenticationUsed: false,
    clientCertificateUsed: false,
  };
  assert.equal(
    validatePublicTlsHandshakeEvidence(evidence).negotiatedVersion,
    'TLSv1.3',
  );
  assertCode(
    () =>
      validatePublicTlsHandshakeEvidence({
        ...evidence,
        negotiatedVersion: 'TLSv1.2',
      }),
    'PUBLIC_TLS_HANDSHAKE_INVALID',
  );
  assertCode(
    () =>
      validatePublicTlsHandshakeEvidence({ ...evidence, earlyDataUsed: true }),
    'PUBLIC_TLS_HANDSHAKE_INVALID',
  );
  assertCode(
    () =>
      validatePublicTlsHandshakeEvidence({
        ...evidence,
        handshakeByteCount: 524_289,
      }),
    'PUBLIC_TLS_HANDSHAKE_INVALID',
  );
});

test('TLS SAN matching distinguishes exact DNS, one-label wildcard, ACE, and native IP bytes', () => {
  validatePublicTlsPeerIdentity('https://example.com', {
    dnsNames: ['EXAMPLE.COM'],
    ipAddresses: [],
  });
  validatePublicTlsPeerIdentity('https://www.example.com', {
    dnsNames: ['*.example.com'],
    ipAddresses: [],
  });
  validatePublicTlsPeerIdentity('https://8.8.8.8', {
    dnsNames: [],
    ipAddresses: [Buffer.from([8, 8, 8, 8])],
  });
  assertCode(
    () =>
      validatePublicTlsPeerIdentity('https://a.b.example.com', {
        dnsNames: ['*.example.com'],
        ipAddresses: [],
      }),
    'TLS_PEER_IDENTITY_INVALID',
  );
  assertCode(
    () =>
      validatePublicTlsPeerIdentity('https://xn--bcher-kva.example', {
        dnsNames: ['*.example'],
        ipAddresses: [],
      }),
    'TLS_PEER_IDENTITY_INVALID',
  );
  assertCode(
    () =>
      validatePublicTlsPeerIdentity('https://8.8.8.8', {
        dnsNames: ['8.8.8.8'],
        ipAddresses: [],
      }),
    'TLS_PEER_IDENTITY_INVALID',
  );
});

test('DNS evidence deduplicates and sorts native bytes while all-address admission fails closed', () => {
  const ipv6 = [...Buffer.from('26064700470000000000000000001111', 'hex')];
  const evidence = {
    complete: true,
    truncated: false,
    elapsedMilliseconds: 5_000,
    cnameChain: ['edge.example.com'],
    addresses: [
      { family: 6, addressBytes: ipv6 },
      { family: 4, addressBytes: [8, 8, 8, 8] },
      { family: 4, addressBytes: [8, 8, 8, 8] },
    ],
  };
  const result = canonicalizePublicDnsResolution(
    'https://example.com',
    evidence,
  );
  assert.deepEqual(result.addresses, [
    { family: 4, addressBytes: [8, 8, 8, 8] },
    { family: 6, addressBytes: ipv6 },
  ]);
  assert.deepEqual(result.selected, { family: 4, addressBytes: [8, 8, 8, 8] });
  assertCode(
    () =>
      canonicalizePublicDnsResolution('https://example.com', {
        ...evidence,
        addresses: [
          { family: 4, addressBytes: [8, 8, 8, 8] },
          { family: 4, addressBytes: [10, 0, 0, 1] },
        ],
      }),
    'DNS_RESOLUTION_INVALID',
  );
  assertCode(
    () =>
      canonicalizePublicDnsResolution('https://example.com', {
        ...evidence,
        cnameChain: ['edge.example.com', 'example.com'],
      }),
    'DNS_RESOLUTION_INVALID',
  );
  assertCode(
    () =>
      canonicalizePublicDnsResolution('https://example.com', {
        ...evidence,
        elapsedMilliseconds: 5_001,
      }),
    'DNS_RESOLUTION_INVALID',
  );
});

test('content-type and retained-header grammars close names, values, order, and head feasibility', () => {
  for (const value of ['text/html', 'application/json; charset=utf-8']) {
    assert.equal(validateVerificationContentType(value), value);
  }
  for (const value of [
    'Text/HTML',
    'text/html;charset=utf-8',
    'text/html; charset=UTF-8',
    'text/html; charset=utf-8; q=1',
  ]) {
    assertCode(
      () => validateVerificationContentType(value),
      'VERIFICATION_CONTENT_TYPE_INVALID',
    );
  }
  assert.equal(validateVerificationHeaderName('content-type'), 'content-type');
  assert.equal(validateVerificationHeaderValue(''), '');
  assert.equal(validateVerificationHeaderValue('a b'), 'a b');
  assert.deepEqual(
    validateVerificationHeaderExpectations([
      { name: 'content-type', value: 'text/html' },
      { name: 'etag', value: '"x"' },
    ]),
    [
      { name: 'content-type', value: 'text/html' },
      { name: 'etag', value: '"x"' },
    ],
  );
  assert.deepEqual(FORBIDDEN_VERIFICATION_HEADERS.slice(-3), [
    'upgrade',
    'location',
    'content-length',
  ]);
  for (const name of FORBIDDEN_VERIFICATION_HEADERS) {
    assertCode(
      () => validateVerificationHeaderName(name),
      'VERIFICATION_HEADER_INVALID',
    );
  }
  for (const value of [' leading', 'trailing ', 'tab\tvalue', 'é']) {
    assertCode(
      () => validateVerificationHeaderValue(value),
      'VERIFICATION_HEADER_INVALID',
    );
  }

  assert.deepEqual(
    deriveMaximumRequiredHeadBytes([
      [{ name: 'etag', value: 'x' }],
      [{ name: 'etag', value: 'longer' }],
    ]),
    { names: ['etag'], maximumRequiredHeadBytes: 1_077 },
  );
  const first32 = Array.from({ length: 32 }, (_, index) => ({
    name: `x-${index.toString().padStart(2, '0')}`,
    value: 'x',
  }));
  assertCode(
    () =>
      deriveMaximumRequiredHeadBytes([first32, [{ name: 'x-32', value: 'x' }]]),
    'VERIFICATION_HEADER_CLOSURE_INVALID',
  );
  assertCode(
    () =>
      deriveMaximumRequiredHeadBytes([
        first32.map((row) => ({ ...row, value: 'x'.repeat(1_024) })),
      ]),
    'VERIFICATION_HEADER_CLOSURE_INVALID',
  );
});

test('HTTP framing admits only one canonical bounded Content-Length or chunked branch', () => {
  const contentLength = selectPublicHttpBodyFraming({
    contentLength: [' 2\t'],
    transferEncoding: [],
    trailer: [],
    contentEncoding: ['identity'],
  });
  assert.deepEqual(
    decodePublicHttpEntity(contentLength, Buffer.from('ok'), {
      maximumResponseBytes: '2',
      maximumResponseWireBytes: '17',
    }),
    {
      entity: Uint8Array.from(Buffer.from('ok')),
      observedByteLength: '2',
      observedDigest: DIGEST_HTTP_OK,
    },
  );
  const chunked = selectPublicHttpBodyFraming({
    contentLength: [],
    transferEncoding: ['\tChUnKeD '],
    trailer: [],
    contentEncoding: [],
  });
  assert.deepEqual(
    decodePublicHttpEntity(chunked, Buffer.from('2\r\nok\r\n0\r\n\r\n'), {
      maximumResponseBytes: '2',
      maximumResponseWireBytes: '17',
    }).entity,
    Uint8Array.from(Buffer.from('ok')),
  );
  for (const fields of [
    {
      contentLength: ['2', '2'],
      transferEncoding: [],
      trailer: [],
      contentEncoding: [],
    },
    {
      contentLength: ['2'],
      transferEncoding: ['chunked'],
      trailer: [],
      contentEncoding: [],
    },
    {
      contentLength: [],
      transferEncoding: ['gzip, chunked'],
      trailer: [],
      contentEncoding: [],
    },
    {
      contentLength: ['2'],
      transferEncoding: [],
      trailer: [],
      contentEncoding: ['gzip'],
    },
  ]) {
    assertCode(
      () => selectPublicHttpBodyFraming(fields),
      'HTTP_RESPONSE_FRAMING_INVALID',
    );
  }
  for (const bytes of [
    '02\r\nok\r\n0\r\n\r\n',
    'A\r\n0123456789\r\n0\r\n\r\n',
    '2\r\no',
  ]) {
    assert.throws(() =>
      decodePublicHttpEntity(chunked, Buffer.from(bytes), {
        maximumResponseBytes: '16',
        maximumResponseWireBytes: '101',
      }),
    );
  }
  assertCode(
    () =>
      decodePublicHttpEntity(
        chunked,
        Buffer.from([
          0xb1, 0x0d, 0x0a, 0x78, 0x0d, 0x0a, 0x30, 0x0d, 0x0a, 0x0d, 0x0a,
        ]),
        {
          maximumResponseBytes: '16',
          maximumResponseWireBytes: '101',
        },
      ),
    'HTTP_RESPONSE_FRAMING_INVALID',
  );
  assertCode(
    () =>
      decodePublicHttpEntity(
        /** @type {ReturnType<typeof selectPublicHttpBodyFraming>} */ (
          /** @type {unknown} */ ({ kind: 'unknown' })
        ),
        Buffer.from('1\r\nx\r\n0\r\n\r\n'),
        { maximumResponseBytes: '1', maximumResponseWireBytes: '11' },
      ),
    'HTTP_RESPONSE_FRAMING_INVALID',
  );
});

test('plan validation closes sorting, redirects, limits, headers, prior order, and digest', () => {
  for (const withRedirect of [false, true]) {
    const fixture = planFixture(withRedirect);
    assert.equal(
      validateVerificationPlan(fixture.plan, fixture.context),
      fixture.context.verificationPlanDigest,
    );
  }
  const wrongWire = planFixture();
  const wrongWireTarget = wrongWire.plan[0];
  assert.ok(wrongWireTarget);
  wrongWireTarget.maximumResponseWireBytes = '22';
  wrongWire.context.verificationPlanDigest =
    ACTIVE_DIGEST_PROFILES.verificationPlan?.digest(wrongWire.plan) ?? '';
  assertCode(
    () => validateVerificationPlan(wrongWire.plan, wrongWire.context),
    'VERIFICATION_PLAN_INVALID',
  );

  const wrongPriorOrder = planFixture();
  wrongPriorOrder.context.retainedPriorGenerationIdsByTargetId['1'] = [];
  assertCode(
    () =>
      validateVerificationPlan(wrongPriorOrder.plan, wrongPriorOrder.context),
    'VERIFICATION_PLAN_INVALID',
  );
  const wrongDigest = planFixture();
  wrongDigest.context.verificationPlanDigest = `sha256:${'00'.repeat(32)}`;
  assertCode(
    () => validateVerificationPlan(wrongDigest.plan, wrongDigest.context),
    'VERIFICATION_PLAN_INVALID',
  );

  const selfDigestedSubstitution = planFixture();
  const substitutedTarget = selfDigestedSubstitution.plan[0];
  assert.ok(substitutedTarget);
  substitutedTarget.expectedCandidateDigest = DIGEST_PRIOR;
  selfDigestedSubstitution.context.verificationPlanDigest =
    ACTIVE_DIGEST_PROFILES.verificationPlan?.digest(
      selfDigestedSubstitution.plan,
    ) ?? '';
  assertCode(
    () =>
      validateVerificationPlan(
        selfDigestedSubstitution.plan,
        selfDigestedSubstitution.context,
      ),
    'VERIFICATION_PLAN_INVALID',
  );

  const wrongMarkerAuthority = planFixture();
  wrongMarkerAuthority.context.marker = {
    ...wrongMarkerAuthority.context.marker,
    basePath: '/docs/',
  };
  assertCode(
    () =>
      validateVerificationPlan(
        wrongMarkerAuthority.plan,
        wrongMarkerAuthority.context,
      ),
    'VERIFICATION_PLAN_INVALID',
  );
});

test('plan capacity multiplies regions, attempts, and redirect hops with a 900-slot ceiling', () => {
  const regionBoundary = capacityPlanFixture(9, 10, 9);
  assert.equal(
    validateVerificationPlan(regionBoundary.plan, regionBoundary.context),
    regionBoundary.context.verificationPlanDigest,
  );
  const regionOverflow = capacityPlanFixture(10, 10, 9);
  assertCode(
    () => validateVerificationPlan(regionOverflow.plan, regionOverflow.context),
    'VERIFICATION_PLAN_INVALID',
  );

  const attemptBoundary = capacityPlanFixture(10, 9, 9);
  assert.equal(
    validateVerificationPlan(attemptBoundary.plan, attemptBoundary.context),
    attemptBoundary.context.verificationPlanDigest,
  );
  const attemptOverflow = capacityPlanFixture(10, 10, 9);
  assertCode(
    () =>
      validateVerificationPlan(attemptOverflow.plan, attemptOverflow.context),
    'VERIFICATION_PLAN_INVALID',
  );

  const redirectBoundary = capacityPlanFixture(10, 10, 8);
  assert.equal(
    validateVerificationPlan(redirectBoundary.plan, redirectBoundary.context),
    redirectBoundary.context.verificationPlanDigest,
  );
  const redirectOverflow = capacityPlanFixture(10, 10, 9);
  assertCode(
    () =>
      validateVerificationPlan(redirectOverflow.plan, redirectOverflow.context),
    'VERIFICATION_PLAN_INVALID',
  );
});

test('policy and intent bindings close network, TLS source, profile, and plan digests', () => {
  const trustStore = parsePublicTlsTrustStore(
    encodeTrustStore(sortCertificates([Buffer.from([0x30, 0x00])])),
  );
  const revocationSet = parsePublicTlsRevocationSet(revocationBytes());
  const profile = tlsProfile(trustStore, revocationSet);
  const fixture = planFixture();
  const publicTlsProfileDigest =
    ACTIVE_DIGEST_PROFILES.publicTlsProfile?.digest(profile);
  assert.ok(publicTlsProfileDigest);
  const owner = {
    networkBoundaryProfileDigest: NETWORK_BOUNDARY_PROFILE_DIGEST,
    publicTlsProfileDigest,
    publicTlsTrustStoreDigest: trustStore.trustStoreDigest,
    publicTlsRevocationSetDigest: revocationSet.revocationSetDigest,
    verificationPlanDigest: fixture.context.verificationPlanDigest,
    maximumPublicVerificationSeconds: 300,
    verificationOrigins: ['https://example.com'],
  };
  const policy = {
    ...owner,
    retryProfile: 'gala-public-probe-retry-v2',
    maximumAttemptsPerTarget: fixture.context.maximumAttemptsPerTarget,
    maximumRedirectHops: fixture.context.maximumRedirectHops,
    maximumConcurrentStreams: fixture.context.maximumConcurrentStreams,
    maximumPublicResponseBytes: fixture.context.maximumPublicResponseBytes,
    requestTimeoutSeconds: fixture.context.requestTimeoutSeconds,
  };
  assert.deepEqual(
    validatePublicVerificationBindings({
      policy,
      intent: { ...owner },
      tlsProfile: profile,
      trustStore,
      revocationSet,
      plan: fixture.plan,
      planContext: fixture.context,
    }),
    {
      networkBoundaryProfileDigest: NETWORK_BOUNDARY_PROFILE_DIGEST,
      publicTlsProfileDigest,
      verificationPlanDigest: fixture.context.verificationPlanDigest,
    },
  );
  assertCode(
    () =>
      validatePublicVerificationBindings({
        policy,
        intent: {
          ...owner,
          publicTlsTrustStoreDigest: `sha256:${'00'.repeat(32)}`,
        },
        tlsProfile: profile,
        trustStore,
        revocationSet,
        plan: fixture.plan,
        planContext: fixture.context,
      }),
    'PUBLIC_VERIFICATION_BINDING_INVALID',
  );
});

test('public-probe batches bind plan coordinates, chain links, selected contract, timestamps, and evidence digests', () => {
  const fixture = planFixture(true);
  const target = fixture.plan[0];
  assert.ok(target);
  const first = digestProbe({
    targetId: 1,
    attemptNumber: 1,
    hopNumber: 0,
    origin: target.origin,
    route: target.route,
    requestUrl: 'https://example.com/.well-known/gala-generation.json',
    probeRegion: 'us-east',
    contractGenerationId: CANDIDATE_GENERATION,
    requestStartedAt: '2026-09-13T12:00:00.000Z',
    observedAt: '2026-09-13T12:00:01.000Z',
    expectedCandidateDigest: DIGEST_CANDIDATE,
    responseHeadState: 'complete',
    observedStatus: 308,
    observedLocationState: 'retained',
    observedLocation: 'https://www.example.com/final',
    observedHeaders: [],
    bodyState: 'not-read',
    classification: 'redirect-match',
  });
  const second = digestProbe({
    targetId: 1,
    attemptNumber: 1,
    hopNumber: 1,
    origin: target.origin,
    route: target.route,
    requestUrl: 'https://www.example.com/final',
    probeRegion: 'us-east',
    contractGenerationId: CANDIDATE_GENERATION,
    precedingProbeEvidenceDigest: first.evidenceDigest,
    requestStartedAt: '2026-09-13T12:00:01.000Z',
    observedAt: '2026-09-13T12:00:02.000Z',
    expectedCandidateDigest: DIGEST_CANDIDATE,
    responseHeadState: 'complete',
    observedStatus: 200,
    observedLocationState: 'absent',
    observedHeaders: [
      {
        name: 'content-type',
        state: 'present',
        value: 'application/json; charset=utf-8',
      },
      { name: 'etag', state: 'absent' },
    ],
    bodyState: 'complete',
    observedByteLength: String(MARKER_BYTES.length),
    observedDigest: DIGEST_CANDIDATE,
    observedGenerationId: CANDIDATE_GENERATION,
    classification: 'candidate',
  });
  const context = attemptContext(fixture);
  validatePublicProbeAttempt([first, second], context);

  const priorFirst = redigestProbe({
    ...first,
    contractGenerationId: PRIOR_GENERATION,
  });
  const priorSecond = redigestProbe({
    ...second,
    contractGenerationId: PRIOR_GENERATION,
    precedingProbeEvidenceDigest: priorFirst.evidenceDigest,
    observedHeaders: [
      {
        name: 'content-type',
        state: 'present',
        value: 'application/json; charset=utf-8',
      },
      { name: 'etag', state: 'present', value: '"old"' },
    ],
    observedByteLength: '3',
    observedDigest: DIGEST_PRIOR,
    observedGenerationId: PRIOR_GENERATION,
    classification: 'recognized-prior',
  });
  validatePublicProbeAttempt([priorFirst, priorSecond], context);

  const inconclusivePrefix = /** @type {Record<string, unknown>} */ ({
    ...first,
    classification: 'inconclusive',
  });
  delete inconclusivePrefix.contractGenerationId;
  const retainedPrefix = redigestProbe(inconclusivePrefix);
  const mismatchingTerminal = /** @type {Record<string, unknown>} */ ({
    ...second,
    precedingProbeEvidenceDigest: retainedPrefix.evidenceDigest,
    observedStatus: 404,
    classification: 'integrity-mismatch',
  });
  delete mismatchingTerminal.contractGenerationId;
  delete mismatchingTerminal.observedGenerationId;
  const retainedMismatch = redigestProbe(mismatchingTerminal);
  validatePublicProbeAttempt([retainedPrefix, retainedMismatch], context);
  assertCode(
    () =>
      validatePublicProbeAttempt(
        [
          retainedPrefix,
          redigestProbe({
            ...retainedMismatch,
            classification: 'inconclusive',
          }),
        ],
        context,
      ),
    'PUBLIC_PROBE_INVALID',
  );

  const priorityFixture = planFixture();
  const priorityTarget = {
    targetId: 2,
    origin: 'https://example.com',
    route: '/page',
    requiredProbeRegions: ['us-east', 'us-west'],
    redirectChain: [],
    terminalRequestUrl: 'https://example.com/page',
    expectedTerminalStatus: 200,
    expectedByteLength: '2',
    maximumResponseBytes: '2',
    maximumResponseWireBytes: '17',
    requestTimeoutSeconds: 30,
    requestProfile: 'gala-public-verifier-v2',
    retryProfile: 'gala-public-probe-retry-v2',
    maximumAttempts: 4,
    maximumConcurrentStreams: 2,
    expectedHeaders: [
      { name: 'content-type', value: 'text/html; charset=utf-8' },
    ],
    expectedCandidateDigest: DIGEST_HTTP_OK,
    recognizedPriorContracts: [
      {
        generationId: PRIOR_GENERATION,
        redirectChain: [],
        terminalRequestUrl: 'https://example.com/page',
        expectedTerminalStatus: 200,
        expectedByteLength: '2',
        expectedHeaders: [
          { name: 'content-type', value: 'text/html; charset=utf-8' },
        ],
        expectedDigest: DIGEST_HTTP_OK,
      },
    ],
  };
  priorityFixture.plan.push(priorityTarget);
  const priorityAuthority = /** @type {Record<string, unknown>} */ ({
    ...priorityTarget,
  });
  for (const key of [
    'targetId',
    'maximumResponseBytes',
    'maximumResponseWireBytes',
    'requestTimeoutSeconds',
    'requestProfile',
    'retryProfile',
    'maximumAttempts',
    'maximumConcurrentStreams',
  ]) {
    delete priorityAuthority[key];
  }
  priorityFixture.context.authoritativeTargets.push(priorityAuthority);
  priorityFixture.context.retainedPriorGenerationIdsByTargetId['2'] = [
    PRIOR_GENERATION,
  ];
  priorityFixture.context.verificationPlanDigest =
    ACTIVE_DIGEST_PROFILES.verificationPlan?.digest(priorityFixture.plan) ?? '';
  const priorityProbe = digestProbe({
    targetId: 2,
    attemptNumber: 1,
    hopNumber: 0,
    origin: priorityTarget.origin,
    route: priorityTarget.route,
    requestUrl: priorityTarget.terminalRequestUrl,
    probeRegion: 'us-east',
    contractGenerationId: PRIOR_GENERATION,
    requestStartedAt: TIMESTAMP_START,
    observedAt: '2026-09-13T12:00:01.000Z',
    expectedCandidateDigest: DIGEST_HTTP_OK,
    responseHeadState: 'complete',
    observedStatus: 200,
    observedLocationState: 'absent',
    observedHeaders: [
      {
        name: 'content-type',
        state: 'present',
        value: 'text/html; charset=utf-8',
      },
    ],
    bodyState: 'complete',
    observedByteLength: '2',
    observedDigest: DIGEST_HTTP_OK,
    classification: 'recognized-prior',
  });
  assertCode(
    () =>
      validatePublicProbeAttempt(
        [priorityProbe],
        attemptContext(priorityFixture, { targetId: 2 }),
      ),
    'PUBLIC_PROBE_INVALID',
  );

  const wrongLink = digestProbe({
    ...second,
    precedingProbeEvidenceDigest: `sha256:${'00'.repeat(32)}`,
  });
  assertCode(
    () => validatePublicProbeAttempt([first, wrongLink], context),
    'PUBLIC_PROBE_INVALID',
  );
  assertCode(
    () =>
      validatePublicProbeAttempt(
        [first, { ...second, evidenceDigest: `sha256:${'00'.repeat(32)}` }],
        context,
      ),
    'PUBLIC_PROBE_INVALID',
  );
  const missingGeneration = { ...second };
  delete missingGeneration.observedGenerationId;
  missingGeneration.evidenceDigest =
    ACTIVE_DIGEST_PROFILES.publicProbeObservation?.digest(missingGeneration) ??
    '';
  assertCode(
    () => validatePublicProbeAttempt([first, missingGeneration], context),
    'PUBLIC_PROBE_INVALID',
  );
  const markerPrefix = redigestProbe({
    ...first,
    classification: 'inconclusive',
  });
  const markerWithoutIdentity = { ...missingGeneration };
  markerWithoutIdentity.precedingProbeEvidenceDigest =
    markerPrefix.evidenceDigest;
  markerWithoutIdentity.classification = 'inconclusive';
  validatePublicProbeAttempt(
    [markerPrefix, redigestProbe(markerWithoutIdentity)],
    context,
  );
});

test('no-response probes remain bounded inconclusive evidence with no invented facts', () => {
  const fixture = planFixture();
  const target = fixture.plan[0];
  assert.ok(target);
  const probe = digestProbe({
    targetId: 1,
    attemptNumber: 1,
    hopNumber: 0,
    origin: target.origin,
    route: target.route,
    requestUrl: target.terminalRequestUrl,
    probeRegion: 'us-west',
    requestStartedAt: TIMESTAMP_START,
    observedAt: TIMESTAMP_START,
    expectedCandidateDigest: DIGEST_CANDIDATE,
    responseHeadState: 'not-received',
    observedLocationState: 'absent',
    observedHeaders: [],
    bodyState: 'not-read',
    classification: 'inconclusive',
  });
  validatePublicProbeAttempt(
    [probe],
    attemptContext(fixture, { probeRegion: 'us-west' }),
  );
});

test('ordinary probe leases bind every operation, plan, stream, and attempt coordinate', () => {
  const fixture = planFixture();
  const target = fixture.plan[0];
  assert.ok(target);
  const probe = digestProbe({
    targetId: 1,
    attemptNumber: 1,
    hopNumber: 0,
    origin: target.origin,
    route: target.route,
    requestUrl: target.terminalRequestUrl,
    probeRegion: 'us-east',
    requestStartedAt: TIMESTAMP_START,
    observedAt: TIMESTAMP_START,
    expectedCandidateDigest: DIGEST_CANDIDATE,
    responseHeadState: 'not-received',
    observedLocationState: 'absent',
    observedHeaders: [],
    bodyState: 'not-read',
    classification: 'inconclusive',
  });
  const context = attemptContext(fixture);
  validatePublicProbeAttempt([probe], context);
  const lease = /** @type {Record<string, unknown>} */ (context.leaseAuthority);
  const swappedLeaseMembers = {
    operationId: ATTEMPT_ID,
    attemptId: OPERATION_ID,
    verificationPlanDigest: DIGEST_HTTP_OK,
    targetId: 2,
    probeRegion: 'us-west',
    attemptNumber: 2,
  };
  for (const [field, replacement] of Object.entries(swappedLeaseMembers)) {
    assertCode(
      () =>
        validatePublicProbeAttempt([probe], {
          ...context,
          leaseAuthority: { ...lease, [field]: replacement },
        }),
      'PUBLIC_PROBE_INVALID',
    );
  }
});

test('ordinary stream history closes attempt gaps, retry jitter, terminal suppression, and latest-safe-start gates', () => {
  const fixture = planFixture();
  const target = fixture.plan[0];
  assert.ok(target);
  const firstObservedAt = '2026-09-13T12:00:01.000Z';
  const retryDelay = derivePublicProbeRetryDelay({
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    proposedGenerationId: CANDIDATE_GENERATION,
    targetId: 1,
    probeRegion: 'us-west',
    nextAttemptNumber: 2,
  });
  const secondEligibleAt = new Date(
    Date.parse(firstObservedAt) + retryDelay,
  ).toISOString();
  const secondProbe = digestProbe({
    targetId: 1,
    attemptNumber: 2,
    hopNumber: 0,
    origin: target.origin,
    route: target.route,
    requestUrl: target.terminalRequestUrl,
    probeRegion: 'us-west',
    requestStartedAt: secondEligibleAt,
    observedAt: secondEligibleAt,
    expectedCandidateDigest: DIGEST_CANDIDATE,
    responseHeadState: 'not-received',
    observedLocationState: 'absent',
    observedHeaders: [],
    bodyState: 'not-read',
    classification: 'inconclusive',
  });
  const priorAttempt = {
    attemptNumber: 1,
    requestStartedAt: TIMESTAMP_START,
    terminalClassification: 'inconclusive',
    observedAt: firstObservedAt,
    terminalEvidenceDigest: sha256Tagged(Buffer.from('attempt-one')),
  };
  validatePublicProbeAttempt(
    [secondProbe],
    attemptContext(fixture, {
      probeRegion: 'us-west',
      attemptNumber: 2,
      priorAttempts: [priorAttempt],
    }),
  );
  assertCode(
    () =>
      validatePublicProbeAttempt(
        [secondProbe],
        attemptContext(fixture, {
          probeRegion: 'us-west',
          attemptNumber: 2,
          priorAttempts: [],
        }),
      ),
    'PUBLIC_PROBE_INVALID',
  );
  const oneMillisecondEarly = redigestProbe({
    ...secondProbe,
    requestStartedAt: new Date(Date.parse(secondEligibleAt) - 1).toISOString(),
  });
  assertCode(
    () =>
      validatePublicProbeAttempt(
        [oneMillisecondEarly],
        attemptContext(fixture, {
          probeRegion: 'us-west',
          attemptNumber: 2,
          priorAttempts: [priorAttempt],
        }),
      ),
    'PUBLIC_PROBE_INVALID',
  );
  assertCode(
    () =>
      validatePublicProbeAttempt(
        [secondProbe],
        attemptContext(fixture, {
          probeRegion: 'us-west',
          attemptNumber: 2,
          priorAttempts: [
            { ...priorAttempt, terminalClassification: 'candidate' },
          ],
        }),
      ),
    'PUBLIC_PROBE_INVALID',
  );
  assertCode(
    () =>
      validatePublicProbeAttempt(
        [secondProbe],
        attemptContext(fixture, {
          probeRegion: 'us-west',
          attemptNumber: 2,
          priorAttempts: [priorAttempt],
          leaseAuthority: {
            leaseCurrent: false,
            cancelled: true,
            superseded: false,
            terminalIntegrityMismatch: false,
          },
        }),
      ),
    'PUBLIC_PROBE_INVALID',
  );

  const postCutoff = redigestProbe({
    ...secondProbe,
    attemptNumber: 1,
    requestStartedAt: '2026-09-13T12:00:00.001Z',
    observedAt: '2026-09-13T12:00:00.001Z',
  });
  assertCode(
    () =>
      validatePublicProbeAttempt(
        [postCutoff],
        attemptContext(fixture, {
          probeRegion: 'us-west',
          verificationDeadlineAt: '2026-09-13T12:00:30.000Z',
        }),
      ),
    'PUBLIC_PROBE_INVALID',
  );

  /** @type {Record<string, unknown>[]} */
  const priorAttempts = [];
  let eligibleAt = Date.parse(TIMESTAMP_START);
  for (let attemptNumber = 1; attemptNumber <= 4; attemptNumber += 1) {
    const requestStartedAt = new Date(eligibleAt).toISOString();
    const observedAt = new Date(eligibleAt + 1).toISOString();
    priorAttempts.push({
      attemptNumber,
      requestStartedAt,
      terminalClassification: 'inconclusive',
      observedAt,
      terminalEvidenceDigest: sha256Tagged(
        Buffer.from(`attempt-${attemptNumber}`),
      ),
    });
    if (attemptNumber < 4) {
      eligibleAt =
        Date.parse(observedAt) +
        derivePublicProbeRetryDelay({
          operationId: OPERATION_ID,
          attemptId: ATTEMPT_ID,
          proposedGenerationId: CANDIDATE_GENERATION,
          targetId: 1,
          probeRegion: 'us-west',
          nextAttemptNumber: attemptNumber + 1,
        });
    }
  }
  const fifthProbe = redigestProbe({
    ...secondProbe,
    attemptNumber: 5,
    requestStartedAt: new Date(eligibleAt + 1).toISOString(),
    observedAt: new Date(eligibleAt + 1).toISOString(),
  });
  assertCode(
    () =>
      validatePublicProbeAttempt(
        [fifthProbe],
        attemptContext(fixture, {
          probeRegion: 'us-west',
          attemptNumber: 5,
          priorAttempts,
        }),
      ),
    'PUBLIC_PROBE_INVALID',
  );
});

test('only 101 may be retained as a complete final informational-status mismatch', () => {
  const fixture = planFixture();
  const target = fixture.plan[0];
  assert.ok(target);
  /**
   * @param {number} observedStatus retained final status
   * @returns {Record<string, unknown>} digested probe
   */
  const informational = (observedStatus) =>
    digestProbe({
      targetId: 1,
      attemptNumber: 1,
      hopNumber: 0,
      origin: target.origin,
      route: target.route,
      requestUrl: target.terminalRequestUrl,
      probeRegion: 'us-east',
      requestStartedAt: TIMESTAMP_START,
      observedAt: TIMESTAMP_START,
      expectedCandidateDigest: DIGEST_CANDIDATE,
      responseHeadState: 'complete',
      observedStatus,
      observedLocationState: 'absent',
      observedHeaders: [
        { name: 'content-type', state: 'absent' },
        { name: 'etag', state: 'absent' },
      ],
      bodyState: 'not-read',
      classification: 'integrity-mismatch',
    });
  assertCode(
    () =>
      validatePublicProbeAttempt([informational(100)], attemptContext(fixture)),
    'PUBLIC_PROBE_INVALID',
  );
  validatePublicProbeAttempt([informational(101)], attemptContext(fixture));
});

test('activation detection validates its exact plan, probe domain, append transition, and basis candidate', () => {
  const fixture = planFixture();
  const markerTarget = fixture.plan[0];
  assert.ok(markerTarget);
  const intent = {
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    artifactId: ARTIFACT_ID,
    proposedGenerationId: CANDIDATE_GENERATION,
    authorizedAt: TIMESTAMP_START,
    verificationDeadlineLimit: TIMESTAMP_END,
    activationDetectionPlanDigest: '',
  };
  const detectionPlan = {
    profile: 'gala-public-activation-detection-v2',
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    artifactId: ARTIFACT_ID,
    proposedGenerationId: CANDIDATE_GENERATION,
    target: markerTarget,
    probeRegion: 'us-east',
    firstEligibleAt: TIMESTAMP_START,
    lastEligibleAt: TIMESTAMP_END,
    maximumAttempts: 91,
    intervalSeconds: 60,
    requestTimeoutSeconds: 30,
    maximumRedirectHops: 0,
    reservedProbeSlots: '91',
    planDigest: '',
  };
  const detectionPlanProfile =
    ACTIVE_DIGEST_PROFILES.publicActivationDetectionPlan;
  assert.ok(detectionPlanProfile);
  detectionPlan.planDigest = detectionPlanProfile.digest(detectionPlan);
  intent.activationDetectionPlanDigest = detectionPlan.planDigest;
  const detectionPlanContext = {
    intent,
    verificationPlan: fixture.plan,
    verificationPlanContext: fixture.context,
  };
  assert.equal(
    validatePublicActivationDetectionPlan(detectionPlan, detectionPlanContext),
    detectionPlan,
  );
  const probe = digestDetectionProbe({
    targetId: 1,
    hopNumber: 0,
    origin: markerTarget.origin,
    route: markerTarget.route,
    requestUrl: markerTarget.terminalRequestUrl,
    probeRegion: 'us-east',
    contractGenerationId: CANDIDATE_GENERATION,
    requestStartedAt: TIMESTAMP_START,
    observedAt: '2026-09-13T12:00:01.000Z',
    expectedCandidateDigest: DIGEST_CANDIDATE,
    responseHeadState: 'complete',
    observedStatus: 200,
    observedLocationState: 'absent',
    observedHeaders: [
      {
        name: 'content-type',
        state: 'present',
        value: 'application/json; charset=utf-8',
      },
      { name: 'etag', state: 'absent' },
    ],
    bodyState: 'complete',
    observedByteLength: String(MARKER_BYTES.length),
    observedDigest: DIGEST_CANDIDATE,
    observedGenerationId: CANDIDATE_GENERATION,
    classification: 'candidate',
  });
  const observation = digestDetectionObservation({
    profile: 'gala-public-activation-detection-observation-v2',
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    planDigest: detectionPlan.planDigest,
    detectionAttemptNumber: 1,
    eligibleAt: TIMESTAMP_START,
    probes: [probe],
    receivedAt: '2026-09-13T12:00:02.000Z',
  });
  const observationContext = {
    detectionPlan,
    detectionPlanContext,
    operationDeadline: OPERATION_DEADLINE,
    retainedObservationCount: 0,
    leaseAuthority: {
      operationId: OPERATION_ID,
      attemptId: ATTEMPT_ID,
      planDigest: detectionPlan.planDigest,
      authorityId: AUTHORITY_ID,
      authorityEpoch: '1',
      currentAuthorityId: AUTHORITY_ID,
      currentAuthorityEpoch: '1',
      authorityState: 'active',
      activationBasisAbsent: true,
      cancelled: false,
      superseded: false,
    },
  };
  const result = validatePublicActivationDetectionObservation(
    observation,
    observationContext,
  );
  assert.deepEqual(result.activationBasisCandidate, {
    source: 'gala-public-marker-detection',
    observedAt: '2026-09-13T12:00:01.000Z',
    evidenceDigest: observation.evidenceDigest,
  });
  assertCode(
    () =>
      validatePublicActivationDetectionObservation(observation, {
        ...observationContext,
        retainedObservationCount: 1,
      }),
    'ACTIVATION_DETECTION_OBSERVATION_INVALID',
  );
  const probeWithOrdinaryAttempt = /** @type {Record<string, unknown>} */ ({
    ...probe,
    attemptNumber: 1,
  });
  delete probeWithOrdinaryAttempt.evidenceDigest;
  const wrongDomainProbe = digestDetectionProbe(probeWithOrdinaryAttempt);
  const wrongDomainObservation = /** @type {Record<string, unknown>} */ ({
    ...observation,
    probes: [wrongDomainProbe],
  });
  delete wrongDomainObservation.evidenceDigest;
  assertCode(
    () =>
      validatePublicActivationDetectionObservation(
        digestDetectionObservation(wrongDomainObservation),
        observationContext,
      ),
    'ACTIVATION_DETECTION_OBSERVATION_INVALID',
  );
  assert.deepEqual(
    validatePublicActivationDetectionObservation(observation, {
      ...observationContext,
      existingObservation: observation,
    }).replayed,
    true,
  );

  const secondProbeBody = /** @type {Record<string, unknown>} */ ({
    ...probe,
    requestStartedAt: '2026-09-13T12:01:00.000Z',
    observedAt: '2026-09-13T12:01:01.000Z',
  });
  delete secondProbeBody.evidenceDigest;
  const secondDetectionProbe = digestDetectionProbe(secondProbeBody);
  const secondObservation = digestDetectionObservation({
    profile: 'gala-public-activation-detection-observation-v2',
    operationId: OPERATION_ID,
    attemptId: ATTEMPT_ID,
    planDigest: detectionPlan.planDigest,
    detectionAttemptNumber: 2,
    eligibleAt: '2026-09-13T12:01:00.000Z',
    probes: [secondDetectionProbe],
    receivedAt: '2026-09-13T12:01:02.000Z',
  });
  assert.equal(typeof observation.evidenceDigest, 'string');
  assertCode(
    () =>
      validatePublicActivationDetectionObservation(secondObservation, {
        ...observationContext,
        retainedObservationCount: 1,
        retainedLastEvidenceDigest: /** @type {string} */ (
          observation.evidenceDigest
        ),
        previousObservation: observation,
      }),
    'ACTIVATION_DETECTION_OBSERVATION_INVALID',
  );
});
