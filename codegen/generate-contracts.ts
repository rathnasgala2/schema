import { createHash } from 'node:crypto';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Ajv2020Module from 'ajv/dist/2020.js';
import {
  Name as CodegenName,
  _ as codegenTemplate,
  type Code as CodegenCode,
} from 'ajv/dist/compile/codegen/index.js';
import standaloneCodeModule from 'ajv/dist/standalone/index.js';
import { format as prettierFormat } from 'prettier';

type JsonPrimitive = boolean | null | number | string;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

interface SchemaDocument extends JsonObject {
  $defs?: Record<string, JsonValue>;
  $id: string;
  properties?: Record<string, JsonValue>;
  required?: string[];
  schemaVersion?: string;
  title?: string;
}

interface DesignManifest extends JsonObject {
  digest: string;
  files: Array<{ byteLength: number; path: string; sha256: string }>;
  schemaVersion: string;
}

interface KeywordContext {
  ok(pass: boolean): void;
}
interface AjvRegistry {
  addFormat(name: string, definition: true): AjvRegistry;
  addKeyword(definition: {
    keyword: string;
    code: (context: KeywordContext) => void;
  }): AjvRegistry;
  addSchema(schema: JsonObject, key?: string): AjvRegistry;
}

const Ajv2020 = Ajv2020Module as unknown as new (options: {
  code: { source: true };
  strict: true;
  strictTypes: false;
  strictRequired: false;
}) => AjvRegistry;

interface BrowserKeywordCodeContext {
  data: CodegenCode;
  schemaCode: CodegenCode;
  fail(condition: CodegenCode): void;
  ok(pass: boolean): void;
}
interface BrowserFormatDefinition {
  type: 'string';
  validate: (value: string) => boolean;
}
interface BrowserAjvRegistry {
  addFormat(
    name: string,
    definition: BrowserFormatDefinition,
  ): BrowserAjvRegistry;
  addKeyword(definition: {
    keyword: string;
    schemaType?: string | string[];
    type?: string;
    code: (context: BrowserKeywordCodeContext) => void;
  }): BrowserAjvRegistry;
  addSchema(schema: JsonObject, key?: string): BrowserAjvRegistry;
}
const Ajv2020Browser = Ajv2020Module as unknown as new (options: {
  allErrors: true;
  code: { source: true; esm: true; formats: unknown };
  strict: true;
  strictTypes: false;
  strictRequired: false;
}) => BrowserAjvRegistry;

const standaloneCode = standaloneCodeModule as unknown as (
  ajv: AjvRegistry | BrowserAjvRegistry,
  references: Record<string, string>,
) => string;

const CONTRACTS = [
  'adapter-capability',
  'appearance',
  'artifact-manifest',
  'author',
  'build-input',
  'build-provenance',
  'content-frontmatter',
  'deployment-intent',
  'deployment-observation',
  'deployment-receipt',
  'event-envelope',
  'lock',
  'navigation',
  'problem',
  'public-generation-marker',
  'public-runtime-origins',
  'publication',
  'repository',
  'template-composition',
  'theme-contract',
] as const;

const OPENAPI_ID = 'urn:gala:schema:openapi:2.0.0';
const DESIGN_DOMAIN = Buffer.from('GALA-DESIGN-REVISION-V2\0', 'utf8');
const INTERNAL_DEFINITION = 'buildProvenance';
const JAVA_PACKAGE = 'io.gala.schema.generated';
const FORMAT_OPTIONS = {
  proseWrap: 'always',
  singleQuote: true,
  trailingComma: 'all',
} as const;

const JAVA_KEYWORDS = new Set([
  'abstract',
  'assert',
  'boolean',
  'break',
  'byte',
  'case',
  'catch',
  'char',
  'class',
  'const',
  'continue',
  'default',
  'do',
  'double',
  'else',
  'enum',
  'extends',
  'final',
  'finally',
  'float',
  'for',
  'goto',
  'if',
  'implements',
  'import',
  'instanceof',
  'int',
  'interface',
  'long',
  'native',
  'new',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'short',
  'static',
  'strictfp',
  'super',
  'switch',
  'synchronized',
  'this',
  'throw',
  'throws',
  'transient',
  'try',
  'void',
  'volatile',
  'while',
]);

function requireObject(value: JsonValue, label: string): JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  return value;
}

