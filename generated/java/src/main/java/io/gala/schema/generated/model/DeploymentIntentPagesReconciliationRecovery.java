// Generated from urn:gala:schema:deployment-intent:2.0.0#/$defs/pagesReconciliationRecovery; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-intent:2.0.0#/$defs/pagesReconciliationRecovery. */
public record DeploymentIntentPagesReconciliationRecovery(
        @JsonProperty("priorAttemptId") String priorAttemptId,
        @JsonProperty("priorAuthorityEpoch") String priorAuthorityEpoch,
        @JsonProperty("priorAuthorityId") String priorAuthorityId,
        @JsonProperty("priorExpectedGenerationId") String priorExpectedGenerationId,
        @JsonProperty("priorFenceEvidenceDigest") String priorFenceEvidenceDigest,
        @JsonProperty("priorIntentDigest") String priorIntentDigest,
        @JsonProperty("priorPagesBuildVersion") String priorPagesBuildVersion,
        @JsonProperty("priorProposedGenerationId") String priorProposedGenerationId,
        @JsonProperty("profile") String profile,
        @JsonProperty("reconcileCommandDigest") String reconcileCommandDigest,
        @JsonProperty("reconcileCommandExpiresAt") String reconcileCommandExpiresAt,
        @JsonProperty("reconcileCommandId") String reconcileCommandId,
        @JsonProperty("recoveryDigest") String recoveryDigest,
        @JsonProperty("runAttemptGapProof") DeploymentIntentPagesRunAttemptGapProof runAttemptGapProof
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentIntentPagesReconciliationRecovery {
        Objects.requireNonNull(priorAttemptId, "priorAttemptId");
        Objects.requireNonNull(priorAuthorityEpoch, "priorAuthorityEpoch");
        Objects.requireNonNull(priorAuthorityId, "priorAuthorityId");
        Objects.requireNonNull(priorFenceEvidenceDigest, "priorFenceEvidenceDigest");
        Objects.requireNonNull(priorIntentDigest, "priorIntentDigest");
        Objects.requireNonNull(priorPagesBuildVersion, "priorPagesBuildVersion");
        Objects.requireNonNull(priorProposedGenerationId, "priorProposedGenerationId");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(reconcileCommandDigest, "reconcileCommandDigest");
        Objects.requireNonNull(reconcileCommandExpiresAt, "reconcileCommandExpiresAt");
        Objects.requireNonNull(reconcileCommandId, "reconcileCommandId");
        Objects.requireNonNull(recoveryDigest, "recoveryDigest");
        Objects.requireNonNull(runAttemptGapProof, "runAttemptGapProof");
    }
}
