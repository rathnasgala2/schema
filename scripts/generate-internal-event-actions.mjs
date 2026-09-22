import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Ajv2020 } from 'ajv/dist/2020.js';
import { format as prettierFormat } from 'prettier';

import { canonicalizeJcsBytes } from '../src/internal/canonical-jcs.js';
import { runIfMain } from './run-if-main.mjs';

const VERSION = '2.0.0';
const EVENT_SCHEMA_ID = 'urn:gala:schema:event-envelope:2.0.0';
const SOURCE_PATH = path.resolve('catalog-sources/internal-event-actions.json');
const EVENT_SCHEMA_PATH = path.resolve('schemas/event-envelope.schema.json');
const DESIGN_MANIFEST_PATH = path.resolve('codegen/design-manifest.json');
const OUTPUT_PATH = path.resolve('docs/catalogs/internal-event-actions.json');
const FAMILY_PATTERN = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/u;
const STATE_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/u;
const COMPONENT_PATTERN = /^api\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const IMPLEMENTATION_TARGET_PATTERN =
  /^io\.gala\.api\.[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)*\.[A-Z][A-Za-z0-9]*$/u;
const SCOPES = new Set([
  'GLOBAL_IDENTITY',
  'ORGANIZATION',
  'ORGANIZATION_AND_PUBLICATION',
]);
const COMPONENT_KINDS = new Set(['PRODUCER', 'CONSUMER', 'BOTH']);
const REQUIRED_PAYLOAD_FIELDS = Object.freeze([
  'transitionId',
  'commandId',
  'fromState',
  'toState',
  'transitionedAt',
]);

/**
 * @typedef {Record<string, any>} JsonObject
 * @typedef {{
 *   componentId: string,
 *   kind: 'PRODUCER' | 'CONSUMER' | 'BOTH',
 *   implementationRepository: string,
 *   implementationTarget: string
 * }} ComponentSource
 * @typedef {{toState: string, fromStates: string[]}} TransitionSource
 * @typedef {{
 *   family: string,
 *   aggregateType: string,
 *   scope: 'GLOBAL_IDENTITY' | 'ORGANIZATION' | 'ORGANIZATION_AND_PUBLICATION',
 *   producer: string,
 *   consumers: string[],
 *   transitions: TransitionSource[]
 * }} FamilySource
 * @typedef {{
 *   schemaVersion: string,
 *   components: ComponentSource[],
 *   families: FamilySource[]
 * }} CatalogSource
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
 *   schemaVersion: string,
 *   sourceDesignRevision: string,
 *   families: string[],
 *   components: ComponentSource[],
 *   actions: EventAction[],
 *   digest: string
 * }} EventCatalog
 */

/**
 * Require one object to contain exactly the admitted member set.
 *
 * @param {JsonObject} value object to inspect
 * @param {string[]} expected exact keys
 * @param {string} identity diagnostic identity
 * @returns {void}
 */
function assertExactKeys(value, expected, identity) {
  const actual = Object.keys(value).sort();
  const orderedExpected = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(orderedExpected)) {
    throw new TypeError(`${identity}: member set is not closed`);
  }
}

/**
 * Assert a string array is non-empty, sorted and unique.
 *
 * @param {unknown} value candidate array
 * @param {string} identity diagnostic identity
 * @param {RegExp | undefined} pattern optional item grammar
 * @returns {asserts value is string[]}
 */
function assertStringSet(value, identity, pattern) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some(
      (item) =>
        typeof item !== 'string' ||
        item.length === 0 ||
        (pattern !== undefined && !pattern.test(item)),
    ) ||
    new Set(value).size !== value.length ||
    JSON.stringify(value) !== JSON.stringify([...value].sort())
  ) {
    throw new TypeError(`${identity}: must be a non-empty sorted unique set`);
  }
}

/**
 * Validate the reviewed source ledger without supplying missing business rows.
 *
 * @param {unknown} value parsed source ledger
 * @returns {CatalogSource} validated source
 */
