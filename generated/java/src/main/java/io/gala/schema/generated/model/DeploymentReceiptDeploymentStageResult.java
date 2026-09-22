// Generated from urn:gala:schema:deployment-receipt:2.0.0#/$defs/deploymentStageResult; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0#/$defs/deploymentStageResult. */
public record DeploymentReceiptDeploymentStageResult(
        @JsonProperty("completedAt") String completedAt,
        @JsonProperty("destinationChanged") String destinationChanged,
        @JsonProperty("failureCode") String failureCode,
        @JsonProperty("finalizationObservation") DeploymentReceiptDeploymentStageObservationEvidenceReference finalizationObservation,
        @JsonProperty("inputDigest") String inputDigest,
        @JsonProperty("outcome") String outcome,
        @JsonProperty("profile") String profile,
        @JsonProperty("retryable") Boolean retryable,
        @JsonProperty("stageInput") DeploymentReceiptDeploymentStageInput stageInput,
        @JsonProperty("startedAt") String startedAt
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptDeploymentStageResult {
        Objects.requireNonNull(destinationChanged, "destinationChanged");
        Objects.requireNonNull(finalizationObservation, "finalizationObservation");
        Objects.requireNonNull(inputDigest, "inputDigest");
        Objects.requireNonNull(outcome, "outcome");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(retryable, "retryable");
        Objects.requireNonNull(stageInput, "stageInput");
    }
}