function compareUtf8(left: string, right: string): number {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function canonicalJson(value: JsonValue): string {
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'string'
  ) {
    return JSON.stringify(value);
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError('Non-finite JSON number');
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(',')}]`;
  }
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key] ?? null)}`)
    .join(',')}}`;
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function catalogDigest(value: JsonObject): string {
  const projection = { ...value };
  delete projection.digest;
  return `sha256:${sha256(canonicalJson(projection))}`;
}

function pascalCase(value: string): string {
  const result = value
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join('');
  if (!result) throw new TypeError(`Cannot derive a type name from ${value}`);
  return /^\d/u.test(result) ? `N${result}` : result;
}

function schemaObject(value: JsonValue | undefined): JsonObject | undefined {
  return value === undefined ? undefined : requireObject(value, 'schema');
}

function resolveLocalReference(
  reference: string,
  root: SchemaDocument,
): JsonObject {
  const prefix = '#/$defs/';
  if (!reference.startsWith(prefix)) {
    throw new TypeError(`Unsupported non-local schema reference ${reference}`);
  }
  const key = reference
    .slice(prefix.length)
    .replaceAll('~1', '/')
    .replaceAll('~0', '~');
  const resolved = root.$defs?.[key];
  if (resolved === undefined)
    throw new TypeError(`Unresolved schema reference ${reference}`);
  return requireObject(resolved, reference);
}

function uniqueTypes(types: string[]): string[] {
  return [...new Set(types)].sort();
}

function typescriptType(
  value: JsonValue,
  root: SchemaDocument,
  prefix: string,
  resolving = new Set<string>(),
): string {
  if (typeof value === 'boolean') return value ? 'unknown' : 'never';
  const schema = requireObject(value, 'TypeScript schema');
  const reference = typeof schema.$ref === 'string' ? schema.$ref : undefined;
  if (reference !== undefined) {
    const definition = reference.slice('#/$defs/'.length);
    if (definition === INTERNAL_DEFINITION) {
      if (resolving.has(reference)) return 'unknown';
      const next = new Set(resolving).add(reference);
      return typescriptType(
        resolveLocalReference(reference, root),
        root,
        prefix,
        next,
      );
    }
    return `${prefix}${pascalCase(definition)}`;
  }
  if ('const' in schema) return JSON.stringify(schema.const);
  if (Array.isArray(schema.enum)) {
    return schema.enum.map((entry) => JSON.stringify(entry)).join(' | ');
  }

  const unions = ['oneOf', 'anyOf']
    .flatMap((key) => (Array.isArray(schema[key]) ? schema[key] : []))
    .map((entry) => typescriptType(entry, root, prefix, resolving));
  const intersections = Array.isArray(schema.allOf)
    ? schema.allOf.map((entry) =>
        typescriptType(entry, root, prefix, resolving),
      )
    : [];

  const declaredTypes = Array.isArray(schema.type)
    ? schema.type.filter((entry): entry is string => typeof entry === 'string')
    : typeof schema.type === 'string'
      ? [schema.type]
      : [];
  const baseTypes = declaredTypes.map((type) => {
    if (type === 'null') return 'null';
    if (type === 'boolean') return 'boolean';
    if (type === 'integer' || type === 'number') return 'number';
    if (type === 'string') return 'string';
    if (type === 'array') {
      if (Array.isArray(schema.prefixItems)) {
        const tuple = schema.prefixItems.map((item) =>
          typescriptType(item, root, prefix, resolving),
        );
        return `readonly [${tuple.join(', ')}]`;
      }
      const item = schema.items ?? true;
      return `ReadonlyArray<${typescriptType(item, root, prefix, resolving)}>`;
    }
    if (type === 'object')
      return typescriptObject(schema, root, prefix, resolving);
    return 'unknown';
  });
  if (
    declaredTypes.length === 0 &&
    (schema.properties !== undefined || schema.patternProperties !== undefined)
  ) {
    baseTypes.push(typescriptObject(schema, root, prefix, resolving));
  }
  const base = uniqueTypes(baseTypes);
  const union = uniqueTypes(unions);
  const intersection = uniqueTypes(intersections);
  const candidates = [
    ...base,
    ...(union.length > 0 ? [`(${union.join(' | ')})`] : []),
  ];
  if (intersection.length > 0) candidates.push(...intersection);
  return candidates.length === 0
    ? 'unknown'
    : uniqueTypes(candidates).join(' & ');
}

function typescriptObject(
  schema: JsonObject,
  root: SchemaDocument,
  prefix: string,
  resolving: Set<string>,
): string {
  const properties = schemaObject(schema.properties);
  const required = new Set(
    Array.isArray(schema.required)
      ? schema.required.filter(
          (entry): entry is string => typeof entry === 'string',
        )
      : [],
  );
  const fields = Object.entries(properties ?? {})
    .sort(([left], [right]) => compareUtf8(left, right))
    .map(
      ([name, property]) =>
        `readonly ${JSON.stringify(name)}${required.has(name) ? '' : '?'}: ${typescriptType(property, root, prefix, resolving)};`,
    );
  const patterns = schemaObject(schema.patternProperties);
  if (
    fields.length === 0 &&
    (patterns !== undefined || schema.additionalProperties !== undefined)
  ) {
    const values = uniqueTypes([
      ...Object.values(patterns ?? {}).map((entry) =>
        typescriptType(entry, root, prefix, resolving),
      ),
      ...(schema.additionalProperties === undefined
        ? []
        : [
            typescriptType(
              schema.additionalProperties,
              root,
              prefix,
              resolving,
            ),
          ]),
    ]);
    return `Readonly<Record<string, ${values.join(' | ') || 'unknown'}>>`;
  }
  if (fields.length === 0) return 'Readonly<Record<string, never>>';
  const body = `Readonly<{\n  ${fields.join('\n  ')}\n}>`;
  return patterns === undefined
    ? body
    : `${body} & Readonly<Record<string, unknown>>`;
}

function generateTypescriptContract(
  contract: string,
  schema: SchemaDocument,
  revision: string,
): string {
  const prefix = pascalCase(contract);
  const rootName = `${prefix}Document`;
  const definitions = Object.entries(schema.$defs ?? {})
    .filter(([name]) => name !== INTERNAL_DEFINITION)
    .sort(([left], [right]) => compareUtf8(left, right))
    .map(
      ([name, definition]) =>
        `export type ${prefix}${pascalCase(name)} = ${typescriptType(definition, schema, prefix)};`,
    );
  return [
    `// Generated from ${schema.$id}; sourceDesignRevision=${revision}.`,
    '// Do not edit.',
    '',
    ...definitions.flatMap((definition) => [definition, '']),
    `export type ${rootName} = ${typescriptType(schema, schema, prefix)};`,
    '',
  ].join('\n');
}

function collectFormats(value: JsonValue, target: Set<string>): void {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const entry of value) collectFormats(entry, target);
    return;
  }
  if (typeof value.format === 'string') target.add(value.format);
  for (const child of Object.values(value)) collectFormats(child, target);
}

// Collect every `x-gala-*` assertion keyword name from one JSON Schema. This
// structural core deliberately does not carry Gala's semantic keyword
// implementations -- see this function's `'// Gala semantic formats and
// keywords are enforced by the strict ESM API.'` comment below and SCH-M5.
// Ajv's 2020-12 dialect evaluates keywords alongside `$ref`, so any
// `x-gala-*` keyword reachable from the root schema must be a keyword Ajv
// recognises, or `strict: true` refuses to compile it; registering each one
// found here as an always-true assertion (the same treatment given every
// `format`, below) keeps this core's known weaker-than-the-ESM-API
// semantics, not a stricter accident.
function collectGalaKeywords(value: JsonValue, target: Set<string>): void {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const entry of value) collectGalaKeywords(entry, target);
    return;
  }
  for (const key of Object.keys(value)) {
    if (key.startsWith('x-gala-')) target.add(key);
  }
  for (const child of Object.values(value)) collectGalaKeywords(child, target);
}

