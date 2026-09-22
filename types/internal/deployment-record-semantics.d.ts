/**
 * Compute the digest that binds a destination identity to its physical provider.
 *
 * @param {unknown} binding exact provider binding
 * @returns {string} tagged digest
 */
export function computeDestinationProviderBindingDigest(binding: unknown): string;
/**
 * Validate a physical destination mutation-key material record.
 *
 * @param {unknown} value key material
 * @returns {Record<string, unknown>} validated material
 */
export function validateDestinationMutationKeyMaterial(value: unknown): Record<string, unknown>;
/**
 * Compute the physical destination single-writer key digest.
 *
 * @param {unknown} material exact mutation-key material
 * @returns {string} tagged digest
 */
export function computeDestinationMutationKeyDigest(material: unknown): string;
/**
 * Compute a deployment-policy decision digest.
 *
 * @param {unknown} decision complete decision
 * @returns {string} tagged digest
 */
export function computeDeploymentPolicyDecisionDigest(decision: unknown): string;
/**
 * Compute an activation-detection plan digest.
 *
 * @param {unknown} plan complete plan
 * @returns {string} tagged digest
 */
export function computeActivationDetectionPlanDigest(plan: unknown): string;
/**
 * Compute a Pages reconciliation-command digest.
 *
 * @param {unknown} command complete command
 * @returns {string} tagged digest
 */
export function computePagesReconciliationCommandDigest(command: unknown): string;
/**
 * Compute a Pages run-attempt gap-proof digest.
 *
 * @param {unknown} proof complete proof
 * @returns {string} tagged digest
 */
export function computePagesRunAttemptGapProofDigest(proof: unknown): string;
/**
 * Compute a permanent Pages no-authority tombstone digest.
 *
 * @param {unknown} coordinates repository/run/attempt/authority coordinates
 * @returns {string} tagged digest
 */
export function computePagesNoAuthorityRunAttemptDigest(coordinates: unknown): string;
/**
 * Compute a Pages reconciliation-recovery digest.
 *
 * @param {unknown} recovery complete recovery
 * @returns {string} tagged digest
 */
export function computePagesReconciliationRecoveryDigest(recovery: unknown): string;
/**
 * Compute a deadline-finalization evidence digest.
 *
 * @param {unknown} evidence complete evidence
 * @returns {string} tagged digest
 */
export function computeDeadlineFinalizationEvidenceDigest(evidence: unknown): string;
/**
 * Compute a supersession-finalization evidence digest.
 *
 * @param {unknown} evidence complete evidence
 * @returns {string} tagged digest
 */
export function computeSupersessionFinalizationEvidenceDigest(evidence: unknown): string;
/**
 * Compute a cancellation-finalization evidence digest.
 *
 * @param {unknown} evidence complete evidence
 * @returns {string} tagged digest
 */
export function computeCancellationFinalizationEvidenceDigest(evidence: unknown): string;
/**
 * Compute the digest of the complete ordered verification plan.
 *
 * @param {unknown} plan complete ordered target array
 * @returns {string} tagged digest
 */
export function computeVerificationPlanDigest(plan: unknown): string;
/**
 * Compute a deployment-intent digest.
 *
 * @param {unknown} intent complete intent
 * @returns {string} tagged digest
 */
export function computeDeploymentIntentDigest(intent: unknown): string;
/**
 * Validate the closed policy decision and its owner equalities.
 *
 * @param {unknown} value decision
 * @param {{intent: Record<string, unknown>, acceptedPolicy: unknown, buildPolicyDecisionDigest: string, capabilityDecisionDigest: string}} context owning context
 * @returns {Record<string, unknown>} validated decision
 */
export function validateDeploymentPolicyDecision(value: unknown, context: {
    intent: Record<string, unknown>;
    acceptedPolicy: unknown;
    buildPolicyDecisionDigest: string;
    capabilityDecisionDigest: string;
}): Record<string, unknown>;
/**
 * Validate a retained marker-watch plan.
 *
 * @param {unknown} value marker-watch plan
 * @param {{intent: Record<string, unknown>, verificationPlan: unknown[], verificationPlanContext: Parameters<typeof validateVerificationPlan>[1]}} context owning context
 * @returns {Record<string, unknown>} validated plan
 */
