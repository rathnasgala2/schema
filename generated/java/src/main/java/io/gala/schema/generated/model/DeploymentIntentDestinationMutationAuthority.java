// Generated from urn:gala:schema:deployment-intent:2.0.0#/$defs/destinationMutationAuthority; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-intent:2.0.0#/$defs/destinationMutationAuthority. */
public record DeploymentIntentDestinationMutationAuthority(
        @JsonProperty("attemptId") String attemptId,
        @JsonProperty("authorityId") String authorityId,
        @JsonProperty("destination") DeploymentIntentDestinationIdentity destination,
        @JsonProperty("destinationMutationKeyDigest") String destinationMutationKeyDigest,
        @JsonProperty("epoch") String epoch,
        @JsonProperty("expectedGenerationId") String expectedGenerationId,
        @JsonProperty("expiresAt") String expiresAt,
        @JsonProperty("mode") String mode,
        @JsonProperty("operationId") String operationId,
        @JsonProperty("pagesRecovery") DeploymentIntentPagesReconciliationRecovery pagesRecovery,
        @JsonProperty("profile") String profile,
        @JsonProperty("proposedGenerationId") String proposedGenerationId
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentIntentDestinationMutationAuthority {
        Objects.requireNonNull(attemptId, "attemptId");
        Objects.requireNonNull(authorityId, "authorityId");
        Objects.requireNonNull(destination, "destination");
        Objects.requireNonNull(destinationMutationKeyDigest, "destinationMutationKeyDigest");
        Objects.requireNonNull(epoch, "epoch");
        Objects.requireNonNull(expiresAt, "expiresAt");
        Objects.requireNonNull(mode, "mode");
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(proposedGenerationId, "proposedGenerationId");
    }
}
