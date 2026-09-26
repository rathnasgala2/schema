import Ajv2020Module from 'ajv/dist/2020.js';
import formatsPlugin from 'ajv-formats';

import {
  galaAsciiByteLength,
  galaDecisionPhase,
  galaGraphemeLength,
  galaMaxCanonicalBytes,
  galaMaximum,
  galaUtf8ByteLength,
} from './gala-keywords.js';
import { assertUnicodeScalarString } from './unicode17.js';

const Ajv2020 = /** @type {typeof import('ajv/dist/2020.js').default} */ (
  /** @type {unknown} */ (Ajv2020Module)
);

// Every S0 root's `$id` is immutable at `2.0.0`: contract *content* moves
// forward in the npm package version (2.0.0 -> 2.11.0 and beyond), never in
// the `$id`, so the same schema identity keeps resolving across releases.
// This constant is that policy made explicit and enforced -- see
// docs/COMPATIBILITY.md.
const IMMUTABLE_SCHEMA_VERSION = '2.0.0';

const SCHEMA_ID_PATTERN = /^urn:gala:(schema|metadata):([a-z0-9-]+):([^:]+)$/u;

/**
 * Stable fallback diagnostic code for a rule/keyword pair the committed
 * diagnostic map has no entry for. `validateGalaDocument` is on the request
 * path in both the api and the App; if the compiled schemas and the
 * diagnostic map ever fall out of step (a stale published tarball, a partial
 * upgrade, a schema patch applied without `npm run diagnostics:generate`),
 * an ordinary invalid input must still come back as a rejected result, not
 * an exception thrown out of the consumer's validation call (SCH-H14).
 */
const UNMAPPED_RULE_CODE = 'SCHEMA_RULE_UNMAPPED';

/**
 * Recover a contract's kebab-case name from its exact immutable schema
 * identity. Every S0 root uses the `urn:gala:schema:<contract>:2.0.0`
 * namespace except build-provenance (SCHEMA-2.10.0), which is a DEC-097
 * metadata record embedded in a build envelope and uses
 * `urn:gala:metadata:<contract>:2.0.0` instead.
 *
 * @param {string} schemaId exact immutable schema identity
 * @returns {string} contract name
 */
function contractFromSchemaId(schemaId) {
  const match = SCHEMA_ID_PATTERN.exec(schemaId);
  if (match === null) {
    throw new Error(
      `Schema identity "${schemaId}" does not match urn:gala:(schema|metadata):<contract>:<version>`,
    );
  }
  const contract = match[2] ?? '';
  const version = match[3] ?? '';
  if (version !== IMMUTABLE_SCHEMA_VERSION) {
    throw new Error(
      `Schema identity "${schemaId}" has version "${version}"; every root's $id is pinned at ` +
        `"${IMMUTABLE_SCHEMA_VERSION}" and never bumps (see docs/COMPATIBILITY.md) -- contract ` +
        `content changes go in the package version instead.`,
    );
  }
  return contract;
}

/**
 * @typedef {{
 *   rules: Record<string, {code: string}>,
 *   keywords: Record<string, string>,
 *   cascadeKeywords: readonly string[],
 *   codes: Record<string, {
 *     severity: 'ERROR',
 *     remediation: string,
 *     documentationUrl: string
 *   }>
 * }} DiagnosticMap
 */

/**
 * @typedef {{
 *   schemasById: ReadonlyMap<string, Record<string, unknown>>,
 *   validatorsById: ReadonlyMap<string, import('ajv').ValidateFunction>,
 *   strictAjv: import('ajv/dist/2020.js').default,
 *   legacyAjv: import('ajv/dist/2020.js').default,
 *   fragmentAjv: import('ajv/dist/2020.js').default,
 *   cardinalityValidators: Map<string, import('ajv').ValidateFunction>
 * }} Registry
 */

/**
 * The callable shape both an `ajv.compile()`-produced validate function and
 * a precompiled standalone one share: callable, with `.errors` populated
 * (Ajv error objects) on rejection. `ajv.compile()`'s richer
 * `import('ajv').ValidateFunction` additionally carries `.schema`/
 * `.schemaEnv`, which a standalone-generated function does not.
 *
 * @typedef {((value: unknown) => boolean) & {errors?: AjvError[] | null}} MinimalValidateFunction
 */

