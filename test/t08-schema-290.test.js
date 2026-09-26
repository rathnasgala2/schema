import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { Ajv2020 } from 'ajv/dist/2020.js';
import formatsPlugin from 'ajv-formats';
import { parse as parseYaml } from 'yaml';

import { createDigestParityCases } from '../scripts/validator-parity.mjs';
import { hexFromBytes } from '../src/internal/bytes.js';
import { ACTIVE_DIGEST_PROFILES } from '../src/internal/digest-profiles.js';
import { validateRegisteredFragment } from '../src/internal/schema-validator.js';

/**
 * @typedef {Record<string, any>} JsonObject
 */

const INTENT_SCHEMA = '../schemas/deployment-intent.schema.json#/$defs/';
const ADAPTERS = Object.freeze([
  'github-pages',
  'do-spaces',
  'local-directory',
]);
/** The four Gala-owned rebuild-record members (design section 1.1-1.2). */
const API_DERIVED_REBUILD_MEMBERS = Object.freeze([
  'packageReleaseCatalogDigest',
  'destinationCapabilityDigest',
  'policyReleaseId',
  'buildPolicyDecisionDigest',
]);
/** Every root schema that carries `$defs/destinationIdentity`. */
const DESTINATION_CARRIERS = Object.freeze([
  'deployment-intent',
  'deployment-receipt',
  'deployment-observation',
  'adapter-capability',
]);
const DIGEST_ONE = `sha256:${'01'.repeat(32)}`;
const REVIEWS_PATH =
  '/v2/organizations/{organizationId}/publications/{publicationId}/reviews';

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
 * Read one committed JSON document.
 *
 * @param {string} file repository-relative path
 * @returns {Promise<JsonObject>} the parsed document
 */
async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

/**
 * Compile one bundle component against the whole bundle, with formats, so the
 * request validates exactly as a strict generated consumer would validate it.
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
  ajv.addSchema({ ...document, $id: 'urn:gala:openapi:bundle-290' });
  return ajv.compile({
    $ref: `urn:gala:openapi:bundle-290#/components/schemas/${name}`,
  });
}

/**
 * Compile one root-schema definition without format checks.
 *
 * @param {JsonObject} root the root schema
 * @param {string} definition `$defs` member name
 * @returns {import('ajv').ValidateFunction} compiled validator
 */
function compileDefinition(root, definition) {
  return new Ajv2020({ strict: false, validateFormats: false }).compile({
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $defs: root.$defs,
    $ref: `#/$defs/${definition}`,
  });
}

/**
 * Build one complete 2.8.1-valid deployment-intent request for an adapter,
 * from the canonical retained intent so every shared member is contract-exact.
 *
 * @param {string} adapterId the adapter identity
 * @returns {Promise<JsonObject>} the request body
 */
async function fullRequest(adapterId) {
  const intent = await readJson(
    'examples/valid/deployment-intent/canonical.json',
  );
  const providerBinding = {
    'github-pages': { owner: 'rathnasgala2', repository: 'example.site' },
    'do-spaces': undefined,
    'local-directory': undefined,
  }[adapterId];
  return {
    purpose: 'deployment-intent',
    sourceCommit: intent.sourceCommit,
    workflowTriggerCommit: intent.workflowTriggerCommit,
    artifactId: intent.artifactId,
    artifactDigest: intent.artifactDigest,
    manifestDigest: intent.manifestDigest,
    provenanceDigest: intent.provenanceDigest,
    sbomDigest: intent.sbomDigest,
    frozenHandoffArtifactId: intent.frozenHandoffArtifactId,
    frozenHandoffName: intent.frozenHandoffName,
    frozenEnvelopeDigest: intent.frozenEnvelopeDigest,
    // The request spells its counts as integers; the retained root as int64
    // decimal strings.
    frozenEnvelopeByteCount: 66_560,
    artifactByteCount: 65_536,
    artifactFileCount: 12,
    requestedArtifactRetentionDays: intent.requestedArtifactRetentionDays,
    effectiveArtifactExpiresAt: intent.effectiveArtifactExpiresAt,
    verificationSubmission: {
      state: 'unfit',
      reason: 'entry-count-exceeded',
      requiredVerificationEntryCount: 1200,
      canonicalFitRequestByteCount: 4_200_000,
    },
    lockDigest: intent.lockDigest,
    rebuildRecord: intent.rebuildRecord,
    publisher: intent.publisher,
    adapter: { ...intent.adapter, adapterId },
    destination: {
      environment: adapterId,
      adapterId,
      adapterVersion: intent.destination.adapterVersion,
      targetDigest: intent.destination.targetDigest,
      baseUrl: intent.destination.baseUrl,
      ...(providerBinding ? { providerBinding } : {}),
    },
    ...(adapterId === 'github-pages'
      ? { pagesBuildVersion: 'a'.repeat(40) }
      : {}),
    ...(adapterId === 'do-spaces'
      ? { spacesStagePrefix: '_gala/staged/v2/x/y/z/' }
      : {}),
    capabilityDecisionDigest: intent.capabilityDecisionDigest,
  };
}

