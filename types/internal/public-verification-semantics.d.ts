/**
 * Validate one canonical public route used by verification URLs.
 *
 * @param {unknown} value candidate route
 * @returns {string} validated route
 */
export function validateCanonicalVerificationRoute(value: unknown): string;
/**
 * Join an exact verification origin and canonical route by byte concatenation.
 *
 * @param {unknown} origin candidate verification origin
 * @param {unknown} route candidate canonical route
 * @returns {string} exact verification URL
 */
export function joinVerificationUrl(origin: unknown, route: unknown): string;
/**
 * Validate one retained normalized HTTP/HTTPS redirect location.
 *
 * @param {unknown} value candidate absolute location
 * @returns {string} validated location
 */
export function validateObservedRedirectLocation(value: unknown): string;
/**
 * Construct the exact credential-free HTTP/1.1 request bytes.
 *
 * Suppression of ambient headers, credentials, redirects, proxies and state is
 * a live transport boundary enumerated above.
 *
 * @param {unknown} origin exact verification origin
 * @param {unknown} route exact canonical route
 * @returns {Uint8Array} request head with no body
 */
export function createPublicVerifierRequest(origin: unknown, route: unknown): Uint8Array;
/**
 * Parse the exact bounded trust-store framing.
 *
 * Certificate DER/PKIX validity is intentionally delegated to the enumerated
 * live certificate-verifier boundary.
 *
 * @param {unknown} input exact trust-store bytes
 * @returns {{source: Uint8Array, trustStoreDigest: string, anchors: {der: Uint8Array, digest: string}[]}} parsed store
 */
export function parsePublicTlsTrustStore(input: unknown): {
    source: Uint8Array;
    trustStoreDigest: string;
    anchors: {
        der: Uint8Array;
        digest: string;
    }[];
};
/**
 * Parse duplicate-free compact JCS TLS revocation-set bytes.
 *
 * @param {unknown} input exact source bytes
 * @returns {{source: Uint8Array, value: {validFrom: string, validUntil: string, entries: {issuerSpkiDigest: string, serialHex: string}[]}, revocationSetDigest: string}} parsed set
 */
export function parsePublicTlsRevocationSet(input: unknown): {
    source: Uint8Array;
    value: {
        validFrom: string;
        validUntil: string;
        entries: {
            issuerSpkiDigest: string;
            serialHex: string;
        }[];
    };
    revocationSetDigest: string;
};
/**
 * Require a parsed revocation set to be current and exactly policy-bound.
 *
 * @param {ReturnType<typeof parsePublicTlsRevocationSet>} revocationSet parsed set
 * @param {{connectionStartedAt: string, expectedDigest: string, expectedValidUntil: string}} context retained connection/policy context
 * @returns {void}
 */
export function validatePublicTlsRevocationWindow(revocationSet: ReturnType<typeof parsePublicTlsRevocationSet>, context: {
    connectionStartedAt: string;
    expectedDigest: string;
    expectedValidUntil: string;
}): void;
/**
 * Test one externally extracted positive certificate serial against the set.
 *
 * @param {ReturnType<typeof parsePublicTlsRevocationSet>} revocationSet parsed set
 * @param {{issuerSpkiDer: Uint8Array, serialBytes: Uint8Array}} identity selected non-root certificate identity
 * @returns {boolean} whether the certificate is revoked
 */
export function isPublicTlsCertificateRevoked(revocationSet: ReturnType<typeof parsePublicTlsRevocationSet>, identity: {
    issuerSpkiDer: Uint8Array;
    serialBytes: Uint8Array;
}): boolean;
/**
 * Validate the exact closed public TLS policy record and source bindings.
 *
 * @param {unknown} value candidate profile
 * @param {{trustStoreDigest: string, revocationSetDigest: string, revocationValidUntil: string}} sources parsed source bindings
 * @returns {string} public TLS profile digest
 */
