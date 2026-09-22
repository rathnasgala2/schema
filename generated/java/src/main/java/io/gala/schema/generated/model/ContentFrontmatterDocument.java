// Generated from urn:gala:schema:content-frontmatter:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:content-frontmatter:2.0.0. */
public record ContentFrontmatterDocument(
        @JsonProperty("authors") List<String> authors,
        @JsonProperty("createdAt") String createdAt,
        @JsonProperty("description") String description,
        @JsonProperty("extensions") ContentFrontmatterExtensionMap extensions,
        @JsonProperty("hero") ContentFrontmatterMediaRef hero,
        @JsonProperty("id") String id,
        @JsonProperty("kind") String kind,
        @JsonProperty("language") String language,
        @JsonProperty("newsletter") String newsletter,
        @JsonProperty("publishedAt") String publishedAt,
        @JsonProperty("redirects") List<String> redirects,
        @JsonProperty("route") String route,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion,
        @JsonProperty("series") String series,
        @JsonProperty("seriesOrder") Long seriesOrder,
        @JsonProperty("slug") String slug,
        @JsonProperty("socialImageRef") String socialImageRef,
        @JsonProperty("status") String status,
        @JsonProperty("tags") List<String> tags,
        @JsonProperty("title") String title,
        @JsonProperty("updatedAt") String updatedAt
) {
    /** Reject a missing required root member before domain use. */
    public ContentFrontmatterDocument {
        Objects.requireNonNull(authors, "authors");
        Objects.requireNonNull(createdAt, "createdAt");
        Objects.requireNonNull(extensions, "extensions");
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(language, "language");
        Objects.requireNonNull(redirects, "redirects");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(slug, "slug");
        Objects.requireNonNull(status, "status");
        Objects.requireNonNull(tags, "tags");
        Objects.requireNonNull(title, "title");
    }
}
