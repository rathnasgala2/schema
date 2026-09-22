// Generated from urn:gala:schema:artifact-manifest:2.0.0#/$defs/manifestAsset; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:artifact-manifest:2.0.0#/$defs/manifestAsset. */
public record ArtifactManifestManifestAsset(
        @JsonProperty("byteLength") String byteLength,
        @JsonProperty("immutable") Boolean immutable,
        @JsonProperty("mediaType") String mediaType,
        @JsonProperty("path") String path,
        @JsonProperty("sha256") String sha256
) {
    /** Reject a missing required root member before domain use. */
    public ArtifactManifestManifestAsset {
        Objects.requireNonNull(byteLength, "byteLength");
        Objects.requireNonNull(immutable, "immutable");
        Objects.requireNonNull(mediaType, "mediaType");
        Objects.requireNonNull(path, "path");
        Objects.requireNonNull(sha256, "sha256");
    }
}
