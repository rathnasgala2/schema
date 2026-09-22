// Generated from urn:gala:schema:event-envelope:2.0.0#/$defs/registeredEventPayload; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:event-envelope:2.0.0#/$defs/registeredEventPayload. */
public record EventEnvelopeRegisteredEventPayload(
        @JsonProperty("commandId") String commandId,
        @JsonProperty("evidenceDigest") String evidenceDigest,
        @JsonProperty("fromState") String fromState,
        @JsonProperty("reasonCode") String reasonCode,
        @JsonProperty("toState") String toState,
        @JsonProperty("transitionId") String transitionId,
        @JsonProperty("transitionedAt") String transitionedAt
) {
    /** Reject a missing required root member before domain use. */
    public EventEnvelopeRegisteredEventPayload {
        Objects.requireNonNull(commandId, "commandId");
        Objects.requireNonNull(fromState, "fromState");
        Objects.requireNonNull(toState, "toState");
        Objects.requireNonNull(transitionId, "transitionId");
        Objects.requireNonNull(transitionedAt, "transitionedAt");
    }
}
