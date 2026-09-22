// Generated from urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemProbeSummary; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
package io.gala.schema.generated.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.Objects;

/** Closed generated record for urn:gala:schema:adapter-capability:2.0.0#/$defs/localFilesystemProbeSummary. */
public record AdapterCapabilityLocalFilesystemProbeSummary(
        @JsonProperty("atomicSymlinkReplacement") Boolean atomicSymlinkReplacement,
        @JsonProperty("directoryFsync") Boolean directoryFsync,
        @JsonProperty("exclusiveControlPublication") Boolean exclusiveControlPublication,
        @JsonProperty("readerIterations") Long readerIterations,
        @JsonProperty("replacementIterations") Long replacementIterations,
        @JsonProperty("rootAndAncestorsNoFollow") Boolean rootAndAncestorsNoFollow,
        @JsonProperty("sameRootAndReleaseDevice") Boolean sameRootAndReleaseDevice,
        @JsonProperty("transcriptDigest") String transcriptDigest,
        @JsonProperty("unexpectedReaderOutcomes") Long unexpectedReaderOutcomes
) {
    /** Reject a missing required root member before domain use. */
    public AdapterCapabilityLocalFilesystemProbeSummary {
        Objects.requireNonNull(atomicSymlinkReplacement, "atomicSymlinkReplacement");
        Objects.requireNonNull(directoryFsync, "directoryFsync");
        Objects.requireNonNull(exclusiveControlPublication, "exclusiveControlPublication");
        Objects.requireNonNull(readerIterations, "readerIterations");
        Objects.requireNonNull(replacementIterations, "replacementIterations");
        Objects.requireNonNull(rootAndAncestorsNoFollow, "rootAndAncestorsNoFollow");
        Objects.requireNonNull(sameRootAndReleaseDevice, "sameRootAndReleaseDevice");
        Objects.requireNonNull(transcriptDigest, "transcriptDigest");
        Objects.requireNonNull(unexpectedReaderOutcomes, "unexpectedReaderOutcomes");
    }
}
