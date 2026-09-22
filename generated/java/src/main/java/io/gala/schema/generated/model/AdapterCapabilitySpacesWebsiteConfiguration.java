// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/spacesWebsiteConfiguration; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/spacesWebsiteConfiguration. */
public record AdapterCapabilitySpacesWebsiteConfiguration(
        @JsonProperty("configurationDigest") String configurationDigest,
        @JsonProperty("errorDocumentKey") String errorDocumentKey,
        @JsonProperty("indexDocumentSuffix") String indexDocumentSuffix,
        @JsonProperty("profile") String profile,
        @JsonProperty("routingRules") JsonNode routingRules
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilitySpacesWebsiteConfiguration {
        Objects.requireNonNull(configurationDigest, "configurationDigest");
        Objects.requireNonNull(errorDocumentKey, "errorDocumentKey");
        Objects.requireNonNull(indexDocumentSuffix, "indexDocumentSuffix");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(routingRules, "routingRules");
    }
}
