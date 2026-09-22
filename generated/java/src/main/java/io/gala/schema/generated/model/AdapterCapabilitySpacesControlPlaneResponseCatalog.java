// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/spacesControlPlaneResponseCatalog; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/spacesControlPlaneResponseCatalog. */
public record AdapterCapabilitySpacesControlPlaneResponseCatalog(
        @JsonProperty("catalogDigest") String catalogDigest,
        @JsonProperty("profile") String profile,
        @JsonProperty("responseProfiles") JsonNode responseProfiles
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilitySpacesControlPlaneResponseCatalog {
        Objects.requireNonNull(catalogDigest, "catalogDigest");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(responseProfiles, "responseProfiles");
    }
}
