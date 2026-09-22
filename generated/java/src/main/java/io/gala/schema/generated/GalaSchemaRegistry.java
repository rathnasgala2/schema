// Generated Networknt registry wiring; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated;

import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.SchemaRegistryConfig;
import com.networknt.schema.dialect.Dialect;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/** Exact nineteen-root schema registry for a caller-supplied Gala-enabled dialect. */
public final class GalaSchemaRegistry {
    private static final Map<String, String> RESOURCES = Map.ofEntries(
            Map.entry("urn:gala:schema:adapter-capability:2.0.0", "/io/gala/schema/generated/schemas/adapter-capability.schema.json"),
            Map.entry("urn:gala:schema:appearance:2.0.0", "/io/gala/schema/generated/schemas/appearance.schema.json"),
            Map.entry("urn:gala:schema:artifact-manifest:2.0.0", "/io/gala/schema/generated/schemas/artifact-manifest.schema.json"),
            Map.entry("urn:gala:schema:author:2.0.0", "/io/gala/schema/generated/schemas/author.schema.json"),
            Map.entry("urn:gala:schema:build-input:2.0.0", "/io/gala/schema/generated/schemas/build-input.schema.json"),
            Map.entry("urn:gala:metadata:build-provenance:2.0.0", "/io/gala/schema/generated/schemas/build-provenance.schema.json"),
            Map.entry("urn:gala:schema:content-frontmatter:2.0.0", "/io/gala/schema/generated/schemas/content-frontmatter.schema.json"),
            Map.entry("urn:gala:schema:deployment-intent:2.0.0", "/io/gala/schema/generated/schemas/deployment-intent.schema.json"),
            Map.entry("urn:gala:schema:deployment-observation:2.0.0", "/io/gala/schema/generated/schemas/deployment-observation.schema.json"),
            Map.entry("urn:gala:schema:deployment-receipt:2.0.0", "/io/gala/schema/generated/schemas/deployment-receipt.schema.json"),
            Map.entry("urn:gala:schema:event-envelope:2.0.0", "/io/gala/schema/generated/schemas/event-envelope.schema.json"),
            Map.entry("urn:gala:schema:lock:2.0.0", "/io/gala/schema/generated/schemas/lock.schema.json"),
            Map.entry("urn:gala:schema:navigation:2.0.0", "/io/gala/schema/generated/schemas/navigation.schema.json"),
            Map.entry("urn:gala:schema:problem:2.0.0", "/io/gala/schema/generated/schemas/problem.schema.json"),
            Map.entry("urn:gala:schema:public-generation-marker:2.0.0", "/io/gala/schema/generated/schemas/public-generation-marker.schema.json"),
            Map.entry("urn:gala:schema:public-runtime-origins:2.0.0", "/io/gala/schema/generated/schemas/public-runtime-origins.schema.json"),
            Map.entry("urn:gala:schema:publication:2.0.0", "/io/gala/schema/generated/schemas/publication.schema.json"),
            Map.entry("urn:gala:schema:repository:2.0.0", "/io/gala/schema/generated/schemas/repository.schema.json"),
            Map.entry("urn:gala:schema:template-composition:2.0.0", "/io/gala/schema/generated/schemas/template-composition.schema.json"),
            Map.entry("urn:gala:schema:theme-contract:2.0.0", "/io/gala/schema/generated/schemas/theme-contract.schema.json")
    );

    private GalaSchemaRegistry() {}

    /** Return the exact immutable root identities in lexical order. */
    public static List<String> schemaIds() {
        return RESOURCES.keySet().stream().sorted().toList();
    }

    /** Build a Networknt registry using the caller's exact Gala formats and keywords. */
    public static SchemaRegistry create(Dialect dialect, SchemaRegistryConfig config) {
        Objects.requireNonNull(dialect, "dialect");
        Objects.requireNonNull(config, "config");
        return SchemaRegistry.withDialect(
                dialect, builder -> builder.schemas(loadSchemas()).schemaRegistryConfig(config));
    }

    private static Map<String, String> loadSchemas() {
        Map<String, String> schemas = new LinkedHashMap<>();
        for (Map.Entry<String, String> entry : RESOURCES.entrySet()) {
            try (InputStream input = GalaSchemaRegistry.class.getResourceAsStream(entry.getValue())) {
                if (input == null) throw new IllegalStateException("Missing schema resource " + entry.getValue());
                schemas.put(entry.getKey(), new String(input.readAllBytes(), StandardCharsets.UTF_8));
            } catch (IOException error) {
                throw new IllegalStateException("Cannot read schema resource " + entry.getValue(), error);
            }
        }
        return Map.copyOf(schemas);
    }
}
