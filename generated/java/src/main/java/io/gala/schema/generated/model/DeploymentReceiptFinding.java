// Generated from urn:gala:schema:deployment-receipt:2.0.0#/$defs/finding; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0#/$defs/finding. */
public record DeploymentReceiptFinding(
        @JsonProperty("code") String code,
        @JsonProperty("messageKey") String messageKey,
        @JsonProperty("pointer") String pointer,
        @JsonProperty("severity") String severity
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptFinding {
        Objects.requireNonNull(code, "code");
        Objects.requireNonNull(messageKey, "messageKey");
        Objects.requireNonNull(pointer, "pointer");
        Objects.requireNonNull(severity, "severity");
    }
}
