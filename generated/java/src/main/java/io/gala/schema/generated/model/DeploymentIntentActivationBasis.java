// Generated from urn:gala:schema:deployment-intent:2.0.0#/$defs/activationBasis; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-intent:2.0.0#/$defs/activationBasis. */
public record DeploymentIntentActivationBasis(
        @JsonProperty("evidenceDigest") String evidenceDigest,
        @JsonProperty("observedAt") String observedAt,
        @JsonProperty("source") String source
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentIntentActivationBasis {
        Objects.requireNonNull(evidenceDigest, "evidenceDigest");
        Objects.requireNonNull(observedAt, "observedAt");
        Objects.requireNonNull(source, "source");
    }
}