function generateValidatorCore(
  schemas: SchemaDocument[],
  revision: string,
): string {
  // See src/internal/validator-core.js's createRegistry for why strictTypes
  // and strictRequired are relaxed: the deployment-* roots' allOf/if/then
  // state-machine composition declares required/properties across sibling
  // branches, which strict mode cannot see across.
  const ajv = new Ajv2020({
    code: { source: true },
    strict: true,
    strictTypes: false,
    strictRequired: false,
  });
  const formats = new Set<string>();
  const galaKeywords = new Set<string>();
  for (const schema of schemas) {
    collectFormats(schema, formats);
    collectGalaKeywords(schema, galaKeywords);
  }
  for (const format of [...formats].sort()) ajv.addFormat(format, true);
  for (const keyword of [...galaKeywords].sort()) {
    // A code-based (not closure-based) keyword: standalone codegen cannot
    // serialize a `validate` function reference, only inline code.
    ajv.addKeyword({ keyword, code: (context) => context.ok(true) });
  }
  const references: Record<string, string> = {};
  for (const [index, schema] of schemas.entries()) {
    ajv.addSchema(schema, schema.$id);
    references[`validate${pascalCase(CONTRACTS[index] ?? '')}`] = schema.$id;
  }
  return [
    '// @ts-nocheck -- Ajv machine-generated standalone core.',
    `'use strict';`,
    `// Generated structural core; sourceDesignRevision=${revision}.`,
    '// Gala semantic formats and keywords are enforced by the strict ESM API.',
    standaloneCode(ajv, references).trimEnd(),
    '',
  ].join('\n');
}

/**
 * Gala's `x-gala-*` assertion keywords, wired to `gala-keywords.js`'s pure
 * implementations via `code()` (not `validate`, a closure Ajv's standalone
 * codegen cannot serialize) -- see gala-keywords.js's module comment.
 */
const BROWSER_KEYWORD_DEFINITIONS: ReadonlyArray<{
  keyword: string;
  schemaType?: string | string[];
  type?: string;
  fn: string;
  inert?: true;
}> = [
  { keyword: 'x-gala-decision-phase', fn: 'galaDecisionPhase', inert: true },
  {
    keyword: 'x-gala-asciiByteLength',
    schemaType: 'object',
    type: 'string',
    fn: 'galaAsciiByteLength',
  },
  {
    keyword: 'x-gala-utf8ByteLength',
    schemaType: 'object',
    type: 'string',
    fn: 'galaUtf8ByteLength',
  },
  {
    keyword: 'x-gala-graphemeLength',
    schemaType: 'object',
    type: 'string',
    fn: 'galaGraphemeLength',
  },
  {
    keyword: 'x-gala-maxCanonicalBytes',
    schemaType: 'number',
    fn: 'galaMaxCanonicalBytes',
  },
  {
    keyword: 'x-gala-maximum',
    schemaType: ['number', 'string'],
    fn: 'galaMaximum',
  },
];

/**
 * Generate one browser-safe ESM standalone core: real Gala format and
 * `x-gala-*` keyword semantics compiled directly into the validator
 * functions' source, with no runtime `ajv.compile` and no `new Function`
 * anywhere in the output (SCH-C2). This is what `.` and `./runtime-origins`
 * bind to; the CJS structural core above stays Node-tooling-only.
 *
 * @param schemas complete schema documents to compile, in `contracts` order
 * @param contracts contract names, one per entry in `schemas`
 * @param revision source design revision, for the file header
 * @param formatModuleSpecifier import specifier for the format dispatcher,
 *   relative to the generated file (the full core needs SPDX support and
 *   the narrow core does not, so the two entry points import different
 *   dispatchers -- see format-validators.js's module comment)
 * @param formatDispatcherName exported name of the format dispatcher
 *   function at `formatModuleSpecifier`, taking `(formatName, value)`
 * @returns generated ESM module source
 */
const AJV_RUNTIME_REQUIRE_PATTERN =
  /const (\w+) = require\("ajv\/dist\/runtime\/([a-zA-Z0-9]+)"\)(\.[a-zA-Z]+)?;/gu;

/**
 * Rewrite every `const name = require("ajv/dist/runtime/<module>")[.prop];`
 * Ajv's standalone codegen emits for its own built-in runtime helpers (deep
 * equality for `enum`/`const`/`uniqueItems`, Unicode-aware length counting,
 * timestamp/URI/JSON parsing) into a real static ESM import plus a bare
 * local binding.
 *
 * These `require(...)` calls are hardcoded in ajv's own runtime helper
 * modules (e.g. `ajv/dist/runtime/equal.js`'s `equal.code =
 * 'require("ajv/dist/runtime/equal").default'`) and are emitted verbatim
 * regardless of the `esm: true` compile option -- `esm: true` only changes
 * how *our own* referenced values are emitted, not ajv's internal ones. A
 * literal `require` is not valid ESM and would throw the moment a browser
 * tried to load this module, so it must be rewritten here, in the one place
 * that assembles the final file text.
 *
 * @param {string} code standalone-generated validator source
 * @returns {{code: string, imports: string[]}} rewritten source and the
 *   import statements it now needs
 */
function resolveAjvRuntimeRequires(code: string): {
  code: string;
  imports: string[];
} {
  const imports = new Set<string>();
  const rewritten = code.replace(
    AJV_RUNTIME_REQUIRE_PATTERN,
    (
      _match,
      localName: string,
      moduleName: string,
      property: string | undefined,
    ) => {
      if (property === undefined) {
        imports.add(
          `import ${localName} from 'ajv/dist/runtime/${moduleName}.js';`,
        );
        return '';
      }
      // These modules mark themselves `__esModule: true` and set
      // `exports.default = <value>`, which is the pattern transpiled
      // TS/Babel CJS output uses. A default *namespace* import of such a
      // module resolves, correctly, to the *whole* `module.exports` object
      // (verified empirically against this Node version) -- not to
      // `.default` directly -- so `.default` needs one extra unwrap.
      // Any other named property (`parseJson.js`'s `.parseJson`, etc.) is a
      // plain CJS named export with no such wrapping and needs none.
      const namespaceName = `${localName}Module`;
      const importStatement =
        property === '.default'
          ? `import ${namespaceName} from 'ajv/dist/runtime/${moduleName}.js';`
          : `import * as ${namespaceName} from 'ajv/dist/runtime/${moduleName}.js';`;
      imports.add(importStatement);
      return `const ${localName} = ${namespaceName}${property};`;
    },
  );
  return { code: rewritten, imports: [...imports].sort() };
}

