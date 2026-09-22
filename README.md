# `@rathnasgala2/schemas`

The Galascribe schema package is the sole authority for portable JSON Schemas,
the OpenAPI contract, generated validators, and generated consumer types. It
does not contain API business behavior, UI code, publication rendering, or
infrastructure configuration.

This repository contains all 20 S0-T04 JSON Schema roots: the six author-source
contracts, the eleven composition/build/deployment contracts (SCHEMA-2.10.0 adds
`build-provenance`, `urn:gala:metadata:build-provenance:2.0.0`, a pure addition
nested identically at `artifact-manifest`'s internal `#/$defs/buildProvenance`
and published standalone for direct validation), and the three platform
contracts (`problem`, `event-envelope`, and `public-runtime-origins`). Every
root embeds the identical complete 20-scalar `$defs` library. The package also
carries the deterministic full valid, boundary, invalid-with-code,
unknown-field, and adversarial fixture corpus. S0-T03 owns the internal semantic
validators and active domain-separated digest profiles required by DEC-097
through DEC-099; S0-T04 adds DEC-100 through DEC-102. S0-T05 exposes the
fail-closed `validateGalaDocument` API and validates the complete committed
corpus through Ajv 8.20.0 on Node 24 and Networknt 2.0.1 on Java 21. Both
engines normalize through the committed shared diagnostic map, and any
acceptance or diagnostic-code divergence fails verification. A separate
committed exact-result snapshot rejects mutually shared extra diagnostics. The
same gate also executes 1,995 shared DEC-099 scalar vectors, including all 766
pinned Unicode 17 grapheme-conformance rows, and raw RFC 8785 number and string
spellings that have not first been normalized by Node. S0-T06 generates strict
TypeScript root types and validators plus Java 21 records and Networknt registry
wiring for the exact 20 roots. The schema inventory adds the separately owned
OpenAPI contract as the twenty-first identity, and the compatibility catalog
closes 46 initial producer/consumer pairings. Both catalogs carry DEC-091's
domain-separated `sourceDesignRevision`. S0-T07 materializes the reviewed
OpenAPI 3.1 source fragments, deterministic bundle, and digest-bound HTTP
catalog for exactly 75 MVP operations plus `/internal/health` (76 catalog rows;
71 at S0-T07, plus the two SCHEMA-2.8.0 reads and the two SCHEMA-2.10.0
publication-destination reads/writes). The bundle includes the accepted DEC-097
receipt-exchange and deployment-receipt amendments and serializes the fixed
OpenAPI Generator 7.25.0 option sets. Every operation also declares its tenant
scope, lifecycle and activation guards, maps every reachable problem, and
carries schema-validated nominal and problem examples. S0-T08 projects the exact
19 admitted transition families into 77 independently identified event actions
(SCHEMA-2.11.0 adds the `github_installation` family so the worker-only
compare-and-set writer can retire into the sole aggregate gateway). Each action
binds its aggregate and organization or publication scope, exact
predecessor/target states, the closed DEC-101 payload, the transactional outbox
producer, and a non-empty registered consumer set. S5-T00 materializes document
07's closed 15-component App semantic catalog and document 14's 20-entry MVP App
route registry (S5 brief section 4) as `docs/catalogs/app-components.json` and
`docs/catalogs/app-routes.json`, with every `apiOperationIds` entry validated
against `openapi/openapi.yaml`, every `componentIds`/`contentKeyIds` entry
validated against the component catalog, and `capabilityKeys` projected from
`openapi/http-catalog.json`. S4-T01 adds the separately generated `fixtures/s4/`
deployment/certification consumer-fixture family (deployment-intent,
deployment-observation, deployment-receipt, public-generation-marker, and
adapter-capability rows for `local-directory`, `github-pages`, and `do-spaces`)
alongside the existing `fixtures/s2/` family, each with its own manifest.
LOCAL-21 admits a 21st App route, `/invitations/accept` (`routeId`
`invitations.accept`), an ordinary `SESSION_REQUIRED` `APP` route (not
`TRANSACTIONAL_LINK`: it is served by the App origin after sign-in, unlike the
deferred `/t/**` template family) that calls
`postMembershipInvitationsByTokenAccept`; its non-enumerating failure states
collapse onto that operation's single declared `INVALID_SOURCE_STATE` problem,
which covers an expired, already-used or unknown token alike.

