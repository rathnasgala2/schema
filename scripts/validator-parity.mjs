import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { isDeepStrictEqual } from 'node:util';

import diagnosticMap from '../diagnostics/diagnostic-map.json' with { type: 'json' };
import {
  canonicalizeBcp47,
  validateCanonicalBcp47,
} from '../src/internal/bcp47.js';
import { canonicalizeJcs } from '../src/internal/canonical-jcs.js';
import {
  decodePunycode,
  encodePunycode,
  toAsciiDomain17,
  validateCanonicalAsciiDomain17,
} from '../src/internal/idna.js';
import { unicodeCollisionKey17 } from '../src/internal/unicode17.js';
import { validateGalaFormat } from '../src/internal/format-validators.js';
import {
  matchRepositoryGlob,
  parseRepositoryGlob,
  selectRepositoryPaths,
  validateRfc3339,
} from '../src/internal/portable-scalars.js';
import {
  parseSemverRange,
  satisfiesSemverRange,
} from '../src/internal/semver.js';
import {
  parseSpdxExpression,
  serializeSpdxExpression,
  validateSpdxExpression,
} from '../src/internal/spdx.js';
import {
  checkJoiners17,
  graphemeBoundaries17,
  graphemeLength17,
  normalizeNfc17,
} from '../src/internal/unicode17.js';
import {
  validateArrayCardinality,
  validateRegisteredFragment,
} from '../src/internal/schema-validator.js';
import { materializeFixture } from './generate-fixture-corpus.mjs';
import { runIfMain } from './run-if-main.mjs';

const DIAGNOSTIC_MAP = /** @type {{
  validators: Record<string, {validator: string, code: string}>
}} */ (diagnosticMap);
const ROOT_CACHE = new Map();
const REPOSITORY_ROOT = path.resolve(import.meta.dirname, '..');
const JAVA_PROJECT = path.join(REPOSITORY_ROOT, 'parity/java');
const JAVA_EXECUTABLE = path.join(
  JAVA_PROJECT,
  'build/install/galascribe-schema-validator-parity/bin/galascribe-schema-validator-parity',
);
const EXPECTATIONS_PATH = path.join(
  REPOSITORY_ROOT,
  'diagnostics/parity-expectations.json',
);

/**
 * Resolve a local JSON Pointer.
 *
 * @param {unknown} root root value
 * @param {string} pointer local pointer
 * @returns {unknown} selected value
 */
function resolvePointer(root, pointer) {
  if (pointer === '#') return root;
  let current = root;
  for (const token of pointer
    .slice(2)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'))) {
    if (current === null || typeof current !== 'object') {
      throw new TypeError(`Cannot resolve ${pointer}`);
    }
    current = /** @type {Record<string, unknown>} */ (current)[token];
  }
  if (current === undefined) throw new TypeError(`Cannot resolve ${pointer}`);
  return current;
}

/**
 * Replace one existing value in a materialized root fixture.
 *
 * @param {unknown} root fixture root
 * @param {string} pointer JSON Pointer to replace
 * @param {unknown} value replacement value
 * @returns {void}
 */
function setPointerValue(root, pointer, value) {
  const tokens = pointer
    .slice(1)
    .split('/')
    .map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
  const last = tokens.pop();
  if (last === undefined) throw new TypeError(`Cannot replace ${pointer}`);
  let parent = root;
  for (const token of tokens) {
    if (parent === null || typeof parent !== 'object') {
      throw new TypeError(`Cannot replace ${pointer}`);
    }
    parent = /** @type {Record<string, unknown>} */ (parent)[token];
  }
  if (parent === null || typeof parent !== 'object' || !(last in parent)) {
    throw new TypeError(`Cannot replace ${pointer}`);
  }
  /** @type {Record<string, unknown>} */ (parent)[last] = value;
}

/**
 * Materialize shared fixture recipes plus parity-only deep JSON witnesses.
 *
 * @param {Record<string, unknown>} fixture compact fixture
 * @param {unknown} root schema root
 * @returns {unknown} materialized instance
 */
function materializeParityFixture(fixture, root) {
  const recipe = /** @type {Record<string, unknown> | undefined} */ (
    fixture.recipe
  );
  if (recipe?.kind === 'deep-object') {
    const depth = Number(recipe.depth);
    if (!Number.isSafeInteger(depth) || depth < 0) {
      throw new TypeError('Deep-object depth must be a nonnegative integer');
    }
    let value = null;
    for (let index = 0; index < depth; index += 1) value = { a: value };
    return value;
  }
  if (recipe?.kind === 'long-combining-cluster') {
    const count = Number(recipe.count);
    if (!Number.isSafeInteger(count) || count < 0 || count > 1_000_000) {
      throw new TypeError(
        'Long-combining-cluster count must be an admitted integer',
      );
    }
    return `a${'\u0316'.repeat(count)}`;
  }
  if (recipe?.kind === 'lone-surrogate-property-name') {
    return { ['\ud800']: null };
  }
  return materializeFixture(fixture, root);
}

/**
 * @typedef {{
 *   caseId: string,
 *   contract: string,
 *   schemaId: string,
 *   schemaPointer: string,
 *   fixture: Record<string, unknown>,
 *   coveredRuleIds: string[],
 *   expectedValid: boolean,
 *   expectedCodes: string[]
 * }} StructuralParityCase
 */

/**
 * Parse one committed JSON file.
 *
 * @param {string} file repository-relative path
 * @returns {Promise<any>} parsed JSON
 */
async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

