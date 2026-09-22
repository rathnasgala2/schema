// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemCapabilityEvidence; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemCapabilityEvidence. */
public record AdapterCapabilityLocalFilesystemCapabilityEvidence(
        @JsonProperty("adapter") AdapterCapabilityAdapterIdentity adapter,
        @JsonProperty("allowlistDigest") String allowlistDigest,
        @JsonProperty("allowlistEntryId") String allowlistEntryId,
        @JsonProperty("deviceId") String deviceId,
        @JsonProperty("effectiveUserId") String effectiveUserId,
        @JsonProperty("evidenceDigest") String evidenceDigest,
        @JsonProperty("mutationSurfaceDigest") String mutationSurfaceDigest,
        @JsonProperty("observedAt") String observedAt,
        @JsonProperty("platform") AdapterCapabilityLocalFilesystemPlatform platform,
        @JsonProperty("probe") AdapterCapabilityLocalFilesystemProbeSummary probe,
        @JsonProperty("profile") String profile,
        @JsonProperty("rootFileId") String rootFileId,
        @JsonProperty("rootIdentityDigest") String rootIdentityDigest,
        @JsonProperty("surfaceIdentityDigest") String surfaceIdentityDigest
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityLocalFilesystemCapabilityEvidence {
        Objects.requireNonNull(adapter, "adapter");
        Objects.requireNonNull(allowlistDigest, "allowlistDigest");
        Objects.requireNonNull(allowlistEntryId, "allowlistEntryId");
        Objects.requireNonNull(deviceId, "deviceId");
        Objects.requireNonNull(effectiveUserId, "effectiveUserId");
        Objects.requireNonNull(evidenceDigest, "evidenceDigest");
        Objects.requireNonNull(mutationSurfaceDigest, "mutationSurfaceDigest");
        Objects.requireNonNull(observedAt, "observedAt");
        Objects.requireNonNull(platform, "platform");
        Objects.requireNonNull(probe, "probe");
        Objects.requireNonNull(profile, "profile");
        Objects.requireNonNull(rootFileId, "rootFileId");
        Objects.requireNonNull(rootIdentityDigest, "rootIdentityDigest");
        Objects.requireNonNull(surfaceIdentityDigest, "surfaceIdentityDigest");
    }
}
