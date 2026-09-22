// Generated from urn:gala:schema:appearance:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:appearance:2.0.0. */
public record AppearanceDocument(
        @JsonProperty("brandMark") String brandMark,
        @JsonProperty("colorMode") AppearanceColorMode colorMode,
        @JsonProperty("extensions") AppearanceExtensionMap extensions,
        @JsonProperty("fontAssetRefs") List<String> fontAssetRefs,
        @JsonProperty("footerComposition") String footerComposition,
        @JsonProperty("headerComposition") String headerComposition,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion,
        @JsonProperty("theme") String theme,
        @JsonProperty("tokens") AppearanceSemanticTokens tokens,
        @JsonProperty("typeScale") String typeScale,
        @JsonProperty("wordmark") String wordmark
) {
    /** Reject a missing required root member before domain use. */
    public AppearanceDocument {
        Objects.requireNonNull(colorMode, "colorMode");
        Objects.requireNonNull(extensions, "extensions");
        Objects.requireNonNull(fontAssetRefs, "fontAssetRefs");
        Objects.requireNonNull(footerComposition, "footerComposition");
        Objects.requireNonNull(headerComposition, "headerComposition");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(theme, "theme");
        Objects.requireNonNull(tokens, "tokens");
        Objects.requireNonNull(typeScale, "typeScale");
    }
}
