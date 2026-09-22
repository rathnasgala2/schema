// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/pagesOidcCredentialEgress; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/pagesOidcCredentialEgress. */
public record AdapterCapabilityPagesOidcCredentialEgress(
        @JsonProperty("audienceQuery") String audienceQuery,
        @JsonProperty("credentialHeader") JsonNode credentialHeader,
        @JsonProperty("method") String method,
        @JsonProperty("originCatalogDigest") String originCatalogDigest,
        @JsonProperty("originProfile") String originProfile,
        @JsonProperty("purpose") String purpose,
        @JsonProperty("requestTargetProfile") String requestTargetProfile,
        @JsonProperty("responseProfile") String responseProfile
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityPagesOidcCredentialEgress {
        Objects.requireNonNull(audienceQuery, "audienceQuery");
        Objects.requireNonNull(credentialHeader, "credentialHeader");
        Objects.requireNonNull(method, "method");
        Objects.requireNonNull(originCatalogDigest, "originCatalogDigest");
        Objects.requireNonNull(originProfile, "originProfile");
        Objects.requireNonNull(purpose, "purpose");
        Objects.requireNonNull(requestTargetProfile, "requestTargetProfile");
        Objects.requireNonNull(responseProfile, "responseProfile");
    }
}
