import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { Ajv2020 } from 'ajv/dist/2020.js';

import {
  createInternalEventActionCatalog,
  validateInternalEventActionCatalog,
  validateInternalEventActionSource,
} from '../scripts/generate-internal-event-actions.mjs';
import { canonicalizeJcsBytes } from '../src/internal/canonical-jcs.js';

/**
 * @typedef {Record<string, any>} JsonObject
 * @typedef {{componentId: string, kind: string}} EventComponent
 * @typedef {{
 *   eventType: string,
 *   family: string,
 *   action: string,
 *   aggregateType: string,
 *   scope: string,
 *   eventVersion: number,
 *   payloadVersion: number,
 *   payloadSchemaId: string,
 *   payloadSchema: JsonObject,
 *   producer: string,
 *   consumers: string[],
 *   introducedIn: string,
 *   retiredIn: string | null
 * }} EventAction
 * @typedef {{
 *   sourceDesignRevision: string,
 *   families: string[],
 *   components: EventComponent[],
 *   actions: EventAction[],
 *   digest: string
 * }} EventCatalog
 */

const EXPECTED_TARGETS =
  /** @type {Readonly<
   *   Record<string, readonly string[]>
   * >} */ (
    Object.freeze({
      principal: ['ACTIVE', 'CLOSED', 'CLOSING', 'RESTRICTED', 'SUSPENDED'],
      external_identity: ['COMPROMISED', 'REVOKED', 'UNLINKED'],
      authentication_transaction: [
        'CALLBACK_RECEIVED',
        'CANCELLED',
        'CONSUMED',
        'EXPIRED',
        'PRESENTED',
        'REJECTED',
      ],
      session_family: ['COMPROMISED', 'EXPIRED', 'REVOKED', 'ROTATED'],
      passkey: ['COMPROMISED', 'REVOKED', 'UNLINKED'],
      recovery_code: ['CONSUMED', 'REVOKED'],
      recovery_code_set: ['REVOKED', 'SUPERSEDED'],
      github_installation: ['ACTIVE', 'DELETED', 'SUSPENDED'],
      organization: ['ACTIVE', 'CLOSED', 'CLOSING', 'SUSPENDED'],
      membership_invitation: ['ACCEPTED', 'EXPIRED', 'REVOKED'],
      membership: ['ACTIVE', 'ENDED', 'PLAN_SUSPENDED', 'SUSPENDED'],
      owner_transfer: ['ACCEPTED', 'EXPIRED', 'REVOKED'],
      publication: ['ACTIVE', 'PAUSED', 'PROVISIONING', 'RETIRED', 'RETIRING'],
      repository_binding: [
        'ACTIVE',
        'AUTHORITY_LOST',
        'REVOKED',
        'TRANSFERRING',
      ],
      repository_change: [
        'AWAITING_CONFIRMATION',
        'CANCELLED',
        'COMMITTED',
        'COMMIT_REQUESTED',
        'COMMITTING',
        'FAILED_NO_CHANGE',
        'PLANNED',
        'UNKNOWN_RECONCILING',
      ],
      review: ['APPROVED', 'INVALIDATED', 'REJECTED'],
      publish_schedule: ['CANCELLED', 'DISPATCHED', 'FINAL_FAILED'],
      operation: [
        'CANCELLED_NO_EFFECT',
        'COMPLETED',
        'EXECUTING',
        'FAILED_NO_EFFECT',
        'RECONCILING',
      ],
      deployment_generation: [
        'ABANDONED',
        'ACTIVE_VERIFIED',
        'ACTIVE_VERIFYING',
        'PROPAGATION_DEGRADED',
        'STAGED',
        'SUPERSEDED',
        'UNKNOWN_RECONCILING',
      ],
    })
  );