/**
 * Copy a record without the named members.
 *
 * @param {JsonObject} record source record
 * @param {readonly string[]} members members to drop
 * @returns {JsonObject} the reduced copy
 */
function without(record, members) {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => !members.includes(key)),
  );
}

/**
 * Rewrite a retained-record property so it reads as the request component
 * spells it: external `$ref`s into the deployment-intent root, no description.
 *
 * @param {unknown} value the retained property schema
 * @returns {unknown} the expected request spelling
 */
function asRequestSpelling(value) {
  if (Array.isArray(value)) return value.map(asRequestSpelling);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, member]) => [
      key,
      key === '$ref'
        ? `${INTENT_SCHEMA}${String(member).slice('#/$defs/'.length)}`
        : asRequestSpelling(member),
    ]),
  );
}

/**
 * Walk a directory tree and yield every JSON file path.
 *
 * @param {string} directory root directory
 * @returns {Promise<string[]>} sorted file paths
 */
async function jsonFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) return jsonFiles(full);
      return entry.name.endsWith('.json') ? [full] : [];
    }),
  );
  return nested.flat().sort();
}

/**
 * Collect every `{adapterId, environment}` pair carried by a document.
 *
 * @param {unknown} value any JSON value
 * @param {Array<{adapterId: unknown, environment: unknown}>} found accumulator
 * @returns {Array<{adapterId: unknown, environment: unknown}>} the pairs
 */
function destinationPairs(value, found = []) {
  if (Array.isArray(value)) {
    for (const item of value) destinationPairs(item, found);
  } else if (value !== null && typeof value === 'object') {
    const record = /** @type {JsonObject} */ (value);
    if ('environment' in record && 'targetDigest' in record) {
      found.push({
        adapterId: record.adapterId,
        environment: record.environment,
      });
    }
    for (const member of Object.values(record)) destinationPairs(member, found);
  }
  return found;
}

test('the intent request no longer requires what the API derives (LOCAL-60)', async () => {
  const document = await bundle();
  const request =
    document.components.schemas.ReceiptExchangeDeploymentIntentRequest;
  assert.deepEqual(request.properties.destination, {
    $ref: '#/components/schemas/ReceiptExchangeIntentRequestDestination',
  });
  assert.deepEqual(request.properties.rebuildRecord, {
    $ref: '#/components/schemas/ReceiptExchangeIntentRequestRebuildRecord',
  });
  assert.ok(!request.required.includes('capabilityDecisionDigest'));
  for (const member of [
    'provenanceDigest',
    'sbomDigest',
    'destination',
    'rebuildRecord',
    'lockDigest',
    'publisher',
    'adapter',
  ]) {
    assert.ok(request.required.includes(member), `${member} stays required`);
  }
  const derived = [
    request.properties.capabilityDecisionDigest,
    document.components.schemas.ReceiptExchangeIntentRequestDestination
      .properties.environment,
    document.components.schemas.ReceiptExchangeIntentRequestDestination
      .properties.targetDigest,
    ...API_DERIVED_REBUILD_MEMBERS.map(
      (member) =>
        document.components.schemas.ReceiptExchangeIntentRequestRebuildRecord
          .properties[member],
    ),
  ];
  for (const member of derived) {
    // LOCAL-57 wording: api-derived, a present disagreeing value is refused.
    assert.match(String(member.description), /derives/u);
    assert.match(String(member.description), /422\s+VALIDATION_FAILED/u);
  }
  assert.match(String(request.description), /2\.8\.x request body/u);
});

