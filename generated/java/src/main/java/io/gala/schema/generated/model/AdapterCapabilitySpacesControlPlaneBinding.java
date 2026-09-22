// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/spacesControlPlaneBinding; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/spacesControlPlaneBinding. */
public record AdapterCapabilitySpacesControlPlaneBinding(
        @JsonProperty("bindingDigest") String bindingDigest,
        @JsonProperty("deploymentCredentialWebsiteAccess") String deploymentCredentialWebsiteAccess,
        @JsonProperty("profile") String profile,
        @JsonProperty("region") String region,
        @JsonProperty("servedBucket") String servedBucket,
        @JsonProperty("stagingBucket") String stagingBucket,
        @JsonProperty("stagingWebsiteConfiguration") String stagingWebsiteConfiguration,
        @JsonProperty("websiteConfigurationDigest") String websiteConfigurationDigest,
        @JsonProperty("websiteOrigin") String websiteOrigin
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilitySpacesControlPlaneBinding {
        Objects.requireNonNull(bindingDigest, "bindingDigest");
        Objects.requireNonNull(deploymentCredentialWebsiteAccess, "deploymentCredentialWebsiteAccess");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(region, "region");
        Objects.requireNonNull(servedBucket, "servedBucket");
        Objects.requireNonNull(stagingBucket, "stagingBucket");
        Objects.requireNonNull(stagingWebsiteConfiguration, "stagingWebsiteConfiguration");
        Objects.requireNonNull(websiteConfigurationDigest, "websiteConfigurationDigest");
        Objects.requireNonNull(websiteOrigin, "websiteOrigin");
    }
}
