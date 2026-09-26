import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parse as parseYaml } from 'yaml';

test('dependabot.yml covers npm, github-actions and the Java parity harness (SCH-M19)', async () => {
  const config = parseYaml(await readFile('.github/dependabot.yml', 'utf8'));
  assert.equal(config.version, 2);
  const ecosystems = config.updates.map(
    (/** @type {{'package-ecosystem': string}} */ update) =>
      update['package-ecosystem'],
  );
  assert.deepEqual(ecosystems.sort(), ['github-actions', 'gradle', 'npm']);
  const gradleUpdate = config.updates.find(
    (/** @type {{'package-ecosystem': string}} */ update) =>
      update['package-ecosystem'] === 'gradle',
  );
  assert.equal(gradleUpdate.directory, '/parity/java');
});
