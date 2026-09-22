// Generated from urn:gala:metadata:build-provenance:2.0.0#/$defs/manifestRedirect; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:metadata:build-provenance:2.0.0#/$defs/manifestRedirect. */
public record BuildProvenanceManifestRedirect(
        @JsonProperty("backingPath") String backingPath,
        @JsonProperty("sha256") String sha256,
        @JsonProperty("sourceRoute") String sourceRoute,
        @JsonProperty("status") Long status,
        @JsonProperty("targetRoute") String targetRoute
) {
    /** Reject a missing required root member before domain use. */
    public BuildProvenanceManifestRedirect {
        Objects.requireNonNull(backingPath, "backingPath");
        Objects.requireNonNull(sha256, "sha256");
        Objects.requireNonNull(sourceRoute, "sourceRoute");
        Objects.requireNonNull(status, "status");
        Objects.requireNonNull(targetRoute, "targetRoute");
    }
}
