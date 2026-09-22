// Generated from urn:gala:schema:deployment-receipt:2.0.0#/$defs/renderPolicyIdentity; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-receipt:2.0.0#/$defs/renderPolicyIdentity. */
public record DeploymentReceiptRenderPolicyIdentity(
        @JsonProperty("digest") String digest,
        @JsonProperty("name") String name,
        @JsonProperty("version") String version
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentReceiptRenderPolicyIdentity {
        Objects.requireNonNull(digest, "digest");
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(version, "version");
    }
}
