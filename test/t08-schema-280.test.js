import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { Ajv2020 } from 'ajv/dist/2020.js';
import formatsPlugin from 'ajv-formats';
import { parse as parseYaml } from 'yaml';

import {
  ACTION_GRANT_MODES,
  ASSURANCE_CLASSES,
} from '../scripts/generate-openapi.mjs';
import { ACTIVE_DIGEST_DOMAINS } from '../src/internal/digest-profiles.js';

/**
 * @typedef {Record<string, any>} JsonObject
 */

const EXPECT_NOTHING_SERVED = 'gala:expect-nothing-served';
const FENCE_REFERENCE = '#/$defs/generationFence';

/**
 * Every place the write-side activation fence is carried on the wire
 * (LOCAL-52: one `$defs` definition, referenced at all five).
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

/**
 * Compile one bundle component schema against the whole deterministic bundle,
 * so every sibling component reference resolves exactly as it is published.
 *
 * @param {JsonObject} document the OpenAPI bundle
 * @param {string} name component schema name
 * @returns {Promise<(value: unknown) => boolean>} compiled validator
 */
async function compileComponent(document, name) {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  /** @type {import('ajv-formats').default} */ (
    /** @type {unknown} */ (formatsPlugin)
  )(ajv);
  ajv.addSchema({ ...document, $id: 'urn:gala:openapi:bundle' });
  return ajv.compile({
    $ref: `urn:gala:openapi:bundle#/components/schemas/${name}`,
  });
}

test('the activation fence is one referenced definition at all five carriers', async () => {
  /** @type {Map<string, JsonObject>} */
  const roots = new Map();
  for (const { contract, keys } of FENCE_LOCATIONS) {
    if (!roots.has(contract)) roots.set(contract, await readRoot(contract));
    const root = /** @type {JsonObject} */ (roots.get(contract));
    const carrier = at(root, keys).expectedGenerationId;
    assert.deepEqual(
      carrier,
      { $ref: FENCE_REFERENCE },
      `${contract}/${keys.join('/')} does not reference the shared fence`,
    );
  }
  for (const [contract, root] of roots) {
    const definition = root.$defs.generationFence;
    // One string schema with one combined pattern, not a union of two string
    // schemas: the admitted value set is identical, and OpenAPI Generator 7.25
    // turns such a union into an empty marker interface.
    assert.equal(definition.type, 'string');
    assert.equal(definition.oneOf, undefined);
    const stableIdBody = String(root.$defs.stableId.pattern).slice(1, -1);
    assert.equal(
      definition.pattern,
      `^(?:${EXPECT_NOTHING_SERVED}|${stableIdBody})$`,
      `${contract} fence pattern has drifted from stableId or the sentinel`,
    );
    assert.match(String(definition.description), /LOCAL-52/u);
    const admits = new Ajv2020({ strict: false }).compile(definition);
    assert.equal(admits(EXPECT_NOTHING_SERVED), true);
    assert.equal(admits('018f0000-0000-7000-8000-000000000001'), true);
    for (const refused of [
      null,
      '',
      'none',
      '__none__',
      `${EXPECT_NOTHING_SERVED} `,
      'GALA:EXPECT-NOTHING-SERVED',
      '018f0000-0000-4000-8000-000000000001',
      7,
    ]) {
      assert.equal(admits(refused), false, JSON.stringify(refused));
    }
  }
});

test('the observation-side generation field states the fence asymmetry', async () => {
  for (const [contract, keys] of [
    [
      'adapter-capability',
      ['$defs', 'localFilesystemObservationEvidence', 'properties'],
    ],
    [
      'deployment-observation',
      ['$defs', 'publicProbeObservation', 'properties'],
    ],
  ]) {
    const root = await readRoot(String(contract));
    const node = at(root, /** @type {string[]} */ (keys));
    if (node?.observedGenerationId === undefined) continue;
    assert.match(
      String(node.observedGenerationId.description),
      /LOCAL-52/u,
      `${contract} observedGenerationId does not state the asymmetry`,
    );
  }
});

