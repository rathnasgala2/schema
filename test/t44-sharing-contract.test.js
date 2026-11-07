import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { Ajv2020 } from 'ajv/dist/2020.js';

/**
 * @param {string} name schema root name
 * @returns {Promise<import('ajv').ValidateFunction>} validator for the sharing definition
 */
async function sharingValidator(name) {
  const schema = JSON.parse(
    await readFile(
      new URL(`../schemas/${name}.schema.json`, import.meta.url),
      'utf8',
    ),
  );
  const ajv = new Ajv2020({
    strict: false,
    allErrors: true,
    validateFormats: false,
  });
  ajv.addSchema(schema, 'root');
  return ajv.compile({
    $ref: `root#/$defs/${name === 'build-input' ? 'resolvedSharing' : 'sharing'}`,
  });
}

const ALL = [
  'copy-link',
  'native',
  'x',
  'bluesky',
  'threads',
  'linkedin',
  'facebook',
  'hacker-news',
  'reddit',
  'whatsapp',
  'telegram',
  'email',
];

// SCHEMA-3.44.0: `threads` joins the closed set; the build input carries the
// platform's Reddit community and X handle.
for (const name of ['publication', 'build-input']) {
  test(`${name} sharing accepts threads and twelve targets`, async () => {
    const validate = await sharingValidator(name);
    assert.equal(validate({ targets: ['threads'] }), true);
    assert.equal(validate({ targets: ALL }), true);
    assert.equal(validate({ targets: [...ALL, 'mastodon'] }), false);
  });
}

test('build-input sharing validates reddit and x', async () => {
  const validate = await sharingValidator('build-input');
  assert.equal(
    validate({
      targets: ['x', 'reddit'],
      reddit: { community: 'Galascribe' },
      x: { via: '' },
    }),
    true,
  );
  assert.equal(
    validate({ targets: [], reddit: { community: 'a'.repeat(22) } }),
    false,
  );
  assert.equal(validate({ targets: [], x: { via: '@gala' } }), false);
  assert.equal(validate({ targets: [], x: { via: 'a'.repeat(16) } }), false);
});

test('publication sharing rejects reddit and x members', async () => {
  const validate = await sharingValidator('publication');
  assert.equal(validate({ targets: ['x'], x: { via: 'gala' } }), false);
});