export function validatePublicTlsProfile(value: unknown, sources: {
    trustStoreDigest: string;
    revocationSetDigest: string;
    revocationValidUntil: string;
}): string;
/**
 * Validate live TLS negotiation and presentation bounds supplied by transport.
 *
 * The evidence object is an in-process context boundary, not a wire record.
 * Certificate meaning remains owned by the explicitly enumerated verifier.
 *
 * @param {unknown} value live transport facts
 * @returns {{presentedCertificates: {der: Uint8Array, extensionCount: number}[], negotiatedVersion: string, negotiatedCipherSuite: string}} bounded facts
 */
export function validatePublicTlsHandshakeEvidence(value: unknown): {
    presentedCertificates: {
        der: Uint8Array;
        extensionCount: number;
    }[];
    negotiatedVersion: string;
    negotiatedCipherSuite: string;
};
/**
 * Validate externally extracted SAN evidence against the canonical origin.
 *
 * CN values are intentionally absent from this context boundary.
 *
 * @param {unknown} origin exact verification origin
 * @param {{dnsNames: unknown[], ipAddresses: unknown[]}} sans selected leaf SAN values
 * @returns {void}
 */
export function validatePublicTlsPeerIdentity(origin: unknown, sans: {
    dnsNames: unknown[];
    ipAddresses: unknown[];
}): void;
/**
 * Canonicalize one complete fresh DNS answer and require every address public.
 *
 * Evidence acquisition is a live resolver boundary; this function validates
 * its bounded retained context without using host address predicates.
 *
 * @param {unknown} origin canonical DNS verification origin
 * @param {unknown} value fresh resolver evidence
 * @returns {{cnameChain: string[], addresses: {family: 4 | 6, addressBytes: number[]}[], selected: {family: 4 | 6, addressBytes: number[]}}} canonical safe answer
 */
export function canonicalizePublicDnsResolution(origin: unknown, value: unknown): {
    cnameChain: string[];
    addresses: {
        family: 4 | 6;
        addressBytes: number[];
    }[];
    selected: {
        family: 4 | 6;
        addressBytes: number[];
    };
};
/**
 * Validate the exact verification content-type grammar.
 *
 * @param {unknown} value candidate value
 * @returns {string} validated value
 */
export function validateVerificationContentType(value: unknown): string;
/**
 * Validate an expected verification header name.
 *
 * @param {unknown} value candidate name
 * @returns {string} validated name
 */
export function validateVerificationHeaderName(value: unknown): string;
/**
 * Validate a safely retainable verification header value.
 *
 * @param {unknown} value candidate value
 * @returns {string} validated value
 */
export function validateVerificationHeaderValue(value: unknown): string;
/**
 * Validate one unique ASCII-sorted expected-header array.
 *
 * @param {unknown} value candidate expectation array
 * @returns {{name: string, value: string}[]} validated rows
 */
export function validateVerificationHeaderExpectations(value: unknown): {
    name: string;
    value: string;
}[];
/**
 * Derive the exact pre-request retained-header union and feasibility bound.
 *
 * @param {unknown[]} expectationSets candidate followed by eligible prior arrays
 * @returns {{names: string[], maximumRequiredHeadBytes: number}} derived closure
 */
export function deriveMaximumRequiredHeadBytes(expectationSets: unknown[]): {
    names: string[];
    maximumRequiredHeadBytes: number;
};
/**
 * Select one exact admitted HTTP/1.1 terminal-body framing branch.
 *
 * Inputs are already case-folded raw field values from the bounded head parser;
 * this in-process context is not persisted.
 *
 * @param {{contentLength: string[], transferEncoding: string[], trailer: string[], contentEncoding: string[]}} fields parsed framing fields
 * @returns {{kind: 'content-length', length: bigint} | {kind: 'chunked'}} framing
 */
export function selectPublicHttpBodyFraming(fields: {
    contentLength: string[];
    transferEncoding: string[];
    trailer: string[];
    contentEncoding: string[];
}): {
    kind: "content-length";
    length: bigint;
} | {
    kind: "chunked";
};
/**
 * Decode one complete canonical HTTP/1.1 entity under retained bounds.
 *
 * Timeout/cancellation versus clean-EOF incomplete classification remains a
 * live transport fact; this function accepts only a complete supplied buffer.
 *
 * @param {ReturnType<typeof selectPublicHttpBodyFraming>} framing admitted framing
 * @param {unknown} input exact wire-body bytes
 * @param {{maximumResponseBytes: string, maximumResponseWireBytes: string}} limits retained target limits
 * @returns {{entity: Uint8Array, observedByteLength: string, observedDigest: string}} decoded entity
 */
