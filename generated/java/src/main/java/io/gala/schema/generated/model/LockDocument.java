// Generated from urn:gala:schema:lock:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:lock:2.0.0. */
public record LockDocument(
        @JsonProperty("dependencies") List<LockPackageIdentity> dependencies,
        @JsonProperty("dependencyDag") List<LockDependencyEdge> dependencyDag,
        @JsonProperty("lockDigest") String lockDigest,
        @JsonProperty("publisher") List<JsonNode> publisher,
        @JsonProperty("repositorySchemaVersion") String repositorySchemaVersion,
        @JsonProperty("resolvedAt") String resolvedAt,
        @JsonProperty("resolver") LockPackageIdentity resolver,
        @JsonProperty("schemaId") String schemaId,
        @JsonProperty("schemaVersion") String schemaVersion,
        @JsonProperty("schemas") LockLockedPackage schemas,
        @JsonProperty("template") LockLockedTemplate template,
        @JsonProperty("theme") LockLockedPackage theme
) {
    /** Reject a missing required root member before domain use. */
    public LockDocument {
        Objects.requireNonNull(dependencies, "dependencies");
        Objects.requireNonNull(dependencyDag, "dependencyDag");
        Objects.requireNonNull(lockDigest, "lockDigest");
        Objects.requireNonNull(publisher, "publisher");
        Objects.requireNonNull(repositorySchemaVersion, "repositorySchemaVersion");
        Objects.requireNonNull(resolvedAt, "resolvedAt");
        Objects.requireNonNull(resolver, "resolver");
        Objects.requireNonNull(schemaId, "schemaId");
        Objects.requireNonNull(schemaVersion, "schemaVersion");
        Objects.requireNonNull(schemas, "schemas");
        Objects.requireNonNull(template, "template");
        Objects.requireNonNull(theme, "theme");
    }
}