const EXPECTED_COMPONENTS = Object.freeze({
  'api.provider-observation-ingress': 'PRODUCER',
  'api.public-projection': 'CONSUMER',
  'api.transition-audit-projector': 'CONSUMER',
  'api.transition-outbox': 'PRODUCER',
  'api.work-dispatcher': 'CONSUMER',
});
const PUBLICATION_FAMILIES = new Set([
  'publication',
  'repository_binding',
  'repository_change',
  'review',
  'publish_schedule',
  'operation',
  'deployment_generation',
]);
const GLOBAL_IDENTITY_FAMILIES = new Set([
  'authentication_transaction',
  'external_identity',
  'github_installation',
  'passkey',
  'principal',
  'recovery_code',
  'recovery_code_set',
  'session_family',
]);
const WORK_DISPATCH_FAMILIES = new Set([
  'authentication_transaction',
  'repository_binding',
  'repository_change',
  'review',
  'publish_schedule',
  'operation',
  'deployment_generation',
]);
const PUBLIC_PROJECTION_FAMILIES = new Set([
  'publication',
  'deployment_generation',
]);

/**
 * @returns {Promise<{
 *   source: any,
 *   catalog: EventCatalog,
 *   eventSchema: JsonObject,
 *   designManifest: {digest: string}
 * }>} task inputs
 */
async function readInputs() {
  const [source, catalog, eventSchema, designManifest] = await Promise.all([
    readFile('catalog-sources/internal-event-actions.json', 'utf8').then(
      JSON.parse,
    ),
    readFile('docs/catalogs/internal-event-actions.json', 'utf8').then(
      JSON.parse,
    ),
    readFile('schemas/event-envelope.schema.json', 'utf8').then(JSON.parse),
    readFile('codegen/design-manifest.json', 'utf8').then(JSON.parse),
  ]);
  return { source, catalog, eventSchema, designManifest };
}

/**
 * @param {EventAction} action registered action
 * @returns {JsonObject} valid payload witness
 */
function payloadWitness(action) {
  return {
    transitionId: '019c0000-0000-7000-8000-000000000001',
    commandId: '019c0000-0001-7000-8000-000000000001',
    fromState: action.payloadSchema.properties.fromState.allOf[1].enum[0],
    toState: action.payloadSchema.properties.toState.allOf[1].const,
    transitionedAt: '2026-09-14T00:00:00.000Z',
  };
}

/**
 * @param {EventAction} action registered action
 * @returns {JsonObject} valid envelope witness
 */
function envelopeWitness(action) {
  const envelope = /** @type {JsonObject} */ ({
    schemaId: 'urn:gala:schema:event-envelope:2.0.0',
    schemaVersion: '2.0.0',
    eventId: '019c0000-0002-7000-8000-000000000001',
    eventType: action.eventType,
    eventVersion: action.eventVersion,
    occurredAt: '2026-09-14T00:00:00.000Z',
    producer: action.producer,
    aggregateType: action.aggregateType,
    aggregateId: '019c0000-0003-7000-8000-000000000001',
    aggregateVersion: '1',
    organizationId: '019c0000-0004-7000-8000-000000000001',
    correlationId: '019c0000-0005-7000-8000-000000000001',
    causationId: '019c0000-0006-7000-8000-000000000001',
    payloadSchemaId: action.payloadSchemaId,
    payloadVersion: action.payloadVersion,
    payload: payloadWitness(action),
  });
  if (action.scope === 'GLOBAL_IDENTITY') {
    delete envelope.organizationId;
  } else if (action.scope === 'ORGANIZATION_AND_PUBLICATION') {
    envelope.publicationId = '019c0000-0007-7000-8000-000000000001';
  }
  return envelope;
}

/**
 * @param {EventCatalog} catalog event catalog
 * @param {JsonObject} eventSchema shared envelope schema
 * @returns {{
 *   validateEnvelope: import('ajv').ValidateFunction,
 *   payloadValidators: Map<string, import('ajv').ValidateFunction>
 * }} compiled validators
 */
function compileCatalogValidators(catalog, eventSchema) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    validateFormats: false,
  });
  const validateEnvelope = ajv.compile(eventSchema);
  const payloadValidators = new Map(
    catalog.actions.map((action) => [
      action.eventType,
      ajv.compile(action.payloadSchema),
    ]),
  );
  return { validateEnvelope, payloadValidators };
}

