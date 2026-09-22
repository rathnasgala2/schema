// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/spacesControlPlaneRequestCatalog; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/spacesControlPlaneRequestCatalog. */
public record AdapterCapabilitySpacesControlPlaneRequestCatalog(
        @JsonProperty("bindingDigest") String bindingDigest,
        @JsonProperty("catalogDigest") String catalogDigest,
        @JsonProperty("credentialFormatProfileDigest") String credentialFormatProfileDigest,
        @JsonProperty("networkBoundaryProfileDigest") String networkBoundaryProfileDigest,
        @JsonProperty("profile") String profile,
        @JsonProperty("requests") List<JsonNode> requests,
        @JsonProperty("responseCatalogDigest") String responseCatalogDigest,
        @JsonProperty("tlsProfileDigest") String tlsProfileDigest
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilitySpacesControlPlaneRequestCatalog {
        Objects.requireNonNull(bindingDigest, "bindingDigest");
        Objects.requireNonNull(catalogDigest, "catalogDigest");
        Objects.requireNonNull(credentialFormatProfileDigest, "credentialFormatProfileDigest");
        Objects.requireNonNull(networkBoundaryProfileDigest, "networkBoundaryProfileDigest");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(requests, "requests");
        Objects.requireNonNull(responseCatalogDigest, "responseCatalogDigest");
        Objects.requireNonNull(tlsProfileDigest, "tlsProfileDigest");
    }
}
