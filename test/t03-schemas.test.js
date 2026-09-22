import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT_LEDGERS = {
  'template-composition': { required: [], optional: [] },
  'theme-contract': {
    required: [
      'themeId',
      'package',
      'contractVersion',
      'templateRange',
      'stylesheets',
      'cssLayers',
      'slotHooks',
      'tokens',
      'modes',
      'assets',
      'fixtures',
      'browserPolicyRef',
      'integrity',
      'budgets',
      'fixtureDigest',
      'evidenceDigest',
      'stylingContractDigest',
    ],
    optional: [],
  },
  lock: {
    required: [
      'repositorySchemaVersion',
      'resolvedAt',
      'resolver',
      'schemas',
      'template',
      'theme',
      'publisher',
      'dependencies',
      'dependencyDag',
      'lockDigest',
    ],
    optional: [],
  },
  'build-input': {
    required: [
      'contractVersion',
      'repository',
      'sourceRevision',
      'packages',
      'publication',
      'authors',
      'content',
      'navigation',
      'appearance',
      'modules',
      'buildEpoch',
      'baseUrl',
      'basePath',
      'destinationCapabilities',
      'placements',
      'inputDigest',
    ],
    optional: [],
  },
  // SCHEMA-2.10.0 (LOCAL-62 follow-up, DEC-097 "Build provenance and
  // verified workload binding", 2198-2228): the standalone buildProvenance
  // root. Every member is required; the record is closed.
  'build-provenance': {
    required: [
      'assertedWorkload',
      'requiredOidcClaims',
      'workflowFiles',
      'actionPins',
      'verifiedInputHandoff',
      'unfrozenOutputHandoff',
      'rebuildRecord',
      'lockDigest',
      'packageReleaseCatalogDigest',
      'buildInputDigest',
      'artifactId',
      'artifactDigest',
      'manifestDigest',
      'sbomDigest',
      'spdxLicenseListVersion',
      'spdxLicenseListDigest',
      'spdx23JsonSchemaDigest',
      'artifactLicenseConclusions',
      'policyReleaseId',
      'buildPolicyDecisionDigest',
      'capabilityDecisionDigest',
      'stylingContractDigest',
      'renderPolicy',
      'sandbox',
      'secretInputs',
    ],
    optional: [],
  },
  'artifact-manifest': {
    required: [
      'repositoryNodeId',
      'sourceCommit',
      'workflowIdentity',
      'buildToolVersions',
      'buildInputDigest',
      'artifactDigest',
      'routes',
      'assets',
      'findings',
      'measurements',
      'policyResult',
      'generatedAt',
      'reproducibilityClass',
      'artifactId',
      'artifactFileCount',
      'artifactByteCount',
      'sourceIdentity',
      'builder',
      'composition',
      'buildInputContractVersion',
      'redirects',
      'declarativeHeaders',
      'includedSources',
      'excludedInputs',
      'sourceInventoryDigest',
      'validation',
      'manifestDigest',
    ],
    optional: [],
  },
  'deployment-intent': {
    required: [
      'operationId',
      'attemptId',
      'idempotencyKey',
      'sourceCommit',
      'workflowTriggerCommit',
      'artifactId',
      'artifactDigest',
      'manifestDigest',
      'artifactByteCount',
      'artifactFileCount',
      'provenanceDigest',
      'sbomDigest',
      'frozenHandoffArtifactId',
      'frozenHandoffName',
      'frozenEnvelopeDigest',
      'frozenEnvelopeByteCount',
      'requestedArtifactRetentionDays',
      'effectiveArtifactExpiresAt',
      'maximumReportRequestByteCount',
      'lockDigest',
      'rebuildRecord',
      'publisher',
      'adapter',
      'destination',
      'destinationMutationAuthority',
      'proposedGenerationId',
      'capabilityDecisionDigest',
      'policyReleaseId',
      'policyProfile',
      'policyVersion',
      'approvedOverrides',
      'policyDecisionDigest',
      'networkBoundaryProfileDigest',
      'publicTlsProfileDigest',
      'publicTlsTrustStoreDigest',
      'publicTlsRevocationSetDigest',
      'workloadBindingDigest',
      'activationDetectionProfile',
      'activationDetectionPlanDigest',
      'maximumActivationDetectionAttempts',
      'activationDetectionIntervalSeconds',
      'verificationTier',
      'verificationOrigins',
      'verificationPlanDigest',
      'maximumPublicVerificationSeconds',
      'verificationDeadlineLimit',
      'maximumFinalizationDelaySeconds',
      'finalizationDeadlineLimit',
      'marker',
      'issuer',
      'subject',
      'audience',
      'capability',
      'authorizedAt',
      'expiresAt',
      'operationDeadline',
      'intentDigest',
    ],
    optional: [
      'expectedGenerationId',
      'pagesBuildVersion',
      'spacesStagePrefix',
    ],
  },
  'deployment-observation': {
    required: [
      'observationId',
      'operationId',
      'attemptId',
      'stageAttemptId',
      'sequence',
      'intentDigest',
      'artifactId',
      'artifactDigest',
      'adapter',
      'destination',
      'observationClass',
      'outcome',
      'destinationChanged',
      'observedAt',
      'receivedAt',
      'evidenceDigest',
      'probes',
    ],
    optional: [
      'generationId',
      'providerObjectIdDigest',
      'providerVersion',
      'observedArtifactDigest',
    ],
  },
  'deployment-receipt': {
    required: [
      'receiptId',
      'snapshotSequence',
      'attemptSnapshotSequence',
      'operationId',
      'organizationId',
      'issuer',
      'repositoryId',
      'repositoryOwnerId',
      'sourceCommit',
      'workflowRef',
      'workflowSha',
      'runId',
      'runAttempt',
      'artifactId',
      'artifactDigest',
      'artifactManifestDigest',
      'artifactByteCount',
      'artifactFileCount',
      'requestedArtifactRetentionDays',
      'effectiveArtifactExpiresAt',
      'publisher',
      'intentDigest',
      'submissionEvidenceDigest',
      'evidenceJournalEntryCount',
      'evidenceJournalHeadDigest',
      'adapter',
      'destination',
      'attempts',
      'observations',
      'verificationTier',
      'outcome',
      'warnings',
      'provenanceDigest',
      'sbomDigest',
      'startedAt',
      'completedAt',
      'receiptDigest',
    ],
    optional: [
      'supersedesReceiptId',
      'destinationGenerationId',
      'destinationReceiptDigest',
      'verificationDeadlineAt',
      'failure',
      'rollbackOfOperationId',
      'rollbackOfGenerationId',
      'rollbackOfReceiptDigest',
      'rollbackActorId',
      'rollbackReason',
      'supersededByOperationId',
      'supersededByGenerationId',
    ],
  },
  'public-generation-marker': {
    required: ['artifactId', 'artifactDigest', 'generationId'],
    optional: [],
  },
  'adapter-capability': {
    required: [
      'adapter',
      'contractVersion',
      'protocolRange',
      'destinationKinds',
      'operations',
      'staging',
      'activation',
      'concurrency',
      'idempotencyClass',
      'rollback',
      'verification',
      'providerInventoryAssurance',
      'configuration',
      'cacheInvalidation',
      'limits',
      'capabilityDigest',
    ],
    optional: ['filesystemEvidenceDigest'],
  },
};

