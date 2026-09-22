// Generated from urn:gala:metadata:build-provenance:2.0.0#/$defs/manifestCompositionIdentity; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:metadata:build-provenance:2.0.0#/$defs/manifestCompositionIdentity. */
public record BuildProvenanceManifestCompositionIdentity(
        @JsonProperty("enabledModuleConfigurationDigests") JsonNode enabledModuleConfigurationDigests,
        @JsonProperty("publisher") List<JsonNode> publisher,
        @JsonProperty("schemas") BuildProvenancePackageIdentity schemas,
        @JsonProperty("template") BuildProvenancePackageIdentity template,
        @JsonProperty("theme") BuildProvenancePackageIdentity theme
) {
    /** Reject a missing required root member before domain use. */
    public BuildProvenanceManifestCompositionIdentity {
        Objects.requireNonNull(enabledModuleConfigurationDigests, "enabledModuleConfigurationDigests");
        Objects.requireNonNull(publisher, "publisher");
        Objects.requireNonNull(schemas, "schemas");
        Objects.requireNonNull(template, "template");
        Objects.requireNonNull(theme, "theme");
    }
}
