// Generated from urn:gala:schema:build-input:2.0.0#/$defs/colorMode; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:build-input:2.0.0#/$defs/colorMode. */
public record BuildInputColorMode(
        @JsonProperty("allowed") List<String> allowed,
        @JsonProperty("default") String default_
) {
    /** Reject a missing required root member before domain use. */
    public BuildInputColorMode {
        Objects.requireNonNull(allowed, "allowed");
        Objects.requireNonNull(default_, "default");
    }
}
