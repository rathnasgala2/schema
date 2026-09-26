/**
 * Bind one schema set, its diagnostic map and its format dispatcher into the
 * fail-closed validator surface this package exposes.
 *
 * Every entry point of this package -- the whole 19-contract `.` export and
 * the narrow `./runtime-origins` export alike -- is one call to this factory.
 * Nothing here imports a schema, a diagnostic map or a pinned source-data
 * table, so a narrow entry point carries only the tables its own contract
 * actually needs (SCHEMA-2.6.0, APP-TAILWIND-SHADCN-2a follow-up (1)).
 *
 * @param {{
 *   schemas: readonly Record<string, unknown>[],
 *   diagnosticMap: DiagnosticMap,
 *   validateFormat: (formatName: string, value: string) => boolean
 * }} dependencies injected schema set, diagnostic map and format dispatcher
 * @returns {{
 *   schemaIds: readonly string[],
 *   validateDocument: (schemaId: string, value: unknown) => GalaValidationResult,
 *   validateFragment: (
 *     schemaId: string,
 *     schemaPointer: string,
 *     value: unknown
 *   ) => {valid: boolean, codes: string[], keywords: string[]},
 *   validateArrayCardinality: (
 *     schema: {minItems?: number, maxItems?: number, uniqueItems?: boolean},
 *     length: number
 *   ) => {valid: boolean, codes: string[], keywords: string[]}
 * }} bound validator surface
 */
export function createValidatorSuite({ schemas, diagnosticMap, validateFormat, }: {
    schemas: readonly Record<string, unknown>[];
    diagnosticMap: DiagnosticMap;
    validateFormat: (formatName: string, value: string) => boolean;
}): {
    schemaIds: readonly string[];
    validateDocument: (schemaId: string, value: unknown) => GalaValidationResult;
    validateFragment: (schemaId: string, schemaPointer: string, value: unknown) => {
        valid: boolean;
        codes: string[];
        keywords: string[];
    };
    validateArrayCardinality: (schema: {
        minItems?: number;
        maxItems?: number;
        uniqueItems?: boolean;
    }, length: number) => {
        valid: boolean;
        codes: string[];
        keywords: string[];
    };
};
/**
 * Bind a document validator surface to an already-compiled set of Ajv
 * validate functions instead of raw schemas -- no `ajv.compile` and
 * therefore no `new Function` in this path.
 *
 * This is what `.` and `./runtime-origins` use (SCH-C2): their compiled
 * validators come from `codegen/generate-contracts.ts`'s browser standalone
 * core, generated ahead of time with real Gala format and `x-gala-*`
 * keyword semantics baked into the compiled source. Every Ajv validate
 * function -- precompiled or `ajv.compile()`-produced -- has the same
 * callable shape (`fn(value)` returning a boolean, `fn.errors` populated on
 * rejection in the same shape), so the exact same diagnostic normalization
 * (`validateDocument`) applies unchanged; only fragment- and cardinality-
 * level validation are unavailable here, because they runtime-compile
 * schema fragments the precompiled core does not carry -- Node-only fixture
 * and parity tooling keeps using `createValidatorSuite` for those.
 *
 * @param {{
 *   validators: Record<string, MinimalValidateFunction>,
 *   diagnosticMap: DiagnosticMap
 * }} dependencies precompiled validators by schema identity, and the shared
 *   diagnostic map
 * @returns {{
 *   schemaIds: readonly string[],
 *   validateDocument: (schemaId: string, value: unknown) => GalaValidationResult
 * }} bound validator surface
 */
export function createPrecompiledValidatorSuite({ validators, diagnosticMap }: {
    validators: Record<string, MinimalValidateFunction>;
    diagnosticMap: DiagnosticMap;
}): {
    schemaIds: readonly string[];
    validateDocument: (schemaId: string, value: unknown) => GalaValidationResult;
};
/**
 * Roots whose `allOf`/`if`/`then`/`else` composition Ajv's `strictTypes`/
 * `strictRequired` cannot see across: a conditional branch's `properties`/
 * `required` describes a value or a required member declared by a
 * *sibling* branch in the same `allOf`, not locally, and strict mode flags
 * that as if it were a typo (SCH-H1).
 *
 * This is a **shrinking-only** allowlist: `test/t15-strict-allowlist.test.js`
 * asserts it is a subset of the set recorded there when the allowlist was
 * introduced, so a new root or a reconciled `$defs` shape can be added to
 * this file only by removing an existing entry, never by adding one net
 * new. Every root *not* listed here already compiles clean under full
 * `strictTypes`/`strictRequired` and must stay that way.
 *
 * As of this allowlist's introduction, the 14 listed roots account for 756
 * strict-mode diagnostics (`strictTypes` + `strictRequired` combined); the
 * remaining 6 roots (`appearance`, `event-envelope`,
 * `public-generation-marker`, `public-runtime-origins`, `repository`,
 * `template-composition`) have zero.
 *
 * @type {ReadonlySet<string>}
 */
export const LEGACY_STRICT_TYPES_ALLOWLIST: ReadonlySet<string>;
export type DiagnosticMap = {
    rules: Record<string, {
        code: string;
    }>;
    keywords: Record<string, string>;
    cascadeKeywords: readonly string[];
    codes: Record<string, {
        severity: "ERROR";
        remediation: string;
        documentationUrl: string;
    }>;
};
export type Registry = {
    schemasById: ReadonlyMap<string, Record<string, unknown>>;
    validatorsById: ReadonlyMap<string, import("ajv").ValidateFunction>;
    strictAjv: import("ajv/dist/2020.js").default;
    legacyAjv: import("ajv/dist/2020.js").default;
    fragmentAjv: import("ajv/dist/2020.js").default;
    cardinalityValidators: Map<string, import("ajv").ValidateFunction>;
};
/**
 * The callable shape both an `ajv.compile()`-produced validate function and
 * a precompiled standalone one share: callable, with `.errors` populated
 * (Ajv error objects) on rejection. `ajv.compile()`'s richer
 * `import('ajv').ValidateFunction` additionally carries `.schema`/
 * `.schemaEnv`, which a standalone-generated function does not.
 */
export type MinimalValidateFunction = ((value: unknown) => boolean) & {
    errors?: AjvError[] | null;
};
/**
 * The subset of `Registry` document-level validation actually needs: just a
 * schema-identity-keyed map of validate functions, precompiled or
 * `ajv.compile()`-produced alike (SCH-C2's `createPrecompiledValidatorSuite`
 * constructs one of these without ever building a real `Registry`).
 */
export type DocumentValidatorRegistry = {
    validatorsById: ReadonlyMap<string, MinimalValidateFunction>;
};
export type AjvError = import("ajv").ErrorObject;
export type GalaDiagnostic = Readonly<{
    code: string;
    severity: "ERROR";
    instancePointer: string;
    actualValueClass: string;
    rule: string;
    remediation: string;
    documentationUrl: string;
}>;
export type GalaValidationResult = Readonly<{
    valid: boolean;
    diagnostics: readonly GalaDiagnostic[];
}>;
