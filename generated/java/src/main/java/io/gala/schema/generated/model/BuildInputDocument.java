// Generated from urn:gala:schema:build-input:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:build-input:2.0.0. */
public record BuildInputDocument(
        @JsonProperty("appearance") BuildInputAppearanceNormalized appearance,
        @JsonProperty("authors") List<BuildInputAuthorNormalized> authors,
        @JsonProperty("basePath") String basePath,
        @JsonProperty("baseUrl") String baseUrl,
        @JsonProperty("buildEpoch") String buildEpoch,
        @JsonProperty("content") List<BuildInputContentBuildRecord> content,
        @JsonProperty("contractVersion") String contractVersion,
        @JsonProperty("destinationCapabilities") BuildInputDestinationCapabilityProfile destinationCapabilities,
        @JsonProperty("inputDigest") String inputDigest,
        @JsonProperty("modules") BuildInputModuleBuildSelection modules,
        @JsonProperty("navigation") BuildInputNavigationNormalized navigation,
        @JsonProperty("packages") BuildInputBuildPackages packages,
        @JsonProperty("placements") JsonNode placements,
        @JsonProperty("publication") BuildInputPublicationNormalized publication,
        @JsonProperty("repository") BuildInputRepositorySnapshot repository,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion,
        @JsonProperty("sourceRevision") String sourceRevision
) {
    /** Reject a missing required root member before domain use. */
    public BuildInputDocument {
        Objects.requireNonNull(appearance, "appearance");
        Objects.requireNonNull(authors, "authors");
        Objects.requireNonNull(basePath, "basePath");
        Objects.requireNonNull(baseUrl, "baseUrl");
        Objects.requireNonNull(buildEpoch, "buildEpoch");
        Objects.requireNonNull(content, "content");
        Objects.requireNonNull(contractVersion, "contractVersion");
        Objects.requireNonNull(destinationCapabilities, "destinationCapabilities");
        Objects.requireNonNull(inputDigest, "inputDigest");
        Objects.requireNonNull(modules, "modules");
        Objects.requireNonNull(navigation, "navigation");
        Objects.requireNonNull(packages, "packages");
        Objects.requireNonNull(placements, "placements");
        Objects.requireNonNull(publication, "publication");
        Objects.requireNonNull(repository, "repository");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(sourceRevision, "sourceRevision");
    }
}