/**
 * Load the reviewed, committed exact result for every parity case.
 *
 * @returns {Promise<{
 *   structural: Record<string, {valid: boolean, codes: string[]}>,
 *   adversarial: Record<string, {valid: boolean, codes: string[]}>,
 *   digest: Record<string, {valid: boolean, codes: string[]}>,
 *   canonicalBytes: Record<string, {valid: boolean, codes: string[], canonical?: string}>,
 *   scalars: Record<string, {valid: boolean, codes: string[], output?: unknown}>
 * }>} exact expectations
 */
export async function loadParityExpectations() {
  return readJson(EXPECTATIONS_PATH);
}

/**
 * Compare a normalized validator result with one exact committed result.
 *
 * @param {{valid: boolean, codes: string[], output?: unknown}} actual observed result
 * @param {{valid: boolean, codes: string[], output?: unknown}} expected committed result
 * @returns {boolean} exact equality
 */
function equalResult(actual, expected) {
  return isDeepStrictEqual(actual, expected);
}

/**
 * Require an expectation table to have exactly the complete case inventory.
 *
 * @param {string} kind expectation group
 * @param {Record<string, unknown>} expectations committed table
 * @param {string[]} caseIds generated case identities
 * @returns {void}
 */
function assertCompleteExpectations(kind, expectations, caseIds) {
  const actual = Object.keys(expectations).sort();
  const expected = [...caseIds].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${kind} parity expectations do not exactly match the generated case inventory`,
    );
  }
}

/**
 * Load all structural fixtures exactly once and retain their compact recipes.
 *
 * @returns {Promise<{
 *   contracts: string[],
 *   cases: StructuralParityCase[],
 *   adversarial: Record<string, any>[],
 *   omittedCaseCount: number
 * }>} complete parity corpus
 */
export async function createStructuralParityCases() {
  const manifest = await readJson('fixtures/manifest.json');
  const adversarialSentinels = await readJson(
    'parity/adversarial-sentinel-vectors.json',
  );
  const fixtureFiles = new Map();
  const cases = new Map();
  const schemaEntries = new Map(
    manifest.schemas.map((/** @type {any} */ entry) => [entry.contract, entry]),
  );

  /**
   * Resolve one fixture by stable case identity.
   *
   * @param {string} file fixture file
   * @param {string} caseId case identity
   * @returns {Promise<Record<string, unknown>>} fixture case
   */
  async function fixtureById(file, caseId) {
    if (!fixtureFiles.has(file)) fixtureFiles.set(file, await readJson(file));
    const fixtures = fixtureFiles.get(file);
    const fixture = fixtures.find(
      (/** @type {any} */ candidate) => candidate.caseId === caseId,
    );
    if (!fixture) throw new Error(`${caseId} is absent from ${file}`);
    return fixture;
  }

  for (const rule of manifest.rules) {
    const schemaEntry = schemaEntries.get(rule.contract);
    if (!schemaEntry)
      throw new Error(`Unknown fixture contract ${rule.contract}`);
    for (const fixtureClass of [
      'valid',
      'boundary',
      'invalid',
      'unknownField',
    ]) {
      const coverage = rule[fixtureClass];
      if (coverage.notApplicable !== undefined) continue;
      const fixture = await fixtureById(coverage.file, coverage.caseId);
      const key = `${rule.contract}:${coverage.caseId}:${fixtureClass}`;
      let parityCase = cases.get(key);
      if (!parityCase) {
        const expectedValid =
          fixtureClass === 'valid' || fixtureClass === 'boundary';
        parityCase = {
          caseId: key,
          contract: rule.contract,
          schemaId: schemaEntry.schemaId,
          schemaPointer: String(
            fixture.validationPointer ?? fixture.schemaPointer,
          ),
          fixture,
          coveredRuleIds: [],
          expectedValid,
          expectedCodes: expectedValid
            ? []
            : [
                ...new Set(
                  /** @type {string[]} */ (
                    fixture.expectedCodes ?? [coverage.expectedCode]
                  ),
                ),
              ]
                .filter((code) => code !== undefined)
                .sort(),
        };
        cases.set(key, parityCase);
      }
      if (!parityCase.coveredRuleIds.includes(rule.ruleId)) {
        parityCase.coveredRuleIds.push(rule.ruleId);
        parityCase.coveredRuleIds.sort();
      }
    }
  }

  for (const schemaEntry of manifest.schemas) {
    const rootFixtures = [
      ['valid-root', schemaEntry.validExample, true, []],
      ['boundary-root', schemaEntry.boundaryFixture, true, []],
      [
        'unknown-field-root',
        schemaEntry.unknownFieldFixture,
        false,
        ['REQUEST_FIELD_UNKNOWN'],
      ],
    ];
    for (const [kind, file, expectedValid, expectedCodes] of rootFixtures) {
      const key = `${schemaEntry.contract}:${kind}`;
      cases.set(key, {
        caseId: key,
        contract: schemaEntry.contract,
        schemaId: schemaEntry.schemaId,
        schemaPointer: '#',
        fixture: { instance: await readJson(file) },
        coveredRuleIds: [`${schemaEntry.contract}:#:additionalProperties`],
        expectedValid,
        expectedCodes,
      });
    }
  }

  const sentinelSource = await readJson(
    'parity/structural-sentinel-vectors.json',
  );
  for (const sentinel of sentinelSource.cases) {
    const schemaEntry = schemaEntries.get(sentinel.contract);
    if (!schemaEntry) {
      throw new Error('Unknown sentinel contract ' + sentinel.contract);
    }
    const caseId = 'sentinel:' + sentinel.vectorId;
    let fixture;
    if (sentinel.recipe?.kind === 'root-lone-surrogate') {
      const instance = await readJson(String(sentinel.recipe.file));
      setPointerValue(
        instance,
        String(sentinel.recipe.instancePointer),
        '\ud800',
      );
      fixture = { instance };
    } else {
      fixture =
        sentinel.recipe === undefined
          ? { instance: sentinel.instance }
          : { recipe: sentinel.recipe };
    }
    cases.set(caseId, {
      caseId,
      contract: sentinel.contract,
      schemaId: schemaEntry.schemaId,
      schemaPointer: sentinel.schemaPointer,
      fixture,
      coveredRuleIds: [],
      expectedValid: sentinel.expectedValid,
      expectedCodes: sentinel.expectedCodes,
    });
  }

  return {
    contracts: [...schemaEntries.keys()].sort(),
    cases: [...cases.values()].sort((left, right) =>
      left.caseId < right.caseId ? -1 : left.caseId > right.caseId ? 1 : 0,
    ),
    adversarial: [
      ...(await Promise.all(
        manifest.adversarial.map((/** @type {{file: string}} */ { file }) =>
          readJson(file),
        ),
      )),
      ...adversarialSentinels.cases,
    ],
    omittedCaseCount: 0,
  };
}