test('a complete 2.8.1 request body is still valid and the reduced 2.9.0 body is valid', async () => {
  const validate = await compileBundleComponent(
    'ReceiptExchangeDeploymentIntentRequest',
  );
  for (const adapterId of ADAPTERS) {
    const full = await fullRequest(adapterId);
    assert.equal(validate(full), true, JSON.stringify(validate.errors));
    const reduced = {
      ...without(full, ['capabilityDecisionDigest']),
      destination: without(full.destination, ['environment', 'targetDigest']),
      rebuildRecord: without(full.rebuildRecord, API_DERIVED_REBUILD_MEMBERS),
    };
    assert.equal(validate(reduced), true, JSON.stringify(validate.errors));
    for (const member of ['provenanceDigest', 'sbomDigest', 'destination']) {
      assert.equal(validate(without(reduced, [member])), false, member);
    }
    assert.equal(
      validate({
        ...reduced,
        destination: without(reduced.destination, ['adapterId']),
      }),
      false,
    );
    assert.equal(
      validate({
        ...reduced,
        rebuildRecord: without(reduced.rebuildRecord, ['workflowIdentity']),
      }),
      false,
    );
    assert.equal(validate({ ...reduced, extra: true }), false);
    assert.equal(
      validate({
        ...reduced,
        adapter: { ...full.adapter, adapterId: 'cloudflare-pages' },
        destination: { ...reduced.destination, adapterId: 'cloudflare-pages' },
      }),
      false,
      'an adapter outside the vocabulary is refused on the request',
    );
    assert.equal(
      validate({
        ...reduced,
        destination: { ...reduced.destination, environment: 'production' },
      }),
      false,
      'environment is the closed adapter vocabulary',
    );
  }
});

test('the request destination admits provider binding material per adapter', async () => {
  const validate = await compileBundleComponent(
    'ReceiptExchangeIntentRequestDestination',
  );
  const document = await bundle();
  const component =
    document.components.schemas.ReceiptExchangeIntentRequestDestination;
  assert.deepEqual(component.required, [
    'adapterId',
    'adapterVersion',
    'baseUrl',
  ]);
  assert.deepEqual(component.properties.environment.enum, [...ADAPTERS]);
  const base = { adapterVersion: '2.0.0', baseUrl: 'https://example.site/' };
  const pages = { ...base, adapterId: 'github-pages' };
  const spaces = { ...base, adapterId: 'do-spaces' };
  const local = { ...base, adapterId: 'local-directory' };
  const coordinates = { owner: 'rathnasgala2', repository: 'example.site' };
  const localBinding = {
    rootIdentityDigest: DIGEST_ONE,
    mutationSurfaceDigest: DIGEST_ONE,
  };
  const cases = [
    [pages, true],
    [{ ...pages, environment: 'github-pages', targetDigest: DIGEST_ONE }, true],
    [{ ...pages, providerBinding: coordinates }, true],
    [{ ...pages, providerBinding: { owner: 'rathnasgala2' } }, false],
    [{ ...pages, providerBinding: { ...coordinates, region: 'nyc3' } }, false],
    [{ ...pages, providerBinding: localBinding }, false],
    [{ ...pages, environment: 'do-spaces' }, false],
    [spaces, true],
    [{ ...spaces, environment: 'do-spaces' }, true],
    // Spaces coordinates are bound to the author destination, never proposed by
    // a deploy job: forbidden on the request until C2.
    [
      {
        ...spaces,
        providerBinding: {
          region: 'nyc3',
          servedBucket: 'gala-served',
          stagingBucket: 'gala-staging',
        },
      },
      false,
    ],
    [{ ...spaces, providerBinding: {} }, false],
    [{ ...spaces, environment: 'github-pages' }, false],
    [local, true],
    [{ ...local, providerBinding: localBinding }, true],
    [{ ...local, providerBinding: { rootIdentityDigest: DIGEST_ONE } }, false],
    [{ ...local, providerBinding: coordinates }, false],
    [{ ...local, environment: 'local-directory' }, true],
    [{ ...local, environment: 'do-spaces' }, false],
    [{ ...pages, environment: 'production' }, false],
    [{ ...pages, targetDigest: 'sha1:00' }, false],
    [without(pages, ['adapterVersion']), false],
    [without(pages, ['baseUrl']), false],
    [{ ...pages, extra: 1 }, false],
    // An adapter outside the vocabulary must be refused by `adapterId` itself,
    // not admitted because no per-adapter branch matches it.
    [{ ...base, adapterId: 'cloudflare-pages' }, false],
    [
      { ...base, adapterId: 'cloudflare-pages', environment: 'github-pages' },
      false,
    ],
    [{ ...base, adapterId: 'cloudflare-pages', providerBinding: {} }, false],
    [
      {
        ...base,
        adapterId: 'cloudflare-pages',
        providerBinding: {
          owner: 'rathnasgala2',
          rootIdentityDigest: DIGEST_ONE,
        },
      },
      false,
    ],
    [{ ...base, adapterId: 'fixture-1' }, false],
  ];
  assert.deepEqual(component.properties.adapterId.enum, [...ADAPTERS]);
  for (const [candidate, expected] of cases) {
    assert.equal(
      validate(candidate),
      expected,
      `${JSON.stringify(candidate)} -> ${JSON.stringify(validate.errors)}`,
    );
  }
});

