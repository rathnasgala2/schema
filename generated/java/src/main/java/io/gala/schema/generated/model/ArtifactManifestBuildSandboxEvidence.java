// Generated from urn:gala:schema:artifact-manifest:2.0.0#/$defs/buildSandboxEvidence; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:artifact-manifest:2.0.0#/$defs/buildSandboxEvidence. */
public record ArtifactManifestBuildSandboxEvidence(
        @JsonProperty("filesystemPolicyDigest") String filesystemPolicyDigest,
        @JsonProperty("locale") String locale,
        @JsonProperty("networkPolicyDigest") String networkPolicyDigest,
        @JsonProperty("nodeExecutableDigest") String nodeExecutableDigest,
        @JsonProperty("nodeVersion") String nodeVersion,
        @JsonProperty("npmExecutableDigest") String npmExecutableDigest,
        @JsonProperty("npmVersion") String npmVersion,
        @JsonProperty("runnerEnvironment") String runnerEnvironment,
        @JsonProperty("runnerImageRelease") String runnerImageRelease,
        @JsonProperty("runnerImageReleaseDigest") String runnerImageReleaseDigest,
        @JsonProperty("sourceDateEpoch") String sourceDateEpoch,
        @JsonProperty("timezone") String timezone
) {
    /** Reject a missing required root member before domain use. */
    public ArtifactManifestBuildSandboxEvidence {
        Objects.requireNonNull(filesystemPolicyDigest, "filesystemPolicyDigest");
        Objects.requireNonNull(locale, "locale");
        Objects.requireNonNull(networkPolicyDigest, "networkPolicyDigest");
        Objects.requireNonNull(nodeExecutableDigest, "nodeExecutableDigest");
        Objects.requireNonNull(nodeVersion, "nodeVersion");
        Objects.requireNonNull(npmExecutableDigest, "npmExecutableDigest");
        Objects.requireNonNull(npmVersion, "npmVersion");
        Objects.requireNonNull(runnerEnvironment, "runnerEnvironment");
        Objects.requireNonNull(runnerImageRelease, "runnerImageRelease");
        Objects.requireNonNull(runnerImageReleaseDigest, "runnerImageReleaseDigest");
        Objects.requireNonNull(sourceDateEpoch, "sourceDateEpoch");
        Objects.requireNonNull(timezone, "timezone");
    }
}
