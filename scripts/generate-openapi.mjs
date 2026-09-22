import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Ajv2020 } from 'ajv/dist/2020.js';
import formatsPlugin from 'ajv-formats';
import { parse, stringify } from 'yaml';

import { canonicalizeJcsBytes } from '../src/internal/canonical-jcs.js';
import { HTTP_PROBLEM_EXAMPLE_RULES } from '../src/internal/http-problem-contract.js';
import { runIfMain } from './run-if-main.mjs';

const VERSION = '2.0.0';
const CONTRACT_ID = 'urn:gala:schema:openapi:2.0.0';
const SOURCE_DIRECTORY = path.resolve('openapi/source');
const BUNDLE_PATH = path.resolve('openapi/openapi.yaml');
const CATALOG_PATH = path.resolve('openapi/http-catalog.json');
const PATH_FRAGMENT_COUNTS = Object.freeze({
  authentication: 4,
  callbacks: 2,
  github: 3,
  internal: 1,
  'membership-invitations': 1,
  organizations: 46,
  self: 14,
  session: 3,
  workloads: 2,
});
const HTTP_METHODS = new Set(['delete', 'get', 'patch', 'post', 'put']);
// SCHEMA-2.7.1: closed vocabulary for `x-gala-conditional-capability-keys[].condition`.
// `read-only` names an alternate capability that admits a GET/query operation without
// granting the write the primary capability key governs. `field:<name>` names one request
// body field of the SAME operation whose presence/value is additionally admitted by the
// listed capability key, alongside (not instead of) the primary key. New members are added
// only by a reviewed schema change, never inferred from free text.
export const CONDITIONAL_CAPABILITY_KEY_CONDITIONS = Object.freeze([
  'field:desiredState',
  'read-only',
]);
// SCHEMA-2.8.0: closed vocabulary for the operation-level `x-gala-assurance-class`
// extension. `SESSION` is an ordinary authenticated call; `RECENT_AUTHENTICATION`
// additionally requires a fresh authentication within the API's recent-authentication
// window, which is what the API's action-grant catalog spells `RECENT_AUTH`. The
// extension exists because assurance is per operation while a capability key can cover
// several: `publication.review` admits the read, the request and the decision, and only
// the decision is a step-up.
export const ASSURANCE_CLASSES = Object.freeze([
  'RECENT_AUTHENTICATION',
  'SESSION',
]);
// SCHEMA-2.8.0: closed vocabulary for the operation-level `x-gala-action-grant`
// extension -- whether the operation consumes a short-lived action grant issued by a
// step-up, alongside its capability key.
export const ACTION_GRANT_MODES = Object.freeze(['none', 'required']);
// Mechanical shape every capability key in this repository follows: two to four
// lowercase dot-separated segments, no digits, no hyphens.
export const CAPABILITY_KEY_PATTERN = /^[a-z]+(?:\.[a-z]+){1,3}$/u;
const SUCCESS_STATUSES = /** @type {Readonly<Record<string, string>>} */ (
  Object.freeze({
    async: '202',
    create: '201',
    delete: '204',
    'oauth-callback': '303',
    'provider-callback': '202',
    protocol: '200',
    query: '200',
    'receipt-exchange': '200',
    update: '200',
  })
);

/**
 * @typedef {Record<string, any>} JsonObject
 * @typedef {{capabilityKey: string, when: string}} ConditionalCapability
 * @typedef {{capabilityKey: string, condition: string}} ConditionalCapabilityKey
 * @typedef {{
 *   operationId: string,
 *   tags: string[],
 *   summary: string,
 *   'x-gala-purpose': string,
 *   'x-gala-capability-key': string | null,
 *   'x-gala-capability-resolution'?: string,
 *   'x-gala-conditional-capabilities': ConditionalCapability[],
 *   'x-gala-conditional-capability-keys'?: ConditionalCapabilityKey[],
 *   'x-gala-assurance-class'?: string,
 *   'x-gala-action-grant'?: string,
 *   'x-gala-activation-gate': string,
 *   'x-gala-activation-guards': string[],
 *   'x-gala-state-guards': string[],
 *   'x-gala-tenant-scope': string,
 *   'x-gala-example-profile': string,
 *   'x-gala-success-category': string,
 *   'x-gala-replay-identity': string,
 *   'x-gala-concurrency': string,
 *   'x-gala-reachable-problems': string[],
 *   'x-gala-nullability': string,
 *   security: Array<Record<string, string[]>>,
 *   parameters: JsonObject[],
 *   requestBody?: JsonObject,
 *   responses: Record<string, JsonObject>
 * }} OpenApiOperation
 * @typedef {{
 *   operation: OpenApiOperation,
 *   method: string,
 *   path: string,
 *   sourceFragment: string
 * }} OperationRecord
 */

/**
 * Parse one reviewed YAML source document as an object.
 *
 * @param {string} filename source filename
 * @returns {Promise<JsonObject>} parsed document
 */
