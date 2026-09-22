// Generated from urn:gala:schema:deployment-receipt:2.0.0#/$defs/deadlineFinalizationEvidence; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0#/$defs/deadlineFinalizationEvidence. */
public record DeploymentReceiptDeadlineFinalizationEvidence(
        @JsonProperty("attemptId") String attemptId,
        @JsonProperty("cutoffEvidenceJournalEntryCount") Long cutoffEvidenceJournalEntryCount,
        @JsonProperty("cutoffEvidenceJournalHeadDigest") String cutoffEvidenceJournalHeadDigest,
        @JsonProperty("finalizationDeadlineAt") String finalizationDeadlineAt,
        @JsonProperty("finalizationKind") String finalizationKind,
        @JsonProperty("finalizedAt") String finalizedAt,
        @JsonProperty("intentDigest") String intentDigest,
        @JsonProperty("operationId") String operationId,
        @JsonProperty("profile") String profile,
        @JsonProperty("selectedStreams") List<DeploymentReceiptDeadlineFinalizationStream> selectedStreams,
        @JsonProperty("verificationDeadlineAt") String verificationDeadlineAt,
        @JsonProperty("verificationPlanDigest") String verificationPlanDigest
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptDeadlineFinalizationEvidence {
        Objects.requireNonNull(attemptId, "attemptId");
        Objects.requireNonNull(cutoffEvidenceJournalEntryCount, "cutoffEvidenceJournalEntryCount");
        Objects.requireNonNull(cutoffEvidenceJournalHeadDigest, "cutoffEvidenceJournalHeadDigest");
        Objects.requireNonNull(finalizationDeadlineAt, "finalizationDeadlineAt");
        Objects.requireNonNull(finalizationKind, "finalizationKind");
        Objects.requireNonNull(finalizedAt, "finalizedAt");
        Objects.requireNonNull(intentDigest, "intentDigest");
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(selectedStreams, "selectedStreams");
        Objects.requireNonNull(verificationDeadlineAt, "verificationDeadlineAt");
        Objects.requireNonNull(verificationPlanDigest, "verificationPlanDigest");
    }
}