test('the request rebuild record restates the retained record with four Gala-owned members optional', async () => {
  // The reviewed source spells every member by the retained definition's own
  // `$defs` reference; the bundler then renames those to `Portable...`
  // components exactly as it does for the retained record.
  const source = parseYaml(
    await readFile('openapi/source/components.yaml', 'utf8'),
  );
  const request =
    source.components.schemas.ReceiptExchangeIntentRequestRebuildRecord;
  const intent = await readJson('schemas/deployment-intent.schema.json');
  const retained = intent.$defs.recordReproducibleBuildRecord;
  assert.equal(request.additionalProperties, false);
  assert.deepEqual(
    Object.keys(request.properties).sort(),
    Object.keys(retained.properties).sort(),
  );
  for (const [member, schema] of Object.entries(retained.properties)) {
    assert.deepEqual(
      without(request.properties[member], ['description']),
      asRequestSpelling(schema),
      `${member} drifted from the retained definition`,
    );
  }
  assert.deepEqual(
    request.required,
    retained.required.filter(
      (/** @type {string} */ member) =>
        !API_DERIVED_REBUILD_MEMBERS.includes(member),
    ),
  );
  // The retained record is unchanged: every member required, in DEC-097 order.
  assert.deepEqual(retained.required, [
    'repositoryId',
    'sourceCommit',
    'sourceTree',
    'repositoryRootDigest',
    'buildEpoch',
    'contractVersion',
    'builder',
    'schemas',
    'template',
    'theme',
    'dependencyLockDigest',
    'packageReleaseCatalogDigest',
    'buildInputDigest',
    'baseUrl',
    'basePath',
    'destinationCapabilityDigest',
    'policyReleaseId',
    'buildPolicyDecisionDigest',
    'stylingContractDigest',
    'renderPolicy',
    'workflowIdentity',
  ]);
  // The retained intent root still requires the members the request relaxed.
  for (const member of [
    'destination',
    'rebuildRecord',
    'capabilityDecisionDigest',
    'policyReleaseId',
    'subject',
  ]) {
    assert.ok(intent.required.includes(member), member);
  }
  assert.deepEqual(intent.$defs.destinationIdentity.required, [
    'environment',
    'adapterId',
    'adapterVersion',
    'targetDigest',
    'baseUrl',
  ]);
});

