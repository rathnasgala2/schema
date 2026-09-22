// Generated from urn:gala:schema:problem:2.0.0#/$defs/fieldError; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:problem:2.0.0#/$defs/fieldError. */
public record ProblemFieldError(
        @JsonProperty("code") String code,
        @JsonProperty("pointer") String pointer
) {
    /** Reject a missing required root member before domain use. */
    public ProblemFieldError {
        Objects.requireNonNull(code, "code");
        Objects.requireNonNull(pointer, "pointer");
    }
}