function generateBrowserValidatorCore(
  schemas: SchemaDocument[],
  contracts: readonly string[],
  revision: string,
  formatModuleSpecifier: string,
  formatDispatcherName: string,
): string {
  const ajv = new Ajv2020Browser({
    allErrors: true,
    code: { source: true, esm: true, formats: codegenTemplate`GALA_FORMATS` },
    strict: true,
    strictTypes: false,
    strictRequired: false,
  });
  for (const definition of BROWSER_KEYWORD_DEFINITIONS) {
    ajv.addKeyword({
      keyword: definition.keyword,
      ...(definition.schemaType === undefined
        ? {}
        : { schemaType: definition.schemaType }),
      ...(definition.type === undefined ? {} : { type: definition.type }),
      code(context) {
        if (definition.inert) {
          context.ok(true);
          return;
        }
        context.fail(
          codegenTemplate`!${new CodegenName(definition.fn)}(${context.schemaCode}, ${context.data})`,
        );
      },
    });
  }
  const formats = new Set<string>();
  for (const schema of schemas) collectFormats(schema, formats);
  for (const format of [...formats].sort()) {
    // This closure is never invoked at runtime: `code.formats` (above)
    // makes every compiled call site reference the real `GALA_FORMATS`
    // object written into the generated file's preamble below instead.
    // Ajv only consults this registration at compile time, to read
    // `.type` off it (`getFormat` in ajv/dist/vocabularies/format/format.js)
    // -- every Gala format is string-typed, so a stub satisfies that.
    ajv.addFormat(format, {
      type: 'string',
      validate: () => true,
    });
  }
  const references: Record<string, string> = {};
  for (const [index, schema] of schemas.entries()) {
    ajv.addSchema(schema, schema.$id);
    references[`validate${pascalCase(contracts[index] ?? '')}`] = schema.$id;
  }
  const schemaValidatorEntries = schemas
    .map(
      (schema, index) =>
        `  ${JSON.stringify(schema.$id)}: validate${pascalCase(contracts[index] ?? '')},`,
    )
    .join('\n');
  const { code: validatorCode, imports: runtimeImports } =
    resolveAjvRuntimeRequires(standaloneCode(ajv, references).trimEnd());
  return [
    '// @ts-nocheck -- Ajv machine-generated standalone core.',
    `// Generated browser-safe ESM standalone core; sourceDesignRevision=${revision}.`,
    '// Do not edit. Real Gala format and x-gala-* keyword semantics are',
    '// compiled directly into these validator functions -- no runtime',
    '// ajv.compile() and no eval()/new Function() (SCH-C2). This core is',
    '// bound to `.` and `./runtime-origins`; the Node-only fixture and',
    '// parity tooling keep using the runtime-compiled registry instead.',
    `import { ${formatDispatcherName} } from '${formatModuleSpecifier}';`,
    'import {',
    '  galaAsciiByteLength,',
    '  galaDecisionPhase,',
    '  galaGraphemeLength,',
    '  galaMaxCanonicalBytes,',
    '  galaMaximum,',
    '  galaUtf8ByteLength,',
    "} from '../../src/internal/gala-keywords.js';",
    ...runtimeImports,
    'const GALA_FORMATS = Object.freeze({',
    ...[...formats]
      .sort()
      .map(
        (format) =>
          `  ${JSON.stringify(format)}: { type: 'string', validate: (value) => ${formatDispatcherName}(${JSON.stringify(format)}, value) },`,
      ),
    '});',
    validatorCode,
    `export const SCHEMA_VALIDATORS = Object.freeze({`,
    schemaValidatorEntries,
    '});',
    '',
  ].join('\n');
}

/**
 * Generate the `.d.mts` companion declaration for one browser standalone
 * core. TypeScript's NodeNext resolution prefers a sibling `.d.mts` over
 * parsing the paired `.mjs` for type information; without one, `tsc` walks
 * the real compiled validator functions' control-flow graph (thousands of
 * nested `if`/`else` branches for the larger roots) and overflows its own
 * call stack. This tiny, stable, generated shape is what every consumer of
 * the real file actually needs.
 *
 * @param {string} revision source design revision, for the file header
 * @returns {string} generated `.d.mts` source
 */
function browserValidatorCoreDeclaration(revision: string): string {
  return [
    `// Generated declaration for the browser-safe ESM standalone core; sourceDesignRevision=${revision}.`,
    '// Do not edit.',
    'export declare const SCHEMA_VALIDATORS: Readonly<',
    "  Record<string, ((value: unknown) => boolean) & { errors?: import('ajv').ErrorObject[] | null }>",
    '>;',
    '',
  ].join('\n');
}

