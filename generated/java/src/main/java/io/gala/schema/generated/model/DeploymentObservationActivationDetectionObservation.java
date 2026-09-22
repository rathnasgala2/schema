// Generated from urn:gala:schema:deployment-observation:2.0.0#/$defs/activationDetectionObservation; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-observation:2.0.0#/$defs/activationDetectionObservation. */
public record DeploymentObservationActivationDetectionObservation(
        @JsonProperty("attemptId") String attemptId,
        @JsonProperty("detectionAttemptNumber") Long detectionAttemptNumber,
        @JsonProperty("eligibleAt") String eligibleAt,
        @JsonProperty("evidenceDigest") String evidenceDigest,
        @JsonProperty("operationId") String operationId,
        @JsonProperty("planDigest") String planDigest,
        @JsonProperty("probes") List<DeploymentObservationActivationDetectionProbe> probes,
        @JsonProperty("profile") String profile,
        @JsonProperty("receivedAt") String receivedAt
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentObservationActivationDetectionObservation {
        Objects.requireNonNull(attemptId, "attemptId");
        Objects.requireNonNull(detectionAttemptNumber, "detectionAttemptNumber");
        Objects.requireNonNull(eligibleAt, "eligibleAt");
        Objects.requireNonNull(evidenceDigest, "evidenceDigest");
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(planDigest, "planDigest");
        Objects.requireNonNull(probes, "probes");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(receivedAt, "receivedAt");
    }
}
