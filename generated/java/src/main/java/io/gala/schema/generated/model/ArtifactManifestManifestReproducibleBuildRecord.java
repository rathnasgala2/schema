// Generated from urn:gala:schema:artifact-manifest:2.0.0#/$defs/manifestReproducibleBuildRecord; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:artifact-manifest:2.0.0#/$defs/manifestReproducibleBuildRecord. */
public record ArtifactManifestManifestReproducibleBuildRecord(
        @JsonProperty("basePath") String basePath,
        @JsonProperty("baseUrl") String baseUrl,
        @JsonProperty("buildEpoch") String buildEpoch,
        @JsonProperty("buildInputDigest") String buildInputDigest,
        @JsonProperty("buildPolicyDecisionDigest") String buildPolicyDecisionDigest,
        @JsonProperty("builder") ArtifactManifestPackageIdentity builder,
        @JsonProperty("contractVersion") String contractVersion,
        @JsonProperty("dependencyLockDigest") String dependencyLockDigest,
        @JsonProperty("destinationCapabilityDigest") String destinationCapabilityDigest,
        @JsonProperty("packageReleaseCatalogDigest") String packageReleaseCatalogDigest,
        @JsonProperty("policyReleaseId") String policyReleaseId,
        @JsonProperty("renderPolicy") ArtifactManifestManifestRenderPolicyIdentity renderPolicy,
        @JsonProperty("repositoryId") String repositoryId,
        @JsonProperty("repositoryRootDigest") String repositoryRootDigest,
        @JsonProperty("schemas") ArtifactManifestPackageIdentity schemas,
        @JsonProperty("sourceCommit") String sourceCommit,
        @JsonProperty("sourceTree") String sourceTree,
        @JsonProperty("stylingContractDigest") String stylingContractDigest,
        @JsonProperty("template") ArtifactManifestPackageIdentity template,
        @JsonProperty("theme") ArtifactManifestPackageIdentity theme,
        @JsonProperty("workflowIdentity") String workflowIdentity
) {
    /** Reject a missing required root member before domain use. */
    public ArtifactManifestManifestReproducibleBuildRecord {
        Objects.requireNonNull(basePath, "basePath");
        Objects.requireNonNull(baseUrl, "baseUrl");
        Objects.requireNonNull(buildEpoch, "buildEpoch");
        Objects.requireNonNull(buildInputDigest, "buildInputDigest");
        Objects.requireNonNull(buildPolicyDecisionDigest, "buildPolicyDecisionDigest");
        Objects.requireNonNull(builder, "builder");
        Objects.requireNonNull(contractVersion, "contractVersion");
        Objects.requireNonNull(dependencyLockDigest, "dependencyLockDigest");
        Objects.requireNonNull(destinationCapabilityDigest, "destinationCapabilityDigest");
        Objects.requireNonNull(packageReleaseCatalogDigest, "packageReleaseCatalogDigest");
        Objects.requireNonNull(policyReleaseId, "policyReleaseId");
        Objects.requireNonNull(renderPolicy, "renderPolicy");
        Objects.requireNonNull(repositoryId, "repositoryId");
        Objects.requireNonNull(repositoryRootDigest, "repositoryRootDigest");
        Objects.requireNonNull(schemas, "schemas");
        Objects.requireNonNull(sourceCommit, "sourceCommit");
        Objects.requireNonNull(sourceTree, "sourceTree");
        Objects.requireNonNull(stylingContractDigest, "stylingContractDigest");
        Objects.requireNonNull(template, "template");
        Objects.requireNonNull(theme, "theme");
        Objects.requireNonNull(workflowIdentity, "workflowIdentity");
    }
}
