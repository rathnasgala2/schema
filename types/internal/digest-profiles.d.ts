/**
 * Construct a domain-separated JCS preimage.
 *
 * @param {string} domain terminal-NUL domain
 * @param {unknown} value I-JSON projection
 * @returns {Uint8Array} exact preimage bytes
 */
export function domainSeparatedJcsPreimage(domain: string, value: unknown): Uint8Array;
/**
 * Hash a JCS projection under a terminal-NUL domain.
 *
 * @param {string} domain terminal-NUL domain
 * @param {unknown} value I-JSON projection
 * @returns {string} tagged SHA-256 digest
 */
export function digestDomainSeparatedJcs(domain: string, value: unknown): string;
/**
 * Hash the exact action-definition Git blob content bytes with no domain.
 *
 * @param {Uint8Array} blobBytes exact Git blob content bytes
 * @returns {string} tagged SHA-256 digest
 */
export function digestActionDefinitionBlob(blobBytes: Uint8Array): string;
/**
 * Hash the canonical publication root spelling as raw UTF-8 after its domain.
 *
 * @param {string} publicationRoot validated canonical root path
 * @returns {string} tagged SHA-256 digest
 */
export function digestLocalRootPath(publicationRoot: string): string;
/**
 * Hash the exact render-policy file bytes after its domain.
 *
 * @param {Uint8Array} policyBytes exact retained file bytes
 * @returns {string} tagged SHA-256 digest
 */
export function digestRenderPolicyBytes(policyBytes: Uint8Array): string;
/**
 * Compute the evidence-journal genesis digest.
 *
 * @param {unknown} coordinates operationId/runAttempt coordinates
 * @returns {string} tagged SHA-256 digest
 */
export function digestManagedEvidenceGenesis(coordinates: unknown): string;
/**
 * Compute an evidence-journal wrapper digest.
 *
 * @param {unknown} wrapper exact observation/attempt wrapper
 * @returns {string} tagged SHA-256 digest
 */
export function digestManagedEvidenceEntry(wrapper: unknown): string;
/**
 * Append one evidence entry using two decoded RAW32 operands.
 *
 * @param {string} previousHeadDigest tagged previous head digest
 * @param {string} entryDigest tagged entry digest
 * @returns {string} tagged SHA-256 head digest
 */
export function appendManagedEvidenceHead(previousHeadDigest: string, entryDigest: string): string;
/**
 * Derive the first 40 lowercase SHA-256 hexadecimal characters for Pages.
 *
 * @param {unknown} coordinates exact Pages build-version coordinates
 * @returns {string} 40 lowercase hexadecimal characters
 */
export function derivePagesBuildVersion(coordinates: unknown): string;
/**
 * Derive the first 32 lowercase SHA-256 hexadecimal characters for local stage.
 *
 * @param {unknown} coordinates exact local stage-token coordinates
 * @returns {string} 32 lowercase hexadecimal characters
 */
export function deriveLocalStageToken(coordinates: unknown): string;
/**
 * Derive the deterministic public-probe retry delay for attempt 2..10.
 *
 * @param {unknown} coordinates exact jitter coordinates
 * @returns {number} delay in milliseconds
 */
export function derivePublicProbeRetryDelay(coordinates: unknown): number;
/** The exact number of active DEC-097/098 terminal-NUL digest domains. */
export const ACTIVE_DIGEST_DOMAIN_COUNT: 80;
/** All active named digest profiles. */
export const ACTIVE_DIGEST_PROFILES: Readonly<Record<string, Readonly<{
    domain: string;
    project: Projector;
    preimage: (value: unknown) => Uint8Array;
    digest: (value: unknown) => string;
    digestBytes: (value: unknown) => Uint8Array;
}>>>;
/** All active profile names mapped to their literal terminal-NUL domains. */
export const ACTIVE_DIGEST_DOMAINS: Readonly<{
    [k: string]: string;
}>;
export type Projector = (value: unknown) => unknown;
export type ProjectionEncoder = (projected: unknown) => Uint8Array;
export type DigestProfile = Readonly<{
    domain: string;
    project: Projector;
    preimage: (value: unknown) => Uint8Array;
    digest: (value: unknown) => string;
    digestBytes: (value: unknown) => Uint8Array;
}>;
