// Generated from urn:gala:schema:event-envelope:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:event-envelope:2.0.0. */
public record EventEnvelopeDocument(
        @JsonProperty("aggregateId") String aggregateId,
        @JsonProperty("aggregateType") String aggregateType,
        @JsonProperty("aggregateVersion") String aggregateVersion,
        @JsonProperty("causationId") String causationId,
        @JsonProperty("correlationId") String correlationId,
        @JsonProperty("eventId") String eventId,
        @JsonProperty("eventType") String eventType,
        @JsonProperty("eventVersion") Long eventVersion,
        @JsonProperty("occurredAt") String occurredAt,
        @JsonProperty("organizationId") String organizationId,
        @JsonProperty("payload") EventEnvelopeRegisteredEventPayload payload,
        @JsonProperty("payloadSchemaId") String payloadSchemaId,
        @JsonProperty("payloadVersion") Long payloadVersion,
        @JsonProperty("producer") String producer,
        @JsonProperty("publicationId") String publicationId,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion
) {
    /** Reject a missing required root member before domain use. */
    public EventEnvelopeDocument {
        Objects.requireNonNull(aggregateId, "aggregateId");
        Objects.requireNonNull(aggregateType, "aggregateType");
        Objects.requireNonNull(aggregateVersion, "aggregateVersion");
        Objects.requireNonNull(causationId, "causationId");
        Objects.requireNonNull(correlationId, "correlationId");
        Objects.requireNonNull(eventId, "eventId");
        Objects.requireNonNull(eventType, "eventType");
        Objects.requireNonNull(eventVersion, "eventVersion");
        Objects.requireNonNull(occurredAt, "occurredAt");
        Objects.requireNonNull(payload, "payload");
        Objects.requireNonNull(payloadSchemaId, "payloadSchemaId");
        Objects.requireNonNull(payloadVersion, "payloadVersion");
        Objects.requireNonNull(producer, "producer");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
    }
}
