// Generated from urn:gala:schema:build-input:2.0.0#/$defs/authorNormalized; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:build-input:2.0.0#/$defs/authorNormalized. */
public record BuildInputAuthorNormalized(
        @JsonProperty("avatar") BuildInputResolvedFile avatar,
        @JsonProperty("biography") String biography,
        @JsonProperty("displayName") String displayName,
        @JsonProperty("id") String id,
        @JsonProperty("links") List<BuildInputSocialLink> links,
        @JsonProperty("localized") List<BuildInputLocalizedAuthor> localized,
        @JsonProperty("pronouns") String pronouns,
        @JsonProperty("sourceDigest") String sourceDigest,
        @JsonProperty("sourcePath") String sourcePath
) {
    /** Reject a missing required root member before domain use. */
    public BuildInputAuthorNormalized {
        Objects.requireNonNull(biography, "biography");
        Objects.requireNonNull(displayName, "displayName");
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(links, "links");
        Objects.requireNonNull(localized, "localized");
        Objects.requireNonNull(sourceDigest, "sourceDigest");
        Objects.requireNonNull(sourcePath, "sourcePath");
    }
}
