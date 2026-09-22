// Generated from urn:gala:schema:deployment-receipt:2.0.0#/$defs/deploymentStageObservationEvidenceReference; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0#/$defs/deploymentStageObservationEvidenceReference. */
public record DeploymentReceiptDeploymentStageObservationEvidenceReference(
        @JsonProperty("evidenceDigest") String evidenceDigest,
        @JsonProperty("observationId") String observationId
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptDeploymentStageObservationEvidenceReference {
        Objects.requireNonNull(evidenceDigest, "evidenceDigest");
        Objects.requireNonNull(observationId, "observationId");
    }
}
