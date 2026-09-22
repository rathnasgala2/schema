// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/spacesControlPlaneRequest; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/spacesControlPlaneRequest. */
public record AdapterCapabilitySpacesControlPlaneRequest(
        @JsonProperty("credentialRole") String credentialRole,
        @JsonProperty("method") String method,
        @JsonProperty("origin") String origin,
        @JsonProperty("requestTarget") String requestTarget,
        @JsonProperty("responseProfile") String responseProfile,
        @JsonProperty("target") String target
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilitySpacesControlPlaneRequest {
        Objects.requireNonNull(credentialRole, "credentialRole");
        Objects.requireNonNull(method, "method");
        Objects.requireNonNull(origin, "origin");
        Objects.requireNonNull(requestTarget, "requestTarget");
        Objects.requireNonNull(responseProfile, "responseProfile");
        Objects.requireNonNull(target, "target");
    }
}
