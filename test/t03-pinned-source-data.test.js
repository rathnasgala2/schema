import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { parseDuplicateFreeIJson } from '../src/internal/canonical-jcs.js';
import {
  createLicenseInventory,
  createRetainedSourceDataInventory,
  readSemverOracle,
} from '../scripts/generate-license-inventory.mjs';
import { createSupplyChainSbom } from '../scripts/generate-sbom.mjs';
import {
  PINNED_SOURCE_DATA,
  verifyPinnedArtifact,
  verifyPinnedSourceData,
} from '../scripts/verify-pinned-source-data.mjs';

const SOURCE_ROOT = path.resolve('codegen/source-data');

/** @typedef {ReturnType<typeof createRetainedSourceDataInventory>[number]} RetainedSourceData */
/**
 * @typedef {{
 *   name: string,
 *   version: string,
 *   license: string,
 *   development: boolean,
 *   optional: boolean,
 *   peer: boolean,
 *   integrity: string
 * }} InventoryDependency
 */
/**
 * @typedef {{
 *   type: string,
 *   name: string,
 *   version?: string,
 *   scope: string,
 *   purl?: string,
 *   'bom-ref': string,
 *   hashes: {alg: string, content: string}[],
 *   licenses: ({license: {id: string}} | {expression: string})[],
 *   externalReferences: {type: string, url: string}[],
 *   properties: {name: string, value: string}[]
 * }} SupplyChainComponent
 */
/** @typedef {{ref: string, dependsOn?: string[]}} SupplyChainDependency */

test('all 17 accepted source-data artifacts pass exact offline verification', async () => {
  assert.equal(PINNED_SOURCE_DATA.length, 17);
  await verifyPinnedSourceData(SOURCE_ROOT);
});

test('every pinned artifact rejects a one-byte mutation and trailing bytes', async () => {
  for (const artifact of PINNED_SOURCE_DATA) {
    const bytes = await readFile(path.join(SOURCE_ROOT, artifact.path));
    const mutated = Buffer.from(bytes);
    const mutationIndex = Math.floor(mutated.length / 2);
    mutated[mutationIndex] = /** @type {number} */ (mutated[mutationIndex]) ^ 1;
    assert.throws(
      () => verifyPinnedArtifact(mutated, artifact),
      new RegExp(`${artifact.id}: SHA-256 mismatch`, 'u'),
    );
    assert.throws(
      () =>
        verifyPinnedArtifact(
          Buffer.concat([bytes, Buffer.from('x')]),
          artifact,
        ),
      new RegExp(`${artifact.id}: byte count mismatch`, 'u'),
    );
  }
});

test('every pinned UTF-8 text rejects BOM and CRLF byte transformations', async () => {
  for (const artifact of PINNED_SOURCE_DATA.filter(({ text }) => text)) {
    const bytes = await readFile(path.join(SOURCE_ROOT, artifact.path));
    const source = bytes.toString('utf8');
    assert.equal(
      source.includes('\n'),
      true,
      `${artifact.id}: missing line feed`,
    );
    const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), bytes]);
    const withCrlf = Buffer.from(source.replaceAll('\n', '\r\n'), 'utf8');
    assert.throws(
      () => verifyPinnedArtifact(withBom, artifact),
      new RegExp(`${artifact.id}: byte count mismatch`, 'u'),
    );
    assert.throws(
      () => verifyPinnedArtifact(withCrlf, artifact),
      new RegExp(`${artifact.id}: byte count mismatch`, 'u'),
    );
  }
});

test('the IANA registry File-Date values equal the accepted pins', async () => {
  for (const artifact of PINNED_SOURCE_DATA.filter(
    ({ fileDate }) => fileDate !== undefined,
  )) {
    const source = await readFile(
      path.join(SOURCE_ROOT, artifact.path),
      'utf8',
    );
    assert.equal(source.split('\n', 1)[0], `File-Date: ${artifact.fileDate}`);
  }
});

