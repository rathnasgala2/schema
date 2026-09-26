// Generated from urn:gala:schema:build-input:2.0.0#/$defs/destinationCapabilityProfile; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:build-input:2.0.0#/$defs/destinationCapabilityProfile. */
public record BuildInputDestinationCapabilityProfile(
        @JsonProperty("adapter") BuildInputAuthoredAdapterIdentity adapter,
        @JsonProperty("baseUrl") String baseUrl,
        @JsonProperty("capabilityDigest") String capabilityDigest
) {
    /** Reject a missing required root member before domain use. */
    public BuildInputDestinationCapabilityProfile {
        Objects.requireNonNull(adapter, "adapter");
        Objects.requireNonNull(baseUrl, "baseUrl");
        Objects.requireNonNull(capabilityDigest, "capabilityDigest");
    }
}
