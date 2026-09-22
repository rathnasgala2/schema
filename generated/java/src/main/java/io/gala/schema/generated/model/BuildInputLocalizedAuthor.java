// Generated from urn:gala:schema:build-input:2.0.0#/$defs/localizedAuthor; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:build-input:2.0.0#/$defs/localizedAuthor. */
public record BuildInputLocalizedAuthor(
        @JsonProperty("biography") String biography,
        @JsonProperty("displayName") String displayName,
        @JsonProperty("language") String language
) {
    /** Reject a missing required root member before domain use. */
    public BuildInputLocalizedAuthor {
        Objects.requireNonNull(biography, "biography");
        Objects.requireNonNull(displayName, "displayName");
        Objects.requireNonNull(language, "language");
    }
}
