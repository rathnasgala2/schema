import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { GALA_SCHEMA_IDS, validateGalaDocument } from '../src/index.js';

/**
 * Parse one committed JSON file.
 *
 * @param {string} file repository-relative file
 * @returns {Promise<any>} parsed JSON
 */
async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

test('the public registry exposes exactly the twenty accepted roots', async () => {
  const manifest = await readJson('fixtures/manifest.json');
  assert.deepEqual(
    GALA_SCHEMA_IDS,
    manifest.schemas
      .map((/** @type {{schemaId: string}} */ { schemaId }) => schemaId)
      .sort(),
  );
  assert.equal(new Set(GALA_SCHEMA_IDS).size, 20);
});

test('the public validator accepts a canonical document', async () => {
  const value = await readJson('examples/valid/repository/canonical.json');
  assert.deepEqual(validateGalaDocument(value.schemaId, value), {
    valid: true,
    diagnostics: [],
  });
});

test('the public validator returns complete stable diagnostics', async () => {
  const value = await readJson('examples/valid/repository/canonical.json');
  value.unexpected = true;
  const result = validateGalaDocument(value.schemaId, value);
  assert.equal(result.valid, false);
  assert.deepEqual(
    result.diagnostics.map(({ code }) => code),
    ['REQUEST_FIELD_UNKNOWN'],
  );
  const [diagnostic] = result.diagnostics;
  assert.ok(diagnostic);
  assert.deepEqual(Object.keys(diagnostic), [
    'code',
    'severity',
    'instancePointer',
    'actualValueClass',
    'rule',
    'remediation',
    'documentationUrl',
  ]);
  assert.equal(diagnostic.severity, 'ERROR');
  assert.equal(diagnostic.instancePointer, '/unexpected');
  assert.equal(diagnostic.actualValueClass, 'boolean');
  assert.match(diagnostic.rule, /:additionalProperties$/u);
  assert.match(diagnostic.documentationUrl, /^https:\/\//u);
});

test('unknown contract identities and majors fail closed', () => {
  const value = {
    schemaId: 'urn:gala:schema:repository:3.0.0',
    schemaVersion: '3.0.0',
  };
  assert.deepEqual(
    validateGalaDocument(value.schemaId, value).diagnostics.map(
      ({ code }) => code,
    ),
    ['SCHEMA_VERSION_UNSUPPORTED'],
  );
});

test('custom formats are assertions on the public path', async () => {
  const value = await readJson('examples/valid/repository/canonical.json');
  value.publication = 'content/../outside.json';
  const result = validateGalaDocument(value.schemaId, value);
  assert.equal(result.valid, false);
  assert.ok(
    result.diagnostics.some(({ code }) => code === 'REPOSITORY_PATH_INVALID'),
  );
});

test('applicator cascades retain leaf diagnostics without throwing', async () => {
  const extensions = await readJson('examples/valid/author/canonical.json');
  extensions.extensions = { 'gala.bad': 1 };
  assert.deepEqual(
    validateGalaDocument(extensions.schemaId, extensions).diagnostics.map(
      ({ code }) => code,
    ),
    ['EXTENSION_KEY_INVALID'],
  );

  const conditional = await readJson('examples/valid/author/canonical.json');
  conditional.links[0] = { type: 'email', uri: 'https://example.com/' };
  assert.deepEqual(
    validateGalaDocument(conditional.schemaId, conditional).diagnostics.map(
      ({ code }) => code,
    ),
    ['SCHEMA_PATTERN_INVALID'],
  );
});

test('non-scalar extension JSON fails closed without escaping the public API', async () => {
  for (const invalid of ['\ud800', '\udfff']) {
    const value = await readJson('examples/valid/repository/canonical.json');
    value.extensions = { 'vendor.test': { invalid } };
    const result = validateGalaDocument(value.schemaId, value);
    assert.equal(result.valid, false);
    assert.ok(
      result.diagnostics.some(({ code }) => code === 'UNICODE_SCALAR_INVALID'),
    );
  }

  const valid = await readJson('examples/valid/repository/canonical.json');
  valid.extensions = { 'vendor.test': { emoji: '\ud83d\ude00' } };
  assert.equal(validateGalaDocument(valid.schemaId, valid).valid, true);
});

test('canonical-byte validation is stack-safe and fails closed for non-JSON values', async () => {
  /**
   * @param {number} depth nesting depth
   * @returns {unknown} nested JSON value
   */
  const deepValue = (depth) => {
    let value = null;
    for (let index = 0; index < depth; index += 1) value = { a: value };
    return value;
  };
  const document = await readJson('examples/valid/repository/canonical.json');
  document.extensions = { 'vendor.test': deepValue(2000) };
  assert.equal(validateGalaDocument(document.schemaId, document).valid, true);

  document.extensions = { 'vendor.test': deepValue(3000) };
  assert.ok(
    validateGalaDocument(document.schemaId, document).diagnostics.some(
      ({ code }) => code === 'CANONICAL_BYTE_LENGTH_INVALID',
    ),
  );

  /** @type {unknown[]} */
  const invalidValues = [
    1n,
    { missing: undefined },
    { callable() {} },
    new Date(0),
  ];
  const cyclic = /** @type {any} */ ({});
  cyclic.self = cyclic;
  invalidValues.push(cyclic);
  for (const invalid of invalidValues) {
    document.extensions = { 'vendor.test': invalid };
    const result = validateGalaDocument(document.schemaId, document);
    assert.equal(result.valid, false);
    assert.ok(
      result.diagnostics.some(
        ({ code }) => code === 'CANONICAL_BYTE_LENGTH_INVALID',
      ),
    );
  }
});

test('the public validator accepts a long canonical single grapheme without stack overflow', async () => {
  const document = await readJson('examples/valid/author/canonical.json');
  document.biography = `a${'\u0316'.repeat(130_000)}`;
  assert.deepEqual(validateGalaDocument(document.schemaId, document), {
    valid: true,
    diagnostics: [],
  });
});

test('the public validator rejects lone surrogates before schema evaluation', async () => {
  /** @type {[string, (document: any) => void][]} */
  const fixtures = [
    [
      'examples/valid/build-input/canonical.json',
      (document) => {
        document.content[0].body = '\ud800';
      },
    ],
    [
      'examples/valid/artifact-manifest/canonical.json',
      (document) => {
        document.findings[0].pointer = '\ud800';
      },
    ],
    [
      'examples/valid/problem/canonical.json',
      (document) => {
        document.errors[0].pointer = '\ud800';
      },
    ],
  ];
  for (const [file, mutate] of fixtures) {
    const document = await readJson(file);
    mutate(document);
    assert.deepEqual(
      validateGalaDocument(document.schemaId, document).diagnostics.map(
        ({ code }) => code,
      ),
      ['UNICODE_SCALAR_INVALID'],
    );
  }

  const document = await readJson('examples/valid/repository/canonical.json');
  document.extensions = { ['\ud800']: null };
  assert.deepEqual(
    validateGalaDocument(document.schemaId, document).diagnostics.map(
      ({ code }) => code,
    ),
    ['UNICODE_SCALAR_INVALID'],
  );
});

test('one diagnostic map owns every executable fixture code', async () => {
  const [manifest, map] = await Promise.all([
    readJson('fixtures/manifest.json'),
    readJson('diagnostics/diagnostic-map.json'),
  ]);
  assert.equal(map.schemaVersion, '1.0.0');
  assert.equal(map.contractVersion, '2.0.0');
  for (const rule of manifest.rules) {
    if (rule.invalid.expectedCode !== undefined) {
      assert.equal(map.rules[rule.ruleId].code, rule.invalid.expectedCode);
    } else {
      assert.equal(map.nonApplicable[rule.ruleId], rule.invalid.notApplicable);
    }
  }
  for (const entry of manifest.adversarial) {
    assert.equal(map.validators[entry.category].code, entry.expectedCode);
  }
  assert.equal(map.validators['sha256-digest'].code, 'DIGEST_VECTOR_MISMATCH');
  assert.deepEqual(map.cascadeKeywords, ['if', 'propertyNames']);
  assert.equal(map.keywords.if, 'SCHEMA_UNION_INVALID');
  assert.equal(map.keywords.propertyNames, 'EXTENSION_KEY_INVALID');
  for (const [code, diagnostic] of Object.entries(map.codes)) {
    assert.match(code, /^[A-Z][A-Z0-9_]+$/u);
    assert.equal(diagnostic.severity, 'ERROR');
    assert.equal(typeof diagnostic.remediation, 'string');
    assert.match(diagnostic.documentationUrl, /^https:\/\//u);
  }
});
