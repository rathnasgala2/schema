/**
 * Public entry point for the `gala-frozen-envelope-v2` byte-string validator.
 *
 * A deploy-side consumer such as `publish` receives the frozen envelope as an
 * opaque byte string (the workflow carrier) and must establish, before it
 * trusts any member, that the bytes are the deterministic encoding DEC-097
 * fixes: the magic line, the record count, the payload records in exact UTF-8
 * path order, then the manifest, provenance and SBOM metadata records, each a
 * compact-JCS document whose digests agree with one another and with the
 * payloads. Until SCHEMA-2.9.1 that validator lived only in
 * `src/internal/frozen-envelope.js`, so the consumer had to import it by file
 * path inside the package, which no `exports` map admits. This subpath exposes
 * the identical function.
 *
 * The result's `records[].content` values are zero-copy views of the supplied
 * byte string; every digest member is the retained `sha256:` form; and every
 * rejection is a `TypeError` whose `code` (and message) is one stable
 * `FROZEN_ENVELOPE_*` code. Structural JSON Schema validation of the manifest,
 * provenance and SBOM documents and the external intent/workload equalities
 * stay with their owning semantic validators (`.` export).
 *
 * This entry point is Node-only: the validator compares and decodes byte
 * strings through `Buffer`, so it is deliberately not one of the
 * browser-consumed subpaths `scripts/check-browser-safety.mjs` walks. Its
 * package-owned module closure is pinned by
 * `test/t12-frozen-envelope-export.test.js` instead, alongside the export-name
 * set, so a future import cannot silently widen what a consumer bundles.
 *
 * @module
 */

export { validateFrozenEnvelope } from './internal/frozen-envelope.js';
