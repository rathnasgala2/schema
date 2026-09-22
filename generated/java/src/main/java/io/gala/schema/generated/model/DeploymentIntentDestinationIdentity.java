// Generated from urn:gala:schema:deployment-intent:2.0.0#/$defs/destinationIdentity; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-intent:2.0.0#/$defs/destinationIdentity. */
public record DeploymentIntentDestinationIdentity(
        @JsonProperty("adapterId") String adapterId,
        @JsonProperty("adapterVersion") String adapterVersion,
        @JsonProperty("baseUrl") String baseUrl,
        @JsonProperty("environment") String environment,
        @JsonProperty("providerBinding") DeploymentIntentDestinationProviderCoordinates providerBinding,
        @JsonProperty("targetDigest") String targetDigest
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentIntentDestinationIdentity {
        Objects.requireNonNull(adapterId, "adapterId");
        Objects.requireNonNull(adapterVersion, "adapterVersion");
        Objects.requireNonNull(baseUrl, "baseUrl");
        Objects.requireNonNull(environment, "environment");
        Objects.requireNonNull(targetDigest, "targetDigest");
    }
}
