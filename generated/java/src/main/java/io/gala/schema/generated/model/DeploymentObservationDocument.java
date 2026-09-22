// Generated from urn:gala:schema:deployment-observation:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:deployment-observation:2.0.0. */
public record DeploymentObservationDocument(
        @JsonProperty("adapter") DeploymentObservationAdapterIdentity adapter,
        @JsonProperty("artifactDigest") String artifactDigest,
        @JsonProperty("artifactId") String artifactId,
        @JsonProperty("attemptId") String attemptId,
        @JsonProperty("destination") DeploymentObservationDestinationIdentity destination,
        @JsonProperty("destinationChanged") String destinationChanged,
        @JsonProperty("evidenceDigest") String evidenceDigest,
        @JsonProperty("generationId") String generationId,
        @JsonProperty("intentDigest") String intentDigest,
        @JsonProperty("observationClass") String observationClass,
        @JsonProperty("observationId") String observationId,
        @JsonProperty("observedArtifactDigest") String observedArtifactDigest,
        @JsonProperty("observedAt") String observedAt,
        @JsonProperty("operationId") String operationId,
        @JsonProperty("outcome") String outcome,
        @JsonProperty("probes") List<DeploymentObservationPublicProbeObservation> probes,
        @JsonProperty("providerObjectIdDigest") String providerObjectIdDigest,
        @JsonProperty("providerVersion") String providerVersion,
        @JsonProperty("receivedAt") String receivedAt,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion,
        @JsonProperty("sequence") Long sequence,
        @JsonProperty("stageAttemptId") String stageAttemptId
) {
    /** Reject a missing required root member before domain use. */
    public DeploymentObservationDocument {
        Objects.requireNonNull(adapter, "adapter");
        Objects.requireNonNull(artifactDigest, "artifactDigest");
        Objects.requireNonNull(artifactId, "artifactId");
        Objects.requireNonNull(attemptId, "attemptId");
        Objects.requireNonNull(destination, "destination");
        Objects.requireNonNull(destinationChanged, "destinationChanged");
        Objects.requireNonNull(evidenceDigest, "evidenceDigest");
        Objects.requireNonNull(intentDigest, "intentDigest");
        Objects.requireNonNull(observationClass, "observationClass");
        Objects.requireNonNull(observationId, "observationId");
        Objects.requireNonNull(observedAt, "observedAt");
        Objects.requireNonNull(operationId, "operationId");
        Objects.requireNonNull(outcome, "outcome");
        Objects.requireNonNull(probes, "probes");
        Objects.requireNonNull(receivedAt, "receivedAt");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(sequence, "sequence");
        Objects.requireNonNull(stageAttemptId, "stageAttemptId");
    }
}
