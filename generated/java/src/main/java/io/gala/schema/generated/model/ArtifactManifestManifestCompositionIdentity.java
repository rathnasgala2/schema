// Generated from urn:gala:schema:artifact-manifest:2.0.0#/$defs/manifestCompositionIdentity; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:artifact-manifest:2.0.0#/$defs/manifestCompositionIdentity. */
public record ArtifactManifestManifestCompositionIdentity(
        @JsonProperty("enabledModuleConfigurationDigests") JsonNode enabledModuleConfigurationDigests,
        @JsonProperty("publisher") List<JsonNode> publisher,
        @JsonProperty("schemas") ArtifactManifestPackageIdentity schemas,
        @JsonProperty("template") ArtifactManifestPackageIdentity template,
        @JsonProperty("theme") ArtifactManifestPackageIdentity theme
) {
    /** Reject a missing required root member before domain use. */
    public ArtifactManifestManifestCompositionIdentity {
        Objects.requireNonNull(enabledModuleConfigurationDigests, "enabledModuleConfigurationDigests");
        Objects.requireNonNull(publisher, "publisher");
        Objects.requireNonNull(schemas, "schemas");
        Objects.requireNonNull(template, "template");
        Objects.requireNonNull(theme, "theme");
    }
}
