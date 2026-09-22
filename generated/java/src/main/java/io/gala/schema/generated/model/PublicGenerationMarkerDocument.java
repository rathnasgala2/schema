// Generated from urn:gala:schema:public-generation-marker:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:public-generation-marker:2.0.0. */
public record PublicGenerationMarkerDocument(
        @JsonProperty("artifactDigest") String artifactDigest,
        @JsonProperty("artifactId") String artifactId,
        @JsonProperty("generationId") String generationId,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion
) {
    /** Reject a missing required root member before domain use. */
    public PublicGenerationMarkerDocument {
        Objects.requireNonNull(artifactDigest, "artifactDigest");
        Objects.requireNonNull(artifactId, "artifactId");
        Objects.requireNonNull(generationId, "generationId");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
    }
}
