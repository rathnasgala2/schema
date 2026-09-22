// Generated from urn:gala:schema:deployment-observation:2.0.0#/$defs/destinationProviderCoordinates; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-observation:2.0.0#/$defs/destinationProviderCoordinates. */
public record DeploymentObservationDestinationProviderCoordinates(
        @JsonProperty("owner") String owner,
        @JsonProperty("region") String region,
        @JsonProperty("repository") String repository,
        @JsonProperty("servedBucket") String servedBucket,
        @JsonProperty("stagingBucket") String stagingBucket
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentObservationDestinationProviderCoordinates {
    }
}
