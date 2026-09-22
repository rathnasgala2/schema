// Generated from urn:gala:schema:lock:2.0.0#/$defs/lockedPackage; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:lock:2.0.0#/$defs/lockedPackage. */
public record LockLockedPackage(
        @JsonProperty("compatibleWith") String compatibleWith,
        @JsonProperty("contractVersion") String contractVersion,
        @JsonProperty("integrity") String integrity,
        @JsonProperty("package") String package_,
        @JsonProperty("registry") String registry,
        @JsonProperty("version") String version
) {
    /** Reject a missing required root member before domain use. */
    public LockLockedPackage {
        Objects.requireNonNull(compatibleWith, "compatibleWith");
        Objects.requireNonNull(contractVersion, "contractVersion");
        Objects.requireNonNull(integrity, "integrity");
        Objects.requireNonNull(package_, "package");
        Objects.requireNonNull(registry, "registry");
        Objects.requireNonNull(version, "version");
    }
}
