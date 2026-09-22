// Generated from urn:gala:schema:artifact-manifest:2.0.0#/$defs/manifestRoute; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:artifact-manifest:2.0.0#/$defs/manifestRoute. */
public record ArtifactManifestManifestRoute(
        @JsonProperty("byteLength") String byteLength,
        @JsonProperty("interactionBearing") Boolean interactionBearing,
        @JsonProperty("mediaType") String mediaType,
        @JsonProperty("path") String path,
        @JsonProperty("routeClass") String routeClass,
        @JsonProperty("sha256") String sha256,
        @JsonProperty("sourceRevision") String sourceRevision,
        @JsonProperty("stableContentId") String stableContentId
) {
    /** Reject a missing required root member before domain use. */
    public ArtifactManifestManifestRoute {
        Objects.requireNonNull(byteLength, "byteLength");
        Objects.requireNonNull(interactionBearing, "interactionBearing");
        Objects.requireNonNull(mediaType, "mediaType");
        Objects.requireNonNull(path, "path");
        Objects.requireNonNull(routeClass, "routeClass");
        Objects.requireNonNull(sha256, "sha256");
    }
}
