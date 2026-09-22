// Generated from urn:gala:schema:publication:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:publication:2.0.0. */
public record PublicationDocument(
        @JsonProperty("authors") List<String> authors,
        @JsonProperty("canonicalBase") String canonicalBase,
        @JsonProperty("contactRef") String contactRef,
        @JsonProperty("defaultImageRef") String defaultImageRef,
        @JsonProperty("defaultLanguage") String defaultLanguage,
        @JsonProperty("description") String description,
        @JsonProperty("extensions") PublicationExtensionMap extensions,
        @JsonProperty("footerCard") PublicationFooterCard footerCard,
        @JsonProperty("id") String id,
        @JsonProperty("profile") PublicationPublicationProfile profile,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion,
        @JsonProperty("slug") String slug,
        @JsonProperty("socialLinks") List<PublicationSocialLink> socialLinks,
        @JsonProperty("title") String title
) {
    /** Reject a missing required root member before domain use. */
    public PublicationDocument {
        Objects.requireNonNull(authors, "authors");
        Objects.requireNonNull(canonicalBase, "canonicalBase");
        Objects.requireNonNull(defaultLanguage, "defaultLanguage");
        Objects.requireNonNull(description, "description");
        Objects.requireNonNull(extensions, "extensions");
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(slug, "slug");
        Objects.requireNonNull(socialLinks, "socialLinks");
        Objects.requireNonNull(title, "title");
    }
}
