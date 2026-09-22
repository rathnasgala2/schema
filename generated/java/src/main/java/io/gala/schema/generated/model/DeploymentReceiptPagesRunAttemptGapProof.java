// Generated from urn:gala:schema:deployment-receipt:2.0.0#/$defs/pagesRunAttemptGapProof; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0#/$defs/pagesRunAttemptGapProof. */
public record DeploymentReceiptPagesRunAttemptGapProof(
        @JsonProperty("claimingRunAttempt") Long claimingRunAttempt,
        @JsonProperty("interveningAttempts") List<DeploymentReceiptPagesInterveningRunAttempt> interveningAttempts,
        @JsonProperty("priorRunAttempt") Long priorRunAttempt,
        @JsonProperty("profile") String profile,
        @JsonProperty("proofDigest") String proofDigest,
        @JsonProperty("runId") String runId
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptPagesRunAttemptGapProof {
        Objects.requireNonNull(claimingRunAttempt, "claimingRunAttempt");
        Objects.requireNonNull(interveningAttempts, "interveningAttempts");
        Objects.requireNonNull(priorRunAttempt, "priorRunAttempt");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(proofDigest, "proofDigest");
        Objects.requireNonNull(runId, "runId");
    }
}
