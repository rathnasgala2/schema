// Generated from urn:gala:schema:artifact-manifest:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:artifact-manifest:2.0.0. */
public record ArtifactManifestDocument(
        @JsonProperty("artifactByteCount") String artifactByteCount,
        @JsonProperty("artifactDigest") String artifactDigest,
        @JsonProperty("artifactFileCount") String artifactFileCount,
        @JsonProperty("artifactId") String artifactId,
        @JsonProperty("assets") List<ArtifactManifestManifestAsset> assets,
        @JsonProperty("buildInputContractVersion") String buildInputContractVersion,
        @JsonProperty("buildInputDigest") String buildInputDigest,
        @JsonProperty("buildToolVersions") List<JsonNode> buildToolVersions,
        @JsonProperty("builder") ArtifactManifestPackageIdentity builder,
        @JsonProperty("composition") ArtifactManifestManifestCompositionIdentity composition,
        @JsonProperty("declarativeHeaders") JsonNode declarativeHeaders,
        @JsonProperty("excludedInputs") List<ArtifactManifestManifestExcludedInput> excludedInputs,
        @JsonProperty("findings") List<ArtifactManifestFinding> findings,
        @JsonProperty("generatedAt") String generatedAt,
        @JsonProperty("includedSources") List<ArtifactManifestManifestIncludedSource> includedSources,
        @JsonProperty("manifestDigest") String manifestDigest,
        @JsonProperty("measurements") List<ArtifactManifestMeasurement> measurements,
        @JsonProperty("policyResult") String policyResult,
        @JsonProperty("redirects") List<ArtifactManifestManifestRedirect> redirects,
        @JsonProperty("repositoryNodeId") String repositoryNodeId,
        @JsonProperty("reproducibilityClass") String reproducibilityClass,
        @JsonProperty("routes") List<ArtifactManifestManifestRoute> routes,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion,
        @JsonProperty("sourceCommit") String sourceCommit,
        @JsonProperty("sourceIdentity") ArtifactManifestManifestSourceIdentity sourceIdentity,
        @JsonProperty("sourceInventoryDigest") String sourceInventoryDigest,
        @JsonProperty("validation") ArtifactManifestManifestValidationEvidence validation,
        @JsonProperty("workflowIdentity") String workflowIdentity
) {
    /** Reject a missing required root member before domain use. */
    public ArtifactManifestDocument {
        Objects.requireNonNull(artifactByteCount, "artifactByteCount");
        Objects.requireNonNull(artifactDigest, "artifactDigest");
        Objects.requireNonNull(artifactFileCount, "artifactFileCount");
        Objects.requireNonNull(artifactId, "artifactId");
        Objects.requireNonNull(assets, "assets");
        Objects.requireNonNull(buildInputContractVersion, "buildInputContractVersion");
        Objects.requireNonNull(buildInputDigest, "buildInputDigest");
        Objects.requireNonNull(buildToolVersions, "buildToolVersions");
        Objects.requireNonNull(builder, "builder");
        Objects.requireNonNull(composition, "composition");
        Objects.requireNonNull(declarativeHeaders, "declarativeHeaders");
        Objects.requireNonNull(excludedInputs, "excludedInputs");
        Objects.requireNonNull(findings, "findings");
        Objects.requireNonNull(generatedAt, "generatedAt");
        Objects.requireNonNull(includedSources, "includedSources");
        Objects.requireNonNull(manifestDigest, "manifestDigest");
        Objects.requireNonNull(measurements, "measurements");
        Objects.requireNonNull(policyResult, "policyResult");
        Objects.requireNonNull(redirects, "redirects");
        Objects.requireNonNull(repositoryNodeId, "repositoryNodeId");
        Objects.requireNonNull(reproducibilityClass, "reproducibilityClass");
        Objects.requireNonNull(routes, "routes");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(sourceCommit, "sourceCommit");
        Objects.requireNonNull(sourceIdentity, "sourceIdentity");
        Objects.requireNonNull(sourceInventoryDigest, "sourceInventoryDigest");
        Objects.requireNonNull(validation, "validation");
        Objects.requireNonNull(workflowIdentity, "workflowIdentity");
    }
}
