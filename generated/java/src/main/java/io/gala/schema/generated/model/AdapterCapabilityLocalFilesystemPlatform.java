// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemPlatform; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemPlatform. */
public record AdapterCapabilityLocalFilesystemPlatform(
        @JsonProperty("architecture") String architecture,
        @JsonProperty("filesystemType") String filesystemType,
        @JsonProperty("kernelRelease") String kernelRelease,
        @JsonProperty("mountFlags") List<String> mountFlags,
        @JsonProperty("os") String os
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityLocalFilesystemPlatform {
        Objects.requireNonNull(architecture, "architecture");
        Objects.requireNonNull(filesystemType, "filesystemType");
        Objects.requireNonNull(kernelRelease, "kernelRelease");
        Objects.requireNonNull(mountFlags, "mountFlags");
        Objects.requireNonNull(os, "os");
    }
}