/**
 * The subset of `Registry` document-level validation actually needs: just a
 * schema-identity-keyed map of validate functions, precompiled or
 * `ajv.compile()`-produced alike (SCH-C2's `createPrecompiledValidatorSuite`
 * constructs one of these without ever building a real `Registry`).
 *
 * @typedef {{
 *   validatorsById: ReadonlyMap<string, MinimalValidateFunction>
 * }} DocumentValidatorRegistry
 */

/** @typedef {import('ajv').ErrorObject} AjvError */

/**
 * @typedef {Readonly<{
 *   code: string,
 *   severity: 'ERROR',
 *   instancePointer: string,
 *   actualValueClass: string,
 *   rule: string,
 *   remediation: string,
 *   documentationUrl: string
 * }>} GalaDiagnostic
 */

/**
 * @typedef {Readonly<{
 *   valid: boolean,
 *   diagnostics: readonly GalaDiagnostic[]
 * }>} GalaValidationResult
 */

/**
 * Register Gala's assertion keywords, wiring each of `gala-keywords.js`'s
 * pure implementations into a closure-based `ajv.addKeyword` definition.
 * `strict: true` would otherwise refuse to compile a schema using any of
 * these as an unknown keyword (SCH-H1).
 *
 * @param {import('ajv/dist/2020.js').default} ajv registry
 * @returns {void}
 */
function addGalaKeywords(ajv) {
  ajv.addKeyword({
    keyword: 'x-gala-decision-phase',
    validate: galaDecisionPhase,
  });
  ajv.addKeyword({
    keyword: 'x-gala-asciiByteLength',
    schemaType: 'object',
    type: 'string',
    validate: galaAsciiByteLength,
  });
  ajv.addKeyword({
    keyword: 'x-gala-utf8ByteLength',
    schemaType: 'object',
    type: 'string',
    validate: galaUtf8ByteLength,
  });
  ajv.addKeyword({
    keyword: 'x-gala-graphemeLength',
    schemaType: 'object',
    type: 'string',
    validate: galaGraphemeLength,
  });
  ajv.addKeyword({
    keyword: 'x-gala-maxCanonicalBytes',
    schemaType: 'number',
    validate: galaMaxCanonicalBytes,
  });
  ajv.addKeyword({
    keyword: 'x-gala-maximum',
    schemaType: ['number', 'string'],
    validate: galaMaximum,
  });
}

/**
 * Collect format names from one JSON Schema.
 *
 * @param {unknown} value schema fragment
 * @param {Set<string>} formats target set
 * @returns {void}
 */
function collectFormats(value, formats) {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) collectFormats(item, formats);
    return;
  }
  const record = /** @type {Record<string, unknown>} */ (value);
  if (typeof record.format === 'string') formats.add(record.format);
  for (const child of Object.values(record)) collectFormats(child, formats);
}

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
export const LEGACY_STRICT_TYPES_ALLOWLIST = new Set([
  'adapter-capability',
  'artifact-manifest',
  'author',
  'build-input',
  'build-provenance',
  'content-frontmatter',
  'deployment-intent',
  'deployment-observation',
  'deployment-receipt',
  'lock',
  'navigation',
  'problem',
  'publication',
  'theme-contract',
]);

/**
 * Build one Ajv instance with Gala's formats and keywords registered.
 *
 * @param {readonly Record<string, unknown>[]} schemas schema documents, in registration order
 * @param {(formatName: string, value: string) => boolean} validateFormat Gala format dispatcher
 * @param {boolean} strictComposition whether `strictTypes`/`strictRequired`
 *   are enabled (see `LEGACY_STRICT_TYPES_ALLOWLIST`)
 * @returns {import('ajv/dist/2020.js').default} configured Ajv instance
 */
