// Generated from urn:gala:schema:build-input:2.0.0#/$defs/navigationNormalized; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:build-input:2.0.0#/$defs/navigationNormalized. */
public record BuildInputNavigationNormalized(
        @JsonProperty("footerItems") List<BuildInputNavigationItem> footerItems,
        @JsonProperty("items") List<BuildInputNavigationItem> items,
        @JsonProperty("source") JsonNode source
) {
    /** Reject a missing required root member before domain use. */
    public BuildInputNavigationNormalized {
        Objects.requireNonNull(footerItems, "footerItems");
        Objects.requireNonNull(items, "items");
        Objects.requireNonNull(source, "source");
    }
}
