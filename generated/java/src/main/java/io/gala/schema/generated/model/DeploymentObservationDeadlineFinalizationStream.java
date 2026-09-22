// Generated from urn:gala:schema:deployment-observation:2.0.0#/$defs/deadlineFinalizationStream; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-observation:2.0.0#/$defs/deadlineFinalizationStream. */
public record DeploymentObservationDeadlineFinalizationStream(
        @JsonProperty("evidenceDigest") String evidenceDigest,
        @JsonProperty("observationId") String observationId,
        @JsonProperty("probeRegion") String probeRegion,
        @JsonProperty("state") String state,
        @JsonProperty("targetId") Long targetId
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentObservationDeadlineFinalizationStream {
        Objects.requireNonNull(probeRegion, "probeRegion");
        Objects.requireNonNull(state, "state");
        Objects.requireNonNull(targetId, "targetId");
    }
}