function generateTypescriptIndex(
  schemas: SchemaDocument[],
  revision: string,
): { declaration: string; runtime: string } {
  const ids = schemas.map((schema) => schema.$id);
  const declarationLines = [
    `// Generated contract API; sourceDesignRevision=${revision}.`,
    '// Do not edit.',
    '',
    "import type { GalaValidationResult } from '../../types/internal/schema-validator.js';",
    '',
  ];
  const runtimeLines = [
    `// Generated contract API; sourceDesignRevision=${revision}.`,
    '// Do not edit.',
    '',
    "import { createRequire } from 'node:module';",
    "import { validateGalaDocument } from '../../src/index.js';",
    '',
    'const require = createRequire(import.meta.url);',
    "const CORE_PATH = './validator-core.cjs';",
    '/** @type {Record<string, (value: unknown) => boolean>} */',
    'const core = require(CORE_PATH);',
    `const SCHEMA_IDS = ${JSON.stringify(ids, null, 2)};`,
    'const STRUCTURAL_VALIDATORS = Object.freeze({',
  ];
  for (const [index, schema] of schemas.entries()) {
    const functionName = `validate${pascalCase(CONTRACTS[index] ?? '')}`;
    runtimeLines.push(`  ${JSON.stringify(schema.$id)}: core.${functionName},`);
  }
  runtimeLines.push(
    '});',
    '',
    '/** Exact immutable schema identities represented by generated root types. */',
    'export const GENERATED_SCHEMA_IDS = Object.freeze(SCHEMA_IDS);',
    '',
    '/**',
    ' * Validate one generated root through the standalone structural core and',
    " * Galascribe's exact semantic validator.",
    ' *',
    ' * @param {string} schemaId exact immutable schema identity',
    ' * @param {unknown} value candidate document',
    " * @returns {Readonly<import('../../src/internal/schema-validator.js').GalaValidationResult & {structuralValid: boolean}>} stable result",
    ' */',
    'export function validateGeneratedDocument(schemaId, value) {',
    '  const structural = STRUCTURAL_VALIDATORS[schemaId];',
    '  const structuralValid = structural?.(value) ?? false;',
    '  const exactResult = validateGalaDocument(schemaId, value);',
    '  return Object.freeze({',
    '    ...exactResult,',
    '    structuralValid,',
    '    valid: structuralValid && exactResult.valid,',
    '  });',
    '}',
    '',
  );
  declarationLines.push(
    'export type GeneratedValidationResult = GalaValidationResult & Readonly<{',
    '  structuralValid: boolean;',
    '}>;',
    '',
    'export declare const GENERATED_SCHEMA_IDS: readonly string[];',
    'export declare function validateGeneratedDocument(',
    '  schemaId: string,',
    '  value: unknown,',
    '): GeneratedValidationResult;',
    '',
  );
  for (const [index, schema] of schemas.entries()) {
    const contract = CONTRACTS[index];
    if (contract === undefined) throw new TypeError('Missing contract');
    const rootName = `${pascalCase(contract)}Document`;
    declarationLines.push(
      `export type { ${rootName} } from './contracts/${contract}.js';`,
    );
    runtimeLines.push(
      '/**',
      ` * Test whether a value is a valid ${rootName}.`,
      ' *',
      ' * @param {unknown} value candidate document',
      ' * @returns {boolean} validation result',
      ' */',
      `export function is${rootName}(value) {`,
      `  return validateGeneratedDocument(${JSON.stringify(schema.$id)}, value).valid;`,
      '}',
      '',
    );
    declarationLines.push(
      `export declare function is${rootName}(value: unknown): value is import('./contracts/${contract}.js').${rootName};`,
    );
  }
  declarationLines.push('');
  return {
    declaration: declarationLines.join('\n'),
    runtime: runtimeLines.join('\n'),
  };
}

function javaIdentifier(value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_$]/gu, '_');
  const prefixed = /^\d/u.test(normalized) ? `_${normalized}` : normalized;
  return JAVA_KEYWORDS.has(prefixed) ? `${prefixed}_` : prefixed;
}

function javaType(
  value: JsonValue,
  root: SchemaDocument,
  prefix: string,
): string {
  if (typeof value === 'boolean') return 'JsonNode';
  const schema = requireObject(value, 'Java schema');
  if (typeof schema.$ref === 'string') {
    const definition = schema.$ref.slice('#/$defs/'.length);
    if (definition === INTERNAL_DEFINITION) return 'JsonNode';
    const resolved = resolveLocalReference(schema.$ref, root);
    if (resolved.type === 'object' || resolved.properties !== undefined) {
      return `${prefix}${pascalCase(definition)}`;
    }
    return javaType(resolved, root, prefix);
  }
  if ('const' in schema) {
    const constant = schema.const;
    if (typeof constant === 'string') return 'String';
    if (typeof constant === 'boolean') return 'Boolean';
    if (typeof constant === 'number')
      return Number.isInteger(constant) ? 'Long' : 'BigDecimal';
    return 'JsonNode';
  }
  if (Array.isArray(schema.enum)) {
    const values = schema.enum;
    if (values.every((entry) => typeof entry === 'string')) return 'String';
    if (values.every((entry) => typeof entry === 'boolean')) return 'Boolean';
    if (values.every((entry) => typeof entry === 'number')) return 'BigDecimal';
    return 'JsonNode';
  }
  const declared = Array.isArray(schema.type)
    ? schema.type.filter((entry): entry is string => typeof entry === 'string')
    : typeof schema.type === 'string'
      ? [schema.type]
      : [];
  const concrete = declared.filter((entry) => entry !== 'null');
  if (concrete.length !== 1) {
    const alternatives = ['oneOf', 'anyOf']
      .flatMap((key) => (Array.isArray(schema[key]) ? schema[key] : []))
      .map((entry) => javaType(entry, root, prefix));
    const unique = uniqueTypes(alternatives);
    if (unique.length === 1) return unique[0] ?? 'JsonNode';
    const intersections = Array.isArray(schema.allOf)
      ? uniqueTypes(schema.allOf.map((entry) => javaType(entry, root, prefix)))
      : [];
    const concreteIntersections = intersections.filter(
      (entry) => entry !== 'JsonNode',
    );
    return concreteIntersections.length === 1
      ? (concreteIntersections[0] ?? 'JsonNode')
      : 'JsonNode';
  }
  const type = concrete[0];
  if (type === 'string') return 'String';
  if (type === 'boolean') return 'Boolean';
  if (type === 'integer') return 'Long';
  if (type === 'number') return 'BigDecimal';
  if (type === 'array') {
    const item = Array.isArray(schema.prefixItems)
      ? true
      : (schema.items ?? true);
    return `List<${javaType(item, root, prefix)}>`;
  }
  return 'JsonNode';
}