/**
 * Run one structural parity case through the authoritative Ajv registry.
 *
 * @param {StructuralParityCase} parityCase fixture case
 * @returns {{valid: boolean, codes: string[], keywords: string[]}} normalized result
 */
export function validateStructuralCaseWithAjv(parityCase) {
  if (!ROOT_CACHE.has(parityCase.contract)) {
    ROOT_CACHE.set(
      parityCase.contract,
      JSON.parse(
        readFileSync(
          path.resolve(`schemas/${parityCase.contract}.schema.json`),
          'utf8',
        ),
      ),
    );
  }
  const root = ROOT_CACHE.get(parityCase.contract);
  const recipe = /** @type {Record<string, unknown> | undefined} */ (
    parityCase.fixture.recipe
  );
  if (
    Number(recipe?.length ?? 0) > 1_000 &&
    (recipe?.kind === 'schema-array-boundary' ||
      recipe?.kind === 'schema-array-count')
  ) {
    const schemaPointer = String(recipe.schemaPointer);
    const schema = /** @type {Record<string, unknown>} */ (
      resolvePointer(root, schemaPointer)
    );
    const cardinality = validateArrayCardinality(
      /** @type {{minItems?: number, maxItems?: number, uniqueItems?: boolean}} */ (
        schema
      ),
      Number(recipe.length),
    );
    if (!cardinality.valid) return cardinality;

    const prefixItems = Array.isArray(schema.prefixItems)
      ? schema.prefixItems
      : [];
    const sampleLength = Math.min(
      Number(recipe.length),
      Math.max(prefixItems.length, Math.min(3, Number(recipe.length))),
    );
    const values = /** @type {unknown[]} */ (
      materializeFixture(
        {
          recipe: {
            kind: 'schema-array-count',
            schemaPointer,
            length: sampleLength,
          },
        },
        root,
      )
    );
    for (let index = 0; index < values.length; index += 1) {
      const childPointer =
        index < prefixItems.length
          ? `${schemaPointer}/prefixItems/${index}`
          : `${schemaPointer}/items`;
      const childResult = validateRegisteredFragment(
        parityCase.schemaId,
        childPointer,
        values[index],
      );
      if (!childResult.valid) return childResult;
    }
    return cardinality;
  }
  const instance = materializeParityFixture(parityCase.fixture, root);
  return validateRegisteredFragment(
    parityCase.schemaId,
    parityCase.schemaPointer,
    instance,
  );
}

/**
 * Materialize the exact streaming payload consumed by the Networknt harness.
 *
 * Large array recipes retain exact cardinality and uniqueness evaluation while
 * bounding complex item witnesses to the same deterministic prefix Ajv uses.
 *
 * @param {StructuralParityCase} parityCase fixture case
 * @returns {{caseId: string, kind: 'structural', checks: Record<string, unknown>[]}} request
 */
export function createNetworkntStructuralRequest(parityCase) {
  if (!ROOT_CACHE.has(parityCase.contract)) {
    ROOT_CACHE.set(
      parityCase.contract,
      JSON.parse(
        readFileSync(
          path.resolve(`schemas/${parityCase.contract}.schema.json`),
          'utf8',
        ),
      ),
    );
  }
  const root = ROOT_CACHE.get(parityCase.contract);
  const recipe = /** @type {Record<string, unknown> | undefined} */ (
    parityCase.fixture.recipe
  );
  if (
    Number(recipe?.length ?? 0) > 1_000 &&
    (recipe?.kind === 'schema-array-boundary' ||
      recipe?.kind === 'schema-array-count')
  ) {
    const schemaPointer = String(recipe.schemaPointer);
    const schema = /** @type {Record<string, unknown>} */ (
      resolvePointer(root, schemaPointer)
    );
    const length = Number(recipe.length);
    const cardinalitySchema = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'array',
      ...(schema.minItems === undefined ? {} : { minItems: schema.minItems }),
      ...(schema.maxItems === undefined ? {} : { maxItems: schema.maxItems }),
      ...(schema.uniqueItems === true ? { uniqueItems: true } : {}),
    };
    const cardinalityValues = schema.uniqueItems
      ? Array.from({ length }, (_, index) => index)
      : Array.from({ length }, () => null);
    /** @type {Record<string, unknown>[]} */
    const checks = [
      {
        inlineSchema: cardinalitySchema,
        instance: cardinalityValues,
      },
    ];
    const prefixItems = Array.isArray(schema.prefixItems)
      ? schema.prefixItems
      : [];
    const sampleLength = Math.min(
      length,
      Math.max(prefixItems.length, Math.min(3, length)),
    );
    const values = /** @type {unknown[]} */ (
      materializeFixture(
        {
          recipe: {
            kind: 'schema-array-count',
            schemaPointer,
            length: sampleLength,
          },
        },
        root,
      )
    );
    for (let index = 0; index < values.length; index += 1) {
      checks.push({
        schemaId: parityCase.schemaId,
        schemaPointer:
          index < prefixItems.length
            ? `${schemaPointer}/prefixItems/${index}`
            : `${schemaPointer}/items`,
        instance: values[index],
      });
    }
    return { caseId: parityCase.caseId, kind: 'structural', checks };
  }
  return {
    caseId: parityCase.caseId,
    kind: 'structural',
    checks: [
      {
        schemaId: parityCase.schemaId,
        schemaPointer: parityCase.schemaPointer,
        instance: materializeParityFixture(parityCase.fixture, root),
      },
    ],
  };
}