test('a bad activation fence value is EXPECTED_GENERATION_FENCE_INVALID', async () => {
  const map = JSON.parse(
    await readFile('diagnostics/diagnostic-map.json', 'utf8'),
  );
  const fenceRules = Object.entries(map.rules).filter(([ruleId]) =>
    ruleId.includes('$defs/generationFence'),
  );
  assert.ok(fenceRules.length > 0, 'no fence rule is mapped');
  for (const [ruleId, entry] of fenceRules) {
    assert.equal(
      /** @type {{code: string}} */ (entry).code,
      'EXPECTED_GENERATION_FENCE_INVALID',
      ruleId,
    );
  }
});

test('adapter-capability admits an optional call-class binding bound to its own digest', async () => {
  const root = await readRoot('adapter-capability');
  const limits = root.$defs.httpProviderLimits;
  assert.ok(!limits.required.includes('callClassBinding'));
  assert.ok(!limits.required.includes('callClassBindingDigest'));
  assert.deepEqual(limits.dependentRequired, {
    callClassBinding: ['callClassBindingDigest'],
    callClassBindingDigest: ['callClassBinding'],
  });
  const row = root.$defs.providerCallClassBinding;
  assert.deepEqual(row.required, [
    'stage',
    'callClass',
    'pagesDeploymentIdSource',
    'recoveryOnly',
  ]);
  assert.deepEqual(row.properties.pagesDeploymentIdSource.enum, [
    'none',
    'intent-pages-build-version',
    'recovery-prior-pages-build-version',
  ]);
  assert.equal(row.additionalProperties, false);
});

test('the call-class binding has its own digest domain and leaves the template domain alone', () => {
  assert.equal(
    ACTIVE_DIGEST_DOMAINS.providerRequestTemplates,
    'GALA-PROVIDER-REQUEST-TEMPLATES-V2\0',
  );
  assert.equal(
    ACTIVE_DIGEST_DOMAINS.providerCallClassBinding,
    'GALA-PROVIDER-CALL-CLASS-BINDING-V2\0',
  );
});

test('the publish and review acceptances name the resource they created', async () => {
  const document = await bundle();
  const publish = await compileComponent(
    document,
    'PostOrganizationsByOrganizationIdPublicationsByPublicationIdPublishesResponse',
  );
  const accepted = {
    commandId: '018f0000-0000-7000-8000-000000000001',
    operationId: '018f0000-0000-7000-8000-000000000001',
    phase: 'accepted',
    resourceVersion: 0,
    statusUrl:
      '/v2/organizations/018f0000-0000-7000-8000-000000000001/operations/018f0000-0000-7000-8000-000000000001',
  };
  assert.equal(
    publish({
      ...accepted,
      publishId: '018f0000-0000-7000-8000-000000000003',
    }),
    true,
  );
  assert.equal(publish(accepted), false, 'publishId is not required');

  const review = await compileComponent(
    document,
    'PostOrganizationsByOrganizationIdPublicationsByPublicationIdReviewsResponse',
  );
  assert.equal(review({ ...accepted, reviewId: accepted.operationId }), true);
  assert.equal(review(accepted), false, 'reviewId is not required');
});

test('an operation subject and kind are optional, closed, and never empty', async () => {
  const document = await bundle();
  const detail = await compileComponent(document, 'OperationDetailResponse');
  const base = {
    attempts: [],
    blockers: [],
    commandId: '018f0000-0000-7000-8000-000000000001',
    operationId: '018f0000-0000-7000-8000-000000000001',
    phase: 'accepted',
    recoveryActions: [],
    resourceVersion: 0,
    statusUrl:
      '/v2/organizations/018f0000-0000-7000-8000-000000000001/operations/018f0000-0000-7000-8000-000000000001',
  };
  // Forward compatibility: a 2.7.1-era body still validates.
  assert.equal(detail(base), true);
  assert.equal(
    detail({
      ...base,
      kind: 'publish',
      subject: {
        publicationId: '018f0000-0000-7000-8000-000000000001',
        publishId: '018f0000-0000-7000-8000-000000000002',
      },
    }),
    true,
  );
  assert.equal(detail({ ...base, subject: {} }), false, 'empty subject');
  assert.equal(detail({ ...base, kind: 'not_a_kind' }), false);
  assert.equal(
    detail({ ...base, subject: { somethingElse: 'x' } }),
    false,
    'subject is not closed',
  );

  const kinds =
    document.components.schemas.OperationKind.enum; /* closed vocabulary */
  assert.deepEqual([...kinds].sort(), [...kinds]);
  for (const kind of kinds) assert.match(kind, /^[a-z][a-z0-9_]*$/u);
});