/**
 * @param {EventCatalog} catalog event catalog
 * @param {import('ajv').ValidateFunction} validateEnvelope envelope validator
 * @param {Map<string, import('ajv').ValidateFunction>} payloadValidators payload validators
 * @param {JsonObject} envelope candidate envelope
 * @returns {boolean} whether the envelope matches the registry
 */
function isRegisteredEnvelope(
  catalog,
  validateEnvelope,
  payloadValidators,
  envelope,
) {
  if (!validateEnvelope(envelope)) return false;
  const action = catalog.actions.find(
    ({ eventType }) => eventType === envelope.eventType,
  );
  if (action === undefined) return false;
  const identityScope = action.scope === 'GLOBAL_IDENTITY';
  const publicationScope = action.scope === 'ORGANIZATION_AND_PUBLICATION';
  return (
    (identityScope
      ? envelope.organizationId === undefined
      : envelope.organizationId !== undefined) &&
    (publicationScope
      ? envelope.publicationId !== undefined
      : envelope.publicationId === undefined) &&
    envelope.eventVersion === action.eventVersion &&
    envelope.producer === action.producer &&
    envelope.aggregateType === action.aggregateType &&
    envelope.payloadSchemaId === action.payloadSchemaId &&
    envelope.payloadVersion === action.payloadVersion &&
    payloadValidators.get(action.eventType)?.(envelope.payload) === true
  );
}

test('reviewed source contains exactly the 19 admitted families and 77 target actions', async () => {
  const { source } = await readInputs();
  const validated = validateInternalEventActionSource(source);
  assert.deepEqual(
    validated.families.map(({ family }) => family).sort(),
    Object.keys(EXPECTED_TARGETS).sort(),
  );
  assert.equal(
    validated.families.reduce(
      (count, family) => count + family.transitions.length,
      0,
    ),
    77,
  );
  for (const family of validated.families) {
    assert.deepEqual(
      family.transitions.map(({ toState }) => toState).sort(),
      [...(EXPECTED_TARGETS[family.family] ?? [])].sort(),
      family.family,
    );
    assert.equal(
      family.scope,
      GLOBAL_IDENTITY_FAMILIES.has(family.family)
        ? 'GLOBAL_IDENTITY'
        : PUBLICATION_FAMILIES.has(family.family)
          ? 'ORGANIZATION_AND_PUBLICATION'
          : 'ORGANIZATION',
    );
  }
  const serialized = JSON.stringify(validated);
  for (const deferred of [
    'device_authorization',
    'preview',
    'reaction',
    'comment',
    'newsletter_approval',
    'payment_observation',
    'runtime_configuration',
    'adapter_admission',
  ]) {
    assert.equal(serialized.includes(deferred), false, deferred);
  }
});

test('generated actions are the exact mechanical projection of reviewed transitions', async () => {
  const { source, catalog, eventSchema, designManifest } = await readInputs();
  const regenerated = createInternalEventActionCatalog(
    source,
    eventSchema,
    designManifest.digest,
  );
  assert.deepEqual(catalog, regenerated);
  assert.equal(catalog.sourceDesignRevision, designManifest.digest);
  assert.deepEqual(catalog.families, Object.keys(EXPECTED_TARGETS).sort());
  assert.equal(catalog.actions.length, 77);
  assert.deepEqual(
    catalog.actions.map(({ eventType }) => eventType),
    catalog.actions.map(({ eventType }) => eventType).sort(),
  );
  assert.equal(
    new Set(catalog.actions.map(({ eventType }) => eventType)).size,
    77,
  );
  assert.equal(
    new Set(catalog.actions.map(({ payloadSchemaId }) => payloadSchemaId)).size,
    77,
  );
  for (const action of catalog.actions) {
    assert.equal(action.eventType, `${action.family}.${action.action}`);
    assert.equal(
      action.action,
      `entered_${action.payloadSchema.properties.toState.allOf[1].const.toLowerCase()}`,
    );
    assert.equal(
      action.payloadSchemaId,
      `urn:gala:event-payload:${action.family}:${action.action}:1`,
    );
    assert.equal(action.payloadSchema.$id, action.payloadSchemaId);
    assert.equal(action.eventVersion, 1);
    assert.equal(action.payloadVersion, 1);
    assert.equal(action.introducedIn, '2.0.0');
    assert.equal(action.retiredIn, null);
  }
});

