// Generated from urn:gala:schema:deployment-receipt:2.0.0#/$defs/deploymentAttempt; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0#/$defs/deploymentAttempt. */
public record DeploymentReceiptDeploymentAttempt(
        @JsonProperty("attemptId") String attemptId,
        @JsonProperty("causationId") String causationId,
        @JsonProperty("completedAt") String completedAt,
        @JsonProperty("destinationChanged") String destinationChanged,
        @JsonProperty("evidenceDigest") String evidenceDigest,
        @JsonProperty("failureCode") String failureCode,
        @JsonProperty("inputDigest") String inputDigest,
        @JsonProperty("outcome") String outcome,
        @JsonProperty("resultDigest") String resultDigest,
        @JsonProperty("retryable") Boolean retryable,
        @JsonProperty("sequence") Long sequence,
        @JsonProperty("stage") String stage,
        @JsonProperty("stageAttemptId") String stageAttemptId,
        @JsonProperty("startedAt") String startedAt
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptDeploymentAttempt {
        Objects.requireNonNull(attemptId, "attemptId");
        Objects.requireNonNull(causationId, "causationId");
        Objects.requireNonNull(destinationChanged, "destinationChanged");
        Objects.requireNonNull(evidenceDigest, "evidenceDigest");
        Objects.requireNonNull(inputDigest, "inputDigest");
        Objects.requireNonNull(outcome, "outcome");
        Objects.requireNonNull(retryable, "retryable");
        Objects.requireNonNull(sequence, "sequence");
        Objects.requireNonNull(stage, "stage");
        Objects.requireNonNull(stageAttemptId, "stageAttemptId");
    }
}