export function validateActivationDetectionPlan(value: unknown, context: {
    intent: Record<string, unknown>;
    verificationPlan: unknown[];
    verificationPlanContext: Parameters<typeof validateVerificationPlan>[1];
}): Record<string, unknown>;
/**
 * Validate one destination-mutation authority against its enclosing intent.
 *
 * @param {unknown} value authority
 * @param {{intent: Record<string, unknown>, destinationProviderBinding: unknown, destinationFence: unknown, recovery?: unknown}} context owning context
 * @returns {Record<string, unknown>} validated authority
 */
export function validateDestinationMutationAuthority(value: unknown, context: {
    intent: Record<string, unknown>;
    destinationProviderBinding: unknown;
    destinationFence: unknown;
    recovery?: unknown;
}): Record<string, unknown>;
/**
 * Validate Pages recovery command, gap proof and prior-fence closure.
 *
 * @param {unknown} value recovery record
 * @param {{intent: Record<string, unknown>, authority: Record<string, unknown>, recovery: unknown}} context owning context
 * @returns {Record<string, unknown>} validated recovery
 */
export function validatePagesReconciliationRecovery(value: unknown, context: {
    intent: Record<string, unknown>;
    authority: Record<string, unknown>;
    recovery: unknown;
}): Record<string, unknown>;
/**
 * Validate a deployment intent against all retained owning records.
 *
 * Structural JSON Schema validation must run before this semantic function.
 *
 * @param {unknown} value deployment intent
 * @param {{
 *   artifactManifest: unknown,
 *   buildProvenance: unknown,
 *   buildInput: unknown,
 *   frozenHandoff: unknown,
 *   lock: unknown,
 *   capabilityDecision: unknown,
 *   buildPolicyDecisionDigest: string,
 *   deploymentPolicyDecision: unknown,
 *   acceptedPolicy: unknown,
 *   activationDetectionPlan: unknown,
 *   verificationPlan: unknown[],
 *   verificationPlanContext: Parameters<typeof validateVerificationPlan>[1],
 *   publicProbeReservation: unknown,
 *   destinationProviderBinding: unknown,
 *   pagesOidcOriginCatalog?: unknown,
 *   destinationFence: unknown,
 *   workloadBinding: unknown,
 *   operation: unknown,
 *   providerLimits: {requestTimeoutMillis: number, maximumProviderCallSeconds: number, providerExecutionSeconds: number},
 *   issuer: string,
 *   recovery?: unknown
 * }} context retained authorities
 * @returns {Record<string, unknown>} validated intent
 */
export function validateDeploymentIntentSemantics(value: unknown, context: {
    artifactManifest: unknown;
    buildProvenance: unknown;
    buildInput: unknown;
    frozenHandoff: unknown;
    lock: unknown;
    capabilityDecision: unknown;
    buildPolicyDecisionDigest: string;
    deploymentPolicyDecision: unknown;
    acceptedPolicy: unknown;
    activationDetectionPlan: unknown;
    verificationPlan: unknown[];
    verificationPlanContext: Parameters<typeof validateVerificationPlan>[1];
    publicProbeReservation: unknown;
    destinationProviderBinding: unknown;
    pagesOidcOriginCatalog?: unknown;
    destinationFence: unknown;
    workloadBinding: unknown;
    operation: unknown;
    providerLimits: {
        requestTimeoutMillis: number;
        maximumProviderCallSeconds: number;
        providerExecutionSeconds: number;
    };
    issuer: string;
    recovery?: unknown;
}): Record<string, unknown>;
/**
 * Compute a deployment-receipt digest.
 *
 * @param {unknown} receipt complete receipt
 * @returns {string} tagged digest
 */
