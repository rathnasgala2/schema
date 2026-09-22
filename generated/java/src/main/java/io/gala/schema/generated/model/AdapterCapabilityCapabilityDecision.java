// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/capabilityDecision; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/capabilityDecision. */
public record AdapterCapabilityCapabilityDecision(
        @JsonProperty("adapter") AdapterCapabilityAdapterIdentity adapter,
        @JsonProperty("artifactByteCount") String artifactByteCount,
        @JsonProperty("artifactDigest") String artifactDigest,
        @JsonProperty("artifactFileCount") String artifactFileCount,
        @JsonProperty("artifactId") String artifactId,
        @JsonProperty("capabilityDigest") String capabilityDigest,
        @JsonProperty("credentialEgressProfileDigest") String credentialEgressProfileDigest,
        @JsonProperty("decisionDigest") String decisionDigest,
        @JsonProperty("deploymentByteCount") String deploymentByteCount,
        @JsonProperty("deploymentObjectCount") String deploymentObjectCount,
        @JsonProperty("destination") AdapterCapabilityDestinationIdentity destination,
        @JsonProperty("manifestDigest") String manifestDigest,
        @JsonProperty("markerByteLength") String markerByteLength,
        @JsonProperty("maximumFinalPathByteLength") String maximumFinalPathByteLength,
        @JsonProperty("maximumStageRequestBytes") String maximumStageRequestBytes,
        @JsonProperty("maximumStageRequestCount") String maximumStageRequestCount,
        @JsonProperty("maximumStageResponseBytes") String maximumStageResponseBytes,
        @JsonProperty("maximumStageResponseWireBytes") String maximumStageResponseWireBytes,
        @JsonProperty("pagesActionsArtifactByteCount") String pagesActionsArtifactByteCount,
        @JsonProperty("pagesActionsArtifactDigest") String pagesActionsArtifactDigest,
        @JsonProperty("pagesActionsArtifactName") String pagesActionsArtifactName,
        @JsonProperty("pagesBuildVersion") String pagesBuildVersion,
        @JsonProperty("pagesOidcOriginCatalogDigest") String pagesOidcOriginCatalogDigest,
        @JsonProperty("profile") String profile,
        @JsonProperty("spacesControlPlaneBindingDigest") String spacesControlPlaneBindingDigest,
        @JsonProperty("spacesControlPlaneRequestCatalogDigest") String spacesControlPlaneRequestCatalogDigest,
        @JsonProperty("spacesControlPlaneResponseCatalogDigest") String spacesControlPlaneResponseCatalogDigest,
        @JsonProperty("spacesControlPlaneTlsProfileDigest") String spacesControlPlaneTlsProfileDigest,
        @JsonProperty("spacesStagePrefix") String spacesStagePrefix,
        @JsonProperty("spacesWebsiteConfigurationDigest") String spacesWebsiteConfigurationDigest
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityCapabilityDecision {
        Objects.requireNonNull(adapter, "adapter");
        Objects.requireNonNull(artifactByteCount, "artifactByteCount");
        Objects.requireNonNull(artifactDigest, "artifactDigest");
        Objects.requireNonNull(artifactFileCount, "artifactFileCount");
        Objects.requireNonNull(artifactId, "artifactId");
        Objects.requireNonNull(capabilityDigest, "capabilityDigest");
        Objects.requireNonNull(decisionDigest, "decisionDigest");
        Objects.requireNonNull(deploymentByteCount, "deploymentByteCount");
        Objects.requireNonNull(deploymentObjectCount, "deploymentObjectCount");
        Objects.requireNonNull(destination, "destination");
        Objects.requireNonNull(manifestDigest, "manifestDigest");
        Objects.requireNonNull(markerByteLength, "markerByteLength");
        Objects.requireNonNull(maximumFinalPathByteLength, "maximumFinalPathByteLength");
        Objects.requireNonNull(maximumStageRequestBytes, "maximumStageRequestBytes");
        Objects.requireNonNull(maximumStageRequestCount, "maximumStageRequestCount");
        Objects.requireNonNull(maximumStageResponseBytes, "maximumStageResponseBytes");
        Objects.requireNonNull(maximumStageResponseWireBytes, "maximumStageResponseWireBytes");
        Objects.requireNonNull(profile, "profile");
    }
}