/**
 * @typedef {{
 *   $schema: string,
 *   $id: string,
 *   additionalProperties: boolean,
 *   required: string[],
 *   properties: Record<string, unknown>,
 *   $defs: Record<string, unknown>
 * }} GeneratedSchema
 */

/**
 * Read one generated schema root.
 *
 * @param {string} contract schema file stem
 * @returns {Promise<GeneratedSchema>} parsed schema
 */
async function readSchema(contract) {
  return /** @type {GeneratedSchema} */ (
    JSON.parse(await readFile(`schemas/${contract}.schema.json`, 'utf8'))
  );
}

test('the T03 schemas have immutable closed Draft 2020-12 identities', async () => {
  for (const contract of Object.keys(ROOT_LEDGERS)) {
    const schema = await readSchema(contract);
    assert.equal(
      schema.$schema,
      'https://json-schema.org/draft/2020-12/schema',
    );
    // SCHEMA-2.10.0: build-provenance alone carries the DEC-097 metadata
    // namespace (urn:gala:metadata:...) rather than the urn:gala:schema:...
    // pattern every other root's $id/schemaId share (see the "buildProvenance
    // stays nested..." test above for the full identity assertion).
    if (contract !== 'build-provenance') {
      assert.equal(schema.$id, `urn:gala:schema:${contract}:2.0.0`);
    }
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(schema.properties.schemaId, { const: schema.$id });
    assert.deepEqual(schema.properties.schemaVersion, { const: '2.0.0' });
  }
});

