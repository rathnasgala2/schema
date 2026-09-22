// Generated from urn:gala:schema:build-input:2.0.0#/$defs/appearanceNormalized; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:build-input:2.0.0#/$defs/appearanceNormalized. */
public record BuildInputAppearanceNormalized(
        @JsonProperty("brandMark") BuildInputResolvedFile brandMark,
        @JsonProperty("colorMode") BuildInputColorMode colorMode,
        @JsonProperty("fontAssets") List<BuildInputResolvedFile> fontAssets,
        @JsonProperty("footerComposition") String footerComposition,
        @JsonProperty("headerComposition") String headerComposition,
        @JsonProperty("source") JsonNode source,
        @JsonProperty("theme") String theme,
        @JsonProperty("tokens") BuildInputSemanticTokens tokens,
        @JsonProperty("typeScale") String typeScale,
        @JsonProperty("wordmark") BuildInputResolvedFile wordmark
) {
    /** Reject a missing required root member before domain use. */
    public BuildInputAppearanceNormalized {
        Objects.requireNonNull(colorMode, "colorMode");
        Objects.requireNonNull(fontAssets, "fontAssets");
        Objects.requireNonNull(footerComposition, "footerComposition");
        Objects.requireNonNull(headerComposition, "headerComposition");
        Objects.requireNonNull(source, "source");
        Objects.requireNonNull(theme, "theme");
        Objects.requireNonNull(tokens, "tokens");
        Objects.requireNonNull(typeScale, "typeScale");
    }
}