test('environment is one constant per adapter wherever destinationIdentity is carried (LOCAL-60a)', async () => {
  for (const contract of DESTINATION_CARRIERS) {
    const root = await readJson(`schemas/${contract}.schema.json`);
    const identity = root.$defs.destinationIdentity;
    assert.deepEqual(identity.properties.environment.enum, [...ADAPTERS]);
    for (const adapterId of ADAPTERS) {
      assert.ok(
        identity.allOf.some(
          (/** @type {JsonObject} */ branch) =>
            branch.if?.properties?.adapterId?.const === adapterId &&
            branch.then?.properties?.environment?.const === adapterId,
        ),
        `${contract}: ${adapterId} branch`,
      );
    }
    const validate = compileDefinition(root, 'destinationIdentity');
    const base = {
      adapterVersion: '2.0.0',
      baseUrl: 'https://example.site/',
      targetDigest: DIGEST_ONE,
    };
    for (const adapterId of ADAPTERS) {
      assert.equal(
        validate({ ...base, adapterId, environment: adapterId }),
        true,
      );
      for (const other of ADAPTERS.filter((name) => name !== adapterId)) {
        assert.equal(
          validate({ ...base, adapterId, environment: other }),
          false,
          `${contract}: ${adapterId} with ${other}`,
        );
      }
      assert.equal(
        validate({ ...base, adapterId, environment: 'production' }),
        false,
      );
      assert.equal(validate({ ...base, adapterId }), false, 'still required');
    }
    // A fixture-only adapter identity is not one of the three, so it may carry
    // any member of the closed vocabulary; nothing outside it.
    assert.equal(
      validate({ ...base, adapterId: 'fixture-1', environment: 'do-spaces' }),
      true,
    );
    assert.equal(
      validate({ ...base, adapterId: 'fixture-1', environment: 'fixture-1' }),
      false,
    );
  }
  // Every committed valid document and consumer fixture complies.
  const files = [
    ...(await jsonFiles('examples/valid')),
    ...(await jsonFiles('fixtures/s2')),
    ...(await jsonFiles('fixtures/s4')),
  ];
  let seen = 0;
  for (const file of files) {
    for (const pair of destinationPairs(await readJson(file))) {
      if (typeof pair.environment !== 'string') continue;
      seen += 1;
      assert.ok(
        ADAPTERS.includes(pair.environment),
        `${file}: environment ${pair.environment}`,
      );
      if (ADAPTERS.includes(String(pair.adapterId))) {
        assert.equal(pair.environment, pair.adapterId, file);
      }
    }
  }
  assert.ok(seen > 20, `only ${seen} destinations inspected`);
});

test('the intent subject stays the Gala workload URN, not the OIDC ref form', async () => {
  const intent = await readJson('schemas/deployment-intent.schema.json');
  assert.deepEqual(intent.properties.subject, { $ref: '#/$defs/urn' });
  const urn = intent.$defs.urn;
  assert.equal(urn.pattern, '^urn:gala:[\\x21-\\x7E]+$');
  assert.equal(urn.minLength, 10);
  assert.equal(urn.maxLength, 255);
  const admits = new RegExp(urn.pattern, 'u');
  // DEC-097 section 6: `urn:gala:workload:github:<repositoryId>:<runId>:<runAttempt>`.
  assert.equal(admits.test('urn:gala:workload:github:1039410932:1801:1'), true);
  // The GitHub OIDC `sub` form the api renders today is not a Gala URN; the
  // ref is bound through `workloadBindingDigest` (verifiedWorkloadBinding.ref).
  assert.equal(
    admits.test(
      'repo:rathnasgala2/example.site:ref:refs/heads/gala/publish/018f0000-0000-7000-8000-000000000001',
    ),
    false,
  );
  assert.ok(intent.required.includes('workloadBindingDigest'));
});

test('the reviews list and read are admitted by publication.view (LOCAL-45/50 pattern)', async () => {
  const document = await bundle();
  const catalog = await readJson('openapi/http-catalog.json');
  for (const route of [REVIEWS_PATH, `${REVIEWS_PATH}/{reviewId}`]) {
    const operation = document.paths[route].get;
    assert.equal(operation['x-gala-capability-key'], 'publication.review');
    assert.deepEqual(operation['x-gala-conditional-capability-keys'], [
      { capabilityKey: 'publication.view', condition: 'read-only' },
    ]);
    const row = catalog.operations.find(
      (/** @type {JsonObject} */ candidate) =>
        candidate.operationId === operation.operationId,
    );
    assert.deepEqual(row.conditionalCapabilityKeys, ['publication.view']);
  }
  for (const method of ['post']) {
    assert.equal(
      document.paths[REVIEWS_PATH][method][
        'x-gala-conditional-capability-keys'
      ],
      undefined,
      'the review request stays gated by publication.review alone',
    );
  }
});