function buildAjv(schemas, validateFormat, strictComposition) {
  const formats = new Set();
  for (const schema of schemas) collectFormats(schema, formats);

  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictTypes: strictComposition,
    strictRequired: strictComposition,
  });
  /** @type {import('ajv-formats').default} */ (
    /** @type {unknown} */ (formatsPlugin)
  )(ajv);
  addGalaKeywords(ajv);
  for (const format of formats) {
    if (ajv.formats[format] === undefined) {
      ajv.addFormat(format, {
        type: 'string',
        validate: (/** @type {string} */ value) =>
          validateFormat(format, value),
      });
    }
  }
  return ajv;
}

/**
 * Create the immutable schema and validator registries. Every root compiles
 * under full `strict: true` (unknown keywords, unknown formats, tuple and
 * number strictness); roots on `LEGACY_STRICT_TYPES_ALLOWLIST` compile with
 * `strictTypes`/`strictRequired` relaxed, every other root compiles with
 * both enabled (SCH-H1).
 *
 * @param {readonly Record<string, unknown>[]} schemas schema documents, in registration order
 * @param {(formatName: string, value: string) => boolean} validateFormat Gala format dispatcher
 * @returns {Registry} registries
 */
function createRegistry(schemas, validateFormat) {
  const strictAjv = buildAjv(schemas, validateFormat, true);
  const legacyAjv = buildAjv(schemas, validateFormat, false);
  // Fragment-level lookups (validateFragment's getSchema by $id + JSON
  // Pointer, and validateArrayCardinality's ad-hoc schemas) are internal,
  // Node-only parity/fixture tooling, never the public document-validation
  // path SCH-H1 targets. Compiling an arbitrary JSON-pointer fragment in
  // isolation loses the ancestor `type` context it had inside its parent
  // schema (Ajv's strict "missing type" check only looks at the current
  // schema object's own siblings), so a perfectly fine nested
  // `allOf`/`if`/`then` fragment -- the *same* shape that motivated
  // LEGACY_STRICT_TYPES_ALLOWLIST, and reachable from shared `$defs` used by
  // roots outside that allowlist too (`colorMode`'s `if` branches, for one)
  // -- throws when fragment-compiled even though the whole-document compile
  // never does. This instance is always relaxed, independent of which
  // document-level Ajv a root's real validator was compiled on.
  const fragmentAjv = buildAjv(schemas, validateFormat, false);
  for (const schema of schemas) {
    fragmentAjv.addSchema(schema, String(schema.$id));
  }

  const schemasById = new Map();
  const validatorsById = new Map();
  for (const schema of schemas) {
    const schemaId = String(schema.$id);
    const contract = contractFromSchemaId(schemaId);
    const ajv = LEGACY_STRICT_TYPES_ALLOWLIST.has(contract)
      ? legacyAjv
      : strictAjv;
    schemasById.set(schemaId, schema);
    validatorsById.set(schemaId, ajv.compile(schema));
  }
  return {
    schemasById,
    validatorsById,
    strictAjv,
    legacyAjv,
    fragmentAjv,
    cardinalityValidators: new Map(),
  };
}

/**
 * Resolve a JSON Pointer without coercion.
 *
 * @param {unknown} value root instance
 * @param {string} pointer JSON Pointer
 * @returns {unknown} selected value or undefined
 */
function valueAtPointer(value, pointer) {
  if (pointer === '') return value;
  let current = value;
  for (const token of pointer
    .slice(1)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if (current === null || typeof current !== 'object') return undefined;
    current = /** @type {Record<string, unknown>} */ (current)[token];
  }
  return current;
}

/**
 * Describe a JSON value without leaking its content.
 *
 * @param {unknown} value input value
 * @returns {string} stable value class
 */
function valueClass(value) {
  if (value === undefined) return 'absent';
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value === 'object' ? 'object' : typeof value;
}

/**
 * Escape one JSON Pointer token.
 *
 * @param {string} value token
 * @returns {string} escaped token
 */
