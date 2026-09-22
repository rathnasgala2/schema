// Generated from urn:gala:schema:deployment-observation:2.0.0#/$defs/recognizedPriorRouteContract; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-observation:2.0.0#/$defs/recognizedPriorRouteContract. */
public record DeploymentObservationRecognizedPriorRouteContract(
        @JsonProperty("expectedByteLength") String expectedByteLength,
        @JsonProperty("expectedDigest") String expectedDigest,
        @JsonProperty("expectedHeaders") List<DeploymentObservationVerificationHeaderExpectation> expectedHeaders,
        @JsonProperty("expectedTerminalStatus") BigDecimal expectedTerminalStatus,
        @JsonProperty("generationId") String generationId,
        @JsonProperty("redirectChain") List<DeploymentObservationExpectedRedirectHop> redirectChain,
        @JsonProperty("terminalRequestUrl") String terminalRequestUrl
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentObservationRecognizedPriorRouteContract {
        Objects.requireNonNull(expectedByteLength, "expectedByteLength");
        Objects.requireNonNull(expectedDigest, "expectedDigest");
        Objects.requireNonNull(expectedHeaders, "expectedHeaders");
        Objects.requireNonNull(expectedTerminalStatus, "expectedTerminalStatus");
        Objects.requireNonNull(generationId, "generationId");
        Objects.requireNonNull(redirectChain, "redirectChain");
        Objects.requireNonNull(terminalRequestUrl, "terminalRequestUrl");
    }
}