test('each T03 root property ledger exactly matches DEC-097 through DEC-099', async () => {
  for (const [contract, ledger] of Object.entries(ROOT_LEDGERS)) {
    const schema = await readSchema(contract);
    const required = ['schemaId', 'schemaVersion', ...ledger.required];
    assert.deepEqual(schema.required, required, `${contract}: required`);
    assert.deepEqual(
      Object.keys(schema.properties).sort(),
      [...required, ...ledger.optional].sort(),
      `${contract}: properties`,
    );
  }
});

test('every T03 root embeds the exact same complete 20-scalar definitions', async () => {
  const marker = await readSchema('public-generation-marker');
  assert.equal(Object.keys(marker.$defs).length, 20);
  assert.equal(marker.$defs.passiveVisualToken, false);
  for (const contract of Object.keys(ROOT_LEDGERS)) {
    const schema = await readSchema(contract);
    for (const [name, definition] of Object.entries(marker.$defs)) {
      assert.deepEqual(schema.$defs[name], definition, `${contract}: ${name}`);
    }
  }
});

test('all T03 local references resolve to a private definition', async () => {
  for (const contract of Object.keys(ROOT_LEDGERS)) {
    const schema = await readSchema(contract);
    const references = [
      ...JSON.stringify(schema).matchAll(/"\$ref":"#\/\$defs\/([^"\\]+)"/gu),
    ].map((match) => match[1]);
    for (const reference of references) {
      assert.ok(reference);
      assert.notEqual(
        schema.$defs[reference],
        undefined,
        `${contract}: ${reference}`,
      );
    }
  }
});

test('buildProvenance stays nested in artifact-manifest and is also its own SCHEMA-2.10.0 root', async () => {
  const artifact = await readSchema('artifact-manifest');
  assert.ok(artifact.$defs.buildProvenance);
  for (const contract of Object.keys(ROOT_LEDGERS).filter(
    (name) => name !== 'artifact-manifest' && name !== 'build-provenance',
  )) {
    const schema = await readSchema(contract);
    assert.equal(schema.$defs.buildProvenance, undefined, contract);
  }
  const packageDefinition = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(
    packageDefinition.exports['./schemas/build-provenance.schema.json'],
    './schemas/build-provenance.schema.json',
  );
  const standalone = await readSchema('build-provenance');
  assert.equal(standalone.$id, 'urn:gala:metadata:build-provenance:2.0.0');
  const standaloneSchemaId = /** @type {{const: string}} */ (
    standalone.properties.schemaId
  );
  assert.equal(standaloneSchemaId.const, standalone.$id);
  // The standalone root is NOT the same JSON node as the nested copy (each
  // file resolves its own local $defs independently), but it is the
  // byte-identical closed shape: same required set, same property schemas.
  const nestedBuildProvenance =
    /** @type {{properties: Record<string, unknown>, required: string[]}} */ (
      artifact.$defs.buildProvenance
    );
  assert.deepEqual(
    Object.keys(standalone.properties).sort(),
    Object.keys(nestedBuildProvenance.properties).sort(),
  );
  assert.deepEqual(
    [...standalone.required].sort(),
    [...nestedBuildProvenance.required].sort(),
  );
  // The standalone root does not re-nest itself inside its own $defs.
  assert.equal(standalone.$defs.buildProvenance, undefined);
});

test('the public marker has only its three DEC-097 members and no self-digest', async () => {
  const marker = await readSchema('public-generation-marker');
  assert.deepEqual(Object.keys(marker.properties), [
    'schemaId',
    'schemaVersion',
    'artifactId',
    'artifactDigest',
    'generationId',
  ]);
  assert.equal(JSON.stringify(marker).includes('markerDigest'), false);
});
