// Generated from urn:gala:schema:problem:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:problem:2.0.0. */
public record ProblemDocument(
        @JsonProperty("code") String code,
        @JsonProperty("correlationId") String correlationId,
        @JsonProperty("detail") String detail,
        @JsonProperty("errors") List<ProblemFieldError> errors,
        @JsonProperty("instance") String instance,
        @JsonProperty("operationId") String operationId,
        @JsonProperty("retryable") Boolean retryable,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion,
        @JsonProperty("status") Long status,
        @JsonProperty("title") String title,
        @JsonProperty("type") String type
) {
    /** Reject a missing required root member before domain use. */
    public ProblemDocument {
        Objects.requireNonNull(code, "code");
        Objects.requireNonNull(correlationId, "correlationId");
        Objects.requireNonNull(detail, "detail");
        Objects.requireNonNull(errors, "errors");
        Objects.requireNonNull(retryable, "retryable");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(status, "status");
        Objects.requireNonNull(title, "title");
        Objects.requireNonNull(type, "type");
    }
}
