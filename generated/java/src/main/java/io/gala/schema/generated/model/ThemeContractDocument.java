// Generated from urn:gala:schema:theme-contract:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:theme-contract:2.0.0. */
public record ThemeContractDocument(
        @JsonProperty("assets") List<ThemeContractPassiveAsset> assets,
        @JsonProperty("browserPolicyRef") String browserPolicyRef,
        @JsonProperty("budgets") ThemeContractThemeBudgets budgets,
        @JsonProperty("contractVersion") String contractVersion,
        @JsonProperty("cssLayers") List<String> cssLayers,
        @JsonProperty("evidenceDigest") String evidenceDigest,
        @JsonProperty("fixtureDigest") String fixtureDigest,
        @JsonProperty("fixtures") List<String> fixtures,
        @JsonProperty("integrity") String integrity,
        @JsonProperty("modes") JsonNode modes,
        @JsonProperty("package") String package_,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion,
        @JsonProperty("slotHooks") List<String> slotHooks,
        @JsonProperty("stylesheets") List<String> stylesheets,
        @JsonProperty("stylingContractDigest") String stylingContractDigest,
        @JsonProperty("templateRange") String templateRange,
        @JsonProperty("themeId") String themeId,
        @JsonProperty("tokens") List<JsonNode> tokens
) {
    /** Reject a missing required root member before domain use. */
    public ThemeContractDocument {
        Objects.requireNonNull(assets, "assets");
        Objects.requireNonNull(browserPolicyRef, "browserPolicyRef");
        Objects.requireNonNull(budgets, "budgets");
        Objects.requireNonNull(contractVersion, "contractVersion");
        Objects.requireNonNull(cssLayers, "cssLayers");
        Objects.requireNonNull(evidenceDigest, "evidenceDigest");
        Objects.requireNonNull(fixtureDigest, "fixtureDigest");
        Objects.requireNonNull(fixtures, "fixtures");
        Objects.requireNonNull(integrity, "integrity");
        Objects.requireNonNull(modes, "modes");
        Objects.requireNonNull(package_, "package");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(slotHooks, "slotHooks");
        Objects.requireNonNull(stylesheets, "stylesheets");
        Objects.requireNonNull(stylingContractDigest, "stylingContractDigest");
        Objects.requireNonNull(templateRange, "templateRange");
        Objects.requireNonNull(themeId, "themeId");
        Objects.requireNonNull(tokens, "tokens");
    }
}
