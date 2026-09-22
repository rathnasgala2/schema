// Generated from urn:gala:schema:deployment-receipt:2.0.0#/$defs/deploymentFailure; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0#/$defs/deploymentFailure. */
public record DeploymentReceiptDeploymentFailure(
        @JsonProperty("code") String code,
        @JsonProperty("destinationChanged") String destinationChanged,
        @JsonProperty("recovery") String recovery,
        @JsonProperty("retryable") Boolean retryable,
        @JsonProperty("stage") String stage
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptDeploymentFailure {
        Objects.requireNonNull(code, "code");
        Objects.requireNonNull(destinationChanged, "destinationChanged");
        Objects.requireNonNull(recovery, "recovery");
        Objects.requireNonNull(retryable, "retryable");
        Objects.requireNonNull(stage, "stage");
    }
}