async function readSource(filename) {
  const value = parse(
    await readFile(path.join(SOURCE_DIRECTORY, filename), 'utf8'),
  );
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${filename}: source document must be an object`);
  }
  return /** @type {JsonObject} */ (value);
}

/**
 * Convert a route into its mechanical PascalCase stem.
 *
 * @param {string} route operation route
 * @returns {string} PascalCase route stem
 */
function pathStem(route) {
  const normalized = route.startsWith('/v2/') ? route.slice(4) : route.slice(1);
  return normalized
    .split(/[-/:]/u)
    .filter(Boolean)
    .map((token) => {
      if (token.startsWith('{') && token.endsWith('}')) {
        const name = token.slice(1, -1);
        return `By${name.charAt(0).toUpperCase()}${name.slice(1)}`;
      }
      return `${token.charAt(0).toUpperCase()}${token.slice(1)}`;
    })
    .join('');
}

/**
 * Derive the immutable operation ID from method and route.
 *
 * @param {string} method uppercase method
 * @param {string} route route template
 * @returns {string} operation ID
 */
export function operationIdFor(method, route) {
  return `${method.toLowerCase()}${pathStem(route)}`;
}

/**
 * Convert one operation ID to its component-name stem.
 *
 * @param {string} operationId operation ID
 * @returns {string} PascalCase operation name
 */
function componentStem(operationId) {
  return `${operationId.charAt(0).toUpperCase()}${operationId.slice(1)}`;
}

/**
 * Require one operation member to have the expected runtime type.
 *
 * @param {OpenApiOperation} operation operation object
 * @param {keyof OpenApiOperation} key property name
 * @param {'array' | 'string'} type expected type
 * @param {string} identity method/path identity
 * @returns {void}
 */
function requireTypedMember(operation, key, type, identity) {
  const value = operation[key];
  const valid = type === 'array' ? Array.isArray(value) : typeof value === type;
  if (!valid) throw new Error(`${identity}: invalid ${String(key)}`);
}

/**
 * Validate one complete reviewed OpenAPI operation fragment.
 *
 * @param {OperationRecord} record operation and source identity
 * @param {Record<string, unknown>} schemas complete component schema registry
 * @returns {void}
 */
function validateOperation(record, schemas) {
  const { method, operation, path: route, sourceFragment } = record;
  const identity = `${method} ${route}`;
  for (const [key, type] of [
    ['operationId', 'string'],
    ['tags', 'array'],
    ['summary', 'string'],
    ['x-gala-purpose', 'string'],
    ['x-gala-conditional-capabilities', 'array'],
    ['x-gala-activation-gate', 'string'],
    ['x-gala-activation-guards', 'array'],
    ['x-gala-state-guards', 'array'],
    ['x-gala-tenant-scope', 'string'],
    ['x-gala-example-profile', 'string'],
    ['x-gala-success-category', 'string'],
    ['x-gala-replay-identity', 'string'],
    ['x-gala-concurrency', 'string'],
    ['x-gala-reachable-problems', 'array'],
    ['x-gala-nullability', 'string'],
    ['parameters', 'array'],
  ]) {
    requireTypedMember(
      operation,
      /** @type {keyof OpenApiOperation} */ (key),
      /** @type {'array' | 'string'} */ (type),
      identity,
    );
  }
  if (
    !('x-gala-capability-key' in operation) ||
    (operation['x-gala-capability-key'] !== null &&
      typeof operation['x-gala-capability-key'] !== 'string')
  ) {
    throw new Error(`${identity}: invalid x-gala-capability-key`);
  }
  const capabilityResolution = operation['x-gala-capability-resolution'];
  if (
    identity ===
    'POST /v2/organizations/{organizationId}/operations/{operationId}:cancel'
  ) {
    if (
      capabilityResolution !== 'target-operation-current-capability-and-scope'
    ) {
      throw new Error(`${identity}: target-operation authority is incomplete`);
    }
  } else if (capabilityResolution !== undefined) {
    throw new Error(`${identity}: unexpected dynamic capability resolution`);
  }
  if (
    operation.operationId !== operationIdFor(method, route) ||
    operation.summary !== operation['x-gala-purpose'] ||
    operation.tags.length !== 1 ||
    operation.tags[0] !== sourceFragment ||
    operation['x-gala-activation-gate'] !== 'MVP' ||
    operation['x-gala-example-profile'] !==
      'NOMINAL_SUCCESS_AND_EACH_REACHABLE_PROBLEM' ||
    operation['x-gala-nullability'] !== 'required-and-nullable-are-explicit'
  ) {
    throw new Error(`${identity}: naming, tag or metadata drift`);
  }
  const category = operation['x-gala-success-category'];
  const status = SUCCESS_STATUSES[category];
  if (status === undefined) {
    throw new Error(`${identity}: success category/status is incomplete`);
  }
  const success = operation.responses?.[status];
  if (success === undefined) {
    throw new Error(`${identity}: success category/status is incomplete`);
  }
  const stem = componentStem(operation.operationId);
  if (operation.requestBody !== undefined) {
    const requestReference =
      operation.requestBody.content?.['application/json']?.schema?.$ref;
    if (
      requestReference !== `#/components/schemas/${stem}Request` ||
      schemas[`${stem}Request`] === undefined
    ) {
      throw new Error(`${identity}: request component naming drift`);
    }
  }
  if (!['204', '303'].includes(status)) {
    const responseReference =
      success.content?.['application/json']?.schema?.$ref;
    if (
      responseReference !== `#/components/schemas/${stem}Response` ||
      schemas[`${stem}Response`] === undefined
    ) {
      throw new Error(`${identity}: response component naming drift`);
    }
  }
  if (
    success.headers?.['X-Correlation-Id']?.$ref !==
      '#/components/headers/XCorrelationId' ||
    success.headers?.['Cache-Control']?.$ref !==
      '#/components/headers/CacheControlNoStore'
  ) {
    throw new Error(`${identity}: success control headers are incomplete`);
  }
  const conditionalKeys = operation['x-gala-conditional-capabilities'].map(
    ({ capabilityKey }) => capabilityKey,
  );
  if (
    conditionalKeys.some((key) => typeof key !== 'string') ||
    new Set(conditionalKeys).size !== conditionalKeys.length
  ) {
    throw new Error(`${identity}: conditional capabilities are invalid`);
  }
  const closedConditionalEntries =
    operation['x-gala-conditional-capability-keys'];
  if (closedConditionalEntries !== undefined) {
    if (!Array.isArray(closedConditionalEntries)) {
      throw new Error(
        `${identity}: invalid x-gala-conditional-capability-keys`,
      );
    }
    const closedConditionalKeys = /** @type {string[]} */ (
      closedConditionalEntries.map((entry) => entry?.capabilityKey)
    );
    const validEntryShape = closedConditionalEntries.every(
      (entry) =>
        entry !== null &&
        typeof entry === 'object' &&
        Object.keys(entry).sort().join(',') === 'capabilityKey,condition' &&
        typeof entry.capabilityKey === 'string' &&
        CAPABILITY_KEY_PATTERN.test(entry.capabilityKey) &&
        CONDITIONAL_CAPABILITY_KEY_CONDITIONS.includes(entry.condition),
    );
    const primaryCapabilityKey = operation['x-gala-capability-key'];
    if (
      !validEntryShape ||
      new Set(closedConditionalKeys).size !== closedConditionalKeys.length ||
      (primaryCapabilityKey !== null &&
        closedConditionalKeys.includes(primaryCapabilityKey)) ||
      closedConditionalKeys.some((key) => conditionalKeys.includes(key))
    ) {
      throw new Error(`${identity}: conditional capability keys are invalid`);
    }
  }
  const guardSets = /** @type {Array<[string, string[]]>} */ ([
    ['activation guards', operation['x-gala-activation-guards']],
    ['state guards', operation['x-gala-state-guards']],
  ]);
  for (const [name, values] of guardSets) {
    if (
      values.length === 0 ||
      values.some((value) => typeof value !== 'string' || value.length === 0) ||
      new Set(values).size !== values.length ||
      (values.includes('NONE') && values.length !== 1)
    ) {
      throw new Error(`${identity}: invalid ${name}`);
    }
  }
  const expectedTenantScope = route.startsWith('/v2/workloads/')
    ? 'WORKLOAD_BOUND_ORGANIZATION_AND_PUBLICATION'
    : route === '/v2/membership-invitations/{token}:accept'
      ? 'TOKEN_BOUND_ORGANIZATION'
      : route.includes('/publications/{publicationId}')
        ? 'ORGANIZATION_AND_PUBLICATION_PATH'
        : route.startsWith('/v2/organizations/{organizationId}')
          ? 'ORGANIZATION_PATH'
          : route === '/internal/health'
            ? 'INTERNAL'
            : 'NONE';
  if (operation['x-gala-tenant-scope'] !== expectedTenantScope) {
    throw new Error(`${identity}: tenant scope drift`);
  }
}

