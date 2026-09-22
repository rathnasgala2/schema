// Generated from urn:gala:schema:deployment-receipt:2.0.0#/$defs/activationDetectionProbe; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0#/$defs/activationDetectionProbe. */
public record DeploymentReceiptActivationDetectionProbe(
        @JsonProperty("bodyState") String bodyState,
        @JsonProperty("classification") String classification,
        @JsonProperty("contractGenerationId") String contractGenerationId,
        @JsonProperty("evidenceDigest") String evidenceDigest,
        @JsonProperty("expectedCandidateDigest") String expectedCandidateDigest,
        @JsonProperty("hopNumber") Long hopNumber,
        @JsonProperty("observedAt") String observedAt,
        @JsonProperty("observedByteLength") String observedByteLength,
        @JsonProperty("observedDigest") String observedDigest,
        @JsonProperty("observedGenerationId") String observedGenerationId,
        @JsonProperty("observedHeaders") List<DeploymentReceiptObservedVerificationHeader> observedHeaders,
        @JsonProperty("observedLocation") String observedLocation,
        @JsonProperty("observedLocationState") String observedLocationState,
        @JsonProperty("observedStatus") Long observedStatus,
        @JsonProperty("origin") String origin,
        @JsonProperty("precedingDetectionProbeEvidenceDigest") String precedingDetectionProbeEvidenceDigest,
        @JsonProperty("probeRegion") String probeRegion,
        @JsonProperty("requestStartedAt") String requestStartedAt,
        @JsonProperty("requestUrl") String requestUrl,
        @JsonProperty("responseHeadState") String responseHeadState,
        @JsonProperty("route") String route,
        @JsonProperty("targetId") Long targetId
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptActivationDetectionProbe {
        Objects.requireNonNull(bodyState, "bodyState");
        Objects.requireNonNull(classification, "classification");
        Objects.requireNonNull(evidenceDigest, "evidenceDigest");
        Objects.requireNonNull(expectedCandidateDigest, "expectedCandidateDigest");
        Objects.requireNonNull(hopNumber, "hopNumber");
        Objects.requireNonNull(observedAt, "observedAt");
        Objects.requireNonNull(observedHeaders, "observedHeaders");
        Objects.requireNonNull(observedLocationState, "observedLocationState");
        Objects.requireNonNull(origin, "origin");
        Objects.requireNonNull(probeRegion, "probeRegion");
        Objects.requireNonNull(requestStartedAt, "requestStartedAt");
        Objects.requireNonNull(requestUrl, "requestUrl");
        Objects.requireNonNull(responseHeadState, "responseHeadState");
        Objects.requireNonNull(route, "route");
        Objects.requireNonNull(targetId, "targetId");
    }
}
