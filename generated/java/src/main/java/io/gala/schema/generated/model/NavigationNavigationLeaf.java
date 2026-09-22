// Generated from urn:gala:schema:navigation:2.0.0#/$defs/navigationLeaf; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:navigation:2.0.0#/$defs/navigationLeaf. */
public record NavigationNavigationLeaf(
        @JsonProperty("children") List<JsonNode> children,
        @JsonProperty("label") String label,
        @JsonProperty("route") String route,
        @JsonProperty("type") String type,
        @JsonProperty("url") String url
) {
    /** Reject a missing required root member before domain use. */
    public NavigationNavigationLeaf {
        Objects.requireNonNull(children, "children");
        Objects.requireNonNull(label, "label");
        Objects.requireNonNull(type, "type");
    }
}
