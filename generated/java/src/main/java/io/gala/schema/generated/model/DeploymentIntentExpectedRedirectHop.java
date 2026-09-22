// Generated from urn:gala:schema:deployment-intent:2.0.0#/$defs/expectedRedirectHop; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-intent:2.0.0#/$defs/expectedRedirectHop. */
public record DeploymentIntentExpectedRedirectHop(
        @JsonProperty("expectedLocation") String expectedLocation,
        @JsonProperty("expectedStatus") BigDecimal expectedStatus,
        @JsonProperty("hopNumber") Long hopNumber,
        @JsonProperty("requestUrl") String requestUrl
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentIntentExpectedRedirectHop {
        Objects.requireNonNull(expectedLocation, "expectedLocation");
        Objects.requireNonNull(expectedStatus, "expectedStatus");
        Objects.requireNonNull(hopNumber, "hopNumber");
        Objects.requireNonNull(requestUrl, "requestUrl");
    }
}
