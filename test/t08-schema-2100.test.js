import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { Ajv2020 } from 'ajv/dist/2020.js';
import formatsPlugin from 'ajv-formats';
import { parse as parseYaml } from 'yaml';

/**
 * @typedef {Record<string, any>} JsonObject
 */

/** @type {Promise<JsonObject> | undefined} */
let adapterCapabilitySchemaPromise;

/**
 * Read the generated adapter-capability schema once.
 *
 * @returns {Promise<JsonObject>} the parsed schema document
 */
function adapterCapabilitySchema() {
  adapterCapabilitySchemaPromise ??= readFile(
    'schemas/adapter-capability.schema.json',
    'utf8',
  ).then((source) => JSON.parse(source));
  return adapterCapabilitySchemaPromise;
}

const DEPLOY_PHASE_MEMBERS = Object.freeze([
  'pagesActionsArtifactByteCount',
  'pagesActionsArtifactDigest',
]);

test('SCHEMA-2.10.0 LOCAL-62: every capabilityDecision member carries exactly one x-gala-decision-phase', async () => {
  const schema = await adapterCapabilitySchema();
  const capabilityDecision = schema.$defs.capabilityDecision;
  const memberNames = Object.keys(capabilityDecision.properties);
  assert.ok(memberNames.length > 0);
  for (const name of memberNames) {
    const member = capabilityDecision.properties[name];
    const phase = member['x-gala-decision-phase'];
    assert.ok(
      phase === 'issuance' || phase === 'deploy',
      `${name} must carry x-gala-decision-phase: issuance|deploy, got ${JSON.stringify(phase)}`,
    );
  }
});

test('SCHEMA-2.10.0 LOCAL-62: exactly the two Pages build-artifact members are deploy-phase', async () => {
  const schema = await adapterCapabilitySchema();
  const capabilityDecision = schema.$defs.capabilityDecision;
  const deployPhaseMembers = Object.entries(capabilityDecision.properties)
    .filter(([, member]) => member['x-gala-decision-phase'] === 'deploy')
    .map(([name]) => name)
    .sort();
  assert.deepEqual(deployPhaseMembers, [...DEPLOY_PHASE_MEMBERS].sort());
});

test('SCHEMA-2.10.0 LOCAL-62: deploy-phase members are optional (not required) on every branch', async () => {
  const schema = await adapterCapabilitySchema();
  const capabilityDecision = schema.$defs.capabilityDecision;
  assert.ok(
    DEPLOY_PHASE_MEMBERS.every(
      (name) => !capabilityDecision.required.includes(name),
    ),
  );
  for (const branch of capabilityDecision.oneOf) {
    const branchRequired = branch.required ?? [];
    for (const name of DEPLOY_PHASE_MEMBERS) {
      assert.ok(
        !branchRequired.includes(name),
        `${name} must not be required on branch ${JSON.stringify(branch.properties?.adapter?.properties?.adapterId?.const ?? 'unknown')}`,
      );
    }
  }
});

test('SCHEMA-2.10.0 LOCAL-62: capabilityDecision description states the issuance-phase digest scope', async () => {
  const schema = await adapterCapabilitySchema();
  const capabilityDecision = schema.$defs.capabilityDecision;
  assert.match(capabilityDecision.description, /issuance-phase/);
  assert.match(capabilityDecision.description, /capabilityDecisionDigest/);
});

