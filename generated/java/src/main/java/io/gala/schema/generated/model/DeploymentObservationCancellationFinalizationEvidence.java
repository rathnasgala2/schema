// Generated from urn:gala:schema:deployment-observation:2.0.0#/$defs/cancellationFinalizationEvidence; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-observation:2.0.0#/$defs/cancellationFinalizationEvidence. */
public record DeploymentObservationCancellationFinalizationEvidence(
        @JsonProperty("activationDetectionLastEvidenceDigest") String activationDetectionLastEvidenceDigest,
        @JsonProperty("activationDetectionObservationCount") Long activationDetectionObservationCount,
        @JsonProperty("attemptId") String attemptId,
        @JsonProperty("authorityEpoch") String authorityEpoch,
        @JsonProperty("cancellationActorId") String cancellationActorId,
        @JsonProperty("cancellationCommandId") String cancellationCommandId,
        @JsonProperty("destinationKeyDigest") String destinationKeyDigest,
        @JsonProperty("fenceEvidenceDigest") String fenceEvidenceDigest,
        @JsonProperty("finalizedAt") String finalizedAt,
        @JsonProperty("intentDigest") String intentDigest,
        @JsonProperty("operationId") String operationId,
        @JsonProperty("precedingEvidenceJournalEntryCount") Long precedingEvidenceJournalEntryCount,
        @JsonProperty("precedingEvidenceJournalHeadDigest") String precedingEvidenceJournalHeadDigest,
        @JsonProperty("profile") String profile
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentObservationCancellationFinalizationEvidence {
        Objects.requireNonNull(activationDetectionObservationCount, "activationDetectionObservationCount");
        Objects.requireNonNull(attemptId, "attemptId");
        Objects.requireNonNull(authorityEpoch, "authorityEpoch");
        Objects.requireNonNull(cancellationActorId, "cancellationActorId");
        Objects.requireNonNull(cancellationCommandId, "cancellationCommandId");
        Objects.requireNonNull(destinationKeyDigest, "destinationKeyDigest");
        Objects.requireNonNull(fenceEvidenceDigest, "fenceEvidenceDigest");
        Objects.requireNonNull(finalizedAt, "finalizedAt");
        Objects.requireNonNull(intentDigest, "intentDigest");
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(precedingEvidenceJournalEntryCount, "precedingEvidenceJournalEntryCount");
        Objects.requireNonNull(precedingEvidenceJournalHeadDigest, "precedingEvidenceJournalHeadDigest");
        Objects.requireNonNull(profile, "profile");
    }
}
