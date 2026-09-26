// Generated from urn:gala:schema:build-input:2.0.0#/$defs/authoredAdapterIdentity; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:build-input:2.0.0#/$defs/authoredAdapterIdentity. */
public record BuildInputAuthoredAdapterIdentity(
        @JsonProperty("adapterDigest") String adapterDigest,
        @JsonProperty("adapterId") String adapterId,
        @JsonProperty("adapterVersion") String adapterVersion
) {
    /** Reject a missing required root member before domain use. */
    public BuildInputAuthoredAdapterIdentity {
        Objects.requireNonNull(adapterDigest, "adapterDigest");
        Objects.requireNonNull(adapterId, "adapterId");
        Objects.requireNonNull(adapterVersion, "adapterVersion");
    }
}