function generateJavaRecordSource(
  className: string,
  sourceIdentity: string,
  value: JsonObject,
  root: SchemaDocument,
  prefix: string,
  revision: string,
): string {
  const properties = Object.entries(schemaObject(value.properties) ?? {}).sort(
    ([left], [right]) => compareUtf8(left, right),
  );
  const required = new Set(
    Array.isArray(value.required)
      ? value.required.filter(
          (entry): entry is string => typeof entry === 'string',
        )
      : [],
  );
  const components = properties.map(([name, property]) => ({
    javaName: javaIdentifier(name),
    name,
    required: required.has(name),
    type: javaType(property, root, prefix),
  }));
  const imports = new Set<string>([
    'com.fasterxml.jackson.annotation.JsonProperty',
    'com.fasterxml.jackson.databind.JsonNode',
    'java.util.Objects',
  ]);
  if (components.some(({ type }) => type.includes('BigDecimal')))
    imports.add('java.math.BigDecimal');
  if (components.some(({ type }) => type.includes('List<')))
    imports.add('java.util.List');
  const componentSource = components
    .map(
      ({ javaName, name, type }) =>
        `        @JsonProperty(${JSON.stringify(name)}) ${type} ${javaName}`,
    )
    .join(',\n');
  const requiredSource = components
    .filter(({ required: isRequired }) => isRequired)
    .map(
      ({ javaName, name }) =>
        `        Objects.requireNonNull(${javaName}, ${JSON.stringify(name)});`,
    );
  return [
    `// Generated from ${sourceIdentity}; sourceDesignRevision=${revision}.`,
    `package ${JAVA_PACKAGE}.model;`,
    '',
    ...[...imports].sort().map((name) => `import ${name};`),
    '',
    `/** Closed generated record for ${sourceIdentity}. */`,
    `public record ${className}(`,
    componentSource,
    ') {',
    `    /** Reject a missing required root member before domain use. */`,
    `    public ${className} {`,
    ...requiredSource,
    '    }',
    '}',
    '',
  ].join('\n');
}

function generateJavaRecords(
  contract: string,
  schema: SchemaDocument,
  revision: string,
): Array<{ className: string; source: string }> {
  const prefix = pascalCase(contract);
  const records = [
    {
      className: `${prefix}Document`,
      identity: schema.$id,
      schema: schema as JsonObject,
    },
  ];
  for (const [name, definition] of Object.entries(schema.$defs ?? {}).sort(
    ([left], [right]) => compareUtf8(left, right),
  )) {
    if (name === INTERNAL_DEFINITION || typeof definition === 'boolean')
      continue;
    const object = requireObject(definition, name);
    if (object.type !== 'object' && object.properties === undefined) continue;
    records.push({
      className: `${prefix}${pascalCase(name)}`,
      identity: `${schema.$id}#/$defs/${name}`,
      schema: object,
    });
  }
  const names = records.map(({ className }) => className);
  if (new Set(names).size !== names.length) {
    throw new TypeError(`${contract} produces colliding Java record names`);
  }
  return records.map(({ className, identity, schema: recordSchema }) => ({
    className,
    source: generateJavaRecordSource(
      className,
      identity,
      recordSchema,
      schema,
      prefix,
      revision,
    ),
  }));
}

function generateJavaRegistry(
  schemas: SchemaDocument[],
  revision: string,
): string {
  const entries = schemas.map(
    (schema, index) =>
      `            Map.entry(${JSON.stringify(schema.$id)}, ${JSON.stringify(`/io/gala/schema/generated/schemas/${CONTRACTS[index]}.schema.json`)})`,
  );
  return [
    `// Generated Networknt registry wiring; sourceDesignRevision=${revision}.`,
    `package ${JAVA_PACKAGE};`,
    '',
    'import com.networknt.schema.SchemaRegistry;',
    'import com.networknt.schema.SchemaRegistryConfig;',
    'import com.networknt.schema.dialect.Dialect;',
    'import java.io.IOException;',
    'import java.io.InputStream;',
    'import java.nio.charset.StandardCharsets;',
    'import java.util.LinkedHashMap;',
    'import java.util.List;',
    'import java.util.Map;',
    'import java.util.Objects;',
    '',
    '/** Exact nineteen-root schema registry for a caller-supplied Gala-enabled dialect. */',
    'public final class GalaSchemaRegistry {',
    '    private static final Map<String, String> RESOURCES = Map.ofEntries(',
    `${entries.join(',\n')}`,
    '    );',
    '',
    '    private GalaSchemaRegistry() {}',
    '',
    '    /** Return the exact immutable root identities in lexical order. */',
    '    public static List<String> schemaIds() {',
    '        return RESOURCES.keySet().stream().sorted().toList();',
    '    }',
    '',
    "    /** Build a Networknt registry using the caller's exact Gala formats and keywords. */",
    '    public static SchemaRegistry create(Dialect dialect, SchemaRegistryConfig config) {',
    '        Objects.requireNonNull(dialect, "dialect");',
    '        Objects.requireNonNull(config, "config");',
    '        return SchemaRegistry.withDialect(',
    '                dialect, builder -> builder.schemas(loadSchemas()).schemaRegistryConfig(config));',
    '    }',
    '',
    '    private static Map<String, String> loadSchemas() {',
    '        Map<String, String> schemas = new LinkedHashMap<>();',
    '        for (Map.Entry<String, String> entry : RESOURCES.entrySet()) {',
    '            try (InputStream input = GalaSchemaRegistry.class.getResourceAsStream(entry.getValue())) {',
    '                if (input == null) throw new IllegalStateException("Missing schema resource " + entry.getValue());',
    '                schemas.put(entry.getKey(), new String(input.readAllBytes(), StandardCharsets.UTF_8));',
    '            } catch (IOException error) {',
    '                throw new IllegalStateException("Cannot read schema resource " + entry.getValue(), error);',
    '            }',
    '        }',
    '        return Map.copyOf(schemas);',
    '    }',
    '}',
    '',
  ].join('\n');
}

async function loadSchemas(repositoryRoot: string): Promise<SchemaDocument[]> {
  const schemas: SchemaDocument[] = [];
  for (const contract of CONTRACTS) {
    const source = await readFile(
      path.join(repositoryRoot, 'schemas', `${contract}.schema.json`),
      'utf8',
    );
    const schema = requireObject(
      JSON.parse(source) as JsonValue,
      contract,
    ) as SchemaDocument;
    // SCHEMA-2.10.0: build-provenance alone uses the DEC-097 metadata
    // namespace (urn:gala:metadata:build-provenance:2.0.0) rather than the
    // urn:gala:schema:<contract>:2.0.0 pattern every other root's $id
    // follows, because it is a metadata record embedded in a build envelope,
    // not an author-portable content contract.
    const expectedId =
      contract === 'build-provenance'
        ? 'urn:gala:metadata:build-provenance:2.0.0'
        : `urn:gala:schema:${contract}:2.0.0`;
    if (schema.$id !== expectedId)
      throw new TypeError(`${contract} has unexpected $id`);
    const properties = schemaObject(schema.properties);
    if (
      properties?.schemaId === undefined ||
      properties.schemaVersion === undefined
    ) {
      throw new TypeError(`${contract} lacks root schema identity fields`);
    }
    schemas.push(schema);
  }
  return schemas;
}

