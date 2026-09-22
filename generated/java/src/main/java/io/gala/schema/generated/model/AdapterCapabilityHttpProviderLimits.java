// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/httpProviderLimits; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/httpProviderLimits. */
public record AdapterCapabilityHttpProviderLimits(
        @JsonProperty("callClassBinding") List<AdapterCapabilityProviderCallClassBinding> callClassBinding,
        @JsonProperty("callClassBindingDigest") String callClassBindingDigest,
        @JsonProperty("credentialEgressProfileDigest") String credentialEgressProfileDigest,
        @JsonProperty("managedExecutionBudget") AdapterCapabilityManagedExecutionBudget managedExecutionBudget,
        @JsonProperty("maximumArtifactBytes") String maximumArtifactBytes,
        @JsonProperty("maximumFileBytes") String maximumFileBytes,
        @JsonProperty("maximumFiles") String maximumFiles,
        @JsonProperty("maximumPagesArtifactBytes") String maximumPagesArtifactBytes,
        @JsonProperty("maximumPathBytes") Long maximumPathBytes,
        @JsonProperty("maximumProviderCallSeconds") Long maximumProviderCallSeconds,
        @JsonProperty("maximumProviderRequestBodyBytes") String maximumProviderRequestBodyBytes,
        @JsonProperty("maximumProviderRequestHeadBytes") Long maximumProviderRequestHeadBytes,
        @JsonProperty("maximumProviderRequestsPerStage") Long maximumProviderRequestsPerStage,
        @JsonProperty("maximumProviderResponseBodyBytes") String maximumProviderResponseBodyBytes,
        @JsonProperty("maximumProviderResponseHeadBytes") Long maximumProviderResponseHeadBytes,
        @JsonProperty("maximumProviderResponseWireBodyBytes") String maximumProviderResponseWireBodyBytes,
        @JsonProperty("maximumProviderStageRequestBytes") String maximumProviderStageRequestBytes,
        @JsonProperty("maximumProviderStageResponseBytes") String maximumProviderStageResponseBytes,
        @JsonProperty("maximumProviderStageResponseWireBytes") String maximumProviderStageResponseWireBytes,
        @JsonProperty("pagesArtifactProfile") String pagesArtifactProfile,
        @JsonProperty("pathRuleProfile") String pathRuleProfile,
        @JsonProperty("providerCompatibilityEvidenceDigest") String providerCompatibilityEvidenceDigest,
        @JsonProperty("requestTemplateCatalogDigest") String requestTemplateCatalogDigest,
        @JsonProperty("requestTemplateProfile") String requestTemplateProfile,
        @JsonProperty("requestTemplates") List<AdapterCapabilityProviderRequestTemplate> requestTemplates,
        @JsonProperty("responseProfileCatalogDigest") String responseProfileCatalogDigest,
        @JsonProperty("spacesControlPlaneBindingDigest") String spacesControlPlaneBindingDigest,
        @JsonProperty("spacesControlPlaneRequestCatalogDigest") String spacesControlPlaneRequestCatalogDigest,
        @JsonProperty("spacesControlPlaneResponseCatalogDigest") String spacesControlPlaneResponseCatalogDigest,
        @JsonProperty("spacesControlPlaneTlsProfileDigest") String spacesControlPlaneTlsProfileDigest,
        @JsonProperty("spacesWebsiteConfigurationDigest") String spacesWebsiteConfigurationDigest,
        @JsonProperty("tlsProfileDigest") String tlsProfileDigest,
        @JsonProperty("transport") String transport
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityHttpProviderLimits {
        Objects.requireNonNull(credentialEgressProfileDigest, "credentialEgressProfileDigest");
        Objects.requireNonNull(managedExecutionBudget, "managedExecutionBudget");
        Objects.requireNonNull(maximumArtifactBytes, "maximumArtifactBytes");
        Objects.requireNonNull(maximumFileBytes, "maximumFileBytes");
        Objects.requireNonNull(maximumFiles, "maximumFiles");
        Objects.requireNonNull(maximumPathBytes, "maximumPathBytes");
        Objects.requireNonNull(maximumProviderCallSeconds, "maximumProviderCallSeconds");
        Objects.requireNonNull(maximumProviderRequestBodyBytes, "maximumProviderRequestBodyBytes");
        Objects.requireNonNull(maximumProviderRequestHeadBytes, "maximumProviderRequestHeadBytes");
        Objects.requireNonNull(maximumProviderRequestsPerStage, "maximumProviderRequestsPerStage");
        Objects.requireNonNull(maximumProviderResponseBodyBytes, "maximumProviderResponseBodyBytes");
        Objects.requireNonNull(maximumProviderResponseHeadBytes, "maximumProviderResponseHeadBytes");
        Objects.requireNonNull(maximumProviderResponseWireBodyBytes, "maximumProviderResponseWireBodyBytes");
        Objects.requireNonNull(maximumProviderStageRequestBytes, "maximumProviderStageRequestBytes");
        Objects.requireNonNull(maximumProviderStageResponseBytes, "maximumProviderStageResponseBytes");
        Objects.requireNonNull(maximumProviderStageResponseWireBytes, "maximumProviderStageResponseWireBytes");
        Objects.requireNonNull(pathRuleProfile, "pathRuleProfile");
        Objects.requireNonNull(providerCompatibilityEvidenceDigest, "providerCompatibilityEvidenceDigest");
        Objects.requireNonNull(requestTemplateCatalogDigest, "requestTemplateCatalogDigest");
        Objects.requireNonNull(requestTemplateProfile, "requestTemplateProfile");
        Objects.requireNonNull(requestTemplates, "requestTemplates");
        Objects.requireNonNull(responseProfileCatalogDigest, "responseProfileCatalogDigest");
        Objects.requireNonNull(tlsProfileDigest, "tlsProfileDigest");
        Objects.requireNonNull(transport, "transport");
    }
}
