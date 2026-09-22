// Generated from urn:gala:metadata:build-provenance:2.0.0#/$defs/manifestValidationEvidence; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:metadata:build-provenance:2.0.0#/$defs/manifestValidationEvidence. */
public record BuildProvenanceManifestValidationEvidence(
        @JsonProperty("evidenceDigest") String evidenceDigest,
        @JsonProperty("findingCount") Long findingCount,
        @JsonProperty("profile") String profile,
        @JsonProperty("version") String version
) {
    /** Reject a missing required root member before domain use. */
    public BuildProvenanceManifestValidationEvidence {
        Objects.requireNonNull(evidenceDigest, "evidenceDigest");
        Objects.requireNonNull(findingCount, "findingCount");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(version, "version");
    }
}
