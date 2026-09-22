// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemAllowlistEntry; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemAllowlistEntry. */
public record AdapterCapabilityLocalFilesystemAllowlistEntry(
        @JsonProperty("allowlistEntryId") String allowlistEntryId,
        @JsonProperty("atomicReplacementMatrixDigest") String atomicReplacementMatrixDigest,
        @JsonProperty("maliciousFilesystemMatrixDigest") String maliciousFilesystemMatrixDigest,
        @JsonProperty("platform") AdapterCapabilityLocalFilesystemPlatform platform,
        @JsonProperty("powerLossMatrixDigest") String powerLossMatrixDigest,
        @JsonProperty("primitiveProfile") String primitiveProfile,
        @JsonProperty("processCrashMatrixDigest") String processCrashMatrixDigest
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityLocalFilesystemAllowlistEntry {
        Objects.requireNonNull(allowlistEntryId, "allowlistEntryId");
        Objects.requireNonNull(atomicReplacementMatrixDigest, "atomicReplacementMatrixDigest");
        Objects.requireNonNull(maliciousFilesystemMatrixDigest, "maliciousFilesystemMatrixDigest");
        Objects.requireNonNull(platform, "platform");
        Objects.requireNonNull(powerLossMatrixDigest, "powerLossMatrixDigest");
        Objects.requireNonNull(primitiveProfile, "primitiveProfile");
        Objects.requireNonNull(processCrashMatrixDigest, "processCrashMatrixDigest");
    }
}
