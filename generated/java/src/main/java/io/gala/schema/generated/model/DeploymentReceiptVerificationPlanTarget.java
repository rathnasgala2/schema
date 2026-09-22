// Generated from urn:gala:schema:deployment-receipt:2.0.0#/$defs/verificationPlanTarget; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0#/$defs/verificationPlanTarget. */
public record DeploymentReceiptVerificationPlanTarget(
        @JsonProperty("expectedByteLength") String expectedByteLength,
        @JsonProperty("expectedCandidateDigest") String expectedCandidateDigest,
        @JsonProperty("expectedHeaders") List<DeploymentReceiptVerificationHeaderExpectation> expectedHeaders,
        @JsonProperty("expectedTerminalStatus") BigDecimal expectedTerminalStatus,
        @JsonProperty("maximumAttempts") Long maximumAttempts,
        @JsonProperty("maximumConcurrentStreams") Long maximumConcurrentStreams,
        @JsonProperty("maximumResponseBytes") String maximumResponseBytes,
        @JsonProperty("maximumResponseWireBytes") String maximumResponseWireBytes,
        @JsonProperty("origin") String origin,
        @JsonProperty("recognizedPriorContracts") List<DeploymentReceiptRecognizedPriorRouteContract> recognizedPriorContracts,
        @JsonProperty("redirectChain") List<DeploymentReceiptExpectedRedirectHop> redirectChain,
        @JsonProperty("requestProfile") String requestProfile,
        @JsonProperty("requestTimeoutSeconds") Long requestTimeoutSeconds,
        @JsonProperty("requiredProbeRegions") List<String> requiredProbeRegions,
        @JsonProperty("retryProfile") String retryProfile,
        @JsonProperty("route") String route,
        @JsonProperty("targetId") Long targetId,
        @JsonProperty("terminalRequestUrl") String terminalRequestUrl
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptVerificationPlanTarget {
        Objects.requireNonNull(expectedByteLength, "expectedByteLength");
        Objects.requireNonNull(expectedCandidateDigest, "expectedCandidateDigest");
        Objects.requireNonNull(expectedHeaders, "expectedHeaders");
        Objects.requireNonNull(expectedTerminalStatus, "expectedTerminalStatus");
        Objects.requireNonNull(maximumAttempts, "maximumAttempts");
        Objects.requireNonNull(maximumConcurrentStreams, "maximumConcurrentStreams");
        Objects.requireNonNull(maximumResponseBytes, "maximumResponseBytes");
        Objects.requireNonNull(maximumResponseWireBytes, "maximumResponseWireBytes");
        Objects.requireNonNull(origin, "origin");
        Objects.requireNonNull(recognizedPriorContracts, "recognizedPriorContracts");
        Objects.requireNonNull(redirectChain, "redirectChain");
        Objects.requireNonNull(requestProfile, "requestProfile");
        Objects.requireNonNull(requestTimeoutSeconds, "requestTimeoutSeconds");
        Objects.requireNonNull(requiredProbeRegions, "requiredProbeRegions");
        Objects.requireNonNull(retryProfile, "retryProfile");
        Objects.requireNonNull(route, "route");
        Objects.requireNonNull(targetId, "targetId");
        Objects.requireNonNull(terminalRequestUrl, "terminalRequestUrl");
    }
}
