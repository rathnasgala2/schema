// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemSurfaceIdentity; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemSurfaceIdentity. */
public record AdapterCapabilityLocalFilesystemSurfaceIdentity(
        @JsonProperty("profile") String profile,
        @JsonProperty("recordDigest") String recordDigest,
        @JsonProperty("surfaceId") String surfaceId
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityLocalFilesystemSurfaceIdentity {
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(recordDigest, "recordDigest");
        Objects.requireNonNull(surfaceId, "surfaceId");
    }
}
