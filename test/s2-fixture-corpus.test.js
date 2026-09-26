import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { validateGalaDocument } from '../src/index.js';

const S2_FAMILIES = [
  {
    family: 'discriminator-only-composition',
    caseIds: [
      'composition-valid-discriminator-only',
      'composition-rejects-unknown-field',
    ],
  },
  {
    family: 'empty-modules-placements',
    caseIds: [
      'build-input-valid-empty-modules-placements',
      'build-input-rejects-nonempty-modules',
      'build-input-rejects-nonempty-placements',
    ],
  },
  {
    family: 'normalized-inputs',
    caseIds: [
      'normalized-build-input-valid',
      'normalized-publication-missing-source-digest-invalid',
    ],
  },
  {
    family: 'unicode17-paths-routes',
    caseIds: [
      'unicode17-nfc-repository-path-valid',
      'unicode17-uppercase-percent-route-valid',
      'unicode17-non-nfc-repository-path-invalid',
      'unicode17-unencoded-route-invalid',
    ],
  },
  {
    family: 'artifact-static-redirects',
    caseIds: [
      'artifact-static-root-redirect-valid',
      'artifact-static-non-root-redirect-valid',
      'artifact-static-redirect-status-invalid',
      'artifact-static-redirect-backing-path-invalid',
    ],
  },
  {
    family: 'theme-contracts-digest-cycle',
    caseIds: [
      'theme-contract-valid-structural',
      'theme-contract-unknown-field-invalid',
    ],
  },
  {
    family: 'lowercase-capabilities',
    caseIds: [
      'capability-local-directory-valid-lowercase',
      'capability-github-pages-valid-lowercase',
      'capability-do-spaces-valid-lowercase',
      'capability-uppercase-invalid',
    ],
  },
  {
    family: 'provider-identities',
    caseIds: [
      'provider-identity-valid-github',
      'provider-identity-uppercase-invalid',
      'provider-identity-unknown-field-invalid',
    ],
  },
  {
    family: 'deployment-records',
    caseIds: [
      'deployment-intent-valid',
      'deployment-intent-operation-id-invalid',
      'deployment-observation-valid',
      'deployment-observation-operation-id-invalid',
      'deployment-receipt-valid',
      'deployment-receipt-operation-id-invalid',
    ],
  },
];

/**
 * Recursively enumerate repository-relative files.
 *
 * @param {string} directory directory to walk
 * @returns {Promise<string[]>} file paths
 */
async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(target)));
    else files.push(target.split(path.sep).join('/'));
  }
  return files;
}

/**
 * Parse JSON.
 *
 * @param {string} file file path
 * @returns {Promise<any>} parsed value
 */
async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

/**
 * Load all S2 family cases by stable ID.
 *
 * @returns {Promise<Map<string, any>>} cases
 */
async function loadCases() {
  const cases = new Map();
  for (const { family } of S2_FAMILIES) {
    const fixture = await readJson(`fixtures/s2/${family}.json`);
    for (const fixtureCase of fixture.cases) {
      assert.equal(cases.has(fixtureCase.caseId), false);
      cases.set(fixtureCase.caseId, fixtureCase);
    }
  }
  return cases;
}

test('legacy generated fixtures remain byte-exact outside the S2 subtree', async () => {
  const files = [
    ...(await listFiles('examples/valid')),
    ...(await listFiles('fixtures')),
  ]
    .filter(
      (file) =>
        !file.startsWith('fixtures/s2/') && !file.startsWith('fixtures/s4/'),
    )
    .sort((left, right) =>
      Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8')),
    );
  const aggregate = createHash('sha256');
  for (const file of files) {
    aggregate.update(file, 'utf8');
    aggregate.update(Buffer.from([0]));
    aggregate.update(await readFile(file));
    aggregate.update(Buffer.from([0]));
  }
  assert.equal(files.length, 826);
  assert.equal(
    // 2026-09-25 code-discipline review, SCH-C3: thirteen $defs shared by
    // name across roots had diverged under the same name with nothing
    // checking (fixed by a new schemas:shared-defs:check gate). Reconciling
    // them regenerated fixtures/manifest.json and the affected boundary/
    // invalid fixture files for every touched root (adapter-capability,
    // appearance, artifact-manifest, build-input, build-provenance,
    // deployment-intent, deployment-observation, deployment-receipt,
    // navigation, theme-contract), and added 9 new fixture files.
    aggregate.digest('hex'),
    'dfe795e06bb501f964d0fadbddfe477a1dc706392d2d2b646dbc0dd5c9185e65',
  );
});

