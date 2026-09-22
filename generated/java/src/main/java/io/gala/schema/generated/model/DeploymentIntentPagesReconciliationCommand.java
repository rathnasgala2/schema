// Generated from urn:gala:schema:deployment-intent:2.0.0#/$defs/pagesReconciliationCommand; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-intent:2.0.0#/$defs/pagesReconciliationCommand. */
public record DeploymentIntentPagesReconciliationCommand(
        @JsonProperty("acceptedAt") String acceptedAt,
        @JsonProperty("actorPrincipalId") String actorPrincipalId,
        @JsonProperty("commandDigest") String commandDigest,
        @JsonProperty("consequentialConfirmationId") String consequentialConfirmationId,
        @JsonProperty("expiresAt") String expiresAt,
        @JsonProperty("generationId") String generationId,
        @JsonProperty("operationId") String operationId,
        @JsonProperty("priorAttemptId") String priorAttemptId,
        @JsonProperty("priorAuthorityEpoch") String priorAuthorityEpoch,
        @JsonProperty("priorAuthorityId") String priorAuthorityId,
        @JsonProperty("priorFenceEvidenceDigest") String priorFenceEvidenceDigest,
        @JsonProperty("priorIntentDigest") String priorIntentDigest,
        @JsonProperty("priorRunAttempt") Long priorRunAttempt,
        @JsonProperty("profile") String profile,
        @JsonProperty("publicationId") String publicationId,
        @JsonProperty("reconcileCommandId") String reconcileCommandId,
        @JsonProperty("runId") String runId
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentIntentPagesReconciliationCommand {
        Objects.requireNonNull(acceptedAt, "acceptedAt");
        Objects.requireNonNull(actorPrincipalId, "actorPrincipalId");
        Objects.requireNonNull(commandDigest, "commandDigest");
        Objects.requireNonNull(consequentialConfirmationId, "consequentialConfirmationId");
        Objects.requireNonNull(expiresAt, "expiresAt");
        Objects.requireNonNull(generationId, "generationId");
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(priorAttemptId, "priorAttemptId");
        Objects.requireNonNull(priorAuthorityEpoch, "priorAuthorityEpoch");
        Objects.requireNonNull(priorAuthorityId, "priorAuthorityId");
        Objects.requireNonNull(priorFenceEvidenceDigest, "priorFenceEvidenceDigest");
        Objects.requireNonNull(priorIntentDigest, "priorIntentDigest");
        Objects.requireNonNull(priorRunAttempt, "priorRunAttempt");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(publicationId, "publicationId");
        Objects.requireNonNull(reconcileCommandId, "reconcileCommandId");
        Objects.requireNonNull(runId, "runId");
    }
}