/**
 * Detect a directed reference cycle.
 *
 * @param {Record<string, any>[]} documents reference records
 * @returns {boolean} whether a cycle exists
 */
function hasReferenceCycle(documents) {
  const graph = new Map(
    documents.map(({ path: documentPath, references }) => [
      documentPath,
      references,
    ]),
  );
  const visiting = new Set();
  const visited = new Set();
  /**
   * Visit one graph node.
   *
   * @param {string} node node identity
   * @returns {boolean} whether a cycle was found
   */
  function visit(node) {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of graph.get(node) ?? []) {
      if (visit(next)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }
  return [...graph.keys()].sort().some(visit);
}

/**
 * Determine whether one adversarial fixture triggers its named validator.
 *
 * @param {Record<string, any>} fixture adversarial fixture
 * @returns {boolean} whether the fixture is rejected
 */
function adversarialFixtureRejects(fixture) {
  const { category, instance, recipe } = fixture;
  if (category === 'active-content') {
    const source = String(instance.content).replace(/[A-Z]/gu, (character) =>
      String.fromCharCode(character.charCodeAt(0) + 0x20),
    );
    // eslint-disable-next-line no-control-regex -- the admitted separators are explicit cross-runtime code points
    return /<(?:script|svg)(?=$|[^A-Za-z0-9_])|(?:^|[^A-Za-z0-9_])on[a-z]+[\u0009-\u000d\u0020\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]*=|javascript:/u.test(
      source,
    );
  }
  if (category === 'cyclic-references') {
    return hasReferenceCycle(instance.documents);
  }
  if (category === 'duplicate-keys') {
    const keys = String(instance)
      .split(/\r\n|[\n\r\u2028\u2029]/u)
      .flatMap((line) => {
        const match = /^([A-Za-z0-9_-]+):/u.exec(line);
        return match?.[1] === undefined ? [] : [match[1]];
      });
    return new Set(keys).size !== keys.length;
  }
  if (category === 'oversized-fields') return Number(recipe.count) > 2_000_000;
  if (category === 'oversized-files') return Number(recipe.count) > 10_485_760;
  if (category === 'path-traversal') {
    return !validateGalaFormat('gala-repository-relative-path', instance);
  }
  if (category === 'reserved-extension-keys') {
    return Object.keys(instance).some((key) => key.startsWith('gala.'));
  }
  if (category === 'symlink-escape') {
    const root = path.resolve(instance.root);
    const realpath = path.resolve(instance.realpath);
    return realpath !== root && !realpath.startsWith(`${root}${path.sep}`);
  }
  if (category === 'unicode-case-fold-collision') {
    const keys = instance.map((/** @type {string} */ value) =>
      unicodeCollisionKey17(value),
    );
    return new Set(keys).size !== keys.length;
  }
  if (category === 'unknown-module') return instance.module !== undefined;
  if (category === 'unknown-schema-major') {
    return (
      instance.schemaVersion !== '2.0.0' ||
      !String(instance.schemaId).endsWith(':2.0.0')
    );
  }
  if (category === 'unsafe-urls') {
    return !validateGalaFormat('gala-verification-url', instance);
  }
  if (category === 'yaml-aliases') {
    // eslint-disable-next-line no-control-regex -- YAML separation is exactly tab, LF, CR, and space
    return /(?:^|[\u0009\u000a\u000d\u0020])[&*][A-Za-z0-9_-]+/u.test(instance);
  }
  if (category === 'yaml-exponential-expansion') {
    return [...String(instance).matchAll(/\*[A-Za-z0-9_-]+/gu)].length > 16;
  }
  throw new Error(`Unknown adversarial category ${category}`);
}

/**
 * Validate one adversarial semantic fixture.
 *
 * @param {Record<string, any>} fixture adversarial fixture
 * @returns {{valid: boolean, codes: string[]}} normalized result
 */
export function validateAdversarialFixture(fixture) {
  if (!adversarialFixtureRejects(fixture)) return { valid: true, codes: [] };
  const mapping = DIAGNOSTIC_MAP.validators[fixture.category];
  if (!mapping)
    throw new Error(`Unmapped adversarial category ${fixture.category}`);
  return { valid: false, codes: [mapping.code] };
}

/**
 * Build an adversarial request without fixture expectations.
 *
 * @param {Record<string, any>} fixture adversarial fixture
 * @returns {Record<string, unknown>} expectation-free request
 */
export function createAdversarialRequest(fixture) {
  return {
    caseId: adversarialCaseId(fixture),
    kind: 'adversarial',
    fixture: {
      category: fixture.category,
      instance: fixture.instance,
      ...(fixture.recipe === undefined ? {} : { recipe: fixture.recipe }),
    },
  };
}

/**
 * Return the stable identity for a primary adversarial fixture or sentinel.
 *
 * @param {Record<string, any>} fixture adversarial fixture
 * @returns {string} stable parity case identity
 */
export function adversarialCaseId(fixture) {
  return `adversarial:${fixture.vectorId ?? fixture.category}`;
}

/**
 * Expand one committed digest vector into its accepted and tampered cases.
 *
 * @param {string} caseStem stable case identity stem
 * @param {string} profile profile name
 * @param {string} preimageHex exact preimage bytes as hex
 * @param {string} digestHex expected SHA-256 hex
 * @returns {Record<string, any>[]} accepted and tampered cases
 */
function digestCasePair(caseStem, profile, preimageHex, digestHex) {
  const digest = `sha256:${digestHex}`;
  const tampered = `${digest.slice(0, -1)}${digest.endsWith('0') ? '1' : '0'}`;
  return [
    {
      caseId: `${caseStem}:valid`,
      profile,
      preimageHex,
      presentedDigest: digest,
      expectedValid: true,
      expectedCodes: [],
    },
    {
      caseId: `${caseStem}:tampered`,
      profile,
      preimageHex,
      presentedDigest: tampered,
      expectedValid: false,
      expectedCodes: ['DIGEST_VECTOR_MISMATCH'],
    },
  ];
}

/**
 * Extract the independently committed active digest vectors as parity cases:
 * the 80 per-domain vectors in `test/t03-digest-profiles.test.js` plus the
 * SCHEMA-2.9.0 DEC-097 record vectors in `parity/digest-record-vectors.json`
 * (`digest:record:<vectorId>`), which the API's Java implementation of the
 * four destination/policy domains reproduces from the shipped file.
 *
 * @returns {Promise<Record<string, any>[]>} accepted and tampered cases
 */
export async function createDigestParityCases() {
  const source = await readFile('test/t03-digest-profiles.test.js', 'utf8');
  const start = source.indexOf('const GOLDEN_VECTORS = [');
  const end = source.indexOf('\n];', start);
  if (start < 0 || end < 0) throw new Error('Digest golden vectors are absent');
  const block = source.slice(start, end);
  const matches = [
    ...block.matchAll(
      /\{\s*name: '([^']+)',\s*preimageHex:\s*'([0-9a-f]+)',\s*digestHex:\s*'([0-9a-f]{64})',\s*\}/gu,
    ),
  ];
  if (matches.length !== 80) {
    throw new Error(
      `Expected 80 active digest vectors, found ${matches.length}`,
    );
  }
  const records = await readJson('parity/digest-record-vectors.json');
  if (!Array.isArray(records.vectors) || records.vectors.length !== 16) {
    throw new Error('Expected 16 DEC-097 record digest vectors');
  }
  return [
    ...matches.flatMap(([, profile = '', preimageHex = '', digestHex = '']) =>
      digestCasePair(`digest:${profile}`, profile, preimageHex, digestHex),
    ),
    .../** @type {Record<string, string>[]} */ (records.vectors).flatMap(
      ({ vectorId = '', profile = '', preimageHex = '', digestHex = '' }) =>
        digestCasePair(
          `digest:record:${vectorId}`,
          profile,
          preimageHex,
          digestHex,
        ),
    ),
  ];
}

