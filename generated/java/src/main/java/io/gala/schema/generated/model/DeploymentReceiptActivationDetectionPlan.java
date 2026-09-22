// Generated from urn:gala:schema:deployment-receipt:2.0.0#/$defs/activationDetectionPlan; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0#/$defs/activationDetectionPlan. */
public record DeploymentReceiptActivationDetectionPlan(
        @JsonProperty("artifactId") String artifactId,
        @JsonProperty("attemptId") String attemptId,
        @JsonProperty("firstEligibleAt") String firstEligibleAt,
        @JsonProperty("intervalSeconds") Long intervalSeconds,
        @JsonProperty("lastEligibleAt") String lastEligibleAt,
        @JsonProperty("maximumAttempts") Long maximumAttempts,
        @JsonProperty("maximumRedirectHops") Long maximumRedirectHops,
        @JsonProperty("operationId") String operationId,
        @JsonProperty("planDigest") String planDigest,
        @JsonProperty("probeRegion") String probeRegion,
        @JsonProperty("profile") String profile,
        @JsonProperty("proposedGenerationId") String proposedGenerationId,
        @JsonProperty("requestTimeoutSeconds") Long requestTimeoutSeconds,
        @JsonProperty("reservedProbeSlots") String reservedProbeSlots,
        @JsonProperty("target") DeploymentReceiptVerificationPlanTarget target
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptActivationDetectionPlan {
        Objects.requireNonNull(artifactId, "artifactId");
        Objects.requireNonNull(attemptId, "attemptId");
        Objects.requireNonNull(firstEligibleAt, "firstEligibleAt");
        Objects.requireNonNull(intervalSeconds, "intervalSeconds");
        Objects.requireNonNull(lastEligibleAt, "lastEligibleAt");
        Objects.requireNonNull(maximumAttempts, "maximumAttempts");
        Objects.requireNonNull(maximumRedirectHops, "maximumRedirectHops");
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(planDigest, "planDigest");
        Objects.requireNonNull(probeRegion, "probeRegion");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(proposedGenerationId, "proposedGenerationId");
        Objects.requireNonNull(requestTimeoutSeconds, "requestTimeoutSeconds");
        Objects.requireNonNull(reservedProbeSlots, "reservedProbeSlots");
        Objects.requireNonNull(target, "target");
    }
}
