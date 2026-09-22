// Generated from urn:gala:schema:template-composition:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:template-composition:2.0.0. */
public record TemplateCompositionDocument(
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion
) {
    /** Reject a missing required root member before domain use. */
    public TemplateCompositionDocument {
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
    }
}
