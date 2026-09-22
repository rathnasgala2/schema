// Generated from urn:gala:schema:deployment-receipt:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0. */
public record DeploymentReceiptDocument(
        @JsonProperty("adapter") DeploymentReceiptAdapterIdentity adapter,
        @JsonProperty("artifactByteCount") String artifactByteCount,
        @JsonProperty("artifactDigest") String artifactDigest,
        @JsonProperty("artifactFileCount") String artifactFileCount,
        @JsonProperty("artifactId") String artifactId,
        @JsonProperty("artifactManifestDigest") String artifactManifestDigest,
        @JsonProperty("attemptSnapshotSequence") Long attemptSnapshotSequence,
        @JsonProperty("attempts") List<DeploymentReceiptDeploymentAttempt> attempts,
        @JsonProperty("completedAt") String completedAt,
        @JsonProperty("destination") DeploymentReceiptDestinationIdentity destination,
        @JsonProperty("destinationGenerationId") String destinationGenerationId,
        @JsonProperty("destinationReceiptDigest") String destinationReceiptDigest,
        @JsonProperty("effectiveArtifactExpiresAt") String effectiveArtifactExpiresAt,
        @JsonProperty("evidenceJournalEntryCount") Long evidenceJournalEntryCount,
        @JsonProperty("evidenceJournalHeadDigest") String evidenceJournalHeadDigest,
        @JsonProperty("failure") DeploymentReceiptDeploymentFailure failure,
        @JsonProperty("intentDigest") String intentDigest,
        @JsonProperty("issuer") String issuer,
        @JsonProperty("observations") List<DeploymentReceiptDeploymentObservation> observations,
        @JsonProperty("operationId") String operationId,
        @JsonProperty("organizationId") String organizationId,
        @JsonProperty("outcome") String outcome,
        @JsonProperty("provenanceDigest") String provenanceDigest,
        @JsonProperty("publisher") DeploymentReceiptPackageIdentity publisher,
        @JsonProperty("receiptDigest") String receiptDigest,
        @JsonProperty("receiptId") String receiptId,
        @JsonProperty("repositoryId") String repositoryId,
        @JsonProperty("repositoryOwnerId") String repositoryOwnerId,
        @JsonProperty("requestedArtifactRetentionDays") Long requestedArtifactRetentionDays,
        @JsonProperty("rollbackActorId") String rollbackActorId,
        @JsonProperty("rollbackOfGenerationId") String rollbackOfGenerationId,
        @JsonProperty("rollbackOfOperationId") String rollbackOfOperationId,
        @JsonProperty("rollbackOfReceiptDigest") String rollbackOfReceiptDigest,
        @JsonProperty("rollbackReason") String rollbackReason,
        @JsonProperty("runAttempt") Long runAttempt,
        @JsonProperty("runId") String runId,
        @JsonProperty("sbomDigest") String sbomDigest,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion,
        @JsonProperty("snapshotSequence") Long snapshotSequence,
        @JsonProperty("sourceCommit") String sourceCommit,
        @JsonProperty("startedAt") String startedAt,
        @JsonProperty("submissionEvidenceDigest") String submissionEvidenceDigest,
        @JsonProperty("supersededByGenerationId") String supersededByGenerationId,
        @JsonProperty("supersededByOperationId") String supersededByOperationId,
        @JsonProperty("supersedesReceiptId") String supersedesReceiptId,
        @JsonProperty("verificationDeadlineAt") String verificationDeadlineAt,
        @JsonProperty("verificationTier") String verificationTier,
        @JsonProperty("warnings") List<DeploymentReceiptFinding> warnings,
        @JsonProperty("workflowRef") String workflowRef,
        @JsonProperty("workflowSha") String workflowSha
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptDocument {
        Objects.requireNonNull(adapter, "adapter");
        Objects.requireNonNull(artifactByteCount, "artifactByteCount");
        Objects.requireNonNull(artifactDigest, "artifactDigest");
        Objects.requireNonNull(artifactFileCount, "artifactFileCount");
        Objects.requireNonNull(artifactId, "artifactId");
        Objects.requireNonNull(artifactManifestDigest, "artifactManifestDigest");
        Objects.requireNonNull(attemptSnapshotSequence, "attemptSnapshotSequence");
        Objects.requireNonNull(attempts, "attempts");
        Objects.requireNonNull(completedAt, "completedAt");
        Objects.requireNonNull(destination, "destination");
        Objects.requireNonNull(effectiveArtifactExpiresAt, "effectiveArtifactExpiresAt");
        Objects.requireNonNull(evidenceJournalEntryCount, "evidenceJournalEntryCount");
        Objects.requireNonNull(evidenceJournalHeadDigest, "evidenceJournalHeadDigest");
        Objects.requireNonNull(intentDigest, "intentDigest");
        Objects.requireNonNull(issuer, "issuer");
        Objects.requireNonNull(observations, "observations");
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(organizationId, "organizationId");
        Objects.requireNonNull(outcome, "outcome");
        Objects.requireNonNull(provenanceDigest, "provenanceDigest");
        Objects.requireNonNull(publisher, "publisher");
        Objects.requireNonNull(receiptDigest, "receiptDigest");
        Objects.requireNonNull(receiptId, "receiptId");
        Objects.requireNonNull(repositoryId, "repositoryId");
        Objects.requireNonNull(repositoryOwnerId, "repositoryOwnerId");
        Objects.requireNonNull(requestedArtifactRetentionDays, "requestedArtifactRetentionDays");
        Objects.requireNonNull(runAttempt, "runAttempt");
        Objects.requireNonNull(runId, "runId");
        Objects.requireNonNull(sbomDigest, "sbomDigest");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(snapshotSequence, "snapshotSequence");
        Objects.requireNonNull(sourceCommit, "sourceCommit");
        Objects.requireNonNull(startedAt, "startedAt");
        Objects.requireNonNull(submissionEvidenceDigest, "submissionEvidenceDigest");
        Objects.requireNonNull(verificationTier, "verificationTier");
        Objects.requireNonNull(warnings, "warnings");
        Objects.requireNonNull(workflowRef, "workflowRef");
        Objects.requireNonNull(workflowSha, "workflowSha");
    }
}
