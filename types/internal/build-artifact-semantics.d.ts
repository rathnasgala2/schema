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
export function validateBuildArtifactSemantics(recordBundle: unknown, validatorContext: unknown): {
    lockDigest: string;
    buildInputDigest: string;
    artifactDigest: string;
    sourceInventoryDigest: string;
    validationEvidenceDigest: string;
    manifestDigest: string;
    buildPolicyDecisionDigest: string;
    provenanceDigest: string;
    sbomDigest: string;
    workloadBindingDigest: string;
    artifactFileCount: number;
};
/**
 * Facts that the semantic validator deliberately receives from trusted owners.
 * None of these facts is added to a portable record.
 */
export const BUILD_ARTIFACT_CONTEXT_CONSTRAINTS: readonly string[];
/** Stable semantic validation failure. */
export class BuildArtifactSemanticError extends TypeError {
    /**
     * @param {string} code stable diagnostic code
     */
    constructor(code: string);
    code: string;
}
export type LockState = {
    direct: Record<string, unknown>[];
    all: Record<string, unknown>[];
    identities: Map<string, Record<string, unknown>>;
    catalogByKey: Map<string, Record<string, unknown>>;
    artifactsByKey: Map<string, Record<string, unknown>>;
    catalog: Record<string, unknown>;
    adapterPackage: Record<string, unknown>;
};
export type SourceState = {
    repositoryContext: Record<string, unknown>;
    treeFiles: Map<string, {
        path: string;
        mode: string;
        objectId: string;
        bytes: Buffer;
    }>;
    includedSources: Record<string, unknown>[];
    exclusions: Record<string, unknown>[];
    renderPolicy: Record<string, unknown>;
};
export type ArtifactOutput = {
    output: Record<string, unknown>;
    path: string;
    kind: string;
    bytes: Buffer;
    manifestEntry: Record<string, unknown>;
};
