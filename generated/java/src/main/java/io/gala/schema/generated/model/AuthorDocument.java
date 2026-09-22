// Generated from urn:gala:schema:author:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:author:2.0.0. */
public record AuthorDocument(
        @JsonProperty("avatarRef") String avatarRef,
        @JsonProperty("biography") String biography,
        @JsonProperty("displayName") String displayName,
        @JsonProperty("extensions") AuthorExtensionMap extensions,
        @JsonProperty("id") String id,
        @JsonProperty("links") List<AuthorSocialLink> links,
        @JsonProperty("localized") List<AuthorLocalizedAuthor> localized,
        @JsonProperty("pronouns") String pronouns,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion
) {
    /** Reject a missing required root member before domain use. */
    public AuthorDocument {
        Objects.requireNonNull(biography, "biography");
        Objects.requireNonNull(displayName, "displayName");
        Objects.requireNonNull(extensions, "extensions");
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(links, "links");
        Objects.requireNonNull(localized, "localized");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
    }
}
