/**
 * Public entry point for the active DEC-097/098 digest profiles.
 *
 * Every Gala digest is a tagged SHA-256 over a terminal-NUL domain string
 * followed by a projection of the digested value (RFC 8785 JCS bytes for every
 * JSON-shaped profile). Until SCHEMA-2.8.1 the profiles lived only in
 * `src/internal/digest-profiles.js`, so a consumer that had to produce a
 * contract digest -- `callClassBindingDigest` and
 * `requestTemplateCatalogDigest` on an adapter capability document, say -- had
 * to re-derive the domain string and the projection by hand and hope it
 * matched. This subpath exposes the same frozen profile objects the validators
 * use, so a consumer computes `ACTIVE_DIGEST_PROFILES.<name>.digest(value)` (or
 * `digestDomainSeparatedJcs(ACTIVE_DIGEST_DOMAINS.<name>, projected)`) and gets
 * the byte-identical result the contract will check.
 *
 * The surface is read-only: the inventory objects and every profile are
 * frozen, and the export-name set is pinned by
 * `test/t11-digest-profiles-export.test.js`. It reaches only browser-safe
 * modules (`bytes.js`, `sha256.js`, `canonical-jcs.js`), so it is walked by
 * `scripts/check-browser-safety.mjs` like the other JavaScript entry points.
 *
 * @module
 */

export {
  ACTIVE_DIGEST_DOMAIN_COUNT,
  ACTIVE_DIGEST_DOMAINS,
  ACTIVE_DIGEST_PROFILES,
  digestDomainSeparatedJcs,
  domainSeparatedJcsPreimage,
} from './internal/digest-profiles.js';