test('SCHEMA-2.10.0 LOCAL-62: a github-pages capabilityDecision record without the two deploy-phase members is still valid', async () => {
  const { validateRegisteredFragment } =
    await import('../src/internal/schema-validator.js');
  const vectors = JSON.parse(
    await readFile('parity/digest-record-vectors.json', 'utf8'),
  );
  const vectorList = Array.isArray(vectors) ? vectors : vectors.vectors;
  const pagesVector = vectorList.find(
    /**
     * @param {JsonObject} vector one digest-record vector
     * @returns {boolean} whether this is the github-pages capabilityDecision vector
     */
    (vector) =>
      vector.profile === 'capabilityDecision' &&
      vector.input?.adapter?.adapterId === 'github-pages',
  );
  assert.ok(pagesVector, 'expected a github-pages capabilityDecision vector');
  const {
    pagesActionsArtifactByteCount,
    pagesActionsArtifactDigest,
    ...record
  } = pagesVector.input;
  assert.ok(pagesActionsArtifactByteCount);
  assert.ok(pagesActionsArtifactDigest);
  const result = validateRegisteredFragment(
    'urn:gala:schema:adapter-capability:2.0.0',
    '#/$defs/capabilityDecision',
    record,
  );
  assert.equal(result.valid, true, JSON.stringify(result));
});

/** @type {Promise<JsonObject> | undefined} */
let bundlePromise;

/**
 * Read the deterministic OpenAPI bundle once.
 *
 * @returns {Promise<JsonObject>} the parsed bundle
 */
function bundle() {
  bundlePromise ??= readFile('openapi/openapi.yaml', 'utf8').then((source) =>
    parseYaml(source),
  );
  return bundlePromise;
}

/**
 * Compile one bundle component against the whole bundle, with formats.
 *
 * @param {string} name component schema name
 * @returns {Promise<import('ajv').ValidateFunction>} compiled validator
 */
async function compileBundleComponent(name) {
  const document = await bundle();
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  /** @type {import('ajv-formats').default} */ (
    /** @type {unknown} */ (formatsPlugin)
  )(ajv);
  ajv.addSchema({ ...document, $id: 'urn:gala:openapi:bundle-2100' });
  return ajv.compile({
    $ref: `urn:gala:openapi:bundle-2100#/components/schemas/${name}`,
  });
}

const DESTINATION_PATH =
  '/v2/organizations/{organizationId}/publications/{publicationId}/destination';

test('SCHEMA-2.10.0 LOCAL-63: the destination GET/PUT operations exist with the pinned extension values', async () => {
  const document = await bundle();
  const item = document.paths[DESTINATION_PATH];
  assert.ok(item, 'destination path is absent');
  const get = item.get;
  assert.equal(
    get.operationId,
    'getOrganizationsByOrganizationIdPublicationsByPublicationIdDestination',
  );
  assert.equal(get['x-gala-capability-key'], 'publication.view');
  assert.equal(get['x-gala-success-category'], 'query');
  assert.equal(get['x-gala-replay-identity'], 'safe-query');
  assert.equal(
    get.responses['200'].content['application/json'].schema.$ref,
    '#/components/schemas/GetOrganizationsByOrganizationIdPublicationsByPublicationIdDestinationResponse',
  );

  const put = item.put;
  assert.equal(
    put.operationId,
    'putOrganizationsByOrganizationIdPublicationsByPublicationIdDestination',
  );
  assert.equal(put['x-gala-capability-key'], 'publication.settings.manage');
  assert.equal(put['x-gala-success-category'], 'update');
  assert.equal(put['x-gala-concurrency'], 'if-match');
  assert.equal(put['x-gala-replay-identity'], 'idempotency-key');
  assert.deepEqual(put['x-gala-state-guards'], [
    'Publication:PROVISIONING|ACTIVE|PAUSED',
    'PublicationDestination:UNSET|SET',
  ]);
  const paramNames = put.parameters.map(
    /**
     * @param {JsonObject} p one parameter object
     * @returns {string} its `$ref` or `name`
     */
    (p) => p.$ref ?? p.name,
  );
  assert.ok(paramNames.includes('#/components/parameters/IfMatch'));
  assert.ok(paramNames.includes('#/components/parameters/IdempotencyKey'));
  assert.ok(paramNames.includes('#/components/parameters/XCsrfToken'));
  assert.equal(
    put.responses['200'].content['application/json'].schema.$ref,
    '#/components/schemas/PutOrganizationsByOrganizationIdPublicationsByPublicationIdDestinationResponse',
  );
});

