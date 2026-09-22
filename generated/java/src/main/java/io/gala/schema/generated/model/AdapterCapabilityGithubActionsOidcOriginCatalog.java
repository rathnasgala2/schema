// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/githubActionsOidcOriginCatalog; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/githubActionsOidcOriginCatalog. */
public record AdapterCapabilityGithubActionsOidcOriginCatalog(
        @JsonProperty("catalogDigest") String catalogDigest,
        @JsonProperty("evidenceDigest") String evidenceDigest,
        @JsonProperty("fixtureDigest") String fixtureDigest,
        @JsonProperty("origins") List<String> origins,
        @JsonProperty("profile") String profile
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityGithubActionsOidcOriginCatalog {
        Objects.requireNonNull(catalogDigest, "catalogDigest");
        Objects.requireNonNull(evidenceDigest, "evidenceDigest");
        Objects.requireNonNull(fixtureDigest, "fixtureDigest");
        Objects.requireNonNull(origins, "origins");
        Objects.requireNonNull(profile, "profile");
    }
}
