// Generated from urn:gala:schema:build-input:2.0.0#/$defs/renderableBody; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:build-input:2.0.0#/$defs/renderableBody. */
public record BuildInputRenderableBody(
        @JsonProperty("body") String body,
        @JsonProperty("bodyDigest") String bodyDigest,
        @JsonProperty("bodyMediaType") String bodyMediaType,
        @JsonProperty("renderPolicy") BuildInputRenderPolicyIdentity renderPolicy,
        @JsonProperty("sourceDigest") String sourceDigest,
        @JsonProperty("sourcePath") String sourcePath
) {
    /** Reject a missing required root member before domain use. */
    public BuildInputRenderableBody {
        Objects.requireNonNull(body, "body");
        Objects.requireNonNull(bodyDigest, "bodyDigest");
        Objects.requireNonNull(bodyMediaType, "bodyMediaType");
        Objects.requireNonNull(renderPolicy, "renderPolicy");
        Objects.requireNonNull(sourceDigest, "sourceDigest");
        Objects.requireNonNull(sourcePath, "sourcePath");
    }
}