test('SCHEMA-2.10.0 LOCAL-63: postPublishes gains the PublicationDestination:SET|LOCKED state guard', async () => {
  const document = await bundle();
  const publishes =
    document.paths[
      '/v2/organizations/{organizationId}/publications/{publicationId}/publishes'
    ].post;
  assert.deepEqual(publishes['x-gala-state-guards'], [
    'Publication:ACTIVE',
    'RepositoryBinding:ACTIVE',
    'Review:APPROVED',
    'PublicationDestination:SET|LOCKED',
  ]);
});

test('SCHEMA-2.10.0 LOCAL-63: state UNSET with version 0 is the honest no-record representation', async () => {
  const validate = await compileBundleComponent(
    'GetOrganizationsByOrganizationIdPublicationsByPublicationIdDestinationResponse',
  );
  const document = await bundle();
  const component =
    document.components.schemas
      .GetOrganizationsByOrganizationIdPublicationsByPublicationIdDestinationResponse;
  assert.deepEqual(component.required, ['publicationId', 'version', 'state']);
  const unset = {
    publicationId: '018f0000-0000-7000-8000-000000000001',
    version: 0,
    state: 'UNSET',
  };
  assert.equal(validate(unset), true, JSON.stringify(validate.errors));
  assert.equal(
    validate({ ...unset, adapterId: 'do-spaces' }),
    false,
    'adapterId without environment/providerBinding must still be rejected by the per-adapter branch',
  );
});

test('SCHEMA-2.10.0 LOCAL-63: the response providerBinding is a discriminated union keyed on adapterId', async () => {
  const validate = await compileBundleComponent(
    'GetOrganizationsByOrganizationIdPublicationsByPublicationIdDestinationResponse',
  );
  const base = {
    publicationId: '018f0000-0000-7000-8000-000000000001',
    version: 1,
  };
  const digest = `sha256:${'ab'.repeat(32)}`;
  const spacesBinding = {
    region: 'nyc3',
    servedBucket: 'gala-served',
    stagingBucket: 'gala-staging',
    basePath: '/',
    websiteOrigin: 'https://gala-served.nyc3-static.digitaloceanspaces.com',
    servedApiOrigin: 'https://gala-served.nyc3.digitaloceanspaces.com',
    stagingApiOrigin: 'https://gala-staging.nyc3.digitaloceanspaces.com',
    targetDigest: digest,
    mutationKeyDigest: digest,
    regionCatalogDigest: digest,
    websiteConfigurationDigest: digest,
    controlPlaneBindingDigest: digest,
  };
  const cases = [
    [{ ...base, state: 'SET' }, true],
    [
      {
        ...base,
        state: 'SET',
        adapterId: 'github-pages',
        environment: 'github-pages',
      },
      true,
    ],
    [
      {
        ...base,
        state: 'SET',
        adapterId: 'github-pages',
        environment: 'github-pages',
        providerBinding: {
          owner: 'rathnasgala2',
          repository: 'example.site',
          repositoryId: '1039410932',
        },
      },
      true,
    ],
    [
      {
        ...base,
        state: 'SET',
        adapterId: 'github-pages',
        environment: 'github-pages',
        providerBinding: { ...spacesBinding },
      },
      false,
    ],
    [
      {
        ...base,
        state: 'SET',
        adapterId: 'do-spaces',
        environment: 'do-spaces',
        providerBinding: spacesBinding,
      },
      true,
    ],
    [
      {
        ...base,
        state: 'SET',
        adapterId: 'do-spaces',
        environment: 'do-spaces',
        providerBinding: {
          owner: 'rathnasgala2',
          repository: 'example.site',
          repositoryId: '1039410932',
        },
      },
      false,
    ],
    [
      {
        ...base,
        state: 'SET',
        adapterId: 'do-spaces',
        environment: 'do-spaces',
      },
      false,
    ],
    [
      {
        ...base,
        state: 'SET',
        adapterId: 'local-directory',
        environment: 'local-directory',
      },
      true,
    ],
    [
      {
        ...base,
        state: 'SET',
        adapterId: 'local-directory',
        environment: 'local-directory',
        providerBinding: {},
      },
      false,
    ],
    [
      {
        ...base,
        state: 'LOCKED',
        adapterId: 'do-spaces',
        environment: 'do-spaces',
        providerBinding: spacesBinding,
        lockedAt: '2026-09-18T00:00:00.000Z',
        lockedByOperationId: '018f0000-0000-7000-8000-000000000002',
        admittedRegions: ['nyc3', 'sfo3'],
      },
      true,
    ],
  ];
  for (const [candidate, expected] of cases) {
    assert.equal(
      validate(candidate),
      expected,
      `${JSON.stringify(candidate)} -> ${JSON.stringify(validate.errors)}`,
    );
  }
});

