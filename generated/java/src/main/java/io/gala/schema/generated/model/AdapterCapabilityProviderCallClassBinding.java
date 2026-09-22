// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/providerCallClassBinding; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/providerCallClassBinding. */
public record AdapterCapabilityProviderCallClassBinding(
        @JsonProperty("callClass") String callClass,
        @JsonProperty("pagesDeploymentIdSource") String pagesDeploymentIdSource,
        @JsonProperty("recoveryOnly") Boolean recoveryOnly,
        @JsonProperty("stage") String stage
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityProviderCallClassBinding {
        Objects.requireNonNull(callClass, "callClass");
        Objects.requireNonNull(pagesDeploymentIdSource, "pagesDeploymentIdSource");
        Objects.requireNonNull(recoveryOnly, "recoveryOnly");
        Objects.requireNonNull(stage, "stage");
    }
}