export function computeDeploymentReceiptDigest(receipt: unknown): string;
/**
 * Compute the digest of the exact accepted extended managed-report submission.
 *
 * @param {unknown} submission validated extended submission
 * @returns {string} tagged digest
 */
export function computeManagedReceiptSubmissionDigest(submission: unknown): string;
/**
 * Compute a public-probe observation digest.
 *
 * @param {unknown} probe complete probe
 * @returns {string} tagged digest
 */
export function computePublicProbeObservationDigest(probe: unknown): string;
/**
 * Validate a deployment observation against its retained intent and evidence.
 *
 * Structural JSON Schema validation must run before this semantic function.
 *
 * @param {unknown} value deployment observation
 * @param {{
 *   intent: unknown,
 *   expectedSequence: number,
 *   stageAttempt: unknown,
 *   stageEvidence: unknown,
 *   stageRetainedObservations: unknown[],
 *   precedingObservations: unknown[],
 *   operationPrecedingObservations?: unknown[],
 *   destinationFence: unknown,
 *   operation?: unknown,
 *   verificationController?: unknown,
 *   activationBasis?: unknown,
 *   activationBasisEvidence?: unknown,
 *   activationDetectionContext?: unknown,
 *   adapterObservationEvidence?: unknown,
 *   capabilityDecision?: unknown,
 *   destinationProviderBinding?: unknown,
 *   pagesOidcOriginCatalog?: unknown,
 *   finalizationSource?: unknown,
 *   finalizationContext?: Record<string, unknown>,
 *   verificationPlan?: unknown[],
 *   verificationPlanContext?: Parameters<typeof validateVerificationPlan>[1],
 *   verificationDeadlineAt?: string,
 *   finalizationDeadlineAt?: string,
 *   publicProbeAttemptContexts?: Record<string, unknown>[],
 *   operationProbeCoordinates?: Set<string>
 * }} context retained authorities
 * @returns {Record<string, unknown>} validated observation
 */
export function validateDeploymentObservationSemantics(value: unknown, context: {
    intent: unknown;
    expectedSequence: number;
    stageAttempt: unknown;
    stageEvidence: unknown;
    stageRetainedObservations: unknown[];
    precedingObservations: unknown[];
    operationPrecedingObservations?: unknown[];
    destinationFence: unknown;
    operation?: unknown;
    verificationController?: unknown;
    activationBasis?: unknown;
    activationBasisEvidence?: unknown;
    activationDetectionContext?: unknown;
    adapterObservationEvidence?: unknown;
    capabilityDecision?: unknown;
    destinationProviderBinding?: unknown;
    pagesOidcOriginCatalog?: unknown;
    finalizationSource?: unknown;
    finalizationContext?: Record<string, unknown>;
    verificationPlan?: unknown[];
    verificationPlanContext?: Parameters<typeof validateVerificationPlan>[1];
    verificationDeadlineAt?: string;
    finalizationDeadlineAt?: string;
    publicProbeAttemptContexts?: Record<string, unknown>[];
    operationProbeCoordinates?: Set<string>;
}): Record<string, unknown>;
/**
 * Validate a managed deployment receipt with its authenticated journal prefix.
 *
 * Structural JSON Schema validation must run before this aggregate validator.
 *
 * @param {unknown} value deployment receipt
 * @param {{
 *   operation: unknown,
 *   operationJournals: unknown,
 *   submissionRecord: unknown,
 *   priorReceipts: unknown,
 *   rollbackCertification?: unknown
 * }} context authenticated retained state
 * @returns {Record<string, unknown>} validated receipt
 */
export function validateDeploymentReceiptSemantics(value: unknown, context: {
    operation: unknown;
    operationJournals: unknown;
    submissionRecord: unknown;
    priorReceipts: unknown;
    rollbackCertification?: unknown;
}): Record<string, unknown>;
export type FailureCatalogRow = readonly [string, string, string, string, readonly string[], boolean, string];
import { validateVerificationPlan } from './public-verification-semantics.js';
