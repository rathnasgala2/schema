// Generated from urn:gala:schema:adapter-capability:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0. */
public record AdapterCapabilityDocument(
        @JsonProperty("activation") String activation,
        @JsonProperty("adapter") AdapterCapabilityAdapterIdentity adapter,
        @JsonProperty("cacheInvalidation") String cacheInvalidation,
        @JsonProperty("capabilityDigest") String capabilityDigest,
        @JsonProperty("concurrency") String concurrency,
        @JsonProperty("configuration") AdapterCapabilityAdapterConfigurationCapabilities configuration,
        @JsonProperty("contractVersion") String contractVersion,
        @JsonProperty("destinationKinds") List<String> destinationKinds,
        @JsonProperty("filesystemEvidenceDigest") String filesystemEvidenceDigest,
        @JsonProperty("idempotencyClass") String idempotencyClass,
        @JsonProperty("limits") JsonNode limits,
        @JsonProperty("operations") List<String> operations,
        @JsonProperty("protocolRange") String protocolRange,
        @JsonProperty("providerInventoryAssurance") String providerInventoryAssurance,
        @JsonProperty("rollback") String rollback,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion,
        @JsonProperty("staging") String staging,
        @JsonProperty("verification") List<String> verification
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityDocument {
        Objects.requireNonNull(activation, "activation");
        Objects.requireNonNull(adapter, "adapter");
        Objects.requireNonNull(cacheInvalidation, "cacheInvalidation");
        Objects.requireNonNull(capabilityDigest, "capabilityDigest");
        Objects.requireNonNull(concurrency, "concurrency");
        Objects.requireNonNull(configuration, "configuration");
        Objects.requireNonNull(contractVersion, "contractVersion");
        Objects.requireNonNull(destinationKinds, "destinationKinds");
        Objects.requireNonNull(idempotencyClass, "idempotencyClass");
        Objects.requireNonNull(limits, "limits");
        Objects.requireNonNull(operations, "operations");
        Objects.requireNonNull(protocolRange, "protocolRange");
        Objects.requireNonNull(providerInventoryAssurance, "providerInventoryAssurance");
        Objects.requireNonNull(rollback, "rollback");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(staging, "staging");
        Objects.requireNonNull(verification, "verification");
    }
}
