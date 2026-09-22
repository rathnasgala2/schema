// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/providerRequestTemplate; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.List;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/providerRequestTemplate. */
public record AdapterCapabilityProviderRequestTemplate(
        @JsonProperty("callClass") String callClass,
        @JsonProperty("canonicalQueryProfile") String canonicalQueryProfile,
        @JsonProperty("credentialHeaders") List<AdapterCapabilityProviderCredentialHeader> credentialHeaders,
        @JsonProperty("derivedHeaders") List<AdapterCapabilityProviderDerivedHeader> derivedHeaders,
        @JsonProperty("fixedHeaders") List<AdapterCapabilityProviderFixedHeader> fixedHeaders,
        @JsonProperty("maximumRequestTargetBytes") Long maximumRequestTargetBytes,
        @JsonProperty("method") String method,
        @JsonProperty("origin") String origin,
        @JsonProperty("requestBodyProfile") String requestBodyProfile,
        @JsonProperty("requestTargetTemplate") String requestTargetTemplate,
        @JsonProperty("responseProfile") String responseProfile,
        @JsonProperty("stage") String stage
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityProviderRequestTemplate {
        Objects.requireNonNull(callClass, "callClass");
        Objects.requireNonNull(canonicalQueryProfile, "canonicalQueryProfile");
        Objects.requireNonNull(credentialHeaders, "credentialHeaders");
        Objects.requireNonNull(derivedHeaders, "derivedHeaders");
        Objects.requireNonNull(fixedHeaders, "fixedHeaders");
        Objects.requireNonNull(maximumRequestTargetBytes, "maximumRequestTargetBytes");
        Objects.requireNonNull(method, "method");
        Objects.requireNonNull(origin, "origin");
        Objects.requireNonNull(requestBodyProfile, "requestBodyProfile");
        Objects.requireNonNull(requestTargetTemplate, "requestTargetTemplate");
        Objects.requireNonNull(responseProfile, "responseProfile");
        Objects.requireNonNull(stage, "stage");
    }
}