/**
 * Resolve one local component reference or return the inline value.
 *
 * @param {JsonObject | undefined} value reference or inline value
 * @param {string} section component section name
 * @param {JsonObject} components complete component registry
 * @returns {JsonObject | undefined} resolved value
 */
function resolveLocalComponent(value, section, components) {
  const prefix = `#/components/${section}/`;
  if (value?.$ref?.startsWith(prefix)) {
    return /** @type {JsonObject | undefined} */ (
      components[section]?.[value.$ref.slice(prefix.length)]
    );
  }
  return value;
}

/**
 * Enforce the semantic closure that YAML/OpenAPI parsing alone cannot prove.
 *
 * @param {OperationRecord[]} records complete operation records
 * @param {JsonObject} components complete component registry
 * @returns {void}
 */
function validateContractClosure(records, components) {
  const schemas = /** @type {Record<string, JsonObject>} */ (
    components.schemas
  );
  if (schemas.Problem?.$ref !== '../schemas/problem.schema.json') {
    throw new Error('Problem must reuse the exact portable DEC-100 schema');
  }
  const receiptRequest = schemas.PostWorkloadsDeploymentReceiptsRequest;
  const exchangeRequest = schemas.PostWorkloadsGithubReceiptExchangesRequest;
  const exchangeBranches = /** @type {JsonObject[]} */ (
    exchangeRequest?.oneOf ?? []
  );
  const exchangeMembers = exchangeBranches.map(
    (branch) =>
      /** @type {JsonObject} */ (
        resolveLocalComponent(branch, 'schemas', components)
      ),
  );
  const deploymentExchange = exchangeMembers.find(
    (branch) => branch?.properties?.purpose?.const === 'deployment-intent',
  );
  const verificationEntry = schemas.VerificationPlanEntry;
  if (
    receiptRequest?.properties?.workflowStartedAt?.$ref !==
      '../schemas/deployment-receipt.schema.json#/$defs/rfc3339' ||
    receiptRequest?.properties?.workflowCompletedAt?.$ref !==
      '../schemas/deployment-receipt.schema.json#/$defs/rfc3339' ||
    deploymentExchange?.properties?.frozenHandoffName?.$ref !==
      '../schemas/deployment-intent.schema.json#/$defs/plainLabel' ||
    deploymentExchange?.properties?.effectiveArtifactExpiresAt?.$ref !==
      '../schemas/deployment-intent.schema.json#/$defs/rfc3339' ||
    verificationEntry?.properties?.path?.$ref !==
      '../schemas/deployment-receipt.schema.json#/$defs/repoRelativePath' ||
    verificationEntry?.properties?.publicRoute?.$ref !==
      '../schemas/deployment-receipt.schema.json#/$defs/canonicalRoute' ||
    verificationEntry?.properties?.expectedContentType?.pattern !==
      '^[a-z0-9][a-z0-9!#$&^_.+-]{0,62}/[a-z0-9][a-z0-9!#$&^_.+-]{0,62}(?:; charset=utf-8)?$'
  ) {
    throw new Error('DEC-097 transport scalar binding drift');
  }

  /**
   * @param {unknown} value schema node
   * @param {string} location diagnostic location
   * @returns {void}
   */
  function visitSchema(value, location) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visitSchema(item, `${location}/${index}`));
      return;
    }
    if (value === null || typeof value !== 'object') return;
    const schema = /** @type {JsonObject} */ (value);
    if (
      Array.isArray(schema.required) &&
      new Set(schema.required).size !== schema.required.length
    ) {
      throw new Error(`${location}: duplicate required member`);
    }
    const state = schema.properties?.state;
    if (
      state !== undefined &&
      state.$ref === undefined &&
      state.enum === undefined &&
      state.const === undefined
    ) {
      throw new Error(`${location}: lifecycle state is not closed`);
    }
    for (const [key, item] of Object.entries(schema)) {
      visitSchema(item, `${location}/${key}`);
    }
  }

  for (const [name, schema] of Object.entries(schemas)) {
    visitSchema(schema, `#/components/schemas/${name}`);
    if (
      name.startsWith('Patch') &&
      name.endsWith('Request') &&
      schema.required?.length === 0 &&
      schema.minProperties !== 1
    ) {
      throw new Error(`${name}: empty PATCH request is admitted`);
    }
    if (
      schema.properties?.nextCursor !== undefined &&
      schema.properties?.hasMore !== undefined
    ) {
      const conditions = /** @type {JsonObject[] | undefined} */ (schema.allOf);
      const cursorCondition = conditions?.find(
        (condition) => condition.if?.properties?.hasMore?.const === true,
      );
      const declaredType = schema.properties.nextCursor.type;
      if (
        !Array.isArray(declaredType) ||
        declaredType.length !== 2 ||
        !declaredType.includes('string') ||
        !declaredType.includes('null')
      ) {
        throw new Error(`${name}: nextCursor is not string-or-null`);
      }
      if (
        !cursorCondition?.then?.required?.includes('nextCursor') ||
        cursorCondition?.then?.properties?.nextCursor?.type !== 'string' ||
        cursorCondition?.else?.properties?.nextCursor?.type !== 'null'
      ) {
        throw new Error(`${name}: nextCursor/hasMore contract is incomplete`);
      }
    }
  }

  for (const { method, operation, path: route } of records) {
    const identity = `${method} ${route}`;
    const reachable = new Set(operation['x-gala-reachable-problems']);
    const mappedProblems = new Set();
    const parameters = operation.parameters.map((parameter) =>
      resolveLocalComponent(parameter, 'parameters', components),
    );
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    /** @type {import('ajv-formats').default} */ (
      /** @type {unknown} */ (formatsPlugin)
    )(ajv);
    for (const parameter of parameters) {
      if (parameter?.example === undefined) {
        throw new Error(`${identity}: parameter example is absent`);
      }
      const validateParameter = ajv.compile(parameter.schema);
      if (!validateParameter(parameter.example)) {
        throw new Error(
          `${identity}: ${parameter.name} parameter example is invalid: ${JSON.stringify(validateParameter.errors)}`,
        );
      }
    }
    const requestMedia = operation.requestBody?.content?.['application/json'];
    if (
      requestMedia !== undefined &&
      requestMedia.examples?.nominal?.value === undefined
    ) {
      throw new Error(`${identity}: request example is absent`);
    }
    const successStatus =
      SUCCESS_STATUSES[operation['x-gala-success-category']];
    if (successStatus === undefined) {
      throw new Error(`${identity}: success status is absent`);
    }
    const successMedia =
      operation.responses[successStatus]?.content?.['application/json'];
    if (
      successMedia !== undefined &&
      successMedia.examples?.nominal?.value === undefined
    ) {
      throw new Error(`${identity}: success example is absent`);
    }
    if (
      parameters.some(
        (parameter) => parameter?.in === 'path' || parameter?.in === 'query',
      )
    ) {
      const invalidInput = resolveLocalComponent(
        operation.responses['400'],
        'responses',
        components,
      );
      if (
        !invalidInput?.['x-gala-problem-codes']?.includes('VALIDATION_FAILED')
      ) {
        throw new Error(`${identity}: path/query validation mapping is absent`);
      }
    }
    for (const [status, rawResponse] of Object.entries(operation.responses)) {
      if (Number(status) < 400) continue;
      const response = resolveLocalComponent(
        rawResponse,
        'responses',
        components,
      );
      if (
        response?.content?.['application/problem+json']?.schema?.$ref !==
        '#/components/schemas/Problem'
      ) {
        throw new Error(`${identity}: ${status} is not a Gala problem`);
      }
      const problemCodes = response['x-gala-problem-codes'];
      if (
        !Array.isArray(problemCodes) ||
        problemCodes.length === 0 ||
        problemCodes.some((code) => !reachable.has(code))
      ) {
        throw new Error(`${identity}: ${status} problem mapping drift`);
      }
      const examples = response.content['application/problem+json'].examples;
      if (
        examples === undefined ||
        Object.keys(examples).sort().join('\0') !==
          [...problemCodes].sort().join('\0') ||
        Object.entries(examples).some(
          ([code, example]) =>
            example?.value?.code !== code ||
            example?.value?.status !== Number(status) ||
            !HTTP_PROBLEM_EXAMPLE_RULES[code]?.statuses.includes(
              Number(status),
            ) ||
            example?.value?.retryable !==
              HTTP_PROBLEM_EXAMPLE_RULES[code]?.retryable,
        )
      ) {
        throw new Error(`${identity}: ${status} problem examples drift`);
      }
      for (const problemCode of problemCodes) mappedProblems.add(problemCode);
      if (
        status === '429' &&
        response.headers?.['Retry-After']?.$ref !==
          '#/components/headers/RetryAfter'
      ) {
        throw new Error(`${identity}: rate limit response lacks Retry-After`);
      }
    }
    if (
      mappedProblems.size !== reachable.size ||
      [...reachable].some((code) => !mappedProblems.has(code))
    ) {
      throw new Error(`${identity}: reachable problem is not status-mapped`);
    }
    const assuranceClass = operation['x-gala-assurance-class'];
    if (
      assuranceClass !== undefined &&
      !ASSURANCE_CLASSES.includes(assuranceClass)
    ) {
      throw new Error(`${identity}: assurance class is not in the vocabulary`);
    }
    const actionGrant = operation['x-gala-action-grant'];
    if (
      actionGrant !== undefined &&
      !ACTION_GRANT_MODES.includes(actionGrant)
    ) {
      throw new Error(`${identity}: action grant is not in the vocabulary`);
    }
    if ((assuranceClass === undefined) !== (actionGrant === undefined)) {
      throw new Error(
        `${identity}: assurance class and action grant are declared apart`,
      );
    }
    if (
      actionGrant === 'required' &&
      assuranceClass !== 'RECENT_AUTHENTICATION'
    ) {
      throw new Error(
        `${identity}: an action grant requires recent authentication`,
      );
    }
    const hasStateGuards = operation['x-gala-state-guards'][0] !== 'NONE';
    if (hasStateGuards !== reachable.has('INVALID_SOURCE_STATE')) {
      throw new Error(`${identity}: lifecycle guard/problem mapping drift`);
    }
    const hasActivationGuards =
      operation['x-gala-activation-guards'][0] !== 'NONE';
    if (hasActivationGuards !== reachable.has('CAPABILITY_UNAVAILABLE')) {
      throw new Error(`${identity}: activation guard/problem mapping drift`);
    }
    if (
      [
        'getCallbacksGithubOauth',
        'postWorkloadsGithubReceiptExchanges',
      ].includes(operation.operationId) !==
      reachable.has('DEPENDENCY_UNAVAILABLE')
    ) {
      throw new Error(`${identity}: dependency failure mapping drift`);
    }
  }
}

