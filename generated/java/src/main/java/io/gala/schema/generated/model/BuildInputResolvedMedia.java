// Generated from urn:gala:schema:build-input:2.0.0#/$defs/resolvedMedia; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:build-input:2.0.0#/$defs/resolvedMedia. */
public record BuildInputResolvedMedia(
        @JsonProperty("alt") String alt,
        @JsonProperty("file") BuildInputResolvedFile file,
        @JsonProperty("role") String role
) {
    /** Reject a missing required root member before domain use. */
    public BuildInputResolvedMedia {
        Objects.requireNonNull(alt, "alt");
        Objects.requireNonNull(file, "file");
        Objects.requireNonNull(role, "role");
    }
}
