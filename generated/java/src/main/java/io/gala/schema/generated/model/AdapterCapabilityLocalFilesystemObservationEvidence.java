// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemObservationEvidence; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemObservationEvidence. */
public record AdapterCapabilityLocalFilesystemObservationEvidence(
        @JsonProperty("attemptId") String attemptId,
        @JsonProperty("controlHeadDigest") String controlHeadDigest,
        @JsonProperty("evidenceDigest") String evidenceDigest,
        @JsonProperty("expectedGenerationId") String expectedGenerationId,
        @JsonProperty("filesystemEvidenceDigest") String filesystemEvidenceDigest,
        @JsonProperty("observedArtifactDigest") String observedArtifactDigest,
        @JsonProperty("observedAt") String observedAt,
        @JsonProperty("observedByteCount") String observedByteCount,
        @JsonProperty("observedCurrentState") String observedCurrentState,
        @JsonProperty("observedFileCount") String observedFileCount,
        @JsonProperty("observedGenerationId") String observedGenerationId,
        @JsonProperty("observedMarkerDigest") String observedMarkerDigest,
        @JsonProperty("operationId") String operationId,
        @JsonProperty("profile") String profile,
        @JsonProperty("rootIdentityDigest") String rootIdentityDigest,
        @JsonProperty("stageAttemptId") String stageAttemptId
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityLocalFilesystemObservationEvidence {
        Objects.requireNonNull(attemptId, "attemptId");
        Objects.requireNonNull(controlHeadDigest, "controlHeadDigest");
        Objects.requireNonNull(evidenceDigest, "evidenceDigest");
        Objects.requireNonNull(filesystemEvidenceDigest, "filesystemEvidenceDigest");
        Objects.requireNonNull(observedAt, "observedAt");
        Objects.requireNonNull(observedCurrentState, "observedCurrentState");
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(rootIdentityDigest, "rootIdentityDigest");
        Objects.requireNonNull(stageAttemptId, "stageAttemptId");
    }
}