test('SCHEMA-2.10.0 LOCAL-63: the PUT request forbids providerBinding for github-pages/local-directory and requires it for do-spaces', async () => {
  const validate = await compileBundleComponent(
    'PutOrganizationsByOrganizationIdPublicationsByPublicationIdDestinationRequest',
  );
  const spacesBinding = {
    region: 'nyc3',
    servedBucket: 'gala-served',
    stagingBucket: 'gala-staging',
  };
  const cases = [
    [{ adapterId: 'github-pages' }, true],
    [{ adapterId: 'local-directory' }, true],
    [{ adapterId: 'github-pages', providerBinding: {} }, false],
    [{ adapterId: 'local-directory', providerBinding: {} }, false],
    [{ adapterId: 'do-spaces', providerBinding: spacesBinding }, true],
    [
      {
        adapterId: 'do-spaces',
        providerBinding: { ...spacesBinding, basePath: '/docs/' },
      },
      true,
    ],
    [{ adapterId: 'do-spaces' }, false],
    [
      {
        adapterId: 'do-spaces',
        providerBinding: { region: 'nyc3', servedBucket: 'gala-served' },
      },
      false,
    ],
    [{ adapterId: 'cloudflare-pages' }, false],
  ];
  for (const [candidate, expected] of cases) {
    assert.equal(
      validate(candidate),
      expected,
      `${JSON.stringify(candidate)} -> ${JSON.stringify(validate.errors)}`,
    );
  }
});

test('SCHEMA-2.10.0 LOCAL-63: the receipt-exchange request family is byte-unchanged from 2.9.0', async () => {
  const document = await bundle();
  const names = [
    'ReceiptExchangeDeploymentIntentRequest',
    'ReceiptExchangeIntentRequestDestination',
    'ReceiptExchangeIntentRequestProviderBinding',
    'ReceiptExchangeIntentRequestRebuildRecord',
  ];
  /**
   * @param {unknown} value value to canonicalize
   * @returns {unknown} the value with every object's keys sorted
   */
  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === 'object') {
      /** @type {JsonObject} */
      const out = {};
      for (const key of Object.keys(value).sort()) {
        out[key] = canonicalize(/** @type {JsonObject} */ (value)[key]);
      }
      return out;
    }
    return value;
  }
  /** @type {JsonObject} */
  const combined = {};
  for (const name of names) {
    combined[name] = canonicalize(document.components.schemas[name]);
  }
  const digest = createHash('sha256')
    .update(JSON.stringify(combined))
    .digest('hex');
  assert.equal(
    digest,
    'b195f55837bcf0c15e4e4543eac41d83e9aed8ed79625f52b6e252e8527e991d',
    'the receipt-exchange request family moved since SCHEMA-2.9.0; Spaces providerBinding must stay forbidden on the request until a future packet, per LOCAL-63d',
  );
});
