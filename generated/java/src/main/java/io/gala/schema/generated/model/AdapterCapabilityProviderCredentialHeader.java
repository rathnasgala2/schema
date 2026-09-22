// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/providerCredentialHeader; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/providerCredentialHeader. */
public record AdapterCapabilityProviderCredentialHeader(
        @JsonProperty("maximumRenderedValueBytes") Long maximumRenderedValueBytes,
        @JsonProperty("maximumSourceBytes") Long maximumSourceBytes,
        @JsonProperty("name") String name,
        @JsonProperty("prefix") String prefix,
        @JsonProperty("source") String source
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityProviderCredentialHeader {
        Objects.requireNonNull(maximumRenderedValueBytes, "maximumRenderedValueBytes");
        Objects.requireNonNull(maximumSourceBytes, "maximumSourceBytes");
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(prefix, "prefix");
        Objects.requireNonNull(source, "source");
    }
}