/**
 * Validate one digest parity case.
 *
 * @param {Record<string, any>} fixture digest fixture
 * @returns {{valid: boolean, codes: string[]}} normalized result
 */
export function validateDigestParityCase(fixture) {
  const actual = `sha256:${createHash('sha256')
    .update(Buffer.from(fixture.preimageHex, 'hex'))
    .digest('hex')}`;
  const code = DIAGNOSTIC_MAP.validators['sha256-digest']?.code;
  if (code === undefined) throw new Error('Digest diagnostic is unmapped');
  return actual === fixture.presentedDigest
    ? { valid: true, codes: [] }
    : { valid: false, codes: [code] };
}

/**
 * Build a digest request without expected validity or diagnostic codes.
 *
 * @param {Record<string, any>} fixture digest fixture
 * @returns {Record<string, unknown>} expectation-free request
 */
export function createDigestRequest(fixture) {
  return {
    caseId: fixture.caseId,
    kind: 'digest',
    profile: fixture.profile,
    preimageHex: fixture.preimageHex,
    presentedDigest: fixture.presentedDigest,
  };
}

/**
 * Load the shared raw-number vectors used by both parity implementations.
 *
 * @returns {Promise<Record<string, any>[]>} canonical-byte vectors
 */
export async function createCanonicalByteParityCases() {
  const source = await readJson('parity/jcs-number-vectors.json');
  return source.cases.map((/** @type {Record<string, any>} */ fixture) => ({
    ...fixture,
    caseId: `canonical-bytes:${fixture.vectorId}`,
  }));
}

/**
 * Evaluate one raw JSON spelling through Node's RFC 8785 implementation.
 *
 * @param {Record<string, any>} fixture canonical-byte vector
 * @returns {{valid: boolean, codes: string[], canonical?: string}} normalized result
 */
export function validateCanonicalByteParityCase(fixture) {
  try {
    const canonical = canonicalizeJcs(JSON.parse(fixture.rawJson));
    const valid = Buffer.byteLength(canonical, 'utf8') <= fixture.maximum;
    return {
      valid,
      codes: valid ? [] : ['CANONICAL_BYTE_LENGTH_INVALID'],
      canonical,
    };
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message === 'UNICODE_SCALAR_INVALID'
    ) {
      return { valid: false, codes: ['UNICODE_SCALAR_INVALID'] };
    }
    throw error;
  }
}

