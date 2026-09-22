/**
 * Validate the intentionally empty MVP template-composition projection.
 *
 * @param {unknown} value template-composition instance
 * @returns {void}
 */
export function validateTemplateComposition(value: unknown): void;
/**
 * Validate the closed theme-contract instance independent of external records.
 *
 * @param {unknown} value theme-contract instance
 * @returns {void}
 */
export function validateThemeContract(value: unknown): void;
/**
 * Compute the exact self-excluding template styling-contract digest.
 *
 * @param {unknown} contract complete styling-contract record
 * @returns {string} tagged digest
 */
export function computeTemplateStylingContractDigest(contract: unknown): string;
/**
 * Validate the selected template's exact immutable styling contract.
 *
 * `context.bytes` is the retained
 * `contracts/theme-styling-contract.jcs` member. `context.lockedTemplate` is
 * the integrity-verified selected lock row; no package or digest fields are
 * synthesized by this validator.
 *
 * @param {unknown} value template styling-contract record
 * @param {unknown} context retained bytes and selected template identity
 * @returns {void}
 */
export function validateTemplateStylingContract(value: unknown, context: unknown): void;
/**
 * Compute the exact self-excluding shared theme-fixture release digest.
 *
 * @param {unknown} release complete fixture-release record
 * @returns {string} tagged digest
 */
export function computeThemeFixtureReleaseDigest(release: unknown): string;
/**
 * Validate an immutable shared theme fixture release.
 *
 * `context.bytes` are its retained compact-JCS bytes and
 * `context.stylingContractDigest` is the independently validated template
 * styling catalog digest.
 *
 * @param {unknown} value fixture-release record
 * @param {unknown} context retained bytes and styling digest
 * @returns {void}
 */
export function validateThemeFixtureRelease(value: unknown, context: unknown): void;
/**
 * Compute the exact self-excluding theme conformance-evidence digest.
 *
 * @param {unknown} result complete conformance result
 * @returns {string} tagged digest
 */
export function computeThemeConformanceEvidenceDigest(result: unknown): string;
/**
 * Validate one retained theme conformance result against its fixture release.
 *
 * `context.bytes` are exact compact-JCS result bytes. The other context fields
 * are independently validated retained inputs, not additional wire members.
 *
 * @param {unknown} value conformance-result record
 * @param {unknown} context release, input digest, and retained result bytes
 * @returns {void}
 */
export function validateThemeConformanceResult(value: unknown, context: unknown): void;
/**
 * Compute the pre-finalization conformance-input digest.
 *
 * `theme.json` is virtualized with exactly `integrity` and `evidenceDigest`
 * omitted; every other package member is represented by its raw bytes.
 *
 * @param {unknown} theme complete theme contract
 * @param {unknown} packageFiles extracted package-file rows
 * @returns {string} tagged digest
 */
export function computeThemeConformanceInputDigest(theme: unknown, packageFiles: unknown): string;
/**
 * Compute final semantic theme-package integrity.
 *
 * `theme.json` is virtualized with exactly `integrity` omitted; every other
 * package member is represented by its raw bytes.
 *
 * @param {unknown} theme complete theme contract
 * @param {unknown} packageFiles extracted package-file rows
 * @returns {string} tagged digest
 */
export function computeThemePackageIntegrity(theme: unknown, packageFiles: unknown): string;
/**
 * Validate the exact closed theme package, byte budgets, manifests, licenses,
 * and trusted parser-evidence projections.
 *
 * `context.packageFiles` is the extraction layer's complete stripped-member
 * observation. `fixtureRelease` is independently validated immutable shared
 * infra state. `cssEvidence` and `passiveAssetEvidence` are retained envelopes
 * emitted by the isolated S2 runners whose exact identities appear in that
 * release; they are context, never fields invented on theme.json. The caller
 * owns the trusted execution boundary: copying a runner ledger row into an
 * envelope does not prove execution. `acceptedBudgetCeilings` is the
 * independently selected release-policy ceiling and is mandatory because
 * DEC-097 deliberately defines no evidence-free universal package ceiling.
 *
 * @param {unknown} value complete theme contract
 * @param {unknown} context package files, parser evidence, styling catalog, and policy ceilings
 * @returns {void}
 */
export function validateThemePackage(value: unknown, context: unknown): void;
/**
 * Validate the complete DEC-097 theme composition across the selected lock,
 * template catalog, package, fixture release, and conformance result.
 *
 * The context ledger is exact and consists only of independently retained or
 * integrity-verified inputs:
 *
 * - `lockedTheme` and `lockedTemplate`: selected lock rows;
 * - styling/fixture/result objects plus their exact compact-JCS bytes;
 * - complete extracted package-file observations;
 * - pinned CSS/passive parser evidence; and
 * - selected release-policy budget ceilings.
 *
 * @param {unknown} value complete theme-contract instance
 * @param {unknown} context exact retained validation context
 * @returns {void}
 */
export function validateThemeComposition(value: unknown, context: unknown): void;
export type UnknownRecord = Record<string, unknown>;
export type ThemePackageFile = {
    path: string;
    kind: "file";
    mode: number;
    bytes: Uint8Array;
};
export type ThemeEntry = {
    path: string;
    byteLength: string;
    sha256: string;
};
export type UnicodePropertyRange = [number, number, string];