test('deployment evidence is optional and forward compatible with a 2.7.1 body', async () => {
  const document = await bundle();
  const summary = await compileComponent(document, 'DeploymentSummary');
  const base = {
    artifactDigest: `sha256:${'0'.repeat(64)}`,
    generationId: '018f0000-0000-7000-8000-000000000001',
    sourceCommit: `sha1:${'0'.repeat(40)}`,
    state: 'ACTIVE_VERIFIED',
    version: 0,
  };
  assert.equal(summary(base), true);
  assert.equal(
    summary({
      ...base,
      activation: {
        detectedAt: '2026-09-17T00:00:00.000Z',
        method: 'GALA_PUBLIC_MARKER_DETECTION',
        state: 'DETECTED',
      },
      verification: {
        publicVerificationUrl: 'https://example.test/',
        state: 'VERIFIED',
        verifiedAt: '2026-09-17T00:00:00.000Z',
      },
    }),
    true,
  );
  assert.equal(summary({ ...base, activation: {} }), false, 'state required');
  assert.equal(
    summary({ ...base, activation: { state: 'MAYBE' } }),
    false,
    'activation state is not closed',
  );
  assert.equal(
    summary({
      ...base,
      verification: {
        state: 'VERIFIED',
        publicVerificationUrl: 'http://example.test/',
      },
    }),
    false,
    'the public verification link must be https',
  );

  const single = await compileComponent(
    document,
    'GetOrganizationsByOrganizationIdPublicationsByPublicationIdDeploymentsByGenerationIdResponse',
  );
  assert.equal(single(base), true);
});

test('a review list row is exactly what the single review read returns', async () => {
  const document = await bundle();
  const schemas = document.components.schemas;
  assert.deepEqual(
    schemas.GetOrganizationsByOrganizationIdPublicationsByPublicationIdReviewsByReviewIdResponse,
    { allOf: [{ $ref: '#/components/schemas/ReviewSummary' }] },
  );
  assert.deepEqual(
    schemas
      .GetOrganizationsByOrganizationIdPublicationsByPublicationIdReviewsResponse
      .properties.items.items,
    { $ref: '#/components/schemas/ReviewSummary' },
  );
  const list = await compileComponent(
    document,
    'GetOrganizationsByOrganizationIdPublicationsByPublicationIdReviewsResponse',
  );
  const row = {
    reviewId: '018f0000-0000-7000-8000-000000000001',
    sourceRevision: `sha1:${'0'.repeat(40)}`,
    state: 'APPROVED',
    version: 0,
  };
  assert.equal(list({ hasMore: false, items: [row] }), true);
  assert.equal(list({ hasMore: true, items: [row] }), false, 'cursor missing');
  assert.equal(
    list({ hasMore: true, items: [row], nextCursor: 'opaque' }),
    true,
  );
});

test('a review can be requested from a confirmed change without client-computed digests', async () => {
  const document = await bundle();
  const request = await compileComponent(
    document,
    'PostOrganizationsByOrganizationIdPublicationsByPublicationIdReviewsRequest',
  );
  const digest = `sha256:${'0'.repeat(64)}`;
  const sourceRevision = `sha1:${'0'.repeat(40)}`;
  assert.equal(
    request({
      repositoryChangeId: '018f0000-0000-7000-8000-000000000002',
      sourceRevision,
    }),
    true,
  );
  // Forward compatibility: the 2.7.1-era body is still accepted.
  assert.equal(
    request({
      policyDigest: digest,
      sourceRevision,
      validationEvidenceDigest: digest,
    }),
    true,
  );
  assert.equal(
    request({ sourceRevision }),
    false,
    'neither a change nor the digests were named',
  );
  assert.equal(
    request({ sourceRevision, validationEvidenceDigest: digest }),
    false,
    'the two digests travel together',
  );
});