/**
 * Build a canonical-byte request without its expected result or output.
 *
 * @param {Record<string, any>} fixture canonical-byte vector
 * @returns {Record<string, unknown>} expectation-free request
 */
export function createCanonicalByteRequest(fixture) {
  return {
    caseId: fixture.caseId,
    kind: 'canonicalBytes',
    rawJson: fixture.rawJson,
    maximum: fixture.maximum,
  };
}

/**
 * Expand the shared DEC-099 scalar manifest and the complete pinned Unicode 17
 * grapheme conformance source into stable parity cases.
 *
 * @returns {Promise<Record<string, any>[]>} complete scalar vector inventory
 */
export async function createScalarParityCases() {
  const manifest = await readJson('parity/scalar-vectors.json');
  const cases = manifest.groups.flatMap(
    (
      /** @type {{operation: string, inputs: Record<string, unknown>[]}} */ group,
    ) =>
      group.inputs.map((input, index) => ({
        caseId: `scalar:${group.operation}:${String(index + 1).padStart(4, '0')}`,
        operation: group.operation,
        ...input,
      })),
  );
  const languageRegistry = /** @type {{records: Array<{
    type: string,
    tag?: string,
    subtag?: string,
    preferredValue?: string,
    prefixes?: string[]
  }>}} */ (await readJson('src/internal/generated/iana-language.json'));
  const wholeTags = languageRegistry.records.filter(
    (record) => record.type === 'grandfathered' || record.type === 'redundant',
  );
  wholeTags.forEach((record, index) => {
    for (const operation of ['bcp47-canonicalize', 'bcp47-validate']) {
      cases.push({
        caseId: `scalar:${operation}-pinned-whole:${String(index + 1).padStart(4, '0')}`,
        operation,
        value: record.tag,
      });
    }
  });
  const preferredSubtags = languageRegistry.records.filter(
    (record) =>
      record.subtag !== undefined && record.preferredValue !== undefined,
  );
  preferredSubtags.forEach((record, index) => {
    let value;
    if (record.type === 'language') {
      value = record.subtag;
    } else if (record.type === 'extlang') {
      if (record.prefixes?.length !== 1) {
        throw new TypeError(
          `Expected one prefix for extlang Preferred-Value: ${record.subtag}`,
        );
      }
      value = `${record.prefixes[0]}-${record.subtag}`;
    } else if (record.type === 'region' || record.type === 'variant') {
      value = `en-${record.subtag}`;
    } else {
      throw new TypeError(`Unsupported Preferred-Value type: ${record.type}`);
    }
    for (const operation of ['bcp47-canonicalize', 'bcp47-validate']) {
      cases.push({
        caseId: `scalar:${operation}-pinned-preferred:${String(index + 1).padStart(4, '0')}`,
        operation,
        value,
      });
    }
  });
  const source = await readFile(
    'codegen/source-data/unicode/17.0.0/ucd/auxiliary/GraphemeBreakTest.txt',
    'utf8',
  );
  let row = 0;
  for (const line of source.split('\n')) {
    const body = line.split('#', 1)[0]?.trim();
    if (!body) continue;
    const codePoints = [];
    for (const token of body.split(/\s+/u)) {
      if (token !== '÷' && token !== '×') {
        codePoints.push(Number.parseInt(token, 16));
      }
    }
    row += 1;
    cases.push({
      caseId: `scalar:grapheme-conformance:${String(row).padStart(4, '0')}`,
      operation: 'grapheme',
      value: String.fromCodePoint(...codePoints),
    });
  }
  if (row !== 766) {
    throw new Error(`Expected 766 GraphemeBreakTest rows, found ${row}`);
  }
  if (wholeTags.length !== 93 || preferredSubtags.length !== 377) {
    throw new Error(
      `Expected 93 whole tags and 377 Preferred-Value subtags, found ${wholeTags.length} and ${preferredSubtags.length}`,
    );
  }
  return cases;
}

/**
 * Evaluate one scalar vector using only the first-party JavaScript profiles.
 *
 * @param {Record<string, any>} fixture scalar vector
 * @returns {{valid: boolean, codes: string[], output?: unknown}} normalized result
 */
