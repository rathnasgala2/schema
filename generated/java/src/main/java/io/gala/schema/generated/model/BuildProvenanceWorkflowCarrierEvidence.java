// Generated from urn:gala:metadata:build-provenance:2.0.0#/$defs/workflowCarrierEvidence; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:metadata:build-provenance:2.0.0#/$defs/workflowCarrierEvidence. */
public record BuildProvenanceWorkflowCarrierEvidence(
        @JsonProperty("artifactId") String artifactId,
        @JsonProperty("byteCount") String byteCount,
        @JsonProperty("digest") String digest,
        @JsonProperty("expiresAt") String expiresAt,
        @JsonProperty("name") String name,
        @JsonProperty("purpose") String purpose
) {
    /** Reject a missing required root member before domain use. */
    public BuildProvenanceWorkflowCarrierEvidence {
        Objects.requireNonNull(artifactId, "artifactId");
        Objects.requireNonNull(byteCount, "byteCount");
        Objects.requireNonNull(digest, "digest");
        Objects.requireNonNull(expiresAt, "expiresAt");
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(purpose, "purpose");
    }
}