async function loadDesignManifest(
  repositoryRoot: string,
): Promise<DesignManifest> {
  const source = await readFile(
    path.join(repositoryRoot, 'codegen', 'design-manifest.json'),
    'utf8',
  );
  const manifest = requireObject(
    JSON.parse(source) as JsonValue,
    'design manifest',
  ) as DesignManifest;
  if (manifest.schemaVersion !== '2.0.0' || manifest.files.length !== 139) {
    throw new TypeError(
      'Design manifest inventory is not the accepted v2.3 root set',
    );
  }
  const paths = manifest.files.map((entry) => entry.path);
  if (
    new Set(paths).size !== paths.length ||
    [...paths].sort(compareUtf8).join('\0') !== paths.join('\0')
  ) {
    throw new TypeError('Design manifest paths are not one sorted set');
  }
  const projection: JsonObject = {
    schemaVersion: manifest.schemaVersion,
    files: manifest.files as unknown as JsonValue,
  };
  const digest = createHash('sha256')
    .update(DESIGN_DOMAIN)
    .update(canonicalJson(projection))
    .digest('hex');
  if (manifest.digest !== digest)
    throw new TypeError('Design manifest digest mismatch');
  return manifest;
}

function schemaInventory(
  schemas: SchemaDocument[],
  sources: string[],
  revision: string,
  openapiSource: string | undefined,
): JsonObject {
  const contracts: JsonValue[] = schemas.map((schema, index) => {
    const contract = CONTRACTS[index];
    if (contract === undefined) throw new TypeError('Missing contract name');
    return {
      contract,
      artifactKind: 'JSON_SCHEMA',
      id: schema.$id,
      version: '2.0.0',
      path: `schemas/${contract}.schema.json`,
      materialized: true,
      sourceDigest: `sha256:${sha256(sources[index] ?? '')}`,
      typescriptRootType: `${pascalCase(contract)}Document`,
      javaRootType: `${JAVA_PACKAGE}.model.${pascalCase(contract)}Document`,
    };
  });
  contracts.push({
    contract: 'openapi',
    artifactKind: 'OPENAPI',
    id: OPENAPI_ID,
    version: '2.0.0',
    path: 'openapi/openapi.yaml',
    materialized: openapiSource !== undefined,
    sourceDigest:
      openapiSource === undefined ? null : `sha256:${sha256(openapiSource)}`,
    typescriptRootType: null,
    javaRootType: null,
  });
  const inventory: JsonObject = {
    schemaVersion: '2.0.0',
    sourceDesignRevision: revision,
    contracts,
    digest: '',
  };
  inventory.digest = catalogDigest(inventory);
  return inventory;
}

async function writeGeneratedTree(
  repositoryRoot: string,
  outputRoot: string,
): Promise<void> {
  const [schemas, manifest] = await Promise.all([
    loadSchemas(repositoryRoot),
    loadDesignManifest(repositoryRoot),
  ]);
  const sourceFiles = await Promise.all(
    CONTRACTS.map((contract) =>
      readFile(
        path.join(repositoryRoot, 'schemas', `${contract}.schema.json`),
        'utf8',
      ),
    ),
  );
  const openapiPath = path.join(repositoryRoot, 'openapi', 'openapi.yaml');
  const openapiSource = await readFile(openapiPath, 'utf8').catch(
    (error: unknown) => {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT')
        return undefined;
      throw error;
    },
  );
  const revision = manifest.digest;
  const typescriptRoot = path.join(outputRoot, 'generated', 'typescript');
  const javaRoot = path.join(outputRoot, 'generated', 'java');
  const browserRoot = path.join(outputRoot, 'generated', 'browser');
  await Promise.all([
    rm(typescriptRoot, { force: true, recursive: true }),
    rm(javaRoot, { force: true, recursive: true }),
    rm(browserRoot, { force: true, recursive: true }),
  ]);
  await Promise.all([
    mkdir(browserRoot, { recursive: true }),
    mkdir(path.join(typescriptRoot, 'contracts'), { recursive: true }),
    mkdir(
      path.join(
        javaRoot,
        'src',
        'main',
        'java',
        ...JAVA_PACKAGE.split('.'),
        'model',
      ),
      {
        recursive: true,
      },
    ),
    mkdir(
      path.join(
        javaRoot,
        'src',
        'main',
        'resources',
        ...JAVA_PACKAGE.split('.'),
        'schemas',
      ),
      { recursive: true },
    ),
    mkdir(path.join(outputRoot, 'docs', 'catalogs'), { recursive: true }),
  ]);

  const runtimeOriginsIndex = CONTRACTS.indexOf('public-runtime-origins');
  const runtimeOriginsSchema = schemas[runtimeOriginsIndex];
  if (runtimeOriginsSchema === undefined) {
    throw new TypeError('Missing public-runtime-origins schema');
  }
  const index = generateTypescriptIndex(schemas, revision);
  const writes: Promise<void>[] = [
    writeFile(
      path.join(typescriptRoot, 'index.js'),
      await prettierFormat(index.runtime, {
        ...FORMAT_OPTIONS,
        parser: 'babel',
      }),
      'utf8',
    ),
    writeFile(
      path.join(typescriptRoot, 'index.d.ts'),
      await prettierFormat(index.declaration, {
        ...FORMAT_OPTIONS,
        parser: 'typescript',
      }),
      'utf8',
    ),
    writeFile(
      path.join(typescriptRoot, 'validator-core.cjs'),
      generateValidatorCore(schemas, revision),
      'utf8',
    ),
    writeFile(
      path.join(browserRoot, 'validator-core.mjs'),
      generateBrowserValidatorCore(
        schemas,
        CONTRACTS,
        revision,
        '../../src/internal/format-validators.js',
        'validateGalaFormat',
      ),
      'utf8',
    ),
    writeFile(
      path.join(browserRoot, 'validator-core.d.mts'),
      await prettierFormat(browserValidatorCoreDeclaration(revision), {
        ...FORMAT_OPTIONS,
        parser: 'typescript',
      }),
      'utf8',
    ),
    writeFile(
      path.join(browserRoot, 'runtime-origins-validator-core.mjs'),
      generateBrowserValidatorCore(
        [runtimeOriginsSchema],
        ['public-runtime-origins'],
        revision,
        '../../src/internal/format-validators-core.js',
        'validateGalaFormatCore',
      ),
      'utf8',
    ),
    writeFile(
      path.join(browserRoot, 'runtime-origins-validator-core.d.mts'),
      await prettierFormat(browserValidatorCoreDeclaration(revision), {
        ...FORMAT_OPTIONS,
        parser: 'typescript',
      }),
      'utf8',
    ),
    writeFile(
      path.join(
        javaRoot,
        'src',
        'main',
        'java',
        ...JAVA_PACKAGE.split('.'),
        'GalaSchemaRegistry.java',
      ),
      generateJavaRegistry(schemas, revision),
      'utf8',
    ),
  ];
  for (const [indexValue, schema] of schemas.entries()) {
    const contract = CONTRACTS[indexValue];
    if (contract === undefined) throw new TypeError('Missing contract');
    writes.push(
      writeFile(
        path.join(typescriptRoot, 'contracts', `${contract}.d.ts`),
        await prettierFormat(
          generateTypescriptContract(contract, schema, revision),
          {
            ...FORMAT_OPTIONS,
            parser: 'typescript',
          },
        ),
        'utf8',
      ),
    );
    for (const java of generateJavaRecords(contract, schema, revision)) {
      writes.push(
        writeFile(
          path.join(
            javaRoot,
            'src',
            'main',
            'java',
            ...JAVA_PACKAGE.split('.'),
            'model',
            `${java.className}.java`,
          ),
          java.source,
          'utf8',
        ),
      );
    }
    writes.push(
      writeFile(
        path.join(
          javaRoot,
          'src',
          'main',
          'resources',
          ...JAVA_PACKAGE.split('.'),
          'schemas',
          `${contract}.schema.json`,
        ),
        sourceFiles[indexValue] ?? '',
        'utf8',
      ),
    );
  }
  const inventory = schemaInventory(
    schemas,
    sourceFiles,
    revision,
    openapiSource,
  );
  writes.push(
    writeFile(
      path.join(outputRoot, 'docs', 'catalogs', 'schema-inventory.json'),
      await prettierFormat(JSON.stringify(inventory), {
        ...FORMAT_OPTIONS,
        parser: 'json',
      }),
      'utf8',
    ),
  );
  await Promise.all(writes);
}

