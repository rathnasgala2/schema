import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

/**
 * The exact closed set of `format` values used across the twenty schema
 * roots. SCH-M9: five of these overlap in what they accept
 * (`gala-int64`/`gala-nonnegative-int64`/`gala-positive-int64`;
 * `gala-github-positive-uint64`/`gala-unsigned-64-bit-decimal`) under three
 * naming conventions, and consolidating that vocabulary is deliberately
 * deferred (a `format` rename is a breaking compatibility event under
 * docs/COMPATIBILITY.md and SCH-C5a, needing a reviewed release note, not a
 * documentation-pass edit). Until then, this is the closed list: a sixth
 * overlapping format, or any format at all, must be added here deliberately
 * rather than appearing by accident.
 */
const CLOSED_FORMAT_VOCABULARY = new Set([
  'date-time',
  'uri',
  'gala-base64url-32-byte',
  'gala-bcp47',
  'gala-canonical-route',
  'gala-extension-key',
  'gala-github-action-coordinate',
  'gala-github-positive-uint64',
  'gala-github-repository-coordinate',
  'gala-int64',
  'gala-iso-country',
  'gala-nonnegative-int64',
  'gala-observed-redirect-location',
  'gala-package-exact',
  'gala-package-range',
  'gala-plain-label',
  'gala-plain-text',
  'gala-positive-int64',
  'gala-repository-glob',
  'gala-repository-relative-path',
  'gala-semver-range',
  'gala-spdx-expression',
  'gala-unsigned-64-bit-decimal',
  'gala-verification-origin',
  'gala-verification-url',
]);

/**
 * Collect every `format` value reachable in a JSON value.
 *
 * @param {unknown} value schema fragment
 * @param {Set<string>} target accumulator
 * @returns {void}
 */
function collectFormats(value, target) {
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const entry of value) collectFormats(entry, target);
    return;
  }
  const record = /** @type {Record<string, unknown>} */ (value);
  if (typeof record.format === 'string') target.add(record.format);
  for (const child of Object.values(record)) collectFormats(child, target);
}

test('the schema roots use exactly the closed format vocabulary (SCH-M9)', async () => {
  const files = (await readdir('schemas')).filter((file) =>
    file.endsWith('.schema.json'),
  );
  const used = new Set();
  for (const file of files) {
    const schema = JSON.parse(await readFile(`schemas/${file}`, 'utf8'));
    collectFormats(schema, used);
  }
  for (const format of used) {
    assert.ok(
      CLOSED_FORMAT_VOCABULARY.has(format),
      `${format} is used in schemas/ but not in the closed vocabulary this test pins`,
    );
  }
  for (const format of CLOSED_FORMAT_VOCABULARY) {
    assert.ok(
      used.has(format),
      `${format} is in the closed vocabulary but no schema root uses it any more; narrow the list`,
    );
  }
});

test('src/internal/format-validators-core.js and format-validators.js dispatch exactly the closed non-builtin vocabulary (SCH-M9)', async () => {
  const [core, wrapper] = await Promise.all([
    readFile('src/internal/format-validators-core.js', 'utf8'),
    readFile('src/internal/format-validators.js', 'utf8'),
  ]);
  const dispatched = new Set(
    [...`${core}\n${wrapper}`.matchAll(/'(gala-[a-z0-9-]+)'/gu)].map(
      (match) => /** @type {string} */ (match[1]),
    ),
  );
  const nonBuiltin = [...CLOSED_FORMAT_VOCABULARY].filter((format) =>
    format.startsWith('gala-'),
  );
  for (const format of nonBuiltin) {
    assert.ok(
      dispatched.has(format),
      `${format} is a closed-vocabulary Gala format with no dispatcher branch`,
    );
  }
  for (const format of dispatched) {
    assert.ok(
      CLOSED_FORMAT_VOCABULARY.has(format),
      `${format} has a dispatcher branch but is not in the closed vocabulary this test pins`,
    );
  }
});