test('review assurance is per operation and the decision is the step-up', async () => {
  const document = await bundle();
  const catalog = JSON.parse(
    await readFile('openapi/http-catalog.json', 'utf8'),
  );
  /** @type {Record<string, [string, string]>} */
  const expected = {
    getOrganizationsByOrganizationIdPublicationsByPublicationIdReviews: [
      'SESSION',
      'none',
    ],
    getOrganizationsByOrganizationIdPublicationsByPublicationIdReviewsByReviewId:
      ['SESSION', 'none'],
    postOrganizationsByOrganizationIdPublicationsByPublicationIdReviews: [
      'SESSION',
      'none',
    ],
    postOrganizationsByOrganizationIdPublicationsByPublicationIdReviewsByReviewIdDecide:
      ['RECENT_AUTHENTICATION', 'required'],
  };
  for (const row of catalog.operations) {
    assert.ok(
      ASSURANCE_CLASSES.includes(row.assuranceClass),
      `${row.operationId}: ${row.assuranceClass}`,
    );
    assert.ok(
      ACTION_GRANT_MODES.includes(row.actionGrant),
      `${row.operationId}: ${row.actionGrant}`,
    );
    const want = expected[row.operationId];
    if (want !== undefined) {
      assert.deepEqual([row.assuranceClass, row.actionGrant], want);
    }
  }
  const decide =
    document.paths[
      '/v2/organizations/{organizationId}/publications/{publicationId}/reviews/{reviewId}:decide'
    ].post;
  assert.ok(
    decide.parameters.some(
      (/** @type {JsonObject} */ parameter) =>
        parameter.$ref === '#/components/parameters/IfMatch',
    ),
    'the review decision declares review-version concurrency but takes no If-Match',
  );
  assert.equal(decide['x-gala-concurrency'], 'review-version');
});

test('the safe review read no longer claims a stale-version refusal', async () => {
  const document = await bundle();
  const read =
    document.paths[
      '/v2/organizations/{organizationId}/publications/{publicationId}/reviews/{reviewId}'
    ].get;
  assert.ok(
    !read['x-gala-reachable-problems'].includes('STALE_AGGREGATE_VERSION'),
  );
  assert.equal(read.responses['412'], undefined);
});

test('a review decision is terminal: the state machine admits no request-changes', async () => {
  const document = await bundle();
  assert.deepEqual(document.components.schemas.ReviewState.enum, [
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'INVALIDATED',
  ]);
  assert.deepEqual(
    document.components.schemas
      .PostOrganizationsByOrganizationIdPublicationsByPublicationIdReviewsByReviewIdDecideRequest
      .properties.decision.enum,
    ['APPROVE', 'REJECT'],
  );
  const decide =
    document.paths[
      '/v2/organizations/{organizationId}/publications/{publicationId}/reviews/{reviewId}:decide'
    ].post;
  assert.deepEqual(decide['x-gala-state-guards'], [
    'Review:REQUESTED -> APPROVED|REJECTED',
  ]);
});

test('the publish command is offered where the App mounts it, not on Reviews', async () => {
  const routes = JSON.parse(
    await readFile('docs/catalogs/app-routes.json', 'utf8'),
  );
  /**
   * @param {string} pathTemplate route path template
   * @returns {JsonObject} the route entry
   */
  const route = (pathTemplate) => {
    const entry = routes.routes.find(
      (/** @type {JsonObject} */ candidate) =>
        candidate.pathTemplate === pathTemplate,
    );
    assert.ok(entry, pathTemplate);
    return entry;
  };
  const publish =
    'postOrganizationsByOrganizationIdPublicationsByPublicationIdPublishes';
  const cancel = `${publish}ByPublishIdCancel`;
  for (const pathTemplate of [
    '/organizations/{organizationId}/publications/{publicationId}',
    '/organizations/{organizationId}/publications/{publicationId}/source',
  ]) {
    const entry = route(pathTemplate);
    assert.ok(entry.apiOperationIds.includes(publish), pathTemplate);
    assert.ok(entry.apiOperationIds.includes(cancel), pathTemplate);
  }
  assert.ok(
    route(
      '/organizations/{organizationId}/operations/{operationId}',
    ).apiOperationIds.includes(cancel),
    'the operation screen is where the App actually cancels a publish',
  );
  const reviews = route(
    '/organizations/{organizationId}/publications/{publicationId}/reviews',
  );
  assert.ok(!reviews.apiOperationIds.includes(publish));
  assert.ok(!reviews.apiOperationIds.includes(cancel));
  assert.ok(
    reviews.apiOperationIds.includes(
      'getOrganizationsByOrganizationIdPublicationsByPublicationIdReviews',
    ),
  );
  const ledger = JSON.parse(
    await readFile('catalog-sources/app-routes.json', 'utf8'),
  );
  for (const pathTemplate of [
    '/organizations/{organizationId}/publications/{publicationId}/reviews',
    '/organizations/{organizationId}/publications/{publicationId}/releases',
  ]) {
    const entry = ledger.routes.find(
      (/** @type {JsonObject} */ candidate) =>
        candidate.pathTemplate === pathTemplate,
    );
    assert.ok(entry, pathTemplate);
    assert.ok(
      !entry.screenJob.includes('not available yet'),
      `${pathTemplate} still says its job is not available yet`,
    );
  }
});