test('S2 manifest binds the exact inventory, family names, files, and case IDs', async () => {
  const expectedFiles = [
    ...S2_FAMILIES.map(({ family }) => `fixtures/s2/${family}.json`),
    'fixtures/s2/manifest.json',
  ].sort();
  assert.deepEqual((await listFiles('fixtures/s2')).sort(), expectedFiles);

  const manifest = await readJson('fixtures/s2/manifest.json');
  assert.deepEqual(Object.keys(manifest), [
    'schemaVersion',
    'contractVersion',
    'fixtureScope',
    'coverageModel',
    'families',
  ]);
  assert.equal(manifest.schemaVersion, '1.0.0');
  assert.equal(manifest.contractVersion, '2.0.0');
  assert.match(manifest.coverageModel, /only public registered-schema/u);
  assert.match(manifest.coverageModel, /not a public serialized format/u);
  assert.deepEqual(
    manifest.families.map((/** @type {any} */ family) => ({
      family: family.family,
      caseIds: family.caseIds,
    })),
    S2_FAMILIES,
  );
  assert.deepEqual(
    manifest.families.map((/** @type {any} */ family) => family.file),
    S2_FAMILIES.map(({ family }) => `fixtures/s2/${family}.json`),
  );
  assert.equal(
    new Set(manifest.families.map((/** @type {any} */ entry) => entry.file))
      .size,
    9,
  );

  const referencedFiles = new Set(
    manifest.families.map((/** @type {any} */ { file }) => file),
  );
  assert.deepEqual(
    expectedFiles.filter((file) => file !== 'fixtures/s2/manifest.json'),
    [...referencedFiles].sort(),
  );
  const allCaseIds = manifest.families.flatMap(
    (/** @type {any} */ { caseIds }) => caseIds,
  );
  assert.equal(new Set(allCaseIds).size, allCaseIds.length);

  for (const family of manifest.families) {
    assert.deepEqual(Object.keys(family), [
      'family',
      'file',
      'caseIds',
      'publicCoverage',
      'internalSemanticCoverage',
    ]);
    assert.equal(family.publicCoverage, 'registered-schema-structural-vectors');
    const fixture = await readJson(family.file);
    assert.deepEqual(Object.keys(fixture), ['family', 'cases']);
    assert.equal(fixture.family, family.family);
    assert.deepEqual(
      fixture.cases.map((/** @type {any} */ { caseId }) => caseId),
      family.caseIds,
    );
    for (const reference of family.internalSemanticCoverage) {
      assert.deepEqual(Object.keys(reference), ['file', 'testName']);
      const source = await readFile(reference.file, 'utf8');
      assert.equal(source.includes(`test('${reference.testName}'`), true);
    }
  }
});

test('every S2 schema-bearing instance has its exact public diagnostics', async () => {
  const cases = await loadCases();
  for (const fixtureCase of cases.values()) {
    assert.deepEqual(Object.keys(fixtureCase), [
      'caseId',
      'schemaId',
      'instance',
      'expectedDiagnostics',
    ]);
    assert.equal(fixtureCase.instance.schemaId, fixtureCase.schemaId);
    const result = validateGalaDocument(
      fixtureCase.schemaId,
      fixtureCase.instance,
    );
    assert.deepEqual(
      result.diagnostics.map(({ code, instancePointer }) => ({
        code,
        instancePointer,
      })),
      fixtureCase.expectedDiagnostics,
      fixtureCase.caseId,
    );
    assert.equal(result.valid, fixtureCase.expectedDiagnostics.length === 0);
  }
});