SCHEMA-2.7.1 (LOCAL-50) adds the optional operation-level vendor extension
`x-gala-conditional-capability-keys`: an array of `{capabilityKey, condition}`
pairs naming an alternate capability key that also admits the operation, next to
the operation's primary `x-gala-capability-key`, under one closed `condition`
(currently `read-only` -- the key admits the operation as a pure read, granting
nothing the primary key's write would -- or `field:<name>` -- the key
additionally admits one named request-body field of the same write, alongside
the primary key). It is additive to, and distinct from, the existing required
`x-gala-conditional-capabilities` extension (`{capabilityKey, when}`, free-text
`when`), which names which capability governs which optional branch of a single
operation's request content. Both extensions project their capability keys into
the same generated `conditionalCapabilityKeys` array on the operation's
`openapi/http-catalog.json` row (legacy entries first, then closed-vocabulary
entries); no operation uses both extensions today. This patch applies the new
extension to
`getOrganizationsByOrganizationIdPublicationsByPublicationIdRepositoryBindingsCurrent`
(`publication.view`, `read-only` -- the read is admitted by the view capability;
bind/revoke stay `publication.integrations.manage`) and
`patchOrganizationsByOrganizationId` (`organization.lifecycle.manage`,
`field:desiredState` -- `organization.settings.manage` stays the primary key
governing `name`/`slug`).

SCHEMA-2.9.0 (LOCAL-60, design
`scrap/20260918_intent-request-derivation-design.md`) is an additive minor on
the request side and a vocabulary closure on the retained side. The workload
receipt-exchange intent request carries only what the workflow can honestly
hold: `destination` is the request-side
`ReceiptExchangeIntentRequestDestination` (`environment` and `targetDigest`
optional and api-derived; `providerBinding` admitted per adapter -- Pages
coordinates, the two `local-directory` evidence digests, nothing for Spaces
until C2), `rebuildRecord` is the request-side
`ReceiptExchangeIntentRequestRebuildRecord` (`policyReleaseId`,
`buildPolicyDecisionDigest`, `packageReleaseCatalogDigest`,
`destinationCapabilityDigest` optional and api-derived) and
`capabilityDecisionDigest` is optional and api-derived; a present value that
disagrees with the api's derivation is `422 VALIDATION_FAILED` (the LOCAL-57
rule). `provenanceDigest`/`sbomDigest` stay required. The retained
`deployment-intent` document is unchanged except that
`destinationIdentity.environment` is now the closed per-adapter vocabulary
`github-pages` | `do-spaces` | `local-directory` (LOCAL-60a), enforced by
`adapterId` in every root that carries it. The package ships and exports
`parity/digest-record-vectors.json`, eleven DEC-097 record golden vectors for
`destinationProviderBinding`, `destinationMutationKey`, `capabilityDecision` and
`buildPolicyDecision`, each also a cross-language parity case. The 80-domain
inventory is unchanged.