test('creating an organization declares the duplicate-slug conflict it can answer', async () => {
  const document = await bundle();
  const create = document.paths['/v2/organizations'].post;
  assert.ok(
    create['x-gala-reachable-problems'].includes('INVALID_SOURCE_STATE'),
    'a duplicate slug is refused but was not declared (LOCAL-54)',
  );
  const conflict = create.responses['409'];
  assert.ok(conflict['x-gala-problem-codes'].includes('INVALID_SOURCE_STATE'));
  const example =
    conflict.content['application/problem+json'].examples.INVALID_SOURCE_STATE
      .value;
  assert.equal(example.status, 409);
  assert.deepEqual(example.errors, [
    { code: 'INVALID_SOURCE_STATE', pointer: '/slug' },
  ]);
  // The publication create, which this is being made to match, says the same.
  const publications =
    document.paths['/v2/organizations/{organizationId}/publications'].post;
  assert.ok(
    publications['x-gala-reachable-problems'].includes('INVALID_SOURCE_STATE'),
  );
});

test('the receipt exchange does not require what a workflow cannot compute', async () => {
  const document = await bundle();
  const request =
    document.components.schemas.ReceiptExchangeDeploymentIntentRequest;
  // LOCAL-57: both members stay on the request but are optional -- the API
  // derives the same two values and refuses a disagreement with 422 -- so a
  // workflow that cannot compute them omits them instead of guessing.
  for (const member of ['pagesBuildVersion', 'spacesStagePrefix']) {
    assert.ok(request.properties[member], member);
    assert.ok(!request.required.includes(member), `${member} must be optional`);
  }
  const validate = await compileComponent(
    document,
    'ReceiptExchangeDeploymentIntentRequest',
  );
  const pages = { adapter: { adapterId: 'github-pages' } };
  // Each member stays confined to the adapter it belongs to.
  assert.equal(
    validateBranches(request, { ...pages, spacesStagePrefix: 'staging/' }),
    false,
  );
  assert.equal(
    validateBranches(request, { ...pages, pagesBuildVersion: '0'.repeat(40) }),
    true,
  );
  assert.equal(validateBranches(request, pages), true, 'omitting it is fine');
  assert.equal(
    validateBranches(request, {
      adapter: { adapterId: 'local-directory' },
      pagesBuildVersion: '0'.repeat(40),
    }),
    false,
  );
  assert.equal(typeof validate, 'function');
  // The retained intent document still requires both, server-derived.
  const intent = await readRoot('deployment-intent');
  assert.ok(intent.properties.pagesBuildVersion);
  assert.ok(intent.properties.spacesStagePrefix);
});

/**
 * Compile only a request's adapter-conditional branches and run one candidate.
 *
 * @param {JsonObject} request the request component
 * @param {unknown} candidate the document to check
 * @returns {boolean} whether the branches admit it
 */
