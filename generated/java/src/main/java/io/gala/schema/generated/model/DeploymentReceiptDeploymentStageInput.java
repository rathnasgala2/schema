// Generated from urn:gala:schema:deployment-receipt:2.0.0#/$defs/deploymentStageInput; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0#/$defs/deploymentStageInput. */
public record DeploymentReceiptDeploymentStageInput(
        @JsonProperty("causationId") String causationId,
        @JsonProperty("destinationMutationAuthority") DeploymentReceiptDestinationMutationAuthority destinationMutationAuthority,
        @JsonProperty("intentDigest") String intentDigest,
        @JsonProperty("profile") String profile,
        @JsonProperty("stage") String stage,
        @JsonProperty("stageAttemptId") String stageAttemptId
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptDeploymentStageInput {
        Objects.requireNonNull(causationId, "causationId");
        Objects.requireNonNull(destinationMutationAuthority, "destinationMutationAuthority");
        Objects.requireNonNull(intentDigest, "intentDigest");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(stage, "stage");
        Objects.requireNonNull(stageAttemptId, "stageAttemptId");
    }
}