export function validateInternalEventActionSource(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Event catalog source must be an object');
  }
  const source = /** @type {JsonObject} */ (value);
  assertExactKeys(
    source,
    ['schemaVersion', 'components', 'families'],
    'event catalog source',
  );
  if (
    source.schemaVersion !== VERSION ||
    !Array.isArray(source.components) ||
    !Array.isArray(source.families) ||
    source.components.length === 0 ||
    source.families.length === 0
  ) {
    throw new TypeError('Event catalog source header is invalid');
  }

  const componentIds = new Set();
  for (const rawComponent of source.components) {
    if (
      rawComponent === null ||
      typeof rawComponent !== 'object' ||
      Array.isArray(rawComponent)
    ) {
      throw new TypeError('Event component source must be an object');
    }
    const component = /** @type {JsonObject} */ (rawComponent);
    assertExactKeys(
      component,
      [
        'componentId',
        'kind',
        'implementationRepository',
        'implementationTarget',
      ],
      'event component source',
    );
    if (
      typeof component.componentId !== 'string' ||
      !COMPONENT_PATTERN.test(component.componentId) ||
      componentIds.has(component.componentId) ||
      !COMPONENT_KINDS.has(component.kind) ||
      component.implementationRepository !== 'api' ||
      typeof component.implementationTarget !== 'string' ||
      !IMPLEMENTATION_TARGET_PATTERN.test(component.implementationTarget)
    ) {
      throw new TypeError('Event component source is invalid');
    }
    componentIds.add(component.componentId);
  }

  const familyIds = new Set();
  for (const rawFamily of source.families) {
    if (
      rawFamily === null ||
      typeof rawFamily !== 'object' ||
      Array.isArray(rawFamily)
    ) {
      throw new TypeError('Event family source must be an object');
    }
    const family = /** @type {JsonObject} */ (rawFamily);
    assertExactKeys(
      family,
      [
        'family',
        'aggregateType',
        'scope',
        'producer',
        'consumers',
        'transitions',
      ],
      'event family source',
    );
    if (
      typeof family.family !== 'string' ||
      !FAMILY_PATTERN.test(family.family) ||
      familyIds.has(family.family) ||
      typeof family.aggregateType !== 'string' ||
      !/^[A-Z][A-Za-z0-9]*$/u.test(family.aggregateType) ||
      !SCOPES.has(family.scope) ||
      typeof family.producer !== 'string' ||
      !componentIds.has(family.producer) ||
      !Array.isArray(family.transitions) ||
      family.transitions.length === 0
    ) {
      throw new TypeError(`${String(family.family)}: event family is invalid`);
    }
    familyIds.add(family.family);
    assertStringSet(
      family.consumers,
      `${family.family}: consumers`,
      COMPONENT_PATTERN,
    );
    const producer = source.components.find(
      (component) => component.componentId === family.producer,
    );
    if (!['PRODUCER', 'BOTH'].includes(producer?.kind)) {
      throw new TypeError(`${family.family}: producer cannot produce`);
    }
    for (const consumerId of family.consumers) {
      const consumer = source.components.find(
        (component) => component.componentId === consumerId,
      );
      if (!['CONSUMER', 'BOTH'].includes(consumer?.kind)) {
        throw new TypeError(`${family.family}: consumer cannot consume`);
      }
    }

    const targets = new Set();
    for (const rawTransition of family.transitions) {
      if (
        rawTransition === null ||
        typeof rawTransition !== 'object' ||
        Array.isArray(rawTransition)
      ) {
        throw new TypeError(`${family.family}: transition must be an object`);
      }
      const transition = /** @type {JsonObject} */ (rawTransition);
      assertExactKeys(
        transition,
        ['toState', 'fromStates'],
        `${family.family}: transition`,
      );
      if (
        typeof transition.toState !== 'string' ||
        !STATE_PATTERN.test(transition.toState) ||
        targets.has(transition.toState)
      ) {
        throw new TypeError(`${family.family}: target state is invalid`);
      }
      targets.add(transition.toState);
      assertStringSet(
        transition.fromStates,
        `${family.family}.${transition.toState}: predecessor states`,
        STATE_PATTERN,
      );
    }
  }
  return /** @type {CatalogSource} */ (source);
}

