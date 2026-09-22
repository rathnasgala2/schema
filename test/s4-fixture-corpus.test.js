import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { validateGalaDocument } from '../src/index.js';

const S4_FAMILIES = [
  {
    family: 'deployment-intent-destinations',
    caseIds: [
      'deployment-intent-local-directory-valid',
      'deployment-intent-github-pages-valid',
      'deployment-intent-do-spaces-valid',
      'deployment-intent-activation-detection-profile-invalid',
    ],
  },
  {
    family: 'deployment-observation-matrix',
    caseIds: [
      'deployment-observation-request-not-started-valid',
      'deployment-observation-provider-state-valid',
      'deployment-observation-class-outcome-matrix-invalid',
    ],
  },
  {
    family: 'deployment-receipt-no-signatures',
    caseIds: [
      'deployment-receipt-managed-no-signatures-valid',
      'deployment-receipt-signatures-member-rejected',
    ],
  },
  {
    family: 'public-generation-marker-closed',
    caseIds: [
      'public-generation-marker-valid',
      'public-generation-marker-publication-id-rejected',
    ],
  },
  {
    family: 'adapter-capability-destinations',
    caseIds: [
      'adapter-capability-local-directory-valid',
      'adapter-capability-github-pages-valid',
      'adapter-capability-do-spaces-valid',
      'adapter-capability-rollback-constant-invalid',
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
 * Load all S4 family cases by stable ID.
 *
 * @returns {Promise<Map<string, any>>} cases
 */
async function loadCases() {
  const cases = new Map();
  for (const { family } of S4_FAMILIES) {
    const fixture = await readJson(`fixtures/s4/${family}.json`);
    for (const fixtureCase of fixture.cases) {
      assert.equal(cases.has(fixtureCase.caseId), false);
      cases.set(fixtureCase.caseId, fixtureCase);
    }
  }
  return cases;
}

test('S4 manifest binds the exact inventory, family names, files, and case IDs', async () => {
  const expectedFiles = [
    ...S4_FAMILIES.map(({ family }) => `fixtures/s4/${family}.json`),
    'fixtures/s4/manifest.json',
  ].sort();
  assert.deepEqual((await listFiles('fixtures/s4')).sort(), expectedFiles);

  const manifest = await readJson('fixtures/s4/manifest.json');
  assert.deepEqual(Object.keys(manifest), [
    'schemaVersion',
    'contractVersion',
    'fixtureScope',
    'coverageModel',
    'families',
  ]);
  assert.equal(manifest.schemaVersion, '1.0.0');
  assert.equal(manifest.contractVersion, '2.0.0');
  assert.match(manifest.fixtureScope, /S4/u);
  assert.match(manifest.coverageModel, /only public registered-schema/u);
  assert.match(manifest.coverageModel, /not a public serialized format/u);
  assert.deepEqual(
    manifest.families.map((/** @type {any} */ family) => ({
      family: family.family,
      caseIds: family.caseIds,
    })),
    S4_FAMILIES,
  );
  assert.deepEqual(
    manifest.families.map((/** @type {any} */ family) => family.file),
    S4_FAMILIES.map(({ family }) => `fixtures/s4/${family}.json`),
  );
  assert.equal(
    new Set(manifest.families.map((/** @type {any} */ entry) => entry.file))
      .size,
    5,
  );

  const referencedFiles = new Set(
    manifest.families.map((/** @type {any} */ { file }) => file),
  );
  assert.deepEqual(
    expectedFiles.filter((file) => file !== 'fixtures/s4/manifest.json'),
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

test('every S4 schema-bearing instance has its exact public diagnostics', async () => {
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

test('the five S4 families preserve their consumer-facing invariants', async () => {
  const cases = await loadCases();
  /**
   * @param {string} caseId fixture case identity
   * @returns {any} fixture instance
   */
  const value = (caseId) => cases.get(caseId).instance;

  assert.deepEqual(
    [
      value('deployment-intent-local-directory-valid').adapter.adapterId,
      value('deployment-intent-github-pages-valid').adapter.adapterId,
      value('deployment-intent-do-spaces-valid').adapter.adapterId,
    ],
    ['local-directory', 'github-pages', 'do-spaces'],
  );
  assert.equal(
    value('deployment-intent-github-pages-valid').pagesBuildVersion.length,
    40,
  );
  assert.equal(
    value('deployment-intent-do-spaces-valid').spacesStagePrefix.startsWith(
      '_gala/staged/v2/',
    ),
    true,
  );
  assert.notEqual(
    value('deployment-intent-activation-detection-profile-invalid')
      .activationDetectionProfile,
    'gala-public-activation-detection-v2',
  );

  assert.equal(
    value('deployment-observation-request-not-started-valid').observationClass,
    'request-not-started',
  );
  assert.deepEqual(
    value('deployment-observation-request-not-started-valid').probes,
    [],
  );
  assert.equal(
    value('deployment-observation-provider-state-valid').observationClass,
    'provider-state',
  );
  assert.equal(
    value('deployment-observation-class-outcome-matrix-invalid')
      .observationClass,
    'provider-state',
  );
  assert.equal(
    value('deployment-observation-class-outcome-matrix-invalid').outcome,
    'rejected',
  );

  assert.equal(
    'signatures' in value('deployment-receipt-managed-no-signatures-valid'),
    false,
  );
  assert.deepEqual(
    value('deployment-receipt-signatures-member-rejected').signatures,
    [],
  );

  assert.deepEqual(Object.keys(value('public-generation-marker-valid')), [
    'schemaId',
    'schemaVersion',
    'artifactId',
    'artifactDigest',
    'generationId',
  ]);
  assert.equal(
    'publicationId' in
      value('public-generation-marker-publication-id-rejected'),
    true,
  );

  const capabilityCaseIds = [
    'adapter-capability-local-directory-valid',
    'adapter-capability-github-pages-valid',
    'adapter-capability-do-spaces-valid',
  ];
  assert.deepEqual(
    capabilityCaseIds.map((caseId) => value(caseId).destinationKinds),
    [['local-directory'], ['github-pages'], ['do-spaces']],
  );
  assert.deepEqual(
    capabilityCaseIds.map((caseId) => value(caseId).rollback),
    ['reupload', 'reupload', 'reupload'],
  );
  assert.notEqual(
    value('adapter-capability-rollback-constant-invalid').rollback,
    'reupload',
  );
});
