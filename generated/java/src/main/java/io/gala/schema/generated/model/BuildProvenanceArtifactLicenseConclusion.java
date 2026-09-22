// Generated from urn:gala:metadata:build-provenance:2.0.0#/$defs/artifactLicenseConclusion; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:metadata:build-provenance:2.0.0#/$defs/artifactLicenseConclusion. */
public record BuildProvenanceArtifactLicenseConclusion(
        @JsonProperty("artifactPath") String artifactPath,
        @JsonProperty("licenseConcluded") String licenseConcluded,
        @JsonProperty("sourceKind") String sourceKind,
        @JsonProperty("themeAssetPath") String themeAssetPath
) {
    /** Reject a missing required root member before domain use. */
    public BuildProvenanceArtifactLicenseConclusion {
        Objects.requireNonNull(artifactPath, "artifactPath");
        Objects.requireNonNull(licenseConcluded, "licenseConcluded");
        Objects.requireNonNull(sourceKind, "sourceKind");
    }
}