/**
 * Read every path fragment and enforce exact fragment and operation counts.
 *
 * @param {Record<string, unknown>} schemas complete component schema registry
 * @returns {Promise<OperationRecord[]>} sorted complete operations
 */
async function readOperationRecords(schemas) {
  const records = /** @type {OperationRecord[]} */ ([]);
  for (const [sourceFragment, expectedCount] of Object.entries(
    PATH_FRAGMENT_COUNTS,
  )) {
    const filename = `${sourceFragment}.yaml`;
    const document = await readSource(filename);
    if (
      Object.keys(document).length !== 1 ||
      document.paths === null ||
      typeof document.paths !== 'object' ||
      Array.isArray(document.paths)
    ) {
      throw new Error(
        `${filename}: must contain only an OpenAPI paths fragment`,
      );
    }
    const paths = /** @type {Record<string, JsonObject>} */ (document.paths);
    const fragmentRecords = /** @type {OperationRecord[]} */ ([]);
    for (const [route, pathItem] of Object.entries(paths)) {
      if (!route.startsWith('/') || route.includes('...')) {
        throw new Error(`${filename}: invalid route ${route}`);
      }
      for (const [method, value] of Object.entries(pathItem)) {
        if (!HTTP_METHODS.has(method)) {
          throw new Error(`${filename}: invalid HTTP method ${method}`);
        }
        const operation = /** @type {OpenApiOperation} */ (value);
        const record = {
          operation,
          method: method.toUpperCase(),
          path: route,
          sourceFragment,
        };
        validateOperation(record, schemas);
        fragmentRecords.push(record);
      }
    }
    if (fragmentRecords.length !== expectedCount) {
      throw new Error(
        `${filename}: expected ${expectedCount} operations, received ${fragmentRecords.length}`,
      );
    }
    records.push(...fragmentRecords);
  }
  records.sort((left, right) => {
    const pathOrder = left.path.localeCompare(right.path);
    return pathOrder || left.method.localeCompare(right.method);
  });
  const identities = records.map(
    ({ method, path: route }) => `${method} ${route}`,
  );
  const operationIds = records.map(({ operation }) => operation.operationId);
  if (
    records.length !== 76 ||
    new Set(identities).size !== 76 ||
    new Set(operationIds).size !== 76 ||
    records.filter(({ path: route }) => route === '/internal/health').length !==
      1 ||
    records.filter(({ path: route }) => route !== '/internal/health').length !==
      75
  ) {
    throw new Error(
      'Source fragments are not exactly 75 MVP operations plus health',
    );
  }
  return records;
}

