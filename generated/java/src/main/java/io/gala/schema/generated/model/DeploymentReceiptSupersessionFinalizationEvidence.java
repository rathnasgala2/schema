// Generated from urn:gala:schema:deployment-receipt:2.0.0#/$defs/supersessionFinalizationEvidence; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0#/$defs/supersessionFinalizationEvidence. */
public record DeploymentReceiptSupersessionFinalizationEvidence(
        @JsonProperty("activationDetectionLastEvidenceDigest") String activationDetectionLastEvidenceDigest,
        @JsonProperty("activationDetectionObservationCount") Long activationDetectionObservationCount,
        @JsonProperty("authorityEpoch") String authorityEpoch,
        @JsonProperty("destinationKeyDigest") String destinationKeyDigest,
        @JsonProperty("fenceEvidenceDigest") String fenceEvidenceDigest,
        @JsonProperty("fenceTerminalState") String fenceTerminalState,
        @JsonProperty("finalizationOutcome") String finalizationOutcome,
        @JsonProperty("finalizedAt") String finalizedAt,
        @JsonProperty("precedingEvidenceJournalEntryCount") Long precedingEvidenceJournalEntryCount,
        @JsonProperty("precedingEvidenceJournalHeadDigest") String precedingEvidenceJournalHeadDigest,
        @JsonProperty("profile") String profile,
        @JsonProperty("supersededAttemptId") String supersededAttemptId,
        @JsonProperty("supersededByGenerationId") String supersededByGenerationId,
        @JsonProperty("supersededByOperationId") String supersededByOperationId,
        @JsonProperty("supersededIntentDigest") String supersededIntentDigest,
        @JsonProperty("supersededOperationId") String supersededOperationId
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptSupersessionFinalizationEvidence {
        Objects.requireNonNull(activationDetectionObservationCount, "activationDetectionObservationCount");
        Objects.requireNonNull(authorityEpoch, "authorityEpoch");
        Objects.requireNonNull(destinationKeyDigest, "destinationKeyDigest");
        Objects.requireNonNull(fenceEvidenceDigest, "fenceEvidenceDigest");
        Objects.requireNonNull(fenceTerminalState, "fenceTerminalState");
        Objects.requireNonNull(finalizationOutcome, "finalizationOutcome");
        Objects.requireNonNull(finalizedAt, "finalizedAt");
        Objects.requireNonNull(precedingEvidenceJournalEntryCount, "precedingEvidenceJournalEntryCount");
        Objects.requireNonNull(precedingEvidenceJournalHeadDigest, "precedingEvidenceJournalHeadDigest");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(supersededAttemptId, "supersededAttemptId");
        Objects.requireNonNull(supersededByGenerationId, "supersededByGenerationId");
        Objects.requireNonNull(supersededByOperationId, "supersededByOperationId");
        Objects.requireNonNull(supersededIntentDigest, "supersededIntentDigest");
        Objects.requireNonNull(supersededOperationId, "supersededOperationId");
    }
}
