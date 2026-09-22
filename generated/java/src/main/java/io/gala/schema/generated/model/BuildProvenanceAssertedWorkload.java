// Generated from urn:gala:metadata:build-provenance:2.0.0#/$defs/assertedWorkload; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:metadata:build-provenance:2.0.0#/$defs/assertedWorkload. */
public record BuildProvenanceAssertedWorkload(
        @JsonProperty("actor") String actor,
        @JsonProperty("actorId") String actorId,
        @JsonProperty("callerPath") String callerPath,
        @JsonProperty("eventName") String eventName,
        @JsonProperty("ref") String ref,
        @JsonProperty("repository") String repository,
        @JsonProperty("repositoryId") String repositoryId,
        @JsonProperty("repositoryOwner") String repositoryOwner,
        @JsonProperty("repositoryOwnerId") String repositoryOwnerId,
        @JsonProperty("runAttempt") Long runAttempt,
        @JsonProperty("runId") String runId,
        @JsonProperty("runNumber") String runNumber,
        @JsonProperty("sourceCommit") String sourceCommit,
        @JsonProperty("verificationState") String verificationState,
        @JsonProperty("workflowTriggerCommit") String workflowTriggerCommit
) {
    /** Reject a missing required root member before domain use. */
    public BuildProvenanceAssertedWorkload {
        Objects.requireNonNull(actor, "actor");
        Objects.requireNonNull(actorId, "actorId");
        Objects.requireNonNull(callerPath, "callerPath");
        Objects.requireNonNull(eventName, "eventName");
        Objects.requireNonNull(ref, "ref");
        Objects.requireNonNull(repository, "repository");
        Objects.requireNonNull(repositoryId, "repositoryId");
        Objects.requireNonNull(repositoryOwner, "repositoryOwner");
        Objects.requireNonNull(repositoryOwnerId, "repositoryOwnerId");
        Objects.requireNonNull(runAttempt, "runAttempt");
        Objects.requireNonNull(runId, "runId");
        Objects.requireNonNull(runNumber, "runNumber");
        Objects.requireNonNull(sourceCommit, "sourceCommit");
        Objects.requireNonNull(verificationState, "verificationState");
        Objects.requireNonNull(workflowTriggerCommit, "workflowTriggerCommit");
    }
}
