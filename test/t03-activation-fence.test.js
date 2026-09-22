import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { Ajv2020 } from 'ajv/dist/2020.js';

/**
 * @typedef {Record<string, any>} JsonObject
 */

/**
 * The explicit "expect nothing served" activation-fence sentinel (LOCAL-47).
 * Publish's adapter protocol 2.1.0 exports the identical constant as
 * `EXPECT_NOTHING_SERVED`.
 */
const EXPECT_NOTHING_SERVED = 'gala:expect-nothing-served';

/**
 * Every place the activation fence is carried on the wire.
 *
 * @type {ReadonlyArray<{contract: string, keys: string[]}>}
 */
const FENCE_LOCATIONS = [
  { contract: 'deployment-intent', keys: ['properties'] },
  {
    contract: 'deployment-intent',
    keys: ['$defs', 'destinationMutationAuthority', 'properties'],
  },
  {
    contract: 'deployment-receipt',
    keys: ['$defs', 'destinationMutationAuthority', 'properties'],
  },
  {
    contract: 'adapter-capability',
    keys: ['$defs', 'localFilesystemControlRow', 'properties'],
  },
  {
    contract: 'adapter-capability',
    keys: ['$defs', 'localFilesystemObservationEvidence', 'properties'],
  },
];

/**
 * Read one generated root schema.
 *
 * @param {string} contract root-schema contract name
 * @returns {Promise<JsonObject>} the parsed schema
 */
async function readRoot(contract) {
  return JSON.parse(await readFile(`schemas/${contract}.schema.json`, 'utf8'));
}

/**
 * Walk a path of object keys.
 *
 * @param {JsonObject} document root document
 * @param {string[]} keys path segments
 * @returns {JsonObject} the addressed node
 */
function at(document, keys) {
  return keys.reduce(
    (node, key) => /** @type {JsonObject} */ (node[key]),
    document,
  );
}

test('every activation fence admits the expect-nothing-served sentinel and refuses null', async () => {
  const roots = new Map();
  for (const { contract, keys } of FENCE_LOCATIONS) {
    if (!roots.has(contract)) {
      roots.set(contract, await readRoot(contract));
    }
    const root = /** @type {JsonObject} */ (roots.get(contract));
    const carrier = at(root, keys).expectedGenerationId;
    assert.deepEqual(
      carrier,
      { $ref: '#/$defs/generationFence' },
      `${contract} ${keys.join('/')} references the one fence definition`,
    );
    // SCHEMA-2.8.0: one string schema with one combined pattern, not a union of
    // two string schemas, which OpenAPI Generator 7.25 emits as an empty marker
    // interface. The admitted value set is unchanged and is asserted below.
    const fence = root.$defs.generationFence;
    assert.equal(fence.type, 'string');
    assert.equal(fence.oneOf, undefined);
    const ajv = new Ajv2020({ strict: false, validateFormats: false });
    const validate = ajv.compile({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: root.$defs,
      ...fence,
    });
    assert.ok(
      validate('019c0000-0000-7000-8000-000000000001'),
      `${contract} fence accepts a generation identity`,
    );
    assert.ok(
      validate(EXPECT_NOTHING_SERVED),
      `${contract} fence accepts the sentinel`,
    );
    for (const refused of [
      null,
      '',
      'none',
      '__none__',
      'gala:expect-nothing-served ',
      0,
    ]) {
      assert.equal(
        validate(refused),
        false,
        `${contract} fence refuses ${JSON.stringify(refused)}`,
      );
    }
  }
});

test('the sentinel cannot be mistaken for a generation identity', async () => {
  const root = await readRoot('deployment-intent');
  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  const validateStableId = ajv.compile({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $defs: root.$defs,
    $ref: '#/$defs/stableId',
  });
  assert.equal(validateStableId(EXPECT_NOTHING_SERVED), false);
});
