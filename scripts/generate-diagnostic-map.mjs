import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { runIfMain } from './run-if-main.mjs';

const OUTPUT_PATH = path.resolve('diagnostics/diagnostic-map.json');

/**
 * Contracts that additionally get a narrow, single-contract projection of the
 * shared map, so a browser entry point bound to exactly one contract carries
 * that contract's rules instead of all 7,804 (SCHEMA-2.6.0).
 */
const NARROW_CONTRACTS = Object.freeze(['public-runtime-origins']);

/**
 * Resolve the committed path of one contract's narrow diagnostic map.
 *
 * @param {string} contract contract name
 * @returns {string} absolute output path
 */
function narrowOutputPath(contract) {
  return path.resolve(`diagnostics/diagnostic-map.${contract}.json`);
}
const KEYWORD_FALLBACKS = Object.freeze({
  additionalProperties: 'REQUEST_FIELD_UNKNOWN',
  anyOf: 'SCHEMA_UNION_INVALID',
  const: 'SCHEMA_CONSTANT_INVALID',
  contains: 'SCHEMA_ARRAY_CONTAINS_INVALID',
  dependentRequired: 'SCHEMA_DEPENDENCY_REQUIRED',
  enum: 'SCHEMA_ENUM_INVALID',
  false: 'REQUEST_FIELD_UNKNOWN',
  format: 'SCHEMA_FORMAT_INVALID',
  if: 'SCHEMA_UNION_INVALID',
  items: 'SCHEMA_ARRAY_TOO_LONG',
  maxItems: 'SCHEMA_ARRAY_TOO_LONG',
  maxLength: 'SCHEMA_STRING_TOO_LONG',
  maxProperties: 'SCHEMA_OBJECT_TOO_LARGE',
  maximum: 'SCHEMA_NUMBER_TOO_LARGE',
  minItems: 'SCHEMA_ARRAY_TOO_SHORT',
  minLength: 'SCHEMA_STRING_TOO_SHORT',
  minProperties: 'SCHEMA_OBJECT_TOO_SMALL',
  minimum: 'SCHEMA_NUMBER_TOO_SMALL',
  not: 'SCHEMA_NEGATED_RULE_MATCHED',
  oneOf: 'SCHEMA_UNION_INVALID',
  pattern: 'SCHEMA_PATTERN_INVALID',
  propertyNames: 'EXTENSION_KEY_INVALID',
  required: 'SCHEMA_REQUIRED_FIELD_MISSING',
  type: 'SCHEMA_TYPE_INVALID',
  uniqueItems: 'SCHEMA_ARRAY_DUPLICATE',
  'x-gala-asciiByteLength': 'ASCII_BYTE_LENGTH_INVALID',
  'x-gala-graphemeLength': 'GRAPHEME_LENGTH_INVALID',
  'x-gala-maxCanonicalBytes': 'CANONICAL_BYTE_LENGTH_INVALID',
  'x-gala-maximum': 'INTEGER_RANGE_INVALID',
  'x-gala-utf8ByteLength': 'UTF8_BYTE_LENGTH_INVALID',
});
const CASCADE_KEYWORDS = Object.freeze(['if', 'propertyNames']);

/**
 * Compare strings by Unicode code point without host-locale behavior.
 *
 * @param {string} left left value
 * @param {string} right right value
 * @returns {-1 | 0 | 1} ordering
 */
