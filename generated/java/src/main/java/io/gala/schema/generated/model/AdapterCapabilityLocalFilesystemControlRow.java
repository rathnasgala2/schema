// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemControlRow; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemControlRow. */
public record AdapterCapabilityLocalFilesystemControlRow(
        @JsonProperty("artifactDigest") String artifactDigest,
        @JsonProperty("attemptId") String attemptId,
        @JsonProperty("destinationChanged") String destinationChanged,
        @JsonProperty("eventStageAttemptId") String eventStageAttemptId,
        @JsonProperty("expectedGenerationId") String expectedGenerationId,
        @JsonProperty("failureCode") String failureCode,
        @JsonProperty("failureEvidenceDigest") String failureEvidenceDigest,
        @JsonProperty("generationId") String generationId,
        @JsonProperty("markerDigest") String markerDigest,
        @JsonProperty("operationId") String operationId,
        @JsonProperty("previousRowDigest") String previousRowDigest,
        @JsonProperty("profile") String profile,
        @JsonProperty("rowDigest") String rowDigest,
        @JsonProperty("sequence") Long sequence,
        @JsonProperty("stageToken") String stageToken,
        @JsonProperty("stagingStageAttemptId") String stagingStageAttemptId,
        @JsonProperty("state") String state
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityLocalFilesystemControlRow {
        Objects.requireNonNull(artifactDigest, "artifactDigest");
        Objects.requireNonNull(attemptId, "attemptId");
        Objects.requireNonNull(destinationChanged, "destinationChanged");
        Objects.requireNonNull(eventStageAttemptId, "eventStageAttemptId");
        Objects.requireNonNull(generationId, "generationId");
        Objects.requireNonNull(markerDigest, "markerDigest");
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(rowDigest, "rowDigest");
        Objects.requireNonNull(sequence, "sequence");
        Objects.requireNonNull(stageToken, "stageToken");
        Objects.requireNonNull(stagingStageAttemptId, "stagingStageAttemptId");
        Objects.requireNonNull(state, "state");
    }
}
