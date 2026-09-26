// Generated from urn:gala:metadata:build-provenance:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:metadata:build-provenance:2.0.0. */
public record BuildProvenanceDocument(
        @JsonProperty("actionPins") List<BuildProvenanceActionPinEvidence> actionPins,
        @JsonProperty("artifactDigest") String artifactDigest,
        @JsonProperty("artifactId") String artifactId,
        @JsonProperty("artifactLicenseConclusions") List<BuildProvenanceArtifactLicenseConclusion> artifactLicenseConclusions,
        @JsonProperty("assertedWorkload") BuildProvenanceAssertedWorkload assertedWorkload,
        @JsonProperty("buildInputDigest") String buildInputDigest,
        @JsonProperty("buildPolicyDecisionDigest") String buildPolicyDecisionDigest,
        @JsonProperty("capabilityDecisionDigest") String capabilityDecisionDigest,
        @JsonProperty("lockDigest") String lockDigest,
        @JsonProperty("manifestDigest") String manifestDigest,
        @JsonProperty("packageReleaseCatalogDigest") String packageReleaseCatalogDigest,
        @JsonProperty("policyReleaseId") String policyReleaseId,
        @JsonProperty("rebuildRecord") BuildProvenanceManifestReproducibleBuildRecord rebuildRecord,
        @JsonProperty("renderPolicy") BuildProvenanceManifestRenderPolicyIdentity renderPolicy,
        @JsonProperty("requiredOidcClaims") JsonNode requiredOidcClaims,
        @JsonProperty("sandbox") BuildProvenanceBuildSandboxEvidence sandbox,
        @JsonProperty("sbomDigest") String sbomDigest,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion,
        @JsonProperty("secretInputs") JsonNode secretInputs,
        @JsonProperty("spdx23JsonSchemaDigest") String spdx23JsonSchemaDigest,
        @JsonProperty("spdxLicenseListDigest") String spdxLicenseListDigest,
        @JsonProperty("spdxLicenseListVersion") String spdxLicenseListVersion,
        @JsonProperty("stylingContractDigest") String stylingContractDigest,
        @JsonProperty("unfrozenOutputHandoff") BuildProvenanceWorkflowCarrierEvidence unfrozenOutputHandoff,
        @JsonProperty("verifiedInputHandoff") BuildProvenanceWorkflowCarrierEvidence verifiedInputHandoff,
        @JsonProperty("workflowFiles") List<JsonNode> workflowFiles
) {
    /** Reject a missing required root member before domain use. */
    public BuildProvenanceDocument {
        Objects.requireNonNull(actionPins, "actionPins");
        Objects.requireNonNull(artifactDigest, "artifactDigest");
        Objects.requireNonNull(artifactId, "artifactId");
        Objects.requireNonNull(artifactLicenseConclusions, "artifactLicenseConclusions");
        Objects.requireNonNull(assertedWorkload, "assertedWorkload");
        Objects.requireNonNull(buildInputDigest, "buildInputDigest");
        Objects.requireNonNull(buildPolicyDecisionDigest, "buildPolicyDecisionDigest");
        Objects.requireNonNull(capabilityDecisionDigest, "capabilityDecisionDigest");
        Objects.requireNonNull(lockDigest, "lockDigest");
        Objects.requireNonNull(manifestDigest, "manifestDigest");
        Objects.requireNonNull(packageReleaseCatalogDigest, "packageReleaseCatalogDigest");
        Objects.requireNonNull(policyReleaseId, "policyReleaseId");
        Objects.requireNonNull(rebuildRecord, "rebuildRecord");
        Objects.requireNonNull(renderPolicy, "renderPolicy");
        Objects.requireNonNull(requiredOidcClaims, "requiredOidcClaims");
        Objects.requireNonNull(sandbox, "sandbox");
        Objects.requireNonNull(sbomDigest, "sbomDigest");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(secretInputs, "secretInputs");
        Objects.requireNonNull(spdx23JsonSchemaDigest, "spdx23JsonSchemaDigest");
        Objects.requireNonNull(spdxLicenseListDigest, "spdxLicenseListDigest");
        Objects.requireNonNull(spdxLicenseListVersion, "spdxLicenseListVersion");
        Objects.requireNonNull(stylingContractDigest, "stylingContractDigest");
        Objects.requireNonNull(unfrozenOutputHandoff, "unfrozenOutputHandoff");
        Objects.requireNonNull(verifiedInputHandoff, "verifiedInputHandoff");
        Objects.requireNonNull(workflowFiles, "workflowFiles");
    }
}