test('component roles and consumer subscriptions are exact and resolvable', async () => {
  const { catalog } = await readInputs();
  assert.deepEqual(
    Object.fromEntries(
      catalog.components.map(({ componentId, kind }) => [componentId, kind]),
    ),
    EXPECTED_COMPONENTS,
  );
  const components = new Map(
    catalog.components.map((component) => [component.componentId, component]),
  );
  for (const action of catalog.actions) {
    assert.equal(action.producer, 'api.transition-outbox');
    const producer = components.get(action.producer);
    assert.ok(producer);
    assert.ok(['PRODUCER', 'BOTH'].includes(producer.kind));
    const expectedConsumers = ['api.transition-audit-projector'];
    if (PUBLIC_PROJECTION_FAMILIES.has(action.family)) {
      expectedConsumers.push('api.public-projection');
    }
    if (WORK_DISPATCH_FAMILIES.has(action.family)) {
      expectedConsumers.push('api.work-dispatcher');
    }
    assert.deepEqual(action.consumers, expectedConsumers.sort());
    assert.equal(new Set(action.consumers).size, action.consumers.length);
    for (const consumerId of action.consumers) {
      const consumer = components.get(consumerId);
      assert.ok(consumer);
      assert.ok(['CONSUMER', 'BOTH'].includes(consumer.kind));
    }
  }
  assert.equal(
    catalog.actions.some(
      ({ producer }) => producer === 'api.provider-observation-ingress',
    ),
    false,
  );
});

test('every per-action DEC-101 payload is closed, bounded and state-specific', async () => {
  const { catalog, eventSchema } = await readInputs();
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    validateFormats: false,
  });
  ajv.addSchema(eventSchema);
  const forbiddenFields = [
    'aggregateVersion',
    'organizationId',
    'publicationId',
    'credential',
    'sessionHandle',
    'contact',
    'contentBody',
    'providerData',
  ];
  for (const action of catalog.actions) {
    assert.deepEqual(Object.keys(action.payloadSchema.properties), [
      'transitionId',
      'commandId',
      'fromState',
      'toState',
      'transitionedAt',
      'reasonCode',
      'evidenceDigest',
    ]);
    assert.deepEqual(action.payloadSchema.required, [
      'transitionId',
      'commandId',
      'fromState',
      'toState',
      'transitionedAt',
    ]);
    assert.equal(action.payloadSchema.additionalProperties, false);
    const validate = ajv.compile(action.payloadSchema);
    const witness = payloadWitness(action);
    assert.equal(validate(witness), true, action.eventType);
    for (const forbidden of forbiddenFields) {
      assert.equal(
        validate({ ...witness, [forbidden]: 'forbidden' }),
        false,
        `${action.eventType}:${forbidden}`,
      );
    }
    assert.equal(validate({ ...witness, fromState: 'UNREGISTERED' }), false);
    assert.equal(validate({ ...witness, toState: 'UNREGISTERED' }), false);
  }
});

