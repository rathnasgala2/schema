import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

/**
 * Every root's `$id` uses `urn:gala:schema:<contract>:2.0.0` except
 * `build-provenance`, which uses `urn:gala:metadata:<contract>:2.0.0`
 * because its canonical home is as a record embedded in another root's
 * envelope (`artifact-manifest`'s `#/$defs/buildProvenance`); see README.md's
 * "URN namespace rule" (SCH-M8). This pins the exception to exactly one
 * named root, so a future metadata-shaped root does not silently widen it
 * without a documented reason.
 */
const METADATA_NAMESPACE_ROOTS = new Set(['build-provenance']);

test('exactly build-provenance uses the urn:gala:metadata: namespace (SCH-M8)', async () => {
  const files = (await readdir('schemas')).filter((file) =>
    file.endsWith('.schema.json'),
  );
  for (const file of files) {
    const schema = JSON.parse(await readFile(`schemas/${file}`, 'utf8'));
    const contract = file.replace(/\.schema\.json$/u, '');
    const expectedNamespace = METADATA_NAMESPACE_ROOTS.has(contract)
      ? 'urn:gala:metadata:'
      : 'urn:gala:schema:';
    assert.ok(
      schema.$id.startsWith(`${expectedNamespace}${contract}:`),
      `${contract}'s $id (${schema.$id}) does not use the expected namespace ${expectedNamespace}`,
    );
  }
});