/**
 * Build the deterministic path map from independently complete fragments.
 *
 * @param {OperationRecord[]} records complete operation records
 * @returns {Record<string, Record<string, OpenApiOperation>>} path map
 */
function buildPaths(records) {
  const paths =
    /** @type {Record<string, Record<string, OpenApiOperation>>} */ ({});
  for (const record of records) {
    const pathItem = (paths[record.path] ??= {});
    pathItem[record.method.toLowerCase()] = record.operation;
  }
  return paths;
}

// SCHEMA-2.8.0 (LOCAL-56 (2)): the canonical Gala instant is the UTC millisecond
// subset of RFC 3339, and the JSON Schema roots express that as a `pattern`
// alongside `format: date-time`. In the OpenAPI bundle the pattern has to go.
// OpenAPI Generator 7.25 emits a Jakarta `@Pattern` on the generated
// `OffsetDateTime` getter, and Hibernate Validator has no `@Pattern` validator
// for `OffsetDateTime`, so the constraint cannot be resolved and every request
// carrying such a member fails with a 500 before any handler runs (observed on
// `POST .../publishes` with `scheduledFor`). The requirement is kept in the
// member's `description`, and the schema package's own validators keep
// enforcing it from the roots, which are untouched.
const DATE_TIME_SUBSET_SENTENCE =
  'Canonical Gala instant: the UTC millisecond subset of RFC 3339, exactly `YYYY-MM-DDThh:mm:ss.sssZ`. Stated here rather than as a `pattern` because a generated `OffsetDateTime` cannot carry one (LOCAL-56).';

