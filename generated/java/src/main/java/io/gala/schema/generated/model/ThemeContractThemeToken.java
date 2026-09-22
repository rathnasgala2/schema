// Generated from urn:gala:schema:theme-contract:2.0.0#/$defs/themeToken; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:theme-contract:2.0.0#/$defs/themeToken. */
public record ThemeContractThemeToken(
        @JsonProperty("dark") String dark,
        @JsonProperty("key") String key,
        @JsonProperty("light") String light,
        @JsonProperty("type") String type
) {
    /** Reject a missing required root member before domain use. */
    public ThemeContractThemeToken {
        Objects.requireNonNull(dark, "dark");
        Objects.requireNonNull(key, "key");
        Objects.requireNonNull(light, "light");
        Objects.requireNonNull(type, "type");
    }
}
