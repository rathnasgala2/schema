// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/adapterConfigurationCapabilities; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/adapterConfigurationCapabilities. */
public record AdapterCapabilityAdapterConfigurationCapabilities(
        @JsonProperty("customDomains") Boolean customDomains,
        @JsonProperty("headers") Boolean headers,
        @JsonProperty("immutableCaching") Boolean immutableCaching,
        @JsonProperty("notFoundBehavior") Boolean notFoundBehavior,
        @JsonProperty("redirects") Boolean redirects
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityAdapterConfigurationCapabilities {
        Objects.requireNonNull(customDomains, "customDomains");
        Objects.requireNonNull(headers, "headers");
        Objects.requireNonNull(immutableCaching, "immutableCaching");
        Objects.requireNonNull(notFoundBehavior, "notFoundBehavior");
        Objects.requireNonNull(redirects, "redirects");
    }
}