function validateBranches(request, candidate) {
  const ajv = new Ajv2020({ strict: false, validateFormats: false });
  return ajv.compile({ allOf: request.allOf })(candidate);
}
test('a destination can name its provider coordinates, per adapter', async () => {
  for (const contract of ['deployment-intent', 'adapter-capability']) {
    const root = await readRoot(contract);
    const identity = root.$defs.destinationIdentity;
    assert.deepEqual(identity.properties.providerBinding, {
      $ref: '#/$defs/destinationProviderCoordinates',
    });
    assert.ok(
      !identity.required.includes('providerBinding'),
      `${contract}: providerBinding must stay optional`,
    );
    const coordinates = root.$defs.destinationProviderCoordinates;
    assert.equal(coordinates.additionalProperties, false);
    assert.deepEqual(Object.keys(coordinates.properties).sort(), [
      'owner',
      'region',
      'repository',
      'servedBucket',
      'stagingBucket',
    ]);

    const ajv = new Ajv2020({ strict: false, validateFormats: false });
    const validate = ajv.compile({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      $defs: root.$defs,
      $ref: '#/$defs/destinationIdentity',
    });
    const base = {
      adapterVersion: '2.0.0',
      baseUrl: 'https://example.test/',
      targetDigest: `sha256:${'0'.repeat(64)}`,
    };
    // SCHEMA-2.9.0 (LOCAL-60a): `environment` is the adapter's constant.
    const pages = {
      ...base,
      adapterId: 'github-pages',
      environment: 'github-pages',
    };
    const spaces = {
      ...base,
      adapterId: 'do-spaces',
      environment: 'do-spaces',
    };
    // Forward compatibility: a 2.7.1-era destination omits it entirely.
    assert.equal(validate(pages), true);
    assert.equal(
      validate({
        ...pages,
        providerBinding: { owner: 'rathnasgala2', repository: 'example.site' },
      }),
      true,
    );
    assert.equal(
      validate({ ...pages, providerBinding: { owner: 'rathnasgala2' } }),
      false,
      'github-pages names both halves of the coordinate',
    );
    assert.equal(
      validate({ ...pages, providerBinding: { region: 'nyc3' } }),
      false,
      'github-pages does not name Spaces coordinates',
    );
    assert.equal(
      validate({
        ...spaces,
        providerBinding: {
          region: 'nyc3',
          servedBucket: 'gala-served',
          stagingBucket: 'gala-staging',
        },
      }),
      true,
    );
    assert.equal(
      validate({ ...spaces, providerBinding: { region: 'nyc3' } }),
      false,
      'do-spaces names all three',
    );
    assert.equal(
      validate({
        ...base,
        adapterId: 'local-directory',
        environment: 'local-directory',
        providerBinding: { owner: 'rathnasgala2', repository: 'x' },
      }),
      false,
      'a local directory has no provider coordinates',
    );
  }
});

test('the publisher package is pinned to the one publish action', async () => {
  for (const contract of ['deployment-intent', 'deployment-receipt']) {
    const root = await readRoot(contract);
    const pinned = root.properties.publisher.allOf.find(
      (/** @type {JsonObject} */ member) =>
        member.properties?.package?.const !== undefined,
    );
    assert.equal(
      pinned?.properties.package.const,
      '@rathnasgala2/publish-action',
      `${contract} does not pin the publisher package`,
    );
    assert.deepEqual(pinned.required, ['package']);
  }
  for (const [contract, owner] of [
    ['artifact-manifest', '$defs.manifestCompositionIdentity'],
    ['build-input', '$defs.buildPackages'],
    ['lock', ''],
  ]) {
    const root = await readRoot(String(contract));
    const node = String(owner)
      .split('.')
      .filter(Boolean)
      .reduce(
        (/** @type {JsonObject} */ value, key) =>
          /** @type {JsonObject} */ (value[key]),
        root,
      );
    const publisher = node.properties.publisher;
    assert.ok(publisher, `${contract} carries a publisher list`);
    assert.equal(
      publisher.prefixItems[0].allOf[1].properties.package.const,
      '@rathnasgala2/publish-action',
      `${contract} does not pin the first publisher package`,
    );
  }
  // LOCAL-55 (3): the portable package-identity component every publisher slot
  // is reached through retains the reviewed literal as metadata. It cannot
  // carry a `const`, because the same portable definition also describes the
  // kernel, protocol and adapter packages.
  const document = await bundle();
  assert.equal(
    document.components.schemas.PortableDeploymentIntentPackageIdentity
      .properties.package['x-gala-const'],
    '@rathnasgala2/publish-action',
  );
});

test('the plan acceptance names what it planned', async () => {
  const document = await bundle();
  const plan = await compileComponent(
    document,
    'PostOrganizationsByOrganizationIdPublicationsByPublicationIdRepositoryChangesPlanResponse',
  );
  const digest = `sha256:${'0'.repeat(64)}`;
  const accepted = {
    commandId: '018f0000-0000-7000-8000-000000000001',
    operationId: '018f0000-0000-7000-8000-000000000001',
    phase: 'accepted',
    resourceVersion: 0,
    statusUrl:
      '/v2/organizations/018f0000-0000-7000-8000-000000000001/operations/018f0000-0000-7000-8000-000000000001',
  };
  assert.equal(
    plan({ ...accepted, diffDigest: digest, managedPathSetDigest: digest }),
    true,
  );
  assert.equal(plan(accepted), false, 'both plan digests are required');
  assert.equal(plan({ ...accepted, diffDigest: digest }), false);
});