export function validateScalarParityCase(fixture) {
  try {
    let output;
    if (fixture.operation === 'bcp47-canonicalize') {
      output = canonicalizeBcp47(fixture.value);
    } else if (fixture.operation === 'bcp47-validate') {
      output = validateCanonicalBcp47(fixture.value);
    } else if (fixture.operation === 'grapheme') {
      output = {
        boundaries: graphemeBoundaries17(fixture.value),
        count: graphemeLength17(fixture.value),
      };
    } else if (fixture.operation === 'grapheme-stress') {
      const value = String.fromCodePoint(fixture.codePoint).repeat(
        fixture.count,
      );
      output = graphemeLength17(value);
    } else if (fixture.operation === 'joiners') {
      checkJoiners17(fixture.value);
      output = true;
    } else if (fixture.operation === 'nfc') {
      output = normalizeNfc17(fixture.value);
    } else if (fixture.operation === 'nfc-stress') {
      const normalized = normalizeNfc17(
        `x${'\u0315\u0316'.repeat(fixture.count)}`,
      );
      output =
        normalized ===
        `x${'\u0316'.repeat(fixture.count)}${'\u0315'.repeat(fixture.count)}`;
    } else if (fixture.operation === 'unicode-collision-key') {
      output = unicodeCollisionKey17(fixture.value);
    } else if (fixture.operation === 'idna-to-ascii') {
      output = toAsciiDomain17(fixture.value);
    } else if (fixture.operation === 'idna-validate') {
      validateCanonicalAsciiDomain17(fixture.value);
      output = true;
    } else if (fixture.operation === 'idna-to-ascii-stress') {
      output = toAsciiDomain17('a'.repeat(fixture.count));
    } else if (fixture.operation === 'punycode-decode-stress') {
      output = decodePunycode(`a-${'a'.repeat(fixture.count)}`).length;
    } else if (fixture.operation === 'punycode-encode-stress') {
      output = encodePunycode('é'.repeat(fixture.count)).length;
    } else if (fixture.operation === 'canonical-route') {
      output = validateGalaFormat('gala-canonical-route', fixture.value);
    } else if (fixture.operation === 'rfc3339') {
      validateRfc3339(fixture.value);
      output = true;
    } else if (fixture.operation === 'semver-range') {
      parseSemverRange(fixture.value);
      output = true;
    } else if (fixture.operation === 'semver-satisfies') {
      output = satisfiesSemverRange(fixture.candidate, fixture.range);
    } else if (fixture.operation === 'spdx-canonicalize') {
      output = serializeSpdxExpression(parseSpdxExpression(fixture.value));
    } else if (fixture.operation === 'spdx-validate') {
      validateSpdxExpression(fixture.value);
      output = true;
    } else if (fixture.operation === 'glob-validate') {
      parseRepositoryGlob(fixture.pattern);
      output = true;
    } else if (fixture.operation === 'glob-match') {
      output = matchRepositoryGlob(fixture.pattern, fixture.candidate);
    } else if (fixture.operation === 'glob-select') {
      output = selectRepositoryPaths(
        fixture.includes,
        fixture.excludes,
        fixture.candidates,
      );
    } else if (fixture.operation === 'timestamp-order') {
      for (const value of fixture.values) validateRfc3339(value);
      output = [...fixture.values].sort();
    } else {
      throw new Error(`Unknown scalar operation ${fixture.operation}`);
    }
    return { valid: true, codes: [], output };
  } catch (error) {
    const code =
      error !== null && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : error instanceof Error
          ? error.message
          : String(error);
    if (!/^[A-Z][A-Z0-9_]+$/u.test(code)) throw error;
    return { valid: false, codes: [code] };
  }
}

/**
 * Strip every committed expectation from a scalar request.
 *
 * @param {Record<string, any>} fixture scalar vector
 * @returns {Record<string, unknown>} expectation-free request
 */
export function createScalarRequest(fixture) {
  const { caseId, operation, ...input } = fixture;
  return { caseId, kind: 'scalar', operation, ...input };
}

/**
 * Compile the Java 21 Networknt harness into its reproducible application image.
 *
 * @returns {void}
 */
function buildNetworkntHarness() {
  const wrapper = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
  const result = spawnSync(wrapper, ['--no-daemon', '--quiet', 'installDist'], {
    cwd: JAVA_PROJECT,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `Networknt harness build failed:\n${result.stdout}${result.stderr}`,
    );
  }
}

/**
 * Run the entire accepted corpus through the independently compiled Networknt
 * validator and compare it with Ajv and the committed expected outcome.
 *
 * @param {{buildHarness?: boolean, structuralOffset?: number, structuralLimit?: number}} [options] optional diagnostic window
 * @returns {Promise<{structuralCases: number, adversarialCases: number, digestCases: number, canonicalByteCases: number, scalarCases: number}>} counts
 */