/**
 * Drop the `pattern` from a `format: date-time` member and state the canonical
 * subset in its description instead.
 *
 * @param {JsonObject} schema one rewritten schema node
 * @returns {JsonObject} the node a generator can bind
 */
function relaxDateTimePattern(schema) {
  if (schema.format !== 'date-time' || schema.pattern === undefined) {
    return schema;
  }
  const rest = Object.fromEntries(
    Object.entries(schema).filter(
      ([key]) => key !== 'pattern' && key !== 'description',
    ),
  );
  const { description } = schema;
  const existing = typeof description === 'string' ? description.trim() : '';
  return {
    ...rest,
    description:
      existing === '' ||
      existing === 'Canonical Gala UTC millisecond subset of RFC 3339.'
        ? DATE_TIME_SUBSET_SENTENCE
        : `${existing}\n\n${DATE_TIME_SUBSET_SENTENCE}`,
  };
}

/**
 * Resolve one RFC 6901 fragment against a parsed JSON document.
 *
 * @param {JsonObject} document reference document
 * @param {string} fragment fragment without the leading hash
 * @returns {unknown} resolved value
 */
function resolveJsonPointer(document, fragment) {
  if (fragment === '') return document;
  if (!fragment.startsWith('/')) {
    throw new Error(`Unsupported external schema fragment: #${fragment}`);
  }
  return fragment
    .slice(1)
    .split('/')
    .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce(
      (value, token) =>
        value !== null && typeof value === 'object'
          ? /** @type {JsonObject} */ (value)[token]
          : undefined,
      /** @type {unknown} */ (document),
    );
}

/**
 * Convert a schema file or definition token into a component-name segment.
 *
 * @param {string} value source token
 * @returns {string} PascalCase token
 */
function componentNameToken(value) {
  return value
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean)
    .map((token) => `${token.charAt(0).toUpperCase()}${token.slice(1)}`)
    .join('');
}

/**
 * Infer the explicit OpenAPI type required by generators for a JSON Schema constant.
 *
 * @param {unknown} value constant value
 * @returns {string | undefined} JSON Schema type
 */
function constantType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return undefined;
  if (typeof value === 'number')
    return Number.isInteger(value) ? 'integer' : 'number';
  if (['boolean', 'string'].includes(typeof value)) return typeof value;
  return undefined;
}

/**
 * Escape one literal for an exact ECMA-262 JSON Schema pattern.
 *
 * @param {string} value literal value
 * @returns {string} exact anchored pattern
 */
function exactStringPattern(value) {
  return `^${value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}$`;
}

/**
 * Replace JSON Schema `const` with an equivalent generator-supported constraint.
 *
 * The pinned Java generator turns `const` into invalid enum source for booleans and incompatible
 * enum getters for string discriminators. `x-gala-const` retains the literal as reviewed metadata;
 * the standard constraints continue to accept exactly that literal.
 *
 * @param {JsonObject} schema schema containing a constant
 * @returns {JsonObject} generator-safe equivalent
 */
function normalizeConstant(schema) {
  if (!('const' in schema)) return schema;
  const value = schema.const;
  const type = constantType(value);
  if (type === undefined) {
    throw new Error('Unsupported OpenAPI constant type');
  }
  const normalized = /** @type {JsonObject} */ ({
    ...schema,
    'x-gala-const': value,
    type,
  });
  delete normalized.const;
  if (typeof value === 'string') {
    normalized.pattern = exactStringPattern(value);
  } else if (typeof value === 'boolean') {
    if ('not' in normalized) {
      normalized.allOf = [
        ...(Array.isArray(normalized.allOf) ? normalized.allOf : []),
        { not: { enum: [!value] } },
      ];
    } else {
      normalized.not = { enum: [!value] };
    }
  } else if (typeof value === 'number') {
    normalized.minimum = value;
    normalized.maximum = value;
  } else if (Array.isArray(value)) {
    if (value.length !== 0) {
      throw new Error(
        'Only the reviewed empty-array OpenAPI constant is supported',
      );
    }
    normalized.minItems = 0;
    normalized.maxItems = 0;
  }
  return normalized;
}