async function listFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  async function visit(current: string, relative: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => compareUtf8(left.name, right.name));
    for (const entry of entries) {
      const childRelative = relative ? `${relative}/${entry.name}` : entry.name;
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(child, childRelative);
      else if (entry.isFile()) result.push(childRelative);
      else throw new TypeError(`Generated output contains a non-file ${child}`);
    }
  }
  await visit(root, '');
  return result;
}

async function compareDirectories(
  left: string,
  right: string,
): Promise<string[]> {
  const [leftFiles, rightFiles] = await Promise.all([
    listFiles(left),
    listFiles(right),
  ]);
  const allFiles = [...new Set([...leftFiles, ...rightFiles])].sort(
    compareUtf8,
  );
  const diagnostics: string[] = [];
  for (const file of allFiles) {
    if (!leftFiles.includes(file))
      diagnostics.push(`missing generated file: ${file}`);
    else if (!rightFiles.includes(file))
      diagnostics.push(`stale generated file: ${file}`);
    else {
      const [leftBytes, rightBytes] = await Promise.all([
        readFile(path.join(left, file)),
        readFile(path.join(right, file)),
      ]);
      if (!leftBytes.equals(rightBytes))
        diagnostics.push(`changed generated file: ${file}`);
    }
  }
  return diagnostics;
}

async function copyManagedView(source: string, target: string): Promise<void> {
  const managed = [
    'generated/browser',
    'generated/java',
    'generated/typescript',
    'docs/catalogs/schema-inventory.json',
  ];
  for (const relative of managed) {
    const sourcePath = path.join(source, relative);
    const targetPath = path.join(target, relative);
    const details = await stat(sourcePath);
    if (details.isDirectory()) {
      for (const file of await listFiles(sourcePath)) {
        await mkdir(path.dirname(path.join(targetPath, file)), {
          recursive: true,
        });
        await writeFile(
          path.join(targetPath, file),
          await readFile(path.join(sourcePath, file)),
        );
      }
    } else {
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, await readFile(sourcePath));
    }
  }
}

async function checkGenerated(repositoryRoot: string): Promise<void> {
  const temporary = await mkdtemp(path.join(tmpdir(), 'gala-schema-codegen-'));
  try {
    const first = path.join(temporary, 'first');
    const second = path.join(temporary, 'second');
    const committed = path.join(temporary, 'committed');
    await Promise.all([
      writeGeneratedTree(repositoryRoot, first),
      writeGeneratedTree(repositoryRoot, second),
      copyManagedView(repositoryRoot, committed),
    ]);
    const [reproducibility, drift] = await Promise.all([
      compareDirectories(first, second),
      compareDirectories(first, committed),
    ]);
    const diagnostics = [
      ...reproducibility.map((entry) => `non-reproducible: ${entry}`),
      ...drift,
    ];
    if (diagnostics.length > 0) throw new Error(diagnostics.join('\n'));
  } finally {
    await rm(temporary, { force: true, recursive: true });
  }
  process.stdout.write(
    'Generated Java, TypeScript, and catalog output is reproducible and current.\n',
  );
}

async function main(): Promise<void> {
  const repositoryRoot = process.cwd();
  const arguments_ = process.argv.slice(2);
  if (
    arguments_.length > 1 ||
    (arguments_.length === 1 && arguments_[0] !== '--check')
  ) {
    throw new TypeError('Usage: generate-contracts [--check]');
  }
  if (arguments_[0] === '--check') await checkGenerated(repositoryRoot);
  else {
    await writeGeneratedTree(repositoryRoot, repositoryRoot);
    process.stdout.write('Generated Java, TypeScript, and schema inventory.\n');
  }
}

await main();
