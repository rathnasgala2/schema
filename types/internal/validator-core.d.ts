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
    ajv: import("ajv/dist/2020.js").default;
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