export function decodePublicHttpEntity(framing: ReturnType<typeof selectPublicHttpBodyFraming>, input: unknown, limits: {
    maximumResponseBytes: string;
    maximumResponseWireBytes: string;
}): {
    entity: Uint8Array;
    observedByteLength: string;
    observedDigest: string;
};
/**
 * Validate the complete deterministic verification plan against retained policy.
 *
 * `authoritativeTargets`, `marker`, and
 * `retainedPriorGenerationIdsByTargetId` are immutable server-owned context,
 * not plan members. Target IDs and every common policy/limit member are derived
 * here rather than trusted from a self-digested candidate plan.
 *
 * @param {unknown} value candidate target array
 * @param {{verificationOrigins: string[], verificationPlanDigest: string, maximumRedirectHops: number, maximumAttemptsPerTarget: number, maximumConcurrentStreams: number, maximumPublicResponseBytes: string, requestTimeoutSeconds: number, retainedPriorGenerationIdsByTargetId: Record<string, string[]>, authoritativeTargets?: unknown[], marker?: unknown}} context retained policy/history/target authority
 * @returns {string} verified plan digest
 */
export function validateVerificationPlan(value: unknown, context: {
    verificationOrigins: string[];
    verificationPlanDigest: string;
    maximumRedirectHops: number;
    maximumAttemptsPerTarget: number;
    maximumConcurrentStreams: number;
    maximumPublicResponseBytes: string;
    requestTimeoutSeconds: number;
    retainedPriorGenerationIdsByTargetId: Record<string, string[]>;
    authoritativeTargets?: unknown[];
    marker?: unknown;
}): string;
/**
 * Validate network/TLS/plan digest equality across policy and intent owners.
 *
 * @param {{policy: Record<string, unknown>, intent: Record<string, unknown>, tlsProfile: unknown, trustStore: ReturnType<typeof parsePublicTlsTrustStore>, revocationSet: ReturnType<typeof parsePublicTlsRevocationSet>, plan: unknown, planContext: Parameters<typeof validateVerificationPlan>[1]}} context retained authority context
 * @returns {{networkBoundaryProfileDigest: string, publicTlsProfileDigest: string, verificationPlanDigest: string}} verified digests
 */
export function validatePublicVerificationBindings(context: {
    policy: Record<string, unknown>;
    intent: Record<string, unknown>;
    tlsProfile: unknown;
    trustStore: ReturnType<typeof parsePublicTlsTrustStore>;
    revocationSet: ReturnType<typeof parsePublicTlsRevocationSet>;
    plan: unknown;
    planContext: Parameters<typeof validateVerificationPlan>[1];
}): {
    networkBoundaryProfileDigest: string;
    publicTlsProfileDigest: string;
    verificationPlanDigest: string;
};
/**
 * Validate one atomically emitted ordinary public-probe attempt batch.
 *
 * @param {unknown} value probe rows for exactly one target/region/attempt
 * @param {{plan: unknown, planContext: Parameters<typeof validateVerificationPlan>[1], operationId: string, attemptId: string, targetId: number, probeRegion: string, attemptNumber: number, proposedGenerationId: string, activationObservedAt: string, verificationDeadlineAt: string, operationDeadline: string, priorAttempts: unknown[], leaseAuthority: unknown}} context immutable plan, stream-history, lease, and timing context
 * @returns {void}
 */
