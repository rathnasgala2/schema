/**
 * Validate a deterministic `gala-frozen-envelope-v2` byte string.
 *
 * The returned record content values are zero-copy views of the supplied byte
 * string. Structural JSON Schema validation and external intent/workload
 * equalities remain the responsibility of their owning semantic validator.
 *
 * @param {Uint8Array} bytes complete envelope bytes
 * @returns {{
 *   recordCount: number,
 *   records: {kind: number, path: string, content: Uint8Array}[],
 *   artifactManifest: Record<string, unknown>,
 *   buildProvenance: Record<string, unknown>,
 *   sbom: Record<string, unknown>,
 *   artifactDigest: string,
 *   manifestDigest: string,
 *   provenanceDigest: string,
 *   sbomDigest: string,
 *   frozenEnvelopeByteCount: string,
 *   frozenEnvelopeDigest: string
 * }} validated projection and computed digests
 * @throws {TypeError} with a stable `code` when any envelope invariant fails
 */
export function validateFrozenEnvelope(bytes: Uint8Array): {
    recordCount: number;
    records: {
        kind: number;
        path: string;
        content: Uint8Array;
    }[];
    artifactManifest: Record<string, unknown>;
    buildProvenance: Record<string, unknown>;
    sbom: Record<string, unknown>;
    artifactDigest: string;
    manifestDigest: string;
    provenanceDigest: string;
    sbomDigest: string;
    frozenEnvelopeByteCount: string;
    frozenEnvelopeDigest: string;
};
export type PropertyRange = [number, number, string];
