import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { validateGalaDocument } from '../src/index.js';
import {
  GALA_SCHEMA_IDS,
  RUNTIME_ORIGINS_SCHEMA_ID,
  validateRuntimeOriginsDocument,
} from '../src/runtime-origins.js';
import { validateGalaFormat } from '../src/internal/format-validators.js';
import { validateGalaFormatCore } from '../src/internal/format-validators-core.js';
import { measureEntryClosure } from '../scripts/check-browser-safety.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const NARROW_ENTRY = 'src/runtime-origins.js';
const ROOT_ENTRY = 'src/index.js';

/** Declared cap, mirroring scripts/check-browser-safety.mjs. */
const NARROW_CLOSURE_BYTE_CAP = 1_250_000;

/**
 * Parse one committed JSON file.
 *
 * @param {string} file repository-relative file
 * @returns {Promise<any>} parsed JSON
 */
async function readJson(file) {
  return JSON.parse(await readFile(path.resolve(ROOT, file), 'utf8'));
}

/**
 * Collect every committed public-runtime-origins document and fixture case.
 *
 * @returns {Promise<{name: string, value: unknown}[]>} named candidates
 */
async function runtimeOriginsCandidates() {
  const candidates = /** @type {{name: string, value: unknown}[]} */ ([]);
  for (const family of [
    'examples/valid/public-runtime-origins',
    'fixtures/boundary/public-runtime-origins',
    'fixtures/unknown-field/public-runtime-origins',
  ]) {
    for (const entry of await readdir(path.resolve(ROOT, family))) {
      const file = `${family}/${entry}`;
      const parsed = await readJson(file);
      const values = Array.isArray(parsed) ? parsed : [parsed];
      values.forEach((value, index) => {
        candidates.push({ name: `${file}#${index}`, value });
      });
    }
  }
  const invalidRoot = 'fixtures/invalid/public-runtime-origins';
  for (const code of await readdir(path.resolve(ROOT, invalidRoot))) {
    const file = `${invalidRoot}/${code}/cases.json`;
    const parsed = await readJson(file);
    const cases = Array.isArray(parsed) ? parsed : [parsed];
    cases.forEach((value, index) => {
      candidates.push({ name: `${file}#${index}`, value });
    });
  }
  return candidates;
}

test('the narrow export accepts exactly the runtime-origins identity', () => {
  assert.deepEqual(GALA_SCHEMA_IDS, [RUNTIME_ORIGINS_SCHEMA_ID]);
  assert.equal(
    RUNTIME_ORIGINS_SCHEMA_ID,
    'urn:gala:schema:public-runtime-origins:2.0.0',
  );
});

test('the narrow export fails closed on every other schema identity', () => {
  const result = validateRuntimeOriginsDocument(
    'urn:gala:schema:repository:2.0.0',
    { schemaId: 'urn:gala:schema:repository:2.0.0' },
  );
  assert.equal(result.valid, false);
  assert.deepEqual(
    result.diagnostics.map(({ code }) => code),
    ['SCHEMA_VERSION_UNSUPPORTED'],
  );
});

test('the narrow export returns the full validator diagnostics verbatim', async () => {
  const candidates = await runtimeOriginsCandidates();
  assert.ok(candidates.length >= 25, 'fixture corpus is unexpectedly small');
  let rejected = 0;
  for (const { name, value } of candidates) {
    const narrow = validateRuntimeOriginsDocument(
      RUNTIME_ORIGINS_SCHEMA_ID,
      value,
    );
    const full = validateGalaDocument(RUNTIME_ORIGINS_SCHEMA_ID, value);
    assert.deepEqual(narrow, full, `${name}: narrow and full results diverge`);
    if (!narrow.valid) rejected += 1;
  }
  assert.ok(
    rejected > 0,
    'the corpus must exercise rejection, not only acceptance',
  );
});

test('the narrow export drops the SPDX, whole-catalog and other-contract weight', async () => {
  const narrow = await measureEntryClosure(ROOT, NARROW_ENTRY);
  const full = await measureEntryClosure(ROOT, ROOT_ENTRY);
  assert.ok(
    narrow.bytes <= NARROW_CLOSURE_BYTE_CAP,
    `narrow closure is ${narrow.bytes} bytes, over the ${NARROW_CLOSURE_BYTE_CAP}-byte cap`,
  );
  assert.ok(
    narrow.bytes * 4 < full.bytes,
    `narrow closure (${narrow.bytes}) is not materially smaller than the root closure (${full.bytes})`,
  );
  for (const unwanted of [
    'src/internal/generated/spdx-3.28.0.json',
    'src/internal/spdx.js',
    'diagnostics/diagnostic-map.json',
    'generated/browser/validator-core.mjs',
  ]) {
    assert.ok(
      !narrow.files.includes(unwanted),
      `${unwanted} is still reachable from the narrow export`,
    );
    assert.ok(
      full.files.includes(unwanted),
      `${unwanted} is not reachable from the root export, so the test is stale`,
    );
  }
});

test('the narrow diagnostic map carries only its own contract rules', async () => {
  const narrowMap = await readJson(
    'diagnostics/diagnostic-map.public-runtime-origins.json',
  );
  const fullMap = await readJson('diagnostics/diagnostic-map.json');
  assert.equal(narrowMap.contract, 'public-runtime-origins');
  assert.deepEqual(narrowMap.keywords, fullMap.keywords);
  assert.deepEqual(narrowMap.codes, fullMap.codes);
  assert.deepEqual(narrowMap.cascadeKeywords, fullMap.cascadeKeywords);
  const ruleIds = Object.keys(narrowMap.rules);
  assert.ok(ruleIds.length > 0);
  for (const ruleId of ruleIds) {
    assert.ok(ruleId.startsWith('public-runtime-origins:'), ruleId);
    assert.deepEqual(narrowMap.rules[ruleId], fullMap.rules[ruleId]);
  }
  assert.ok(ruleIds.length < Object.keys(fullMap.rules).length / 10);
});

/**
 * Collect every `format` name declared anywhere in one JSON Schema.
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

test('the narrow format dispatcher agrees with the full one on this contract', async () => {
  const schema = await readJson('schemas/public-runtime-origins.schema.json');
  const formats = /** @type {Set<string>} */ (new Set());
  collectFormats(schema, formats);
  formats.delete('date-time');
  formats.delete('uri');
  assert.ok(formats.size >= 10, 'the contract should declare Gala formats');
  assert.ok(
    !formats.has('gala-spdx-expression'),
    'this contract must not need the SPDX table',
  );
  const vectors = [
    'en',
    'en-GB',
    'en-US-',
    'xx-notalanguage',
    'zz',
    'GB',
    'gb',
    'Ottawa',
    'Ottawa\u0301',
    'a'.repeat(256),
    '',
    ' leading',
    'has <angle> brackets',
    'line\nbreak',
    'control\u0007char',
    '/v2/verify/abc',
    '../escape',
    '@scope/pkg@1.2.3',
    '@scope/pkg@^1.2.3',
    'docs/**/*.md',
    'docs/../secret.md',
    '>=1.0.0 <2.0.0',
    'gala.reserved',
    'vendor.key',
  ];
  for (const format of [...formats].sort()) {
    for (const vector of vectors) {
      assert.equal(
        validateGalaFormatCore(format, vector),
        validateGalaFormat(format, vector),
        `${format} disagrees on ${JSON.stringify(vector)}`,
      );
    }
  }
  assert.equal(validateGalaFormatCore('gala-spdx-expression', 'MIT'), false);
  assert.equal(validateGalaFormat('gala-spdx-expression', 'MIT'), true);
});