test('starting a publish names /scheduledFor in its INVALID_SOURCE_STATE example', async () => {
  const document = await bundle();
  const publish =
    document.paths[
      '/v2/organizations/{organizationId}/publications/{publicationId}/publishes'
    ].post;
  const example =
    publish.responses['409'].content['application/problem+json'].examples
      .INVALID_SOURCE_STATE.value;
  assert.equal(example.status, 409);
  assert.deepEqual(example.errors, [
    { code: 'INVALID_SOURCE_STATE', pointer: '/scheduledFor' },
  ]);
  assert.ok(publish.requestBody.content['application/json'].schema);
});

test('the DEC-097 record vectors reproduce through the profiles and validate against the roots', async () => {
  const { vectors } = await readJson('parity/digest-record-vectors.json');
  assert.equal(vectors.length, 16);
  const byId = new Map(
    vectors.map((/** @type {JsonObject} */ vector) => [
      vector.vectorId,
      vector,
    ]),
  );
  const profileCounts = new Map();
  for (const vector of vectors) {
    const profile = ACTIVE_DIGEST_PROFILES[vector.profile];
    assert.ok(profile, vector.profile);
    profileCounts.set(
      vector.profile,
      (profileCounts.get(vector.profile) ?? 0) + 1,
    );
    assert.equal(
      hexFromBytes(profile.preimage(vector.input)),
      vector.preimageHex,
      vector.vectorId,
    );
    assert.equal(
      profile.digest(vector.input),
      `sha256:${vector.digestHex}`,
      vector.vectorId,
    );
    if (vector.selfMember !== null) {
      // The record carries its own digest, which the projection omits.
      assert.equal(
        vector.input[vector.selfMember],
        `sha256:${vector.digestHex}`,
      );
      assert.equal(
        profile.digest({ ...vector.input, [vector.selfMember]: DIGEST_ONE }),
        `sha256:${vector.digestHex}`,
      );
    }
    assert.match(String(vector.decRef), /^DEC-097 section [5-8]/u);
  }
  assert.deepEqual(Object.fromEntries(profileCounts), {
    destinationProviderBinding: 4,
    destinationMutationKey: 3,
    capabilityDecision: 3,
    buildPolicyDecision: 2,
    spacesWebsiteConfiguration: 2,
    spacesControlPlaneBinding: 1,
    spacesRegionCatalog: 1,
  });
  const schemaId = 'urn:gala:schema:adapter-capability:2.0.0';
  const fragments = {
    destinationProviderBinding: '#/$defs/destinationProviderBinding',
    capabilityDecision: '#/$defs/capabilityDecision',
  };
  for (const vector of vectors) {
    const pointer = /** @type {Record<string, string>} */ (fragments)[
      vector.profile
    ];
    if (pointer === undefined) continue;
    const result = validateRegisteredFragment(schemaId, pointer, vector.input);
    assert.equal(
      result.valid,
      true,
      `${vector.vectorId}: ${JSON.stringify(result)}`,
    );
  }
  for (const kind of ADAPTERS) {
    const binding = byId.get(`destination-provider-binding-${kind}`);
    const key = byId.get(`destination-mutation-key-${kind}`);
    const decision = byId.get(`capability-decision-${kind}`);
    assert.equal(binding.input.kind, kind);
    assert.equal(key.input.kind, kind);
    // DEC-097 lines 3303-3309: the fence key material per adapter.
    assert.deepEqual(
      Object.keys(key.input).sort(),
      {
        'github-pages': ['kind', 'repositoryId'],
        'do-spaces': ['kind', 'region', 'servedBucket'],
        'local-directory': ['kind', 'mutationSurfaceDigest'],
      }[kind],
    );
    // The capability decision embeds the destination whose `targetDigest` is
    // the binding digest (DEC-097 line 7321), and its environment constant.
    assert.equal(
      decision.input.destination.targetDigest,
      `sha256:${binding.digestHex}`,
    );
    assert.equal(decision.input.destination.environment, kind);
    assert.equal(decision.input.adapter.adapterId, kind);
  }
  for (const vector of vectors.filter(
    (/** @type {JsonObject} */ candidate) =>
      candidate.profile === 'buildPolicyDecision',
  )) {
    assert.equal(vector.input.profile, 'gala-build-policy-decision-v2');
    assert.deepEqual(vector.input.approvedOverrides, []);
    const hasWarning = vector.input.findings.some(
      (/** @type {JsonObject} */ finding) => finding.severity === 'warning',
    );
    assert.equal(
      vector.input.policyResult,
      hasWarning ? 'pass-with-warnings' : 'pass',
    );
  }
  // Every vector is a cross-language parity case, valid and tampered.
  const cases = await createDigestParityCases();
  const recordCases = cases.filter((entry) =>
    entry.caseId.startsWith('digest:record:'),
  );
  // SCHEMA-2.10.0 added five vectors (sixteen total): 160 + 32.
  assert.equal(cases.length, 160 + 32);
  assert.equal(recordCases.length, 32);
  for (const vector of vectors) {
    assert.ok(
      recordCases.some(
        (entry) =>
          entry.caseId === `digest:record:${vector.vectorId}:valid` &&
          entry.presentedDigest === `sha256:${vector.digestHex}` &&
          entry.preimageHex === vector.preimageHex,
      ),
      vector.vectorId,
    );
  }
  const expectations = await readJson('diagnostics/parity-expectations.json');
  for (const entry of recordCases) {
    assert.deepEqual(expectations.digest[entry.caseId], {
      valid: entry.expectedValid,
      codes: entry.expectedCodes,
    });
  }
});

