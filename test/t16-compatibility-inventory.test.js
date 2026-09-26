import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import test from 'node:test';

import {
  findCompatibilityChanges,
  inventorySchemaFiles,
} from '../scripts/check-backward-compatibility.mjs';

test('the compatibility gate derives its root listing from the schema inventory (SCH-M12)', async () => {
  const inventoryFiles = await inventorySchemaFiles();
  const schemaFiles = (await readdir('schemas'))
    .filter((file) => file.endsWith('.schema.json'))
    .sort();
  assert.deepEqual(
    inventoryFiles,
    schemaFiles,
    'docs/catalogs/schema-inventory.json is out of step with schemas/; run ' +
      'npm run codegen:generate',
  );
});

test('a root missing from the schema inventory is reported as a finding, not silently skipped', async () => {
  const findings = await findCompatibilityChanges();
  const inventoryFindings = findings.filter((finding) =>
    finding.detail.includes('schema-inventory.json'),
  );
  assert.deepEqual(
    inventoryFindings,
    [],
    'the committed inventory, baseline and schemas/ must agree on the same root set today',
  );
});