test('the nine S2 families preserve their consumer-facing invariants', async () => {
  const cases = await loadCases();
  /**
   * @param {string} caseId fixture case identity
   * @returns {any} fixture instance
   */
  const value = (caseId) => cases.get(caseId).instance;

  assert.deepEqual(Object.keys(value('composition-valid-discriminator-only')), [
    'schemaId',
    'schemaVersion',
  ]);

  const emptyBuildInput = value('build-input-valid-empty-modules-placements');
  assert.deepEqual(emptyBuildInput.modules, {});
  assert.deepEqual(emptyBuildInput.placements, []);
  assert.notDeepEqual(
    value('build-input-rejects-nonempty-modules').modules,
    {},
  );
  assert.notDeepEqual(
    value('build-input-rejects-nonempty-placements').placements,
    [],
  );

  const normalized = value('normalized-build-input-valid');
  assert.equal(normalized.sourceRevision, normalized.repository.sourceRevision);
  assert.equal(normalized.baseUrl.endsWith('/'), true);
  assert.equal(normalized.basePath.startsWith('/'), true);
  assert.equal(
    value('normalized-publication-missing-source-digest-invalid').publication
      .sourceDigest,
    undefined,
  );

  const unicodePath = value('unicode17-nfc-repository-path-valid').assetRoots[0]
    .path;
  assert.equal(unicodePath, unicodePath.normalize('NFC'));
  assert.equal(
    Buffer.byteLength(unicodePath, 'utf8') > unicodePath.length,
    true,
  );
  assert.equal(
    value('unicode17-uppercase-percent-route-valid').content[0].frontmatter
      .redirects[0],
    '/caf%C3%A9',
  );
  const nonNfcPath = value('unicode17-non-nfc-repository-path-invalid')
    .assetRoots[0].path;
  assert.notEqual(nonNfcPath, nonNfcPath.normalize('NFC'));
  assert.equal(
    value('unicode17-unencoded-route-invalid').content[0].frontmatter
      .redirects[0],
    '/café',
  );

  const rootRedirect = value('artifact-static-root-redirect-valid')
    .redirects[0];
  assert.deepEqual(
    [rootRedirect.targetRoute, rootRedirect.status, rootRedirect.backingPath],
    ['/', 200, 'old-home/index.html'],
  );
  const nonRootRedirect = value('artifact-static-non-root-redirect-valid')
    .redirects[0];
  assert.deepEqual(
    [
      nonRootRedirect.sourceRoute,
      nonRootRedirect.targetRoute,
      nonRootRedirect.status,
      nonRootRedirect.backingPath,
    ],
    ['/blog/old', '/blog/new', 200, 'blog/old/index.html'],
  );
  assert.notEqual(
    value('artifact-static-redirect-status-invalid').redirects[0].status,
    200,
  );
  assert.equal(
    value('artifact-static-redirect-backing-path-invalid').redirects[0]
      .backingPath,
    '../index.html',
  );

  const theme = value('theme-contract-valid-structural');
  assert.equal(
    new Set([
      theme.integrity,
      theme.fixtureDigest,
      theme.evidenceDigest,
      theme.stylingContractDigest,
    ]).size,
    4,
  );

  const capabilityCaseIds = [
    'capability-local-directory-valid-lowercase',
    'capability-github-pages-valid-lowercase',
    'capability-do-spaces-valid-lowercase',
  ];
  assert.deepEqual(
    capabilityCaseIds.map((caseId) => value(caseId).destinationKinds),
    [['local-directory'], ['github-pages'], ['do-spaces']],
  );
  for (const caseId of capabilityCaseIds) {
    const operations = value(caseId).operations;
    assert.equal(
      operations.every(
        (/** @type {string} */ operation) =>
          operation === operation.toLowerCase(),
      ),
      true,
    );
  }
  assert.equal(
    value('capability-uppercase-invalid').operations.includes('Activate'),
    true,
  );

  assert.equal(
    value('provider-identity-valid-github').sourceIdentity.provider,
    'github',
  );
  assert.equal(
    value('provider-identity-uppercase-invalid').sourceIdentity.provider,
    'GitHub',
  );
  assert.equal(
    value('provider-identity-unknown-field-invalid').sourceIdentity.unexpected,
    true,
  );

  for (const record of ['intent', 'observation', 'receipt']) {
    assert.equal(value(`deployment-${record}-valid`).unexpected, undefined);
    assert.equal(
      value(`deployment-${record}-operation-id-invalid`).operationId.includes(
        'C',
      ),
      true,
    );
  }
});