function pointerToken(value) {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

/**
 * Normalize implementation-specific validator keyword names.
 *
 * @param {string} keyword validator keyword
 * @returns {string} shared keyword identity
 */
function normalizedKeyword(keyword) {
  return keyword === 'false schema' ? 'false' : keyword;
}

/**
 * Resolve an Ajv fragment-relative schema path against its registered base.
 *
 * @param {string} basePointer registered fragment pointer
 * @param {string} schemaPath Ajv schema path
 * @returns {string} root-relative schema path
 */
function absoluteSchemaPath(basePointer, schemaPath) {
  const hash = schemaPath.indexOf('#');
  const fragment = hash >= 0 ? schemaPath.slice(hash) : schemaPath;
  if (!fragment.startsWith('#') || basePointer === '#') return fragment;
  return fragment === '#' ? basePointer : `${basePointer}${fragment.slice(1)}`;
}

/**
 * Convert one Ajv schema path into a fixture rule identity.
 *
 * @param {string} contract contract name
 * @param {string} basePointer registered fragment pointer
 * @param {AjvError} error Ajv error
 * @returns {string} rule identity
 */
function ruleIdentity(contract, basePointer, error) {
  const keyword = normalizedKeyword(error.keyword);
  const suffix = `/${error.keyword}`;
  const relativePointer = error.schemaPath.endsWith(suffix)
    ? error.schemaPath.slice(0, -suffix.length)
    : error.schemaPath;
  const schemaPointer = absoluteSchemaPath(basePointer, relativePointer);
  const property =
    keyword === 'required' && typeof error.params.missingProperty === 'string'
      ? `:${error.params.missingProperty}`
      : '';
  return `${contract}:${schemaPointer}:${keyword}${property}`;
}

/**
 * Remove redundant Ajv applicator errors using only the observed error tree.
 *
 * @param {DiagnosticMap} diagnosticMap shared diagnostic normalization map
 * @param {readonly AjvError[]} errors Ajv errors
 * @returns {AjvError[]} independently actionable errors
 */
function canonicalErrors(diagnosticMap, errors) {
  const withoutCascades = errors.filter(
    ({ keyword }) => !diagnosticMap.cascadeKeywords.includes(keyword),
  );
  const initial = withoutCascades.length > 0 ? withoutCascades : [...errors];
  const wrongTypeInstances = new Set(
    initial
      .filter(({ keyword }) => keyword === 'type')
      .map(({ instancePath }) => instancePath),
  );
  const actionable = initial.filter(
    ({ instancePath, keyword, schemaPath }) =>
      keyword !== 'not' ||
      (!schemaPath.includes('/then/not') &&
        !schemaPath.includes('/else/not')) ||
      !wrongTypeInstances.has(instancePath),
  );
  const suppressed = new Set();
  for (let parentIndex = 0; parentIndex < actionable.length; parentIndex += 1) {
    const parent = actionable[parentIndex];
    if (parent === undefined) continue;
    const keyword = normalizedKeyword(parent.keyword);
    if (!['anyOf', 'contains', 'oneOf'].includes(keyword)) continue;
    for (let index = 0; index < parentIndex; index += 1) {
      const error = actionable[index];
      if (
        error !== undefined &&
        error.schemaPath.startsWith(`${parent.schemaPath}/`)
      ) {
        suppressed.add(index);
      }
    }
    if (keyword === 'contains') continue;
    for (let index = parentIndex - 1; index >= 0; index -= 1) {
      const error = actionable[index];
      if (error === undefined) continue;
      if (
        error.instancePath !== parent.instancePath &&
        !error.instancePath.startsWith(`${parent.instancePath}/`)
      ) {
        break;
      }
      suppressed.add(index);
    }
  }
  return actionable.filter((_, index) => !suppressed.has(index));
}

/**
 * Map one Ajv error into a complete Gala diagnostic.
 *
 * @param {DiagnosticMap} diagnosticMap shared diagnostic normalization map
 * @param {string} contract contract name
 * @param {string} basePointer registered fragment pointer
 * @param {unknown} value complete input
 * @param {AjvError} error Ajv error
 * @returns {GalaDiagnostic} normalized diagnostic
 */
function normalizeError(diagnosticMap, contract, basePointer, value, error) {
  const rule = ruleIdentity(contract, basePointer, error);
  const mapping = diagnosticMap.rules[rule];
  const keyword = normalizedKeyword(error.keyword);
  const code =
    mapping?.code ?? diagnosticMap.keywords[keyword] ?? UNMAPPED_RULE_CODE;
  const catalog = diagnosticMap.codes[code];
  if (!catalog) throw new Error(`Diagnostic code ${code} is not cataloged`);
  const property =
    typeof error.params.additionalProperty === 'string'
      ? error.params.additionalProperty
      : typeof error.params.missingProperty === 'string'
        ? error.params.missingProperty
        : undefined;
  const instancePointer =
    property === undefined
      ? error.instancePath
      : `${error.instancePath}/${pointerToken(property)}`;
  return Object.freeze({
    code,
    severity: 'ERROR',
    instancePointer,
    actualValueClass: valueClass(valueAtPointer(value, instancePointer)),
    rule,
    remediation: catalog.remediation,
    documentationUrl: catalog.documentationUrl,
  });
}

/**
 * Construct the fail-closed unknown-contract diagnostic.
 *
 * @param {DiagnosticMap} diagnosticMap shared diagnostic normalization map
 * @param {unknown} value candidate input
 * @returns {GalaValidationResult} rejected result
 */
function unsupportedContract(diagnosticMap, value) {
  const catalog = diagnosticMap.codes.SCHEMA_VERSION_UNSUPPORTED;
  if (!catalog) {
    throw new Error('SCHEMA_VERSION_UNSUPPORTED is not cataloged');
  }
  return Object.freeze({
    valid: false,
    diagnostics: Object.freeze([
      Object.freeze({
        code: 'SCHEMA_VERSION_UNSUPPORTED',
        severity: 'ERROR',
        instancePointer: '/schemaId',
        actualValueClass: valueClass(valueAtPointer(value, '/schemaId')),
        rule: 'schema-registry:schemaId',
        remediation: catalog.remediation,
        documentationUrl: catalog.documentationUrl,
      }),
    ]),
  });
}

/**
 * Find the first reachable string value or property name that is not I-JSON.
 *
 * @param {unknown} value candidate document or fragment
 * @returns {string | undefined} stable pointer, if invalid
 */
function invalidUnicodeScalarPointer(value) {
  const visited = new WeakSet();
  const stack = [{ value, pointer: '' }];
  while (stack.length > 0) {
    const current = stack.pop();
    if (current === undefined) break;
    if (typeof current.value === 'string') {
      try {
        assertUnicodeScalarString(current.value);
      } catch (error) {
        if (
          error instanceof TypeError &&
          error.message === 'UNICODE_SCALAR_INVALID'
        ) {
          return current.pointer;
        }
        throw error;
      }
      continue;
    }
    if (current.value === null || typeof current.value !== 'object') continue;
    if (visited.has(current.value)) continue;
    visited.add(current.value);
    const keys = Object.keys(current.value).sort();
    for (const key of keys) {
      try {
        assertUnicodeScalarString(key);
      } catch (error) {
        if (
          error instanceof TypeError &&
          error.message === 'UNICODE_SCALAR_INVALID'
        ) {
          return current.pointer;
        }
        throw error;
      }
    }
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const key = keys[index];
      if (key === undefined) continue;
      stack.push({
        value: /** @type {Record<string, unknown>} */ (current.value)[key],
        pointer: `${current.pointer}/${pointerToken(key)}`,
      });
    }
  }
  return undefined;
}

