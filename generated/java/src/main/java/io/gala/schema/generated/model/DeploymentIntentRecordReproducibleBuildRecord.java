// Generated from urn:gala:schema:deployment-intent:2.0.0#/$defs/recordReproducibleBuildRecord; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-intent:2.0.0#/$defs/recordReproducibleBuildRecord. */
public record DeploymentIntentRecordReproducibleBuildRecord(
        @JsonProperty("basePath") String basePath,
        @JsonProperty("baseUrl") String baseUrl,
        @JsonProperty("buildEpoch") String buildEpoch,
        @JsonProperty("buildInputDigest") String buildInputDigest,
        @JsonProperty("buildPolicyDecisionDigest") String buildPolicyDecisionDigest,
        @JsonProperty("builder") DeploymentIntentPackageIdentity builder,
        @JsonProperty("contractVersion") String contractVersion,
        @JsonProperty("dependencyLockDigest") String dependencyLockDigest,
        @JsonProperty("destinationCapabilityDigest") String destinationCapabilityDigest,
        @JsonProperty("packageReleaseCatalogDigest") String packageReleaseCatalogDigest,
        @JsonProperty("policyReleaseId") String policyReleaseId,
        @JsonProperty("renderPolicy") DeploymentIntentRecordRenderPolicyIdentity renderPolicy,
        @JsonProperty("repositoryId") String repositoryId,
        @JsonProperty("repositoryRootDigest") String repositoryRootDigest,
        @JsonProperty("schemas") DeploymentIntentPackageIdentity schemas,
        @JsonProperty("sourceCommit") String sourceCommit,
        @JsonProperty("sourceTree") String sourceTree,
        @JsonProperty("stylingContractDigest") String stylingContractDigest,
        @JsonProperty("template") DeploymentIntentPackageIdentity template,
        @JsonProperty("theme") DeploymentIntentPackageIdentity theme,
        @JsonProperty("workflowIdentity") String workflowIdentity
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentIntentRecordReproducibleBuildRecord {
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
