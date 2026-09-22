// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/filesystemProviderLimits; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/filesystemProviderLimits. */
public record AdapterCapabilityFilesystemProviderLimits(
        @JsonProperty("filesystemAllowlistDigest") String filesystemAllowlistDigest,
        @JsonProperty("filesystemProfile") String filesystemProfile,
        @JsonProperty("maximumArtifactBytes") String maximumArtifactBytes,
        @JsonProperty("maximumFileBytes") String maximumFileBytes,
        @JsonProperty("maximumFiles") String maximumFiles,
        @JsonProperty("maximumPathBytes") Long maximumPathBytes,
        @JsonProperty("maximumProviderCallSeconds") Long maximumProviderCallSeconds,
        @JsonProperty("pathRuleProfile") String pathRuleProfile,
        @JsonProperty("transport") String transport
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityFilesystemProviderLimits {
        Objects.requireNonNull(filesystemAllowlistDigest, "filesystemAllowlistDigest");
        Objects.requireNonNull(filesystemProfile, "filesystemProfile");
        Objects.requireNonNull(maximumArtifactBytes, "maximumArtifactBytes");
        Objects.requireNonNull(maximumFileBytes, "maximumFileBytes");
        Objects.requireNonNull(maximumFiles, "maximumFiles");
        Objects.requireNonNull(maximumPathBytes, "maximumPathBytes");
        Objects.requireNonNull(maximumProviderCallSeconds, "maximumProviderCallSeconds");
        Objects.requireNonNull(pathRuleProfile, "pathRuleProfile");
        Objects.requireNonNull(transport, "transport");
    }
}
