// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemFailureEvidence; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemFailureEvidence. */
public record AdapterCapabilityLocalFilesystemFailureEvidence(
        @JsonProperty("attemptId") String attemptId,
        @JsonProperty("boundary") String boundary,
        @JsonProperty("destinationChanged") String destinationChanged,
        @JsonProperty("errorClass") String errorClass,
        @JsonProperty("eventStageAttemptId") String eventStageAttemptId,
        @JsonProperty("evidenceDigest") String evidenceDigest,
        @JsonProperty("failureCode") String failureCode,
        @JsonProperty("filesystemEvidenceDigest") String filesystemEvidenceDigest,
        @JsonProperty("observedCurrentState") String observedCurrentState,
        @JsonProperty("operationId") String operationId,
        @JsonProperty("profile") String profile,
        @JsonProperty("rootIdentityDigest") String rootIdentityDigest,
        @JsonProperty("stageToken") String stageToken
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityLocalFilesystemFailureEvidence {
        Objects.requireNonNull(attemptId, "attemptId");
        Objects.requireNonNull(boundary, "boundary");
        Objects.requireNonNull(destinationChanged, "destinationChanged");
        Objects.requireNonNull(errorClass, "errorClass");
        Objects.requireNonNull(eventStageAttemptId, "eventStageAttemptId");
        Objects.requireNonNull(evidenceDigest, "evidenceDigest");
        Objects.requireNonNull(failureCode, "failureCode");
        Objects.requireNonNull(filesystemEvidenceDigest, "filesystemEvidenceDigest");
        Objects.requireNonNull(observedCurrentState, "observedCurrentState");
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(rootIdentityDigest, "rootIdentityDigest");
        Objects.requireNonNull(stageToken, "stageToken");
    }
}
