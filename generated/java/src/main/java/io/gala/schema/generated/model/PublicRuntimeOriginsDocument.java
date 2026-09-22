// Generated from urn:gala:schema:public-runtime-origins:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:public-runtime-origins:2.0.0. */
public record PublicRuntimeOriginsDocument(
        @JsonProperty("apiOrigin") String apiOrigin,
        @JsonProperty("appArtifactDigest") String appArtifactDigest,
        @JsonProperty("appOrigin") String appOrigin,
        @JsonProperty("environment") String environment,
        @JsonProperty("expiresAt") String expiresAt,
        @JsonProperty("generation") String generation,
        @JsonProperty("issuedAt") String issuedAt,
        @JsonProperty("payloadDigest") String payloadDigest,
        @JsonProperty("publicRecoveryBase") String publicRecoveryBase,
        @JsonProperty("schemaDocsOrigin") String schemaDocsOrigin,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion,
        @JsonProperty("sourceCatalogDigest") String sourceCatalogDigest,
        @JsonProperty("sourceCatalogGeneration") String sourceCatalogGeneration,
        @JsonProperty("transactionalLinkBase") String transactionalLinkBase
) {
    /** Reject a missing required root member before domain use. */
    public PublicRuntimeOriginsDocument {
        Objects.requireNonNull(apiOrigin, "apiOrigin");
        Objects.requireNonNull(appArtifactDigest, "appArtifactDigest");
        Objects.requireNonNull(appOrigin, "appOrigin");
        Objects.requireNonNull(environment, "environment");
        Objects.requireNonNull(expiresAt, "expiresAt");
        Objects.requireNonNull(generation, "generation");
        Objects.requireNonNull(issuedAt, "issuedAt");
        Objects.requireNonNull(payloadDigest, "payloadDigest");
        Objects.requireNonNull(publicRecoveryBase, "publicRecoveryBase");
        Objects.requireNonNull(schemaDocsOrigin, "schemaDocsOrigin");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(sourceCatalogDigest, "sourceCatalogDigest");
        Objects.requireNonNull(sourceCatalogGeneration, "sourceCatalogGeneration");
        Objects.requireNonNull(transactionalLinkBase, "transactionalLinkBase");
    }
}
