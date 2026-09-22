// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemReplacement; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemReplacement. */
public record AdapterCapabilityLocalFilesystemReplacement(
        @JsonProperty("operationNumber") Long operationNumber,
        @JsonProperty("preparedTarget") String preparedTarget,
        @JsonProperty("readerResult") String readerResult,
        @JsonProperty("renameResult") String renameResult
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityLocalFilesystemReplacement {
        Objects.requireNonNull(operationNumber, "operationNumber");
        Objects.requireNonNull(preparedTarget, "preparedTarget");
        Objects.requireNonNull(readerResult, "readerResult");
        Objects.requireNonNull(renameResult, "renameResult");
    }
}