/**
 * Build the public diagnostic for the mandatory pre-schema I-JSON gate.
 *
 * @param {DiagnosticMap} diagnosticMap shared diagnostic normalization map
 * @param {unknown} value candidate input
 * @param {string} instancePointer first invalid location
 * @returns {GalaDiagnostic} frozen diagnostic
 */
function unicodeScalarDiagnostic(diagnosticMap, value, instancePointer) {
  const catalog = diagnosticMap.codes.UNICODE_SCALAR_INVALID;
  if (!catalog) throw new Error('UNICODE_SCALAR_INVALID is not cataloged');
  return Object.freeze({
    code: 'UNICODE_SCALAR_INVALID',
    severity: 'ERROR',
    instancePointer,
    actualValueClass: valueClass(valueAtPointer(value, instancePointer)),
    rule: 'schema-registry:unicode-scalar',
    remediation: catalog.remediation,
    documentationUrl: catalog.documentationUrl,
  });
}

/**
 * Validate one complete Gala document against an exact registered schema identity.
 *
 * @param {DocumentValidatorRegistry} registry validators by schema identity
 * @param {DiagnosticMap} diagnosticMap shared diagnostic normalization map
 * @param {string} schemaId exact immutable schema identity
 * @param {unknown} value document value
 * @returns {GalaValidationResult} frozen validation result
 */
