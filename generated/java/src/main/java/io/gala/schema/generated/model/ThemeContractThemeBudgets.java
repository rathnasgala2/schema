// Generated from urn:gala:schema:theme-contract:2.0.0#/$defs/themeBudgets; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:theme-contract:2.0.0#/$defs/themeBudgets. */
public record ThemeContractThemeBudgets(
        @JsonProperty("maximumFileBytes") String maximumFileBytes,
        @JsonProperty("maximumFiles") Long maximumFiles,
        @JsonProperty("maximumTotalBytes") String maximumTotalBytes
) {
    /** Reject a missing required root member before domain use. */
    public ThemeContractThemeBudgets {
        Objects.requireNonNull(maximumFileBytes, "maximumFileBytes");
        Objects.requireNonNull(maximumFiles, "maximumFiles");
        Objects.requireNonNull(maximumTotalBytes, "maximumTotalBytes");
    }
}