/**
 * Promote external JSON Schema resources into named local OpenAPI components.
 *
 * OpenAPI Generator does not preserve an external schema resource as the base URI when it follows
 * a nested `#/$defs/...` reference. Named local components keep the published bundle self-contained,
 * retain one canonical definition per portable shape, and avoid generator defects caused by deeply
 * nested anonymous models. Reviewed source fragments continue to reference the portable schemas.
 *
 * @param {JsonObject} openApiDocument complete unresolved OpenAPI document
 * @returns {Promise<JsonObject>} self-contained generator-consumable bundle
 */
async function bundleExternalSchemaReferences(openApiDocument) {
  const externalDocuments = new Map();
  const externalComponents = /** @type {Record<string, unknown>} */ ({});
  const registeredComponents = new Map();
  const componentOwners = new Map();
  const schemaDirectory = `${path.resolve('schemas')}${path.sep}`;

  /**
   * Load one contained portable schema document.
   *
   * @param {string} filename reference filename relative to openapi/
   * @returns {Promise<{document: JsonObject, externalPath: string}>} schema and absolute identity
   */
  async function loadExternalDocument(filename) {
    const externalPath = path.resolve('openapi', filename);
    if (!externalPath.startsWith(schemaDirectory)) {
      throw new Error(`External OpenAPI schema escapes schemas/: ${filename}`);
    }
    let document = externalDocuments.get(externalPath);
    if (document === undefined) {
      document = /** @type {JsonObject} */ (
        JSON.parse(await readFile(externalPath, 'utf8'))
      );
      externalDocuments.set(externalPath, document);
    }
    return { document, externalPath };
  }

  /**
   * Register one external resource fragment as a local component.
   *
   * @param {string} externalPath absolute source schema path
   * @param {JsonObject} document parsed source schema
   * @param {string} fragment JSON Pointer fragment without hash
   * @returns {Promise<string>} registered component name
   */
  async function registerExternalComponent(externalPath, document, fragment) {
    const identity = `${externalPath}#${fragment}`;
    const existing = registeredComponents.get(identity);
    if (existing !== undefined) return existing;

    const basename = path
      .basename(externalPath)
      .replace(/\.schema\.json$/u, '');
    const definition =
      fragment === '' ? 'document' : fragment.split('/').at(-1);
    if (definition === undefined || definition === '') {
      throw new Error(
        `Invalid external schema component identity: ${identity}`,
      );
    }
    const componentName = `Portable${componentNameToken(basename)}${componentNameToken(definition)}`;
    const owner = componentOwners.get(componentName);
    if (owner !== undefined && owner !== identity) {
      throw new Error(
        `External schema component name collision: ${componentName}`,
      );
    }
    componentOwners.set(componentName, identity);
    registeredComponents.set(identity, componentName);
    externalComponents[componentName] = {};

    const target = resolveJsonPointer(document, fragment);
    if (target === undefined) {
      throw new Error(`Unresolved external OpenAPI schema: ${identity}`);
    }
    externalComponents[componentName] = await transform(
      target,
      document,
      externalPath,
    );
    if (componentName === 'PortableDeploymentIntentPackageIdentity') {
      // Every place this component is reached from is a `publisher` slot, and
      // `deployment-intent`/`deployment-receipt` pin that slot's `package` to
      // the one publish action (LOCAL-55 (3)); the API enforces it. The
      // portable `packageIdentity` definition itself cannot carry the constant,
      // because the same definition also describes the kernel, protocol and
      // adapter packages, so the reviewed literal is retained here as metadata
      // rather than as a second, wrong validation rule.
      const component = /** @type {JsonObject} */ (
        externalComponents[componentName]
      );
      component.properties = {
        .../** @type {JsonObject} */ (component.properties),
        package: {
          .../** @type {JsonObject} */ (
            /** @type {JsonObject} */ (component.properties).package
          ),
          'x-gala-const': '@rathnasgala2/publish-action',
        },
      };
    }
    if (componentName === 'PortableProblemProblemType') {
      externalComponents[componentName] = {
        format: 'uri',
        pattern:
          '^(?:https://(?![^/?#]*@)[^#]+|urn:gala:problem:[a-z0-9]+(?:-[a-z0-9]+)*)$',
        type: 'string',
      };
    }
    return componentName;
  }

  /**
   * Rewrite one node and recursively register external references.
   *
   * @param {unknown} value current value
   * @param {JsonObject} referenceDocument local-reference document
   * @param {string | null} externalPath source path, or null for the OpenAPI document
   * @returns {Promise<unknown>} rewritten node
   */
  async function transform(value, referenceDocument, externalPath) {
    if (Array.isArray(value)) {
      return Promise.all(
        value.map((item) => transform(item, referenceDocument, externalPath)),
      );
    }
    if (value === null || typeof value !== 'object') return value;

    const schema = /** @type {JsonObject} */ (value);
    if (typeof schema.$ref === 'string') {
      const hashIndex = schema.$ref.indexOf('#');
      const filename =
        hashIndex === -1 ? schema.$ref : schema.$ref.slice(0, hashIndex);
      const fragment = hashIndex === -1 ? '' : schema.$ref.slice(hashIndex + 1);
      /** @type {string | undefined} */
      let componentName;
      if (filename !== '') {
        const loaded = await loadExternalDocument(filename);
        componentName = await registerExternalComponent(
          loaded.externalPath,
          loaded.document,
          fragment,
        );
      } else if (externalPath !== null) {
        componentName = await registerExternalComponent(
          externalPath,
          referenceDocument,
          fragment,
        );
      }
      if (componentName !== undefined) {
        return {
          $ref: `#/components/schemas/${componentName}`,
          .../** @type {JsonObject} */ (
            await transform(
              Object.fromEntries(
                Object.entries(schema).filter(([key]) => key !== '$ref'),
              ),
              referenceDocument,
              externalPath,
            )
          ),
        };
      }
    }

    const entries = await Promise.all(
      Object.entries(schema)
        .filter(
          ([key]) =>
            externalPath === null || !['$defs', '$id', '$schema'].includes(key),
        )
        .map(async ([key, item]) => [
          key,
          await transform(item, referenceDocument, externalPath),
        ]),
    );
    return relaxDateTimePattern(
      normalizeConstant(
        /** @type {JsonObject} */ (Object.fromEntries(entries)),
      ),
    );
  }

  const document = /** @type {JsonObject} */ (
    await transform(openApiDocument, openApiDocument, null)
  );
  document.components.schemas = {
    ...document.components.schemas,
    ...externalComponents,
  };
  return document;
}

