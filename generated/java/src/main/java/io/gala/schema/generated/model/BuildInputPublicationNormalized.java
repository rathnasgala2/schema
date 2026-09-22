// Generated from urn:gala:schema:build-input:2.0.0#/$defs/publicationNormalized; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:build-input:2.0.0#/$defs/publicationNormalized. */
public record BuildInputPublicationNormalized(
        @JsonProperty("authorIds") List<String> authorIds,
        @JsonProperty("canonicalBase") String canonicalBase,
        @JsonProperty("contactAuthorId") String contactAuthorId,
        @JsonProperty("defaultImage") BuildInputResolvedFile defaultImage,
        @JsonProperty("defaultLanguage") String defaultLanguage,
        @JsonProperty("description") String description,
        @JsonProperty("footerCard") JsonNode footerCard,
        @JsonProperty("id") String id,
        @JsonProperty("profile") JsonNode profile,
        @JsonProperty("slug") String slug,
        @JsonProperty("socialLinks") List<BuildInputSocialLink> socialLinks,
        @JsonProperty("sourceDigest") String sourceDigest,
        @JsonProperty("sourcePath") String sourcePath,
        @JsonProperty("title") String title
) {
    /** Reject a missing required root member before domain use. */
    public BuildInputPublicationNormalized {
        Objects.requireNonNull(authorIds, "authorIds");
        Objects.requireNonNull(canonicalBase, "canonicalBase");
        Objects.requireNonNull(defaultLanguage, "defaultLanguage");
        Objects.requireNonNull(description, "description");
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(slug, "slug");
        Objects.requireNonNull(socialLinks, "socialLinks");
        Objects.requireNonNull(sourceDigest, "sourceDigest");
        Objects.requireNonNull(sourcePath, "sourcePath");
        Objects.requireNonNull(title, "title");
    }
}
