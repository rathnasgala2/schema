// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/providerCredentialEgress; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/providerCredentialEgress. */
public record AdapterCapabilityProviderCredentialEgress(
        @JsonProperty("credentialFormatProfileDigest") String credentialFormatProfileDigest,
        @JsonProperty("credentialSources") List<String> credentialSources,
        @JsonProperty("origin") String origin,
        @JsonProperty("purpose") String purpose,
        @JsonProperty("requestProfile") String requestProfile,
        @JsonProperty("requestTemplateCatalogDigest") String requestTemplateCatalogDigest
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityProviderCredentialEgress {
        Objects.requireNonNull(credentialSources, "credentialSources");
        Objects.requireNonNull(origin, "origin");
        Objects.requireNonNull(purpose, "purpose");
        Objects.requireNonNull(requestProfile, "requestProfile");
        Objects.requireNonNull(requestTemplateCatalogDigest, "requestTemplateCatalogDigest");
    }
}
