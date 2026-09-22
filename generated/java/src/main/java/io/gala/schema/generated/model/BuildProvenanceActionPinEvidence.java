// Generated from urn:gala:metadata:build-provenance:2.0.0#/$defs/actionPinEvidence; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:metadata:build-provenance:2.0.0#/$defs/actionPinEvidence. */
public record BuildProvenanceActionPinEvidence(
        @JsonProperty("actionDefinitionDigest") String actionDefinitionDigest,
        @JsonProperty("commit") String commit,
        @JsonProperty("use") String use
) {
    /** Reject a missing required root member before domain use. */
    public BuildProvenanceActionPinEvidence {
        Objects.requireNonNull(actionDefinitionDigest, "actionDefinitionDigest");
        Objects.requireNonNull(commit, "commit");
        Objects.requireNonNull(use, "use");
    }
}