function validateDocument(registry, diagnosticMap, schemaId, value) {
  const validator = registry.validatorsById.get(schemaId);
  if (!validator) return unsupportedContract(diagnosticMap, value);
  const invalidScalar = invalidUnicodeScalarPointer(value);
  if (invalidScalar !== undefined) {
    return Object.freeze({
      valid: false,
      diagnostics: Object.freeze([
        unicodeScalarDiagnostic(diagnosticMap, value, invalidScalar),
      ]),
    });
  }
  if (validator(value)) {
    return Object.freeze({ valid: true, diagnostics: Object.freeze([]) });
  }
  const contract = contractFromSchemaId(schemaId);
  const seen = new Set();
  const diagnostics = canonicalErrors(diagnosticMap, validator.errors ?? [])
    .map((error) => normalizeError(diagnosticMap, contract, '#', value, error))
    .filter((diagnostic) => {
      const key = `${diagnostic.code}\u0000${diagnostic.instancePointer}\u0000${diagnostic.rule}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => {
      const leftKey = `${left.instancePointer}\u0000${left.code}\u0000${left.rule}`;
      const rightKey = `${right.instancePointer}\u0000${right.code}\u0000${right.rule}`;
      return leftKey < rightKey ? -1 : leftKey > rightKey ? 1 : 0;
    });
  return Object.freeze({
    valid: false,
    diagnostics: Object.freeze(diagnostics),
  });
}

/**
 * Validate a fixture value against one registered schema fragment.
 *
 * This is the private cross-language parity seam; package consumers validate
 * complete documents through validateGalaDocument.
 *
 * @param {Registry} registry compiled schema registry
 * @param {DiagnosticMap} diagnosticMap shared diagnostic normalization map
 * @param {string} schemaId exact immutable schema identity
 * @param {string} schemaPointer local JSON Pointer
 * @param {unknown} value fixture value
 * @returns {{valid: boolean, codes: string[], keywords: string[]}} normalized result
 */
function validateFragment(
  registry,
  diagnosticMap,
  schemaId,
  schemaPointer,
  value,
) {
  const validator = registry.fragmentAjv.getSchema(
    `${schemaId}${schemaPointer}`,
  );
  if (!validator) {
    throw new Error(
      `Registered schema fragment is absent: ${schemaId}${schemaPointer}`,
    );
  }
  if (invalidUnicodeScalarPointer(value) !== undefined) {
    return {
      valid: false,
      codes: ['UNICODE_SCALAR_INVALID'],
      keywords: ['i-json-scalar'],
    };
  }
  if (validator(value)) return { valid: true, codes: [], keywords: [] };
  const contract = contractFromSchemaId(schemaId);
  const errors = canonicalErrors(diagnosticMap, validator.errors ?? []);
  return {
    valid: false,
    codes: [
      ...new Set(
        errors.map((error) => {
          const rule = ruleIdentity(contract, schemaPointer, error);
          const keyword = normalizedKeyword(error.keyword);
          return (
            diagnosticMap.rules[rule]?.code ??
            diagnosticMap.keywords[keyword] ??
            UNMAPPED_RULE_CODE
          );
        }),
      ),
    ].sort(),
    keywords: [
      ...new Set(errors.map(({ keyword }) => normalizedKeyword(keyword))),
    ].sort(),
  };
}

/**
 * Normalize inline-schema keywords through the one shared diagnostic map.
 *
 * @param {DiagnosticMap} diagnosticMap shared diagnostic normalization map
 * @param {string[]} keywords engine keywords
 * @returns {{valid: boolean, codes: string[], keywords: string[]}} normalized result
 */
function normalizedInlineResult(diagnosticMap, keywords) {
  const codes = [
    ...new Set(
      keywords
        .map((keyword) => diagnosticMap.keywords[keyword])
        .filter((code) => code !== undefined),
    ),
  ].sort();
  return { valid: false, codes, keywords };
}

/**
 * Validate only the cardinality and uniqueness assertions of a large array.
 *
 * Item schemas are validated separately by the parity harness so compact
 * recipes never allocate hundreds of thousands of complex object witnesses.
 * The compiled validator for a given {minItems, maxItems, uniqueItems} shape
 * is cached on the registry (SCH-M7): only a handful of distinct shapes
 * exist across the fixture corpus, but this runs once per cardinality
 * fixture case, so compiling on every call would recompile the same handful
 * of schemas thousands of times over one parity run.
 *
 * @param {Registry} registry compiled schema registry
 * @param {DiagnosticMap} diagnosticMap shared diagnostic normalization map
 * @param {{minItems?: number, maxItems?: number, uniqueItems?: boolean}} schema array schema
 * @param {number} length logical fixture length
 * @returns {{valid: boolean, codes: string[], keywords: string[]}} normalized result
 */
function validateArrayCardinality(registry, diagnosticMap, schema, length) {
  const cardinalitySchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'array',
    ...(schema.minItems === undefined ? {} : { minItems: schema.minItems }),
    ...(schema.maxItems === undefined ? {} : { maxItems: schema.maxItems }),
    ...(schema.uniqueItems === true ? { uniqueItems: true } : {}),
  };
  // Only a handful of distinct {minItems, maxItems, uniqueItems} shapes
  // exist across the whole fixture corpus, but this is called once per
  // cardinality fixture case (thousands, across a full parity run).
  // Compiling once per distinct shape and reusing the compiled validator
  // (rather than ajv.compile()-ing the same shape repeatedly) is what
  // SCH-M7 asks for; the cache lives on the registry so it is scoped to
  // one createValidatorSuite call, not process-global.
  const cacheKey = JSON.stringify(cardinalitySchema);
  let validator = registry.cardinalityValidators.get(cacheKey);
  if (validator === undefined) {
    validator = registry.fragmentAjv.compile(cardinalitySchema);
    registry.cardinalityValidators.set(cacheKey, validator);
  }
  const values = schema.uniqueItems
    ? Array.from({ length }, (_, index) => index)
    : Array.from({ length }, () => null);
  if (validator(values)) return { valid: true, codes: [], keywords: [] };
  const keywords = [
    ...new Set(
      canonicalErrors(diagnosticMap, validator.errors ?? []).map(
        ({ keyword }) => normalizedKeyword(keyword),
      ),
    ),
  ].sort();
  return normalizedInlineResult(diagnosticMap, keywords);
}

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
export function createValidatorSuite({
  schemas,
  diagnosticMap,
  validateFormat,
}) {
  const registry = createRegistry(schemas, validateFormat);
  return Object.freeze({
    schemaIds: Object.freeze([...registry.schemasById.keys()].sort()),
    validateDocument: (schemaId, value) =>
      validateDocument(registry, diagnosticMap, schemaId, value),
    validateFragment: (schemaId, schemaPointer, value) =>
      validateFragment(registry, diagnosticMap, schemaId, schemaPointer, value),
    validateArrayCardinality: (schema, length) =>
      validateArrayCardinality(registry, diagnosticMap, schema, length),
  });
}

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
export function createPrecompiledValidatorSuite({ validators, diagnosticMap }) {
  const registry = { validatorsById: new Map(Object.entries(validators)) };
  return Object.freeze({
    schemaIds: Object.freeze([...registry.validatorsById.keys()].sort()),
    validateDocument: (schemaId, value) =>
      validateDocument(registry, diagnosticMap, schemaId, value),
  });
}
