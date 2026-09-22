// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/credentialEgressProfile; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/credentialEgressProfile. */
public record AdapterCapabilityCredentialEgressProfile(
        @JsonProperty("ambientProxy") String ambientProxy,
        @JsonProperty("cookies") String cookies,
        @JsonProperty("credentialForwarding") String credentialForwarding,
        @JsonProperty("egress") List<JsonNode> egress,
        @JsonProperty("netrc") String netrc,
        @JsonProperty("networkBoundaryProfileDigest") String networkBoundaryProfileDigest,
        @JsonProperty("profile") String profile,
        @JsonProperty("profileDigest") String profileDigest,
        @JsonProperty("redirects") String redirects,
        @JsonProperty("tlsProfileDigest") String tlsProfileDigest
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityCredentialEgressProfile {
        Objects.requireNonNull(ambientProxy, "ambientProxy");
        Objects.requireNonNull(cookies, "cookies");
        Objects.requireNonNull(credentialForwarding, "credentialForwarding");
        Objects.requireNonNull(egress, "egress");
        Objects.requireNonNull(netrc, "netrc");
        Objects.requireNonNull(networkBoundaryProfileDigest, "networkBoundaryProfileDigest");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(profileDigest, "profileDigest");
        Objects.requireNonNull(redirects, "redirects");
        Objects.requireNonNull(tlsProfileDigest, "tlsProfileDigest");
    }
}