test('the duplicate-free SPDX graph has the exact accepted node counts', async () => {
  const artifact = PINNED_SOURCE_DATA.find(
    ({ id }) => id === 'spdx-license-list-3.28.0',
  );
  assert.ok(artifact);
  const bytes = await readFile(path.join(SOURCE_ROOT, artifact.path));
  const document = /** @type {Record<string, unknown>} */ (
    parseDuplicateFreeIJson(bytes)
  );
  assert.equal(typeof document, 'object');
  assert.ok(document);
  const graph = document['@graph'];
  assert.ok(Array.isArray(graph));
  const counts = { licenses: 0, exceptions: 0, crossReferences: 0 };
  for (const row of graph) {
    if (row['@type'] === 'spdx:ListedLicense') counts.licenses += 1;
    if (row['@type'] === 'spdx:ListedLicenseException') counts.exceptions += 1;
    if (row['@type'] === 'spdx:CrossRef') counts.crossReferences += 1;
  }
  assert.deepEqual(counts, artifact.graphCounts);
});

test('the installed SemVer oracle matches the accepted version and integrity', async () => {
  const packageDefinition = JSON.parse(await readFile('package.json', 'utf8'));
  const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
  assert.equal(packageDefinition.devDependencies.semver, '7.8.5');
  assert.equal(lock.packages['node_modules/semver'].version, '7.8.5');
  assert.equal(
    lock.packages['node_modules/semver'].integrity,
    'sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==',
  );
});

test('the generated license inventory covers every retained input and the oracle', async () => {
  const lockSource = await readFile('package-lock.json', 'utf8');
  const actualSource = await readFile('THIRD_PARTY_LICENSES.json', 'utf8');
  assert.equal(actualSource, createLicenseInventory(lockSource));

  const inventory =
    /** @type {{
     *   retainedSourceData: RetainedSourceData[],
     *   dependencies: InventoryDependency[]
     * }} */ (JSON.parse(actualSource));
  assert.deepEqual(
    inventory.retainedSourceData,
    createRetainedSourceDataInventory(),
  );
  assert.deepEqual(
    inventory.retainedSourceData.map(({ id }) => id),
    PINNED_SOURCE_DATA.map(({ id }) => id),
  );
  assert.equal(inventory.retainedSourceData.length, 17);
  assert.deepEqual(
    Object.fromEntries(
      inventory.retainedSourceData.map(({ id, license }) => [id, license]),
    ),
    Object.fromEntries(
      PINNED_SOURCE_DATA.map(({ id }) => [
        id,
        id === 'unicode-uax29-revision-47'
          ? 'Unicode-TOU'
          : id.startsWith('unicode-17-')
            ? 'Unicode-3.0'
            : id.startsWith('iana-') || id === 'spdx-license-list-3.28.0'
              ? 'CC0-1.0'
              : 'ISC',
      ]),
    ),
  );
  assert.equal(
    inventory.retainedSourceData.filter(({ developmentOracle }) =>
      Boolean(developmentOracle),
    ).length,
    1,
  );

  const oracle = readSemverOracle(JSON.parse(lockSource));
  assert.deepEqual(oracle, {
    name: 'semver',
    version: '7.8.5',
    license: 'ISC',
    development: true,
    resolved: 'https://registry.npmjs.org/semver/-/semver-7.8.5.tgz',
    integrity:
      'sha512-Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==',
    sha256: 'd85045d4300d7d57c891336b95df532e73f34c22ffcd222452b6d08b9d127d5d',
    sha512:
      'Y7/KDsb8LjooZpwaqGyulO6DQlksgCncchHGk+sZIY4SBvUocMBEFH5Ur1fI4dV+Jvl0w6cjvucaIi40puRioA==',
  });
  assert.deepEqual(
    inventory.dependencies.filter(
      ({ name, version }) => name === 'semver' && version === '7.8.5',
    ),
    [
      {
        name: 'semver',
        version: '7.8.5',
        license: 'ISC',
        development: true,
        optional: false,
        peer: false,
        integrity: oracle.integrity,
      },
    ],
  );

  const driftedLock = JSON.parse(lockSource);
  driftedLock.packages['node_modules/semver'].dev = false;
  assert.throws(
    () => readSemverOracle(driftedLock),
    /SemVer development oracle does not match DEC-099/u,
  );
});

