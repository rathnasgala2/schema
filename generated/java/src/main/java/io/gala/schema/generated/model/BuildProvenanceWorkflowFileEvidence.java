// Generated from urn:gala:metadata:build-provenance:2.0.0#/$defs/workflowFileEvidence; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:metadata:build-provenance:2.0.0#/$defs/workflowFileEvidence. */
public record BuildProvenanceWorkflowFileEvidence(
        @JsonProperty("commit") String commit,
        @JsonProperty("fileDigest") String fileDigest,
        @JsonProperty("identitySource") String identitySource,
        @JsonProperty("path") String path,
        @JsonProperty("repositoryId") String repositoryId,
        @JsonProperty("role") String role
) {
    /** Reject a missing required root member before domain use. */
    public BuildProvenanceWorkflowFileEvidence {
        Objects.requireNonNull(commit, "commit");
        Objects.requireNonNull(fileDigest, "fileDigest");
        Objects.requireNonNull(identitySource, "identitySource");
        Objects.requireNonNull(path, "path");
        Objects.requireNonNull(repositoryId, "repositoryId");
        Objects.requireNonNull(role, "role");
    }
}
