// Generated from urn:gala:schema:repository:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:repository:2.0.0. */
public record RepositoryDocument(
        @JsonProperty("appearance") String appearance,
        @JsonProperty("assetRoots") List<RepositoryAssetRoot> assetRoots,
        @JsonProperty("contentRoots") List<RepositoryContentRoot> contentRoots,
        @JsonProperty("defaultLanguage") String defaultLanguage,
        @JsonProperty("extensions") RepositoryExtensionMap extensions,
        @JsonProperty("generatedSourceRoots") List<RepositoryGeneratedRoot> generatedSourceRoots,
        @JsonProperty("minimumToolVersion") String minimumToolVersion,
        @JsonProperty("modules") String modules,
        @JsonProperty("navigation") String navigation,
        @JsonProperty("publication") String publication,
        @JsonProperty("publicationId") String publicationId,
        @JsonProperty("routeNormalizationProfile") String routeNormalizationProfile,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion
) {
    /** Reject a missing required root member before domain use. */
    public RepositoryDocument {
        Objects.requireNonNull(assetRoots, "assetRoots");
        Objects.requireNonNull(contentRoots, "contentRoots");
        Objects.requireNonNull(defaultLanguage, "defaultLanguage");
        Objects.requireNonNull(extensions, "extensions");
        Objects.requireNonNull(generatedSourceRoots, "generatedSourceRoots");
        Objects.requireNonNull(minimumToolVersion, "minimumToolVersion");
        Objects.requireNonNull(modules, "modules");
        Objects.requireNonNull(publication, "publication");
        Objects.requireNonNull(publicationId, "publicationId");
        Objects.requireNonNull(routeNormalizationProfile, "routeNormalizationProfile");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
    }
}
