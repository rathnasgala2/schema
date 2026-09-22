/**
 * Return the exact no-newline payload bytes for one probe source.
 *
 * @param {string} source `control`, `race-a`, or `race-b`
 * @returns {Buffer} exact compact-JCS payload bytes
 */
export function createLocalFilesystemProbePayload(source: string): Buffer;
/**
 * Validate exact local-filesystem probe payload bytes.
 *
 * @param {unknown} payload exact payload bytes
 * @param {string} source expected source
 * @returns {void}
 */
export function validateLocalFilesystemProbePayload(payload: unknown, source: string): void;
/**
 * Compute the exact DEC-098 local-filesystem probe transcript digest.
 *
 * @param {unknown} transcript complete transcript
 * @returns {string} tagged digest
 */
export function computeLocalFilesystemProbeTranscriptDigest(transcript: unknown): string;
/**
 * Validate the exact 10,000-operation local-filesystem probe transcript.
 *
 * @param {unknown} value candidate transcript
 * @returns {void}
 */
export function validateLocalFilesystemProbeTranscript(value: unknown): void;
/**
 * Compute a local observation evidence self-exclusion digest.
 *
 * @param {unknown} evidence complete local observation evidence
 * @returns {string} tagged digest
 */
export function computeLocalFilesystemObservationEvidenceDigest(evidence: unknown): string;
/**
 * Validate local observation evidence and its five-field state ledger.
 *
 * @param {unknown} value candidate evidence
 * @returns {void}
 */
export function validateLocalFilesystemObservationEvidence(value: unknown): void;
/**
 * Compute the exact credential-free deployment-stage input digest.
 *
 * @param {unknown} input complete stage input
 * @returns {string} tagged digest
 */
export function computeDeploymentStageInputDigest(input: unknown): string;
/**
 * Validate one closed deployment-stage input.
 *
 * @param {unknown} input candidate stage input
 * @returns {void}
 */
export function validateDeploymentStageInput(input: unknown): void;
/**
 * Compute the exact normalized deployment-stage result digest.
 *
 * @param {unknown} result complete stage result
 * @returns {string} tagged digest
 */
export function computeDeploymentStageResultDigest(result: unknown): string;
/**
 * Validate one closed terminal deployment-stage result.
 *
 * @param {unknown} result candidate result
 * @returns {void}
 */
export function validateDeploymentStageResult(result: unknown): void;
/**
 * Compute the complete deployment-stage evidence self-exclusion digest.
 *
 * @param {unknown} evidence complete stage evidence
 * @returns {string} tagged digest
 */
export function computeDeploymentStageEvidenceDigest(evidence: unknown): string;
/**
 * Validate one closed deployment-stage evidence owner.
 *
 * Cross-record intent, attempt, and journal-prefix equalities are validated by
 * `validateDeploymentStageRecords`.
 *
 * @param {unknown} evidence candidate evidence
 * @returns {void}
 */
export function validateDeploymentStageEvidence(evidence: unknown): void;
/**
 * Validate all DEC-098 equalities for one stage and its already committed
 * observation prefix.
 *
 * `retainedObservations` is the retained joint-evidence-journal order, not a
 * caller-selected or observation-sequence order. This function only consumes
 * committed observations and never constructs a current observation wrapper,
 * which preserves DEC-098's stage digest dependency order.
 *
 * @param {unknown} records related retained records
 * @returns {void}
 */
export function validateDeploymentStageRecords(records: unknown): void;
export type FailureCatalogRow = {
    stage: string;
    code: string;
    outcome: string;
    destinationChanges: readonly string[];
    retryable: boolean;
};
