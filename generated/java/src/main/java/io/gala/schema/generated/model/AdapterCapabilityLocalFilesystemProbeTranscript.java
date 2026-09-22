// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemProbeTranscript; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemProbeTranscript. */
public record AdapterCapabilityLocalFilesystemProbeTranscript(
        @JsonProperty("controlPublication") AdapterCapabilityLocalFilesystemControlPublication controlPublication,
        @JsonProperty("initialTarget") String initialTarget,
        @JsonProperty("profile") String profile,
        @JsonProperty("racePublication") JsonNode racePublication,
        @JsonProperty("replacements") List<AdapterCapabilityLocalFilesystemReplacement> replacements
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityLocalFilesystemProbeTranscript {
        Objects.requireNonNull(controlPublication, "controlPublication");
        Objects.requireNonNull(initialTarget, "initialTarget");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(racePublication, "racePublication");
        Objects.requireNonNull(replacements, "replacements");
    }
}