/**
 * Build one independently identified closed transition payload schema.
 *
 * @param {string} payloadSchemaId immutable payload identity
 * @param {TransitionSource} transition exact predecessor and target states
 * @returns {JsonObject} payload schema
 */
function payloadSchema(payloadSchemaId, transition) {
  const ref = /** @type {(definition: string) => JsonObject} */ (
    (definition) => ({
      $ref: `${EVENT_SCHEMA_ID}#/$defs/${definition}`,
    })
  );
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: payloadSchemaId,
    type: 'object',
    required: REQUIRED_PAYLOAD_FIELDS,
    properties: {
      transitionId: ref('stableId'),
      commandId: ref('stableId'),
      fromState: {
        allOf: [ref('plainLabel'), { enum: transition.fromStates }],
      },
      toState: {
        allOf: [ref('plainLabel'), { const: transition.toState }],
      },
      transitionedAt: ref('rfc3339'),
      reasonCode: ref('plainLabel'),
      evidenceDigest: ref('digest'),
    },
    additionalProperties: false,
  };
}

/**
 * Project the reviewed source ledger into the complete deterministic catalog.
 *
 * @param {CatalogSource} source validated source ledger
 * @param {string} sourceDesignRevision DEC-091 design manifest digest
 * @returns {Omit<EventCatalog, 'digest'>} catalog projection
 */
function projectCatalog(source, sourceDesignRevision) {
  const actions = source.families.flatMap((family) =>
    family.transitions.map((transition) => {
      const action = `entered_${transition.toState.toLowerCase()}`;
      const payloadSchemaId = `urn:gala:event-payload:${family.family}:${action}:1`;
      return {
        eventType: `${family.family}.${action}`,
        family: family.family,
        action,
        aggregateType: family.aggregateType,
        scope: family.scope,
        eventVersion: 1,
        payloadVersion: 1,
        payloadSchemaId,
        payloadSchema: payloadSchema(payloadSchemaId, transition),
        producer: family.producer,
        consumers: [...family.consumers],
        introducedIn: VERSION,
        retiredIn: null,
      };
    }),
  );
  actions.sort((left, right) =>
    left.eventType < right.eventType
      ? -1
      : left.eventType > right.eventType
        ? 1
        : 0,
  );
  return {
    schemaVersion: VERSION,
    sourceDesignRevision,
    families: source.families.map(({ family }) => family).sort(),
    components: [...source.components].sort((left, right) =>
      left.componentId.localeCompare(right.componentId),
    ),
    actions,
  };
}

/**
 * Validate a complete catalog against its reviewed source, shared envelope and
 * DEC-091 source revision.
 *
 * @param {unknown} value candidate catalog
 * @param {CatalogSource} source validated source ledger
 * @param {JsonObject} eventSchema shared event-envelope schema
 * @param {string} sourceDesignRevision expected design revision
 * @returns {EventCatalog} validated catalog
 */
