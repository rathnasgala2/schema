// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/managedExecutionBudget; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/managedExecutionBudget. */
public record AdapterCapabilityManagedExecutionBudget(
        @JsonProperty("journalHandoffSeconds") Long journalHandoffSeconds,
        @JsonProperty("pagesArtifactUploadSeconds") Long pagesArtifactUploadSeconds,
        @JsonProperty("pagesArtifactVerificationSeconds") Long pagesArtifactVerificationSeconds,
        @JsonProperty("pagesCarrierConstructionSeconds") Long pagesCarrierConstructionSeconds,
        @JsonProperty("providerExecutionSeconds") Long providerExecutionSeconds,
        @JsonProperty("spacesControlPlaneVerificationSeconds") Long spacesControlPlaneVerificationSeconds,
        @JsonProperty("totalSeconds") Long totalSeconds,
        @JsonProperty("verifiedHandoffSeconds") Long verifiedHandoffSeconds
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityManagedExecutionBudget {
        Objects.requireNonNull(journalHandoffSeconds, "journalHandoffSeconds");
        Objects.requireNonNull(providerExecutionSeconds, "providerExecutionSeconds");
        Objects.requireNonNull(totalSeconds, "totalSeconds");
        Objects.requireNonNull(verifiedHandoffSeconds, "verifiedHandoffSeconds");
    }
}