function compareStrings(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Return one stable remediation sentence.
 *
 * @param {string} code diagnostic code
 * @returns {string} remediation
 */
function remediationFor(code) {
  if (code === 'REQUEST_FIELD_UNKNOWN') {
    return 'Remove the undeclared field or place inert data in a named extension map.';
  }
  if (code === 'SCHEMA_VERSION_UNSUPPORTED') {
    return 'Use an explicitly supported schema identity and semantic version.';
  }
  return `Replace the input with a value that satisfies the documented ${code} rule.`;
}

/**
 * Generate the language-neutral diagnostic map from the committed fixture authority.
 *
 * @param {string} manifestSource fixture manifest JSON
 * @returns {string} canonical presentation JSON
 */
export function createDiagnosticMap(manifestSource) {
  const manifest = JSON.parse(manifestSource);
  const rules = /** @type {Record<string, {code: string}>} */ ({});
  const nonApplicable = /** @type {Record<string, string>} */ ({});
  const validators =
    /** @type {Record<string, {validator: string, code: string}>} */ ({});
  const codes = new Set();

  for (const rule of [...manifest.rules].sort((left, right) =>
    compareStrings(left.ruleId, right.ruleId),
  )) {
    if (rule.invalid.expectedCode !== undefined) {
      rules[rule.ruleId] = { code: rule.invalid.expectedCode };
      codes.add(rule.invalid.expectedCode);
    } else {
      nonApplicable[rule.ruleId] = rule.invalid.notApplicable;
    }
  }
  for (const entry of [...manifest.adversarial].sort((left, right) =>
    compareStrings(left.category, right.category),
  )) {
    validators[entry.category] = {
      validator: entry.validator,
      code: entry.expectedCode,
    };
    codes.add(entry.expectedCode);
  }
  validators['sha256-digest'] = {
    validator: 'sha256',
    code: 'DIGEST_VECTOR_MISMATCH',
  };
  validators['unicode-scalar'] = {
    validator: 'i-json-scalar',
    code: 'UNICODE_SCALAR_INVALID',
  };
  codes.add('DIGEST_VECTOR_MISMATCH');
  codes.add('UNICODE_SCALAR_INVALID');
  codes.add('SCHEMA_VERSION_UNSUPPORTED');
  for (const code of Object.values(KEYWORD_FALLBACKS)) codes.add(code);

  const codeCatalog = Object.fromEntries(
    [...codes].sort(compareStrings).map((code) => [
      code,
      {
        severity: 'ERROR',
        remediation: remediationFor(code),
        documentationUrl: `https://schemas.galascribe.com/diagnostics/${code
          .toLowerCase()
          .replaceAll('_', '-')}`,
      },
    ]),
  );

  return `${JSON.stringify(
    {
      schemaVersion: '1.0.0',
      contractVersion: manifest.contractVersion,
      rules,
      nonApplicable,
      validators,
      keywords: KEYWORD_FALLBACKS,
      cascadeKeywords: CASCADE_KEYWORDS,
      codes: codeCatalog,
    },
    null,
    2,
  )}\n`;
}

/**
 * Project the shared diagnostic map onto exactly one contract.
 *
 * Keyword fallbacks, cascade keywords, cross-contract validators and the code
 * catalog are shared vocabulary and are carried whole; only the per-rule
 * tables, which are contract-prefixed, are narrowed. A narrowed map therefore
 * produces byte-identical diagnostics for its own contract and is simply
 * unable to serve any other, which is exactly what a single-contract entry
 * point needs.
 *
 * @param {string} mapSource shared diagnostic map JSON
 * @param {string} contract contract name
 * @returns {string} canonical presentation JSON
 */
export function createContractDiagnosticMap(mapSource, contract) {
  const map = JSON.parse(mapSource);
  const prefix = `${contract}:`;
  /**
   * Keep only the entries whose rule identity names this contract.
   *
   * @param {Record<string, unknown>} table rule-keyed table
   * @returns {Record<string, unknown>} narrowed table
   */
  const narrow = (table) =>
    Object.fromEntries(
      Object.entries(table).filter(([ruleId]) => ruleId.startsWith(prefix)),
    );
  return `${JSON.stringify(
    {
      schemaVersion: map.schemaVersion,
      contractVersion: map.contractVersion,
      contract,
      rules: narrow(map.rules),
      nonApplicable: narrow(map.nonApplicable),
      validators: map.validators,
      keywords: map.keywords,
      cascadeKeywords: map.cascadeKeywords,
      codes: map.codes,
    },
    null,
    2,
  )}\n`;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some((argument) => argument !== '--check') || args.length > 1) {
    throw new Error(
      'Usage: node scripts/generate-diagnostic-map.mjs [--check]',
    );
  }
  const expected = createDiagnosticMap(
    await readFile(path.resolve('fixtures/manifest.json'), 'utf8'),
  );
  const narrowMaps = NARROW_CONTRACTS.map((contract) => ({
    contract,
    outputPath: narrowOutputPath(contract),
    expected: createContractDiagnosticMap(expected, contract),
  }));
  if (args.includes('--check')) {
    const actual = await readFile(OUTPUT_PATH, 'utf8');
    if (actual !== expected) {
      throw new Error(
        'diagnostics/diagnostic-map.json is stale; run npm run diagnostics:generate',
      );
    }
    for (const narrowMap of narrowMaps) {
      if (
        (await readFile(narrowMap.outputPath, 'utf8')) !== narrowMap.expected
      ) {
        throw new Error(
          `diagnostics/diagnostic-map.${narrowMap.contract}.json is stale; run npm run diagnostics:generate`,
        );
      }
    }
    process.stdout.write('Shared diagnostic map is current.\n');
    return;
  }
  await writeFile(OUTPUT_PATH, expected, 'utf8');
  for (const narrowMap of narrowMaps) {
    await writeFile(narrowMap.outputPath, narrowMap.expected, 'utf8');
  }
  process.stdout.write('Wrote diagnostics/diagnostic-map.json.\n');
}

await runIfMain(import.meta.url, main);