test('the generated CycloneDX SBOM covers every retained input and the oracle', async () => {
  const [lockSource, sbomSource] = await Promise.all([
    readFile('package-lock.json', 'utf8'),
    readFile('sbom.cdx.json', 'utf8'),
  ]);
  const sbom =
    /** @type {{
     *   components: SupplyChainComponent[],
     *   metadata: {component: {'bom-ref': string}},
     *   dependencies: SupplyChainDependency[]
     * }} */ (JSON.parse(sbomSource));
  const components = new Map(
    sbom.components.map((component) => [component['bom-ref'], component]),
  );
  assert.equal(components.size, sbom.components.length);
  assert.equal(sbom.components.length, 24);

  const retained = createRetainedSourceDataInventory();
  for (const artifact of retained) {
    const component = components.get(`urn:gala:source-data:${artifact.id}`);
    assert.ok(component, artifact.id);
    assert.equal(component.type, 'data');
    assert.equal(component.scope, 'excluded');
    assert.deepEqual(component.hashes[0], {
      alg: 'SHA-256',
      content: artifact.sha256,
    });
    assert.deepEqual(component.licenses, [
      { license: { id: artifact.license } },
    ]);
    assert.equal(component.hashes.length, artifact.sha512 ? 2 : 1);
    assert.deepEqual(component.externalReferences, [
      { type: 'distribution', url: artifact.url },
    ]);
    assert.deepEqual(
      Object.fromEntries(
        component.properties.map(({ name, value }) => [name, value]),
      ),
      {
        'gala:retained-source-data:path': artifact.path,
        'gala:retained-source-data:byte-count': String(artifact.bytes),
        'gala:supply-chain:role': artifact.developmentOracle
          ? 'development-oracle-source'
          : 'retained-source-data',
      },
    );
  }

  const oracle = components.get('pkg:npm/semver@7.8.5');
  assert.ok(oracle);
  assert.equal(oracle.type, 'library');
  assert.equal(oracle.scope, 'excluded');
  assert.equal(oracle.purl, 'pkg:npm/semver@7.8.5');
  assert.deepEqual(oracle.licenses, [{ license: { id: 'ISC' } }]);
  assert.equal(
    oracle.properties.find(({ name }) => name === 'gala:supply-chain:role')
      ?.value,
    'development-oracle',
  );

  const rootReference = sbom.metadata.component['bom-ref'];
  const rootDependency = sbom.dependencies.find(
    ({ ref }) => ref === rootReference,
  );
  assert.ok(rootDependency);
  const requiredReferences = [
    ...retained.map(({ id }) => `urn:gala:source-data:${id}`),
    'pkg:npm/semver@7.8.5',
  ];
  assert.ok(Array.isArray(rootDependency.dependsOn));
  for (const reference of requiredReferences) {
    assert.equal(rootDependency.dependsOn.includes(reference), true, reference);
    assert.equal(
      sbom.dependencies.some(({ ref }) => ref === reference),
      true,
      reference,
    );
  }

  const minimalBase = JSON.stringify({
    bomFormat: 'CycloneDX',
    specVersion: '1.6',
    metadata: { component: { 'bom-ref': 'root' } },
    components: [],
    dependencies: [{ ref: 'root' }],
  });
  assert.equal(
    createSupplyChainSbom(minimalBase, lockSource),
    createSupplyChainSbom(minimalBase, lockSource),
  );
});