test('registered action scope makes organization and publication envelope fields fail closed', async () => {
  const { catalog, eventSchema } = await readInputs();
  const { validateEnvelope, payloadValidators } = compileCatalogValidators(
    catalog,
    eventSchema,
  );
  const organizationAction = catalog.actions.find(
    ({ eventType }) => eventType === 'organization.entered_active',
  );
  const publicationAction = catalog.actions.find(
    ({ eventType }) => eventType === 'publication.entered_active',
  );
  const identityAction = catalog.actions.find(
    ({ eventType }) =>
      eventType === 'authentication_transaction.entered_presented',
  );
  assert.ok(organizationAction);
  assert.ok(publicationAction);
  assert.ok(identityAction);

  const identityEnvelope = envelopeWitness(identityAction);
  assert.equal(
    isRegisteredEnvelope(
      catalog,
      validateEnvelope,
      payloadValidators,
      identityEnvelope,
    ),
    true,
  );
  assert.equal(
    isRegisteredEnvelope(catalog, validateEnvelope, payloadValidators, {
      ...identityEnvelope,
      organizationId: '019c0000-0004-7000-8000-000000000001',
    }),
    false,
  );

  const organizationEnvelope = envelopeWitness(organizationAction);
  assert.equal(
    isRegisteredEnvelope(
      catalog,
      validateEnvelope,
      payloadValidators,
      organizationEnvelope,
    ),
    true,
  );
  const { organizationId: omittedOrganization, ...withoutOrganization } =
    organizationEnvelope;
  assert.ok(omittedOrganization);
  assert.equal(
    isRegisteredEnvelope(
      catalog,
      validateEnvelope,
      payloadValidators,
      withoutOrganization,
    ),
    false,
  );
  assert.equal(
    isRegisteredEnvelope(catalog, validateEnvelope, payloadValidators, {
      ...organizationEnvelope,
      publicationId: '019c0000-0007-7000-8000-000000000001',
    }),
    false,
  );

  const publicationEnvelope = envelopeWitness(publicationAction);
  assert.equal(
    isRegisteredEnvelope(
      catalog,
      validateEnvelope,
      payloadValidators,
      publicationEnvelope,
    ),
    true,
  );
  const { publicationId: omittedPublication, ...withoutPublication } =
    publicationEnvelope;
  assert.ok(omittedPublication);
  assert.equal(
    isRegisteredEnvelope(
      catalog,
      validateEnvelope,
      payloadValidators,
      withoutPublication,
    ),
    false,
  );
  assert.equal(
    isRegisteredEnvelope(catalog, validateEnvelope, payloadValidators, {
      ...publicationEnvelope,
      eventType: 'comment.entered_visible',
    }),
    false,
  );
});

test('catalog digest excludes only digest and semantic tampering rejects', async () => {
  const { source, catalog, eventSchema, designManifest } = await readInputs();
  const { digest: omittedDigest, ...projection } = catalog;
  assert.equal(omittedDigest, catalog.digest);
  assert.equal(
    catalog.digest,
    `sha256:${createHash('sha256')
      .update(canonicalizeJcsBytes(projection))
      .digest('hex')}`,
  );
  assert.throws(
    () =>
      validateInternalEventActionCatalog(
        { ...catalog, digest: `sha256:${'0'.repeat(64)}` },
        validateInternalEventActionSource(source),
        eventSchema,
        designManifest.digest,
      ),
    /digest mismatch/u,
  );
  assert.throws(
    () =>
      validateInternalEventActionSource({
        ...structuredClone(source),
        families: [
          ...structuredClone(source.families),
          structuredClone(source.families[0]),
        ],
      }),
    /event family is invalid/u,
  );
  const missingConsumers = structuredClone(source);
  missingConsumers.families[0].consumers = [];
  assert.throws(
    () => validateInternalEventActionSource(missingConsumers),
    /non-empty sorted unique set/u,
  );
});

test('package build, exports and publish files include the event catalog drift gate', async () => {
  const packageDefinition = JSON.parse(await readFile('package.json', 'utf8'));
  assert.equal(
    packageDefinition.scripts['events:generate'],
    'node scripts/generate-internal-event-actions.mjs',
  );
  assert.equal(
    packageDefinition.scripts['events:check'],
    'node scripts/generate-internal-event-actions.mjs --check',
  );
  assert.match(packageDefinition.scripts.build, /npm run events:check/u);
  assert.equal(
    packageDefinition.exports['./docs/catalogs/internal-event-actions.json'],
    './docs/catalogs/internal-event-actions.json',
  );
  assert.ok(
    packageDefinition.files.includes(
      'docs/catalogs/internal-event-actions.json',
    ),
  );
});
