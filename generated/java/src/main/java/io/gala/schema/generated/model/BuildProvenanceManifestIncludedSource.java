// Generated from urn:gala:metadata:build-provenance:2.0.0#/$defs/manifestIncludedSource; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:metadata:build-provenance:2.0.0#/$defs/manifestIncludedSource. */
public record BuildProvenanceManifestIncludedSource(
        @JsonProperty("path") String path,
        @JsonProperty("role") String role,
        @JsonProperty("sha256") String sha256,
        @JsonProperty("sourceRevision") String sourceRevision
) {
    /** Reject a missing required root member before domain use. */
    public BuildProvenanceManifestIncludedSource {
        Objects.requireNonNull(path, "path");
        Objects.requireNonNull(role, "role");
        Objects.requireNonNull(sha256, "sha256");
        Objects.requireNonNull(sourceRevision, "sourceRevision");
    }
}