export async function runCrossLanguageParity(options = {}) {
  if (options.buildHarness !== false) buildNetworkntHarness();
  const corpus = await createStructuralParityCases();
  const digestCases = await createDigestParityCases();
  const canonicalByteCases = await createCanonicalByteParityCases();
  const scalarCases = await createScalarParityCases();
  const committed = await loadParityExpectations();
  assertCompleteExpectations(
    'structural',
    committed.structural,
    corpus.cases.map(({ caseId }) => caseId),
  );
  assertCompleteExpectations(
    'scalar',
    committed.scalars,
    scalarCases.map(({ caseId }) => caseId),
  );
  assertCompleteExpectations(
    'canonical-byte',
    committed.canonicalBytes,
    canonicalByteCases.map(({ caseId }) => caseId),
  );
  assertCompleteExpectations(
    'adversarial',
    committed.adversarial,
    corpus.adversarial.map(adversarialCaseId),
  );
  assertCompleteExpectations(
    'digest',
    committed.digest,
    digestCases.map(({ caseId }) => caseId),
  );
  const structuralOffset = options.structuralOffset ?? 0;
  const structuralCases =
    options.structuralLimit === undefined
      ? corpus.cases.slice(structuralOffset)
      : corpus.cases.slice(
          structuralOffset,
          structuralOffset + options.structuralLimit,
        );
  const child = spawn(JAVA_EXECUTABLE, [REPOSITORY_ROOT], {
    cwd: REPOSITORY_ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const expected = new Map();
  const failures = [];
  let standardError = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk) => {
    standardError += chunk;
  });

  const lines = readline.createInterface({ input: child.stdout });
  const reader = (async () => {
    for await (const line of lines) {
      const actual = JSON.parse(line);
      const { caseId, ...observed } = actual;
      const wanted = expected.get(caseId);
      if (!wanted) {
        failures.push({ caseId, reason: 'unexpected-result' });
        continue;
      }
      expected.delete(caseId);
      if (!equalResult(observed, wanted)) {
        failures.push({ caseId, expected: wanted, actual: observed });
      }
    }
  })();

  /** @param {Record<string, unknown>} request parity request */
  async function send(request) {
    if (!child.stdin.write(`${JSON.stringify(request)}\n`)) {
      await once(child.stdin, 'drain');
    }
  }

  for (const fixture of structuralCases) {
    let ajv;
    try {
      ajv = validateStructuralCaseWithAjv(fixture);
    } catch (error) {
      throw new Error(`Ajv failed for structural case ${fixture.caseId}`, {
        cause: error,
      });
    }
    const wanted = committed.structural[fixture.caseId];
    if (wanted === undefined) {
      throw new Error(`Missing structural expectation ${fixture.caseId}`);
    }
    expected.set(fixture.caseId, wanted);
    if (
      wanted.valid !== fixture.expectedValid ||
      fixture.expectedCodes.some((code) => !wanted.codes.includes(code))
    ) {
      failures.push({
        caseId: fixture.caseId,
        reason: 'fixture-target-versus-committed',
        fixtureExpected: {
          valid: fixture.expectedValid,
          requiredCodes: fixture.expectedCodes,
        },
        committed: wanted,
      });
    }
    if (!equalResult(ajv, wanted)) {
      failures.push({
        caseId: fixture.caseId,
        reason: 'javascript-versus-committed',
        committed: wanted,
        actual: ajv,
      });
    }
    await send(createNetworkntStructuralRequest(fixture));
  }
  for (const fixture of corpus.adversarial) {
    const caseId = adversarialCaseId(fixture);
    const ajv = validateAdversarialFixture(fixture);
    const wanted = committed.adversarial[caseId];
    if (wanted === undefined) {
      throw new Error(`Missing adversarial expectation ${caseId}`);
    }
    expected.set(caseId, wanted);
    const fixtureExpected = fixture.expectedValid
      ? { valid: true, codes: [] }
      : { valid: false, codes: [fixture.expectedCode] };
    if (!equalResult(wanted, fixtureExpected)) {
      failures.push({
        caseId,
        reason: 'fixture-target-versus-committed',
        fixtureExpected,
        committed: wanted,
      });
    }
    if (!equalResult(ajv, wanted)) {
      failures.push({
        caseId,
        reason: 'javascript-versus-committed',
        committed: wanted,
        actual: ajv,
      });
    }
    await send(createAdversarialRequest(fixture));
  }
  for (const fixture of digestCases) {
    const ajv = validateDigestParityCase(fixture);
    const wanted = committed.digest[fixture.caseId];
    if (wanted === undefined) {
      throw new Error(`Missing digest expectation ${fixture.caseId}`);
    }
    expected.set(fixture.caseId, wanted);
    if (
      wanted.valid !== fixture.expectedValid ||
      JSON.stringify(wanted.codes) !== JSON.stringify(fixture.expectedCodes)
    ) {
      failures.push({
        caseId: fixture.caseId,
        reason: 'fixture-target-versus-committed',
        fixtureExpected: {
          valid: fixture.expectedValid,
          codes: fixture.expectedCodes,
        },
        committed: wanted,
      });
    }
    if (!equalResult(ajv, wanted)) {
      failures.push({
        caseId: fixture.caseId,
        reason: 'javascript-versus-committed',
        committed: wanted,
        actual: ajv,
      });
    }
    await send(createDigestRequest(fixture));
  }
  for (const fixture of canonicalByteCases) {
    const javascript = validateCanonicalByteParityCase(fixture);
    const wanted = committed.canonicalBytes[fixture.caseId];
    if (wanted === undefined) {
      throw new Error(`Missing canonical-byte expectation ${fixture.caseId}`);
    }
    expected.set(fixture.caseId, wanted);
    if (
      !equalResult(javascript, wanted) ||
      javascript.canonical !== wanted.canonical
    ) {
      failures.push({
        caseId: fixture.caseId,
        reason: 'javascript-versus-committed',
        committed: wanted,
        actual: javascript,
      });
    }
    await send(createCanonicalByteRequest(fixture));
  }
  for (const fixture of scalarCases) {
    const javascript = validateScalarParityCase(fixture);
    const wanted = committed.scalars[fixture.caseId];
    if (wanted === undefined) {
      throw new Error(`Missing scalar expectation ${fixture.caseId}`);
    }
    expected.set(fixture.caseId, wanted);
    if (!equalResult(javascript, wanted)) {
      failures.push({
        caseId: fixture.caseId,
        reason: 'javascript-versus-committed',
        committed: wanted,
        actual: javascript,
      });
    }
    await send(createScalarRequest(fixture));
  }
  child.stdin.end();
  const [exitCode] = await Promise.all([once(child, 'close'), reader]).then(
    ([close]) => close,
  );
  if (exitCode !== 0) {
    throw new Error(
      `Networknt harness exited ${String(exitCode)}:\n${standardError}`,
    );
  }
  if (expected.size > 0) {
    failures.push({
      reason: 'missing-results',
      caseIds: [...expected.keys()].slice(0, 20),
    });
  }
  if (failures.length > 0) {
    throw new Error(
      `Cross-language parity failed:\n${JSON.stringify(failures.slice(0, 20), null, 2)}`,
    );
  }
  return {
    structuralCases: structuralCases.length,
    adversarialCases: corpus.adversarial.length,
    digestCases: digestCases.length,
    canonicalByteCases: canonicalByteCases.length,
    scalarCases: scalarCases.length,
  };
}

async function main() {
  const counts = await runCrossLanguageParity();
  process.stdout.write(`${JSON.stringify({ status: 'pass', ...counts })}\n`);
}

await runIfMain(import.meta.url, main);
