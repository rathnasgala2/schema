// Generated from urn:gala:schema:repository:2.0.0#/$defs/contentRoot; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:repository:2.0.0#/$defs/contentRoot. */
public record RepositoryContentRoot(
        @JsonProperty("exclude") List<String> exclude,
        @JsonProperty("include") List<String> include,
        @JsonProperty("kind") String kind,
        @JsonProperty("path") String path
) {
    /** Reject a missing required root member before domain use. */
    public RepositoryContentRoot {
        Objects.requireNonNull(exclude, "exclude");
        Objects.requireNonNull(include, "include");
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(path, "path");
    }
}
