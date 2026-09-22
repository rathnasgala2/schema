// Generated from urn:gala:metadata:build-provenance:2.0.0#/$defs/manifestSourceIdentity; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:metadata:build-provenance:2.0.0#/$defs/manifestSourceIdentity. */
public record BuildProvenanceManifestSourceIdentity(
        @JsonProperty("commit") String commit,
        @JsonProperty("provider") String provider,
        @JsonProperty("repository") String repository,
        @JsonProperty("repositoryId") String repositoryId,
        @JsonProperty("repositoryOwnerId") String repositoryOwnerId,
        @JsonProperty("treeDigest") String treeDigest
) {
    /** Reject a missing required root member before domain use. */
    public BuildProvenanceManifestSourceIdentity {
        Objects.requireNonNull(commit, "commit");
        Objects.requireNonNull(provider, "provider");
        Objects.requireNonNull(repository, "repository");
        Objects.requireNonNull(repositoryId, "repositoryId");
        Objects.requireNonNull(repositoryOwnerId, "repositoryOwnerId");
        Objects.requireNonNull(treeDigest, "treeDigest");
    }
}