SCHEMA-2.9.1 is an additive patch: the package gains the Node-only
`./frozen-envelope` subpath (`validateFrozenEnvelope`, described under "Browser
safety" below) so a deploy-side consumer stops importing
`src/internal/frozen-envelope.js` by file path. No root, digest domain, vector,
`required` set or catalog changes.

SCHEMA-2.10.0 (LOCAL-63, plan
`scrap/20260918_c2-publication-destination-plan.md` section 2) is an additive
minor closing the C2 publication-destination packet. Two new operations join the
contract: `GET`/`PUT .../publications/{publicationId}/destination`, the
publication's single deployment-destination sub-resource for all three MVP
adapters. The sub-resource always exists: `state: UNSET` with `version: 0` is
the honest representation of "not chosen yet", so `PUT` uses the required
`If-Match` header uniformly (`"0"` means create) with no `If-None-Match` special
case and no separate create operation; `state: SET` means the author chose a
destination that has not yet been fixed by a publish, and `state: LOCKED` means
the first accepted publish fixed it permanently (a new destination requires a
new publication). The response's `providerBinding` is a discriminated union
keyed on `adapterId` (`github-pages`: `owner`/`repository`/`repositoryId`
derived from the live repository binding; `do-spaces`: the complete DEC-097
provider binding including its two pre-authorized control-plane digests;
`local-directory`: absent), and the GET response additionally carries
`admittedRegions`, the exact accepted DigitalOcean Spaces region catalog, so a
client never hard-codes provider facts. `publication.view` admits the `GET`;
`publication.settings.manage` admits the `PUT`. The `PUT` request forbids
`providerBinding` for `github-pages`/`local-directory` and requires
`region`/`servedBucket`/`stagingBucket` for `do-spaces`; a bucket already bound
to another Gala destination is refused `409 INVALID_SOURCE_STATE` pointed at the
conflicting member (DigitalOcean bucket names are globally unique, so this
reveals only what DigitalOcean itself already reveals), a locked destination
refuses every `PUT`, and region/bucket-equality/forbidden-`providerBinding`
violations are `422 VALIDATION_FAILED`.
`postOrganizationsByOrganizationIdPublicationsByPublicationIdPublishes` gains
the state guard `PublicationDestination:SET|LOCKED` to its existing "admitted
destination" activation guard. The workload receipt-exchange intent request is
byte-unchanged from 2.9.0: Spaces `providerBinding` stays forbidden on the
request because the destination record is now server-owned and the api renders
the retained `providerBinding` from it; a test pins this byte-for-byte. LOCAL-62
is resolved: every `$defs.capabilityDecision` member in `adapter-capability` now
carries `x-gala-decision-phase: issuance|deploy`,
`pagesActionsArtifactByteCount`/`pagesActionsArtifactDigest` move out of the
Pages-conditional `required` set (deploy-phase evidence the artifact-build step
produces after authorization, not before), and the schema description states
that the intent's `capabilityDecisionDigest` is computed over the issuance-phase
record only -- a `required`-set relaxation on a record root is MINOR, not MAJOR,
under this package's stated compatibility policy (every 2.9.x-valid
`capabilityDecision` record, Pages included, stays valid, since 2.9.x always
supplied both fields where 2.10.0 now only asks for them optionally). The
package adds its twentieth JSON Schema root, `build-provenance`
(`urn:gala:metadata:build-provenance:2.0.0`), the exact closed 27-member
`buildProvenance:2.0.0` envelope object DEC-097 section 2 defines (`schemaId`
through `secretInputs`); it is a pure addition, modelled on the nested,
byte-identical `#/$defs/buildProvenance` copy `artifact-manifest` has carried
internally since before 2.10.0, and the existing `buildProvenance` digest
profile (`GALA-BUILD-PROVENANCE-V2`) now has a published root to validate
against. `parity/digest-record-vectors.json` gains five vectors:
`spaces-website-configuration-root` and `-docs-base-path` (basePath `/` and
`/docs/`), `spaces-control-plane-binding`, `spaces-region-catalog`, and
`destination-provider-binding-do-spaces-realistic` (chained on the first three,
using DEC-097's real virtual-host origin spellings), each computed with an
independent byte-level oracle exactly as the existing eleven were, taking the
DEC-097 record vector count from 11 to 16 and the 80-domain digest inventory's
accepted/tampered parity case count from 182 to 192.
`catalog-sources/app-routes.json` adds the two new operation ids to the
publication Settings and Overview routes; no new route and no new capability key
(both `publication.view` and `publication.settings.manage` already existed).

SCHEMA-2.8.1 (PUBLISH-S4-4b plus two App-consumer corrections) is an additive
patch: the package gains the `./digest-profiles` subpath described under
"Browser safety" below so a consumer computes contract digests through the same
frozen profiles the validators use; the `ManagedDeploymentOperationResponse` arm
of the operation read admits the optional `kind`/`subject` members exactly as
`OperationDetailResponse` does (a strict validator no longer rejects, and a
generated parser no longer drops, a 2.8.0 api's managed-deployment operation
body); and the single deployment read `getDeploymentsByGenerationId` is bound to
the Releases route in `docs/catalogs/app-routes.json`. No root schema, digest
domain or golden vector changes.

SCHEMA-2.8.0 (LOCAL-51, LOCAL-52, LOCAL-54 through LOCAL-57) is additive. The
workload receipt-exchange intent request no longer _requires_
`pagesBuildVersion` or `spacesStagePrefix`: the API derives both
deterministically from identifiers it mints, so a workflow that cannot compute
them omits them and a disagreeing value is refused `422 VALIDATION_FAILED`; the
retained deployment-intent document still carries both as required,
server-derived members. `destinationIdentity` gains an optional closed
`providerBinding` naming the destination's provider coordinates per adapter, and
`POST /v2/organizations` declares the duplicate-slug `409 INVALID_SOURCE_STATE`
it has always answered, `repository-changes:plan` names the two digests its
confirm is fenced on, and no `format: date-time` member in the bundle carries a
`pattern` any longer -- a generated `OffsetDateTime` cannot carry one, and the
requirement moves into each member's description while the nineteen JSON Schema
roots keep enforcing it. Two reads join the contract --
`GET .../publications/{publicationId}/reviews` (keyset, optional `state` filter,
rows of the new `ReviewSummary`, which the single review read is now defined as)
and `GET .../deployments/{generationId}` -- taking the MVP operation count from
71 to 73. `POST .../publishes` names the `publishId` it accepted and
`POST .../reviews` names the `reviewId` it created (byte-equal to `operationId`
and `commandId`, LOCAL-16); both operation reads gain an optional closed
`subject` and `kind`; `DeploymentSummary` gains optional `activation` and
`verification` evidence whose closed enums map one-for-one onto DEC-097's
deployment generation machine. `POST .../reviews` admits a `repositoryChangeId`
in place of client-computed `validationEvidenceDigest`/ `policyDigest`, and
`:decide` takes `If-Match`. Two optional operation-level extensions,
`x-gala-assurance-class` and `x-gala-action-grant`, state assurance per
operation rather than per capability key, so the review decision can be a
step-up while the review read is not. On the JSON Schema side, the activation
fence becomes a single `$defs/generationFence` referenced at all five carriers
-- one string schema with one combined pattern rather than a two-member `oneOf`
of two string schemas, which OpenAPI Generator 7.25 renders as an empty marker
interface -- with the finding code `EXPECTED_GENERATION_FENCE_INVALID`, and
`adapter-capability` admits an optional `callClassBinding` block bound by its
own `callClassBindingDigest` under the new
`GALA-PROVIDER-CALL-CLASS-BINDING-V2\0` domain -- deliberately _not_ folded into
`requestTemplateCatalogDigest`, whose domain DEC-097 section 8 closes, so every
digest computed under 2.7.x stays valid. Two further generator-shape fixes land
in the same release: `verificationSubmission` becomes the named, discriminated
pair `VerificationSubmissionFit`/`VerificationSubmissionUnfit`, and the
receipt-exchange response union flattens from two members with a nested `state`
discriminator to three members keyed on a new optional `kind` constant, with
`purpose` untouched on the wire.

## Prerequisites

- Node.js 24.18.0
- npm 11.16.0
- Java 21 (only for the cross-language parity development gate)

Both versions are enforced by `package.json`; `.nvmrc` and `.node-version` carry
the same Node pin.

## Commands

```sh
npm ci
npm run verify
npm run schemas:generate
npm run fixtures:generate
npm run diagnostics:generate
npm run parity-expectations:generate
npm run parity:check
npm run declarations:generate
npm run codegen:generate
npm run codegen:check
npm run openapi:generate
npm run openapi:check
npm run events:generate
npm run events:check
npm run app-catalogs:generate
npm run app-catalogs:check
npm run compatibility:check
npm run licenses:check
npm run sbom:check
npm run browser-safety:check
npm pack --dry-run
```

`npm run verify` checks deterministic schema, diagnostic-map, exact parity
expectation, generated TypeScript/Java, schema-inventory, and compatibility
generation; verifies the deterministic OpenAPI bundle/catalog; builds
declarations; and runs formatting, lint, type, architecture, duplication,
workflow-pin, test, full cross-language parity, license, SBOM, and critical
vulnerability gates. `codegen:check` performs two isolated clean builds and
requires both generated trees and the committed tree to be byte-identical.

### Browser safety

The `.` export (`validateGalaDocument`/`GALA_SCHEMA_IDS`, `src/index.js`) is
consumed at runtime by the App's Vite dev/build pipeline, so it must run in a
browser: no `node:*` import, and no `Buffer`/`process` reference, may be
reachable from it. Two gates enforce this:

- `npm run browser-safety:check` (`scripts/check-browser-safety.mjs`, wired into
  `npm run build`/`npm run verify`) statically walks the `.`,
  `./runtime-origins` and `./digest-profiles` exports' import graphs and fails
  on any reachable Node-builtin import or `Buffer`/`process` reference. The same
  walk weighs each entry point's package-owned module closure — the reachable
  `.js` sources plus the `.json` documents they import, which is what a bundler
  inlines — and fails `./runtime-origins` if it exceeds its declared
  1,250,000-byte cap. `./generated/typescript` is a declared export subpath but
  is intentionally excluded from this walk: it is generated output that loads a
  CommonJS structural-validator core via `node:module`'s `createRequire`, and
  every consumer today reaches it only through `import type` (erased at compile
  time, never entering a runtime browser bundle) — making that subpath itself
  browser-safe is a separate codegen change.
- `npm test` (via `test/browser-smoke.test.js`) spawns
  `scripts/browser-smoke.mjs` under `node --experimental-vm-modules`, which
  links the real `.` export's ESM source inside a genuine jsdom-realm `vm`
  context (no `Buffer`, `process`, `require`, or `module`) and calls
  `validateGalaDocument` against a real fixture, proving the export actually
  executes in a browser-shaped global environment, not just that Node happens to
  be able to parse it.

`Buffer`-based code (`node:crypto`'s `createHash`, `Buffer.from`/`compare`/
`concat`, etc.) reachable from `.` is replaced by `src/internal/bytes.js`
(browser-safe byte helpers) and `src/internal/sha256.js` (a pure-JS synchronous
SHA-256, verified byte-identical to `node:crypto`'s `createHash('sha256')`,
needed because `crypto.subtle.digest` is Promise-only and many call sites here
are synchronous). Modules not reachable from `.` (`frozen-envelope.js`,
`build-artifact-semantics.js`, `theme-composition-semantics.js`,
`deployment-record-semantics.js`) remain Node-only and keep using
`node:*`/`Buffer` freely.

The public package API is intentionally small:

```js
import { GALA_SCHEMA_IDS, validateGalaDocument } from '@rathnasgala2/schemas';

const result = validateGalaDocument(GALA_SCHEMA_IDS[0], candidate);
```

A browser client that needs only the public runtime-origins contract imports the
narrow subpath instead, which carries that one schema, that one contract's slice
of the diagnostic map, and none of the SPDX licence list or the other eighteen
contracts:

```js
import {
  RUNTIME_ORIGINS_SCHEMA_ID,
  validateRuntimeOriginsDocument,
} from '@rathnasgala2/schemas/runtime-origins';
```

It produces byte-identical diagnostics to the `.` export for that identity and
fails closed on every other, and its package-owned module closure is roughly a
sixth of the root export's. It still carries the Unicode 17 tables and the IANA
language subtag registry, because this contract's `gala-bcp47`,
`gala-plain-label` and `gala-plain-text` formats genuinely consult them; only
SPDX, the other contracts and the rest of the diagnostic map are absent.

A consumer that has to _produce_ a contract digest (an adapter's
`callClassBindingDigest` or `requestTemplateCatalogDigest`, for example) imports
the read-only digest-profile surface instead of re-deriving the domain string
and the projection by hand:

```js
import {
  ACTIVE_DIGEST_DOMAINS,
  ACTIVE_DIGEST_PROFILES,
  digestDomainSeparatedJcs,
} from '@rathnasgala2/schemas/digest-profiles';

const callClassBindingDigest =
  ACTIVE_DIGEST_PROFILES.providerCallClassBinding.digest(rows);
// equivalently, for a value already projected:
digestDomainSeparatedJcs(ACTIVE_DIGEST_DOMAINS.providerCallClassBinding, rows);
```

Every profile object and each of its four function members is frozen
(SCHEMA-2.9.0). The DEC-097 record vectors a second implementer reproduces are
in `parity/digest-record-vectors.json`, importable as
`@rathnasgala2/schemas/parity/digest-record-vectors.json`.

The subpath exports exactly `ACTIVE_DIGEST_DOMAIN_COUNT` (80),
`ACTIVE_DIGEST_DOMAINS` (profile name to terminal-NUL domain string),
`ACTIVE_DIGEST_PROFILES` (profile name to a frozen
`{domain, project, preimage, digest, digestBytes}` profile),
`digestDomainSeparatedJcs(domain, value)` and
`domainSeparatedJcsPreimage(domain, value)`. They are the validator's own frozen
inventory objects, not copies, so a digest computed through them is
byte-identical to the one the contract checks; the export-name set and the
80-profile inventory are pinned by `test/t11-digest-profiles-export.test.js`.
The entry point reaches only `bytes.js`, `sha256.js` and `canonical-jcs.js`, and
is walked by the browser-safety gate like the other JavaScript entry points.

A deploy-side consumer that receives the frozen envelope as bytes (the workflow
carrier) validates them through the Node-only subpath:

```js
import { validateFrozenEnvelope } from '@rathnasgala2/schemas/frozen-envelope';

const { artifactDigest, manifestDigest, provenanceDigest, sbomDigest } =
  validateFrozenEnvelope(envelopeBytes);
```

It exports exactly `validateFrozenEnvelope` (SCHEMA-2.9.1): the identical
function the `.` export's build-artifact semantics apply, returning the
zero-copy record views, the parsed manifest/provenance/SBOM documents and every
retained digest, and throwing a `TypeError` whose `code` is one stable
`FROZEN_ENVELOPE_*` code. Because it compares byte strings through `Buffer` it
is not a browser entry point and is not walked by the browser-safety gate; its
seven-file package-owned closure, the export-name set, and a packed-tarball
resolution round trip are pinned by `test/t12-frozen-envelope-export.test.js`.

Generated consumers use the explicit subpath:

```js
import {
  GENERATED_SCHEMA_IDS,
  validateGeneratedDocument,
} from '@rathnasgala2/schemas/generated/typescript';
```

Unknown schema identities and major versions reject closed. Invalid results
contain stable code, severity, JSON Pointer, actual-value class, rule identity,
remediation, and documentation URL fields without including authored values.

## Package layout

- `src/` — JavaScript ESM runtime package surface, checked from JSDoc;
  `index.js` is the 19-contract `.` export and `runtime-origins.js` the narrow
  single-contract browser export, both bound through
  `internal/validator-core.js`; `digest-profiles.js` is the read-only
  `./digest-profiles` re-export of `internal/digest-profiles.js`;
  `frozen-envelope.js` is the Node-only `./frozen-envelope` re-export of
  `internal/frozen-envelope.js`.
- `types/` — declaration output emitted from `src/`.
- `schemas/` — 19 committed Draft 2020-12 contracts.
- `diagnostics/` — generated shared rule-to-diagnostic normalization map, its
  per-contract narrow projections (today `public-runtime-origins`, for the
  narrow browser export), and the exact whole-result parity snapshot.
- `examples/valid/` — canonical valid roots and rule-level accepted vectors.
- `fixtures/` — boundary, invalid-with-code, unknown-field, and adversarial
  vectors plus their coverage manifest; `fixtures/s2/` and `fixtures/s4/` are
  separately bound, generated consumer-fixture families with their own
  manifests.
- `codegen/` — TypeScript deterministic generator and the hash-bound DEC-091
  design manifest reconstructed from the accepted merged design snapshot.
- `generated/typescript/` — strict root types and ESM API around the deliberate
  Ajv standalone CommonJS structural core.
- `generated/java/` — Java 21 root/nested records, exact schema resources, and
  Networknt registry wiring for a caller-supplied Gala semantic dialect.
- `docs/catalogs/schema-inventory.json` — exact 19 JSON Schema roots plus the
  materialized OpenAPI identity.
- `catalog-sources/internal-event-actions.json` — reviewed 19-family transition,
  aggregate, scope, producer, and consumer source ledger.
- `docs/catalogs/internal-event-actions.json` — generated digest-bound catalog
  of all 77 admitted transition actions and their closed payload schemas.
- `catalog-sources/app-components.json` and `catalog-sources/app-routes.json` —
  reviewed document 07/14 component and route source ledgers for the S5 App
  control plane.
- `docs/catalogs/app-components.json` — generated digest-bound catalog of the 15
  closed semantic App components and the per-screen title/summary/status/
  recovery content-key inventory for every registered route.
- `docs/catalogs/app-routes.json` — generated digest-bound catalog of the 22 MVP
  App route registry entries (S5 brief section 4, plus LOCAL-21's
  `/invitations/accept` and SCHEMA-2.8.0's Reviews list), each with its derived
  `routeId`/`screenId`, `componentIds`, `contentKeyIds`, `apiOperationIds`
  validated against `openapi/openapi.yaml`, and `capabilityKeys` projected from
  `openapi/http-catalog.json`.
- `openapi/source/` — reviewed, complete OpenAPI root, component, and path
  fragments grouped by the first literal resource token.
- `openapi/openapi.yaml` — deterministic OpenAPI 3.1 bundle for the exact 73 MVP
  operations plus health.
- `openapi/http-catalog.json` — generated digest-bound method/path/purpose and
  capability inventory, including `conditionalCapabilityKeys` (SCHEMA-2.7.1) and
  the per-operation `assuranceClass`/`actionGrant` pair (SCHEMA-2.8.0); it is
  not a parallel transport authority.
- `openapi/generator/` — serialized Spring and TypeScript Fetch options for
  OpenAPI Generator 7.25.0.
- `compatibility/` — closed compatibility schema and the executable initial
  21-contract, 46-pairing release authority (SCHEMA-2.10.0).
- `scripts/` — repository verification and supply-chain tooling.
- `parity/java/` — test-only checksum-pinned Gradle 8.8/Java 21 Networknt
  harness; it is not part of the npm package payload.
- `parity/*.json` — shared scalar and raw RFC 8785 number inputs consumed by
  both parity implementations without transmitting expected results to Java;
  `parity/digest-record-vectors.json` (SCHEMA-2.9.0, shipped and exported) is
  the DEC-097 record golden-vector set for the four destination/policy digest
  domains the API derives at intent issuance.
- `test/` — Node native tests.

## Architecture sources

The controlling sources currently exist only in the enclosing eleven-repository
workspace. Their workspace-relative paths are:

- `orchestration/slice-briefs/S0-executable-contracts.md`
- `orchestration/decisions/DEC-093-eleven-repository-workspace-and-rathnasgala2-namespace.md`
- `orchestration/decisions/DEC-094-javascript-esm-public-packages.md`
- `orchestration/decisions/DEC-096-mvp-scope-fence-and-per-slice-contract-materialization.md`
- `orchestration/decisions/DEC-097-mvp-composition-build-and-deployment-contract-closure.md`
- `orchestration/decisions/DEC-098-s0-t03-record-and-digest-closure.md`
- `orchestration/decisions/DEC-099-portable-scalar-and-pinned-data-profile-closure.md`
- `orchestration/decisions/DEC-100-problem-type-identity-closure.md`
- `orchestration/decisions/DEC-101-event-transition-payload-version-authority.md`
- `orchestration/decisions/DEC-102-public-runtime-origin-digest-and-binding-closure.md`
- `orchestration/WORKSPACE.md`

Public immutable links will replace these paths when the product owner assigns
the orchestration corpus a canonical public location.

## License

Apache License 2.0. See `LICENSE`, `NOTICE`, and `THIRD_PARTY_LICENSES.json`.