test('no generated date-time member carries a pattern a validator cannot resolve', async () => {
  const document = await bundle();
  /** @type {string[]} */
  const offenders = [];
  /** @type {string[]} */
  const instants = [];
  /**
   * @param {unknown} node any bundle node
   * @param {string} location JSON pointer-ish path
   * @returns {void}
   */
  const walk = (node, location) => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${location}/${index}`));
      return;
    }
    if (node === null || typeof node !== 'object') return;
    const schema = /** @type {JsonObject} */ (node);
    if (schema.format === 'date-time') {
      instants.push(location);
      if (schema.pattern !== undefined) offenders.push(location);
      assert.match(
        String(schema.description ?? ''),
        /millisecond subset of RFC 3339/u,
        `${location} does not state the canonical instant`,
      );
    }
    for (const [key, item] of Object.entries(schema)) {
      walk(item, `${location}/${key}`);
    }
  };
  walk(document, '#');
  assert.ok(instants.length > 0, 'the bundle declares no instants at all');
  assert.deepEqual(
    offenders,
    [],
    'a `@Pattern` on a generated OffsetDateTime cannot be resolved (LOCAL-56)',
  );
  // The roots keep the pattern: this repository's own validators still refuse a
  // non-millisecond instant.
  const problem = await readRoot('problem');
  assert.equal(problem.$defs.rfc3339.format, 'date-time');
  assert.ok(problem.$defs.rfc3339.pattern);
});

test('SCHEMA-2.8.1: the managed-deployment operation arm admits kind and subject', async () => {
  const document = await bundle();
  const detail = {
    attempts: [],
    blockers: [],
    commandId: '018f0000-0000-7000-8000-000000000001',
    operationId: '018f0000-0000-7000-8000-000000000001',
    phase: 'accepted',
    recoveryActions: [],
    resourceVersion: 0,
    statusUrl:
      '/v2/organizations/018f0000-0000-7000-8000-000000000001/operations/018f0000-0000-7000-8000-000000000001',
    kind: 'publish',
    subject: {
      publicationId: '018f0000-0000-7000-8000-000000000001',
      publishId: '018f0000-0000-7000-8000-000000000002',
    },
  };
  const managed = {
    ...detail,
    managedReceiptSnapshotCount: 0,
    managedReceiptSnapshots: [],
  };
  // Every arm that is a detail body must accept the 2.8.0 detail members: a
  // strict validator or a generated parser on the operation read must not drop
  // `kind`/`subject` because the body happens to be a managed deployment.
  for (const name of [
    'OperationDetailResponse',
    'ManagedDeploymentOperationResponse',
    'GetOrganizationsByOrganizationIdOperationsByOperationIdResponse',
    'PostOrganizationsByOrganizationIdOperationsByOperationIdCancelResponse',
  ]) {
    const validate = await compileComponent(document, name);
    const body =
      name.startsWith('ManagedDeployment') ||
      name.startsWith('GetOrganizations')
        ? managed
        : detail;
    assert.equal(
      validate(body),
      true,
      `${name}: ${JSON.stringify(
        /** @type {{errors?: unknown}} */ (validate).errors,
      )}`,
    );
    const withoutMembers = Object.fromEntries(
      Object.entries(body).filter(
        ([key]) => key !== 'kind' && key !== 'subject',
      ),
    );
    assert.equal(
      validate(withoutMembers),
      true,
      `${name}: members are optional`,
    );
    assert.equal(validate({ ...body, kind: 'not_a_kind' }), false, name);
    assert.equal(validate({ ...body, subject: {} }), false, name);
  }
  const managedArm =
    document.components.schemas.ManagedDeploymentOperationResponse;
  const detailArm = document.components.schemas.OperationDetailResponse;
  assert.equal(managedArm.additionalProperties, false);
  assert.deepEqual(managedArm.properties.kind, detailArm.properties.kind);
  assert.deepEqual(managedArm.properties.subject, detailArm.properties.subject);
  const cancel =
    document.components.schemas
      .PostOrganizationsByOrganizationIdOperationsByOperationIdCancelResponse;
  assert.deepEqual(cancel.allOf, [
    { $ref: '#/components/schemas/OperationDetailResponse' },
  ]);
});