test('requesting a review from a confirmed change no longer requires sourceRevision (LOCAL-57 pattern)', async () => {
  const document = await bundle();
  const name =
    'PostOrganizationsByOrganizationIdPublicationsByPublicationIdReviewsRequest';
  const request = document.components.schemas[name];
  assert.equal(request.required, undefined);
  assert.deepEqual(request.allOf[0].then.required, [
    'sourceRevision',
    'policyDigest',
    'validationEvidenceDigest',
  ]);
  assert.match(
    String(request.properties.sourceRevision.description),
    /derives/u,
  );
  assert.match(
    String(request.properties.sourceRevision.description),
    /422 VALIDATION_FAILED[^.]*\/sourceRevision/u,
  );
  const validate = await compileBundleComponent(name);
  const changeId = '018f0000-0000-7000-8000-000000000001';
  const revision = `sha1:${'0'.repeat(40)}`;
  const digests = {
    policyDigest: DIGEST_ONE,
    validationEvidenceDigest: DIGEST_ONE,
  };
  const cases = [
    // 2.8.1 App shape: still valid.
    [{ repositoryChangeId: changeId, sourceRevision: revision }, true],
    // 2.9.0 App shape: the api derives the revision from the change.
    [{ repositoryChangeId: changeId }, true],
    // 2.7.1 workload shape: everything required.
    [{ sourceRevision: revision, ...digests }, true],
    [{ sourceRevision: revision }, false],
    [{ ...digests }, false],
    [{ sourceRevision: revision, policyDigest: DIGEST_ONE }, false],
    [{}, false],
    [{ repositoryChangeId: changeId, sourceRevision: 'main' }, false],
    [{ repositoryChangeId: changeId, ...digests }, true],
    [{ repositoryChangeId: changeId, extra: true }, false],
  ];
  for (const [candidate, expected] of cases) {
    assert.equal(validate(candidate), expected, JSON.stringify(candidate));
  }
});

test('every profile function member is frozen', () => {
  for (const [name, profile] of Object.entries(ACTIVE_DIGEST_PROFILES)) {
    assert.ok(Object.isFrozen(profile), name);
    for (const member of ['project', 'preimage', 'digest', 'digestBytes']) {
      const fn = /** @type {JsonObject} */ (profile)[member];
      assert.equal(typeof fn, 'function', `${name}.${member}`);
      assert.ok(Object.isFrozen(fn), `${name}.${member} is not frozen`);
      assert.throws(() => {
        fn.leak = true;
      }, TypeError);
    }
  }
});

test('the record vectors ship with the package', async () => {
  const definition = await readJson('package.json');
  assert.equal(definition.version, '2.11.0');
  assert.equal(
    definition.exports['./parity/digest-record-vectors.json'],
    './parity/digest-record-vectors.json',
  );
  assert.ok(definition.files.includes('parity/digest-record-vectors.json'));
});
