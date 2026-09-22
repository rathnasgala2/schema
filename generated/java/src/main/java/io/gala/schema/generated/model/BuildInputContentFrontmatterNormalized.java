// Generated from urn:gala:schema:build-input:2.0.0#/$defs/contentFrontmatterNormalized; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:build-input:2.0.0#/$defs/contentFrontmatterNormalized. */
public record BuildInputContentFrontmatterNormalized(
        @JsonProperty("authorIds") List<String> authorIds,
        @JsonProperty("createdAt") String createdAt,
        @JsonProperty("description") String description,
        @JsonProperty("hero") BuildInputResolvedMedia hero,
        @JsonProperty("id") String id,
        @JsonProperty("kind") String kind,
        @JsonProperty("language") String language,
        @JsonProperty("publishedAt") String publishedAt,
        @JsonProperty("redirects") List<String> redirects,
        @JsonProperty("route") String route,
        @JsonProperty("series") String series,
        @JsonProperty("seriesOrder") Long seriesOrder,
        @JsonProperty("slug") String slug,
        @JsonProperty("socialImage") BuildInputResolvedFile socialImage,
        @JsonProperty("status") String status,
        @JsonProperty("tags") List<String> tags,
        @JsonProperty("title") String title,
        @JsonProperty("updatedAt") String updatedAt
) {
    /** Reject a missing required root member before domain use. */
    public BuildInputContentFrontmatterNormalized {
        Objects.requireNonNull(authorIds, "authorIds");
        Objects.requireNonNull(createdAt, "createdAt");
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(kind, "kind");
        Objects.requireNonNull(language, "language");
        Objects.requireNonNull(publishedAt, "publishedAt");
        Objects.requireNonNull(redirects, "redirects");
        Objects.requireNonNull(slug, "slug");
        Objects.requireNonNull(status, "status");
        Objects.requireNonNull(tags, "tags");
        Objects.requireNonNull(title, "title");
    }
}