export function validateInternalEventActionCatalog(
  value,
  source,
  eventSchema,
  sourceDesignRevision,
) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('Internal event action catalog must be an object');
  }
  const catalog = /** @type {JsonObject} */ (value);
  assertExactKeys(
    catalog,
    [
      'schemaVersion',
      'sourceDesignRevision',
      'families',
      'components',
      'actions',
      'digest',
    ],
    'internal event action catalog',
  );
  const expected = projectCatalog(source, sourceDesignRevision);
  const expectedRecord = /** @type {JsonObject} */ (expected);
  for (const key of [
    'schemaVersion',
    'sourceDesignRevision',
    'families',
    'components',
    'actions',
  ]) {
    if (JSON.stringify(catalog[key]) !== JSON.stringify(expectedRecord[key])) {
      throw new TypeError(`Internal event action catalog ${key} drift`);
    }
  }
  const projection = { ...catalog };
  delete projection.digest;
  const digest = `sha256:${createHash('sha256')
    .update(canonicalizeJcsBytes(projection))
    .digest('hex')}`;
  if (catalog.digest !== digest) {
    throw new TypeError('Internal event action catalog digest mismatch');
  }

  const eventTypes = expected.actions.map(({ eventType }) => eventType);
  const payloadIds = expected.actions.map(
    ({ payloadSchemaId }) => payloadSchemaId,
  );
  if (
    new Set(eventTypes).size !== eventTypes.length ||
    new Set(payloadIds).size !== payloadIds.length
  ) {
    throw new TypeError('Internal event action identity is not unique');
  }
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    validateFormats: false,
  });
  ajv.addSchema(eventSchema);
  for (const action of expected.actions) {
    const validate = ajv.compile(action.payloadSchema);
    const fromState =
      action.payloadSchema.properties.fromState.allOf[1].enum[0];
    const sample = {
      transitionId: '019c0000-0000-7000-8000-000000000001',
      commandId: '019c0000-0001-7000-8000-000000000001',
      fromState,
      toState: action.payloadSchema.properties.toState.allOf[1].const,
      transitionedAt: '2026-09-14T00:00:00.000Z',
      reasonCode: 'accepted-transition',
      evidenceDigest: `sha256:${'0'.repeat(64)}`,
    };
    if (!validate(sample)) {
      throw new TypeError(
        `${action.eventType}: payload schema rejected its valid witness`,
      );
    }
    if (
      validate({ ...sample, aggregateVersion: '1' }) ||
      validate({ ...sample, toState: 'UNREGISTERED' })
    ) {
      throw new TypeError(`${action.eventType}: payload schema is not closed`);
    }
  }
  return /** @type {EventCatalog} */ (catalog);
}

/**
 * Create the deterministic catalog from explicit inputs.
 *
 * @param {unknown} sourceValue parsed reviewed source ledger
 * @param {JsonObject} eventSchema shared event-envelope schema
 * @param {string} sourceDesignRevision DEC-091 design manifest digest
 * @returns {EventCatalog} generated and validated catalog
 */
export function createInternalEventActionCatalog(
  sourceValue,
  eventSchema,
  sourceDesignRevision,
) {
  const source = validateInternalEventActionSource(sourceValue);
  if (!/^[0-9a-f]{64}$/u.test(sourceDesignRevision)) {
    throw new TypeError('Source design revision must be lowercase SHA-256');
  }
  const projection = projectCatalog(source, sourceDesignRevision);
  const catalog = {
    ...projection,
    digest: `sha256:${createHash('sha256')
      .update(canonicalizeJcsBytes(projection))
      .digest('hex')}`,
  };
  return validateInternalEventActionCatalog(
    catalog,
    source,
    eventSchema,
    sourceDesignRevision,
  );
}

/**
 * Generate the catalog or prove the committed projection is current.
 *
 * @param {boolean} check whether to compare without writing
 * @returns {Promise<void>}
 */
async function generate(check) {
  const [sourceValue, eventSchema, designManifest] = await Promise.all([
    readFile(SOURCE_PATH, 'utf8').then(JSON.parse),
    readFile(EVENT_SCHEMA_PATH, 'utf8').then(JSON.parse),
    readFile(DESIGN_MANIFEST_PATH, 'utf8').then(JSON.parse),
  ]);
  const catalog = createInternalEventActionCatalog(
    sourceValue,
    eventSchema,
    designManifest.digest,
  );
  const output = await prettierFormat(JSON.stringify(catalog), {
    parser: 'json',
    proseWrap: 'always',
    singleQuote: true,
    trailingComma: 'all',
  });
  if (check) {
    if ((await readFile(OUTPUT_PATH, 'utf8')) !== output) {
      throw new Error('docs/catalogs/internal-event-actions.json is stale');
    }
    process.stdout.write(
      `Internal event catalog is current (${catalog.families.length} families, ${catalog.actions.length} actions).\n`,
    );
    return;
  }
  await writeFile(OUTPUT_PATH, output, 'utf8');
  process.stdout.write(
    `Generated ${catalog.families.length} event families and ${catalog.actions.length} actions.\n`,
  );
}

await runIfMain(import.meta.url, async () => {
  await generate(process.argv.includes('--check'));
});
