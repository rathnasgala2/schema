// Generated from urn:gala:schema:build-input:2.0.0#/$defs/buildPackages; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:build-input:2.0.0#/$defs/buildPackages. */
public record BuildInputBuildPackages(
        @JsonProperty("dependencies") List<BuildInputPackageIdentity> dependencies,
        @JsonProperty("publisher") List<JsonNode> publisher,
        @JsonProperty("schemas") BuildInputPackageIdentity schemas,
        @JsonProperty("template") BuildInputPackageIdentity template,
        @JsonProperty("theme") BuildInputPackageIdentity theme
) {
    /** Reject a missing required root member before domain use. */
    public BuildInputBuildPackages {
        Objects.requireNonNull(dependencies, "dependencies");
        Objects.requireNonNull(publisher, "publisher");
        Objects.requireNonNull(schemas, "schemas");
        Objects.requireNonNull(template, "template");
        Objects.requireNonNull(theme, "theme");
    }
}