export function validatePublicProbeAttempt(value: unknown, context: {
    plan: unknown;
    planContext: Parameters<typeof validateVerificationPlan>[1];
    operationId: string;
    attemptId: string;
    targetId: number;
    probeRegion: string;
    attemptNumber: number;
    proposedGenerationId: string;
    activationObservedAt: string;
    verificationDeadlineAt: string;
    operationDeadline: string;
    priorAttempts: unknown[];
    leaseAuthority: unknown;
}): void;
/**
 * Validate the immutable activation-detection plan against its intent, complete
 * verification plan, and accepted public-verification policy.
 *
 * @param {unknown} value candidate activation-detection plan
 * @param {{intent: Record<string, unknown>, verificationPlan: unknown, verificationPlanContext: Parameters<typeof validateVerificationPlan>[1]}} context retained owners
 * @returns {Record<string, unknown>} validated plan
 */
export function validatePublicActivationDetectionPlan(value: unknown, context: {
    intent: Record<string, unknown>;
    verificationPlan: unknown;
    verificationPlanContext: Parameters<typeof validateVerificationPlan>[1];
}): Record<string, unknown>;
/**
 * Validate one activation-detection observation, its immutable lease authority,
 * exact append transition, retry predecessor, and coordinate-replay behavior.
 * `leaseAuthority` is the snapshot that authorized the already-leased request;
 * a later closure may still retain that truthful observation but remains an
 * external compare-and-set boundary for installing the derived activation basis.
 *
 * @param {unknown} value candidate observation
 * @param {{detectionPlan: unknown, detectionPlanContext: Parameters<typeof validatePublicActivationDetectionPlan>[1], operationDeadline: string, retainedObservationCount: number, retainedLastEvidenceDigest?: string, previousObservation?: unknown, existingObservation?: unknown, leaseAuthority: unknown}} context immutable plan/ledger/lease context
 * @returns {{observation: Record<string, unknown>, replayed: boolean, observationCount: number, lastEvidenceDigest: string, terminalClassification: string, activationBasisCandidate?: {source: string, observedAt: string, evidenceDigest: string}}} validated append/replay result
 */
export function validatePublicActivationDetectionObservation(value: unknown, context: {
    detectionPlan: unknown;
    detectionPlanContext: Parameters<typeof validatePublicActivationDetectionPlan>[1];
    operationDeadline: string;
    retainedObservationCount: number;
    retainedLastEvidenceDigest?: string;
    previousObservation?: unknown;
    existingObservation?: unknown;
    leaseAuthority: unknown;
}): {
    observation: Record<string, unknown>;
    replayed: boolean;
    observationCount: number;
    lastEvidenceDigest: string;
    terminalClassification: string;
    activationBasisCandidate?: {
        source: string;
        observedAt: string;
        evidenceDigest: string;
    };
};
export const FORBIDDEN_VERIFICATION_HEADERS: readonly string[];
export const PUBLIC_TLS_PROFILE_CONSTANTS: Readonly<{
    profile: "gala-public-tls-v2";
    versions: readonly string[];
    cipherSuites: readonly string[];
    maximumHandshakeBytes: 524288;
    maximumPresentedCertificates: 8;
    maximumCertificateBytes: 65536;
    maximumCertificateChainBytes: 262144;
    maximumCertificateExtensions: 64;
}>;
export const PUBLIC_HTTP_LIMITS: Readonly<{
    maximumStatusLineBytes: 1024;
    maximumHeaderFields: 128;
    maximumHeaderFieldLineBytes: 8192;
    maximumResponseHeadBytes: 32768;
    maximumInformationalHeads: 4;
    maximumLocationBytes: 2048;
}>;
export const PUBLIC_VERIFIER_REQUEST_PROFILE: Readonly<{
    requestProfile: "gala-public-verifier-v2";
    retryProfile: "gala-public-probe-retry-v2";
    method: "GET";
    httpVersion: "HTTP/1.1";
    headers: readonly (Readonly<{
        name: "Accept";
        value: "*/*";
    }> | Readonly<{
        name: "Accept-Encoding";
        value: "identity";
    }> | Readonly<{
        name: "User-Agent";
        value: "gala-public-verifier/2.0.0";
    }> | Readonly<{
        name: "Connection";
        value: "close";
    }>)[];
}>;
/**
 * Live facts deliberately outside this byte-semantic module.
 *
 * These are context boundaries, not members of any wire or evidence record.
 */
export const LIVE_PUBLIC_VERIFICATION_BOUNDARIES: readonly string[];