/**
 * Materialize the deterministic OpenAPI bundle and generated HTTP catalog.
 *
 * @returns {Promise<{bundleSource: string, catalogSource: string}>} outputs
 */
export async function createOpenApiArtifacts() {
  const [root, componentDocument] = await Promise.all([
    readSource('root.yaml'),
    readSource('components.yaml'),
  ]);
  if (
    root.openapi !== '3.1.0' ||
    root.info?.version !== VERSION ||
    root['x-gala-contract-id'] !== CONTRACT_ID ||
    typeof root['x-gala-source-design-revision'] !== 'string' ||
    'paths' in root ||
    'components' in root ||
    Object.keys(componentDocument).length !== 1 ||
    componentDocument.components === null ||
    typeof componentDocument.components !== 'object'
  ) {
    throw new Error('Root or component OpenAPI source fragment is invalid');
  }
  const components = /** @type {JsonObject} */ (componentDocument.components);
  const schemas = /** @type {Record<string, unknown>} */ (components.schemas);
  const records = await readOperationRecords(schemas);
  validateContractClosure(records, components);
  const unresolvedDocument = {
    ...root,
    paths: buildPaths(records),
    components,
  };
  const document = await bundleExternalSchemaReferences(unresolvedDocument);
  const bundleSource = stringify(document, {
    aliasDuplicateObjects: false,
    indent: 2,
    lineWidth: 0,
    sortMapEntries: true,
    version: '1.1',
  });
  const openApiDigest = `sha256:${createHash('sha256')
    .update(bundleSource)
    .digest('hex')}`;
  const catalogWithoutDigest = {
    schemaVersion: VERSION,
    sourceDesignRevision: root['x-gala-source-design-revision'],
    openApiDigest,
    operations: records.map(
      ({ method, operation, path: route, sourceFragment }) => ({
        operationId: operation.operationId,
        method,
        path: route,
        purpose: operation['x-gala-purpose'],
        capabilityKey: operation['x-gala-capability-key'],
        conditionalCapabilityKeys: [
          ...operation['x-gala-conditional-capabilities'].map(
            ({ capabilityKey }) => capabilityKey,
          ),
          ...(operation['x-gala-conditional-capability-keys'] ?? []).map(
            ({ capabilityKey }) => capabilityKey,
          ),
        ],
        activationGate: operation['x-gala-activation-gate'],
        // SCHEMA-2.8.0: the API's action-grant catalog is keyed by operation, not by
        // capability key, so the contract states per-operation assurance here. The
        // defaults are the ordinary case: an authenticated session, no action grant.
        assuranceClass: operation['x-gala-assurance-class'] ?? 'SESSION',
        actionGrant: operation['x-gala-action-grant'] ?? 'none',
        sourceFragment,
      }),
    ),
  };
  const catalog = {
    ...catalogWithoutDigest,
    digest: `sha256:${createHash('sha256')
      .update(canonicalizeJcsBytes(catalogWithoutDigest))
      .digest('hex')}`,
  };
  return {
    bundleSource,
    catalogSource: `${JSON.stringify(catalog, null, 2)}\n`,
  };
}

/**
 * Generate outputs or prove that checked-in outputs are current.
 *
 * @param {boolean} check whether to compare without writing
 * @returns {Promise<void>}
 */
async function generate(check) {
  const artifacts = await createOpenApiArtifacts();
  if (check) {
    const [bundleSource, catalogSource] = await Promise.all([
      readFile(BUNDLE_PATH, 'utf8'),
      readFile(CATALOG_PATH, 'utf8'),
    ]);
    if (bundleSource !== artifacts.bundleSource) {
      throw new Error('openapi/openapi.yaml is stale');
    }
    if (catalogSource !== artifacts.catalogSource) {
      throw new Error('openapi/http-catalog.json is stale');
    }
    process.stdout.write('OpenAPI bundle and HTTP catalog are current.\n');
    return;
  }
  await Promise.all([
    writeFile(BUNDLE_PATH, artifacts.bundleSource),
    writeFile(CATALOG_PATH, artifacts.catalogSource),
  ]);
  process.stdout.write('Generated OpenAPI bundle and HTTP catalog.\n');
}

await runIfMain(import.meta.url, async () => {
  await generate(process.argv.includes('--check'));
});
