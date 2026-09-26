import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { Ajv2020 } from 'ajv/dist/2020.js';
import formatsPlugin from 'ajv-formats';
import { parse as parseYaml } from 'yaml';

import {
  CAPABILITY_KEY_PATTERN,
  CONDITIONAL_CAPABILITY_KEY_CONDITIONS,
  createOpenApiArtifacts,
  operationIdFor,
} from '../scripts/generate-openapi.mjs';
import { canonicalizeJcsBytes } from '../src/internal/canonical-jcs.js';
import { validateGalaFormat } from '../src/internal/format-validators.js';
import { HTTP_PROBLEM_EXAMPLE_RULES } from '../scripts/internal-semantics/http-problem-contract.js';
import { validateRfc3339 } from '../src/internal/portable-scalars.js';
import { validateVerificationContentType } from '../src/internal/public-verification-semantics.js';

/**
 * @typedef {Record<string, any>} JsonObject
 * @typedef {{
 *   operationId: string,
 *   method: string,
 *   path: string,
 *   purpose: string,
 *   capabilityKey: string | null,
 *   conditionalCapabilityKeys: string[],
 *   activationGate: string,
 *   sourceFragment: string
 * }} CatalogRow
 * @typedef {{
 *   openApiDigest: string,
 *   digest: string,
 *   operations: CatalogRow[]
 * }} HttpCatalog
 * @typedef {{method: string, path: string, fragment: string}} SourceOperation
 */

const EXPECTED_OPERATIONS = `
GET /internal/health
GET /v2/session
POST /v2/session/reauthentication
DELETE /v2/session
POST /v2/authentication/github/transactions
GET /v2/callbacks/github/oauth
POST /v2/authentication/passkey/assertion-options
POST /v2/authentication/passkey/assertions
POST /v2/authentication/recovery-code
GET /v2/self/authenticators
POST /v2/self/identity-links
DELETE /v2/self/identity-links/{identityLinkId}
POST /v2/self/passkey-registration-options
POST /v2/self/passkeys
PATCH /v2/self/passkeys/{passkeyId}
DELETE /v2/self/passkeys/{passkeyId}
POST /v2/self/recovery-code-sets
GET /v2/self/sessions
DELETE /v2/self/sessions/{sessionFamilyId}
POST /v2/self/exports
GET /v2/self/exports/{exportId}
POST /v2/self/closure
GET /v2/self/closure
GET /v2/github/installations
GET /v2/organizations
POST /v2/organizations
GET /v2/organizations/{organizationId}
PATCH /v2/organizations/{organizationId}
GET /v2/organizations/{organizationId}/membership-invitations
GET /v2/organizations/{organizationId}/memberships
POST /v2/organizations/{organizationId}/membership-invitations
GET /v2/organizations/{organizationId}/membership-invitations/{invitationId}
DELETE /v2/organizations/{organizationId}/membership-invitations/{invitationId}
POST /v2/membership-invitations/{token}:accept
PATCH /v2/organizations/{organizationId}/memberships/{membershipId}
DELETE /v2/organizations/{organizationId}/memberships/{membershipId}
GET /v2/organizations/{organizationId}/publications
POST /v2/organizations/{organizationId}/publications
GET /v2/organizations/{organizationId}/publications/{publicationId}
PATCH /v2/organizations/{organizationId}/publications/{publicationId}
DELETE /v2/organizations/{organizationId}/publications/{publicationId}
POST /v2/organizations/{organizationId}/owner-transfers
GET /v2/organizations/{organizationId}/owner-transfers/{transferId}
POST /v2/organizations/{organizationId}/owner-transfers/{transferId}:accept
POST /v2/organizations/{organizationId}/owner-transfers/{transferId}:cancel
POST /v2/organizations/{organizationId}/publications/{publicationId}/repository-bindings
GET /v2/organizations/{organizationId}/publications/{publicationId}/repository-bindings/current
DELETE /v2/organizations/{organizationId}/publications/{publicationId}/repository-bindings/current
POST /v2/organizations/{organizationId}/publications/{publicationId}/repository-changes:plan
POST /v2/organizations/{organizationId}/publications/{publicationId}/repository-changes/{changeId}:confirm
POST /v2/organizations/{organizationId}/publications/{publicationId}/content-changes:plan
POST /v2/organizations/{organizationId}/publications/{publicationId}/configuration-changes:plan
POST /v2/organizations/{organizationId}/publications/{publicationId}/reviews
GET /v2/organizations/{organizationId}/publications/{publicationId}/reviews
GET /v2/organizations/{organizationId}/publications/{publicationId}/reviews/{reviewId}
POST /v2/organizations/{organizationId}/publications/{publicationId}/reviews/{reviewId}:decide
POST /v2/organizations/{organizationId}/publications/{publicationId}/publishes
POST /v2/organizations/{organizationId}/publications/{publicationId}/publishes/{publishId}:cancel
POST /v2/organizations/{organizationId}/publication-imports
GET /v2/organizations/{organizationId}/publication-imports/{importId}
GET /v2/organizations/{organizationId}/operations/{operationId}
POST /v2/organizations/{organizationId}/operations/{operationId}:cancel
POST /v2/organizations/{organizationId}/publications/{publicationId}/deployments/{generationId}:reconcile
POST /v2/organizations/{organizationId}/publications/{publicationId}/deployments:rollback
GET /v2/organizations/{organizationId}/publications/{publicationId}/deployments
GET /v2/organizations/{organizationId}/publications/{publicationId}/deployments/{generationId}
POST /v2/workloads/github/receipt-exchanges
POST /v2/workloads/deployment-receipts
POST /v2/callbacks/github/app
GET /v2/github/app
GET /v2/github/installations/{installationId}/repositories
GET /v2/organizations/{organizationId}/operations
GET /v2/organizations/{organizationId}/roles
POST /v2/organizations/{organizationId}/publications/{publicationId}:previewRetirement
GET /v2/organizations/{organizationId}/publications/{publicationId}/destination
PUT /v2/organizations/{organizationId}/publications/{publicationId}/destination
`
  .trim()
  .split('\n')
  .sort();

/**
 * Read all three OpenAPI projections.
 *
 * @returns {Promise<{
 *   bundleSource: string,
 *   bundle: JsonObject,
 *   catalog: HttpCatalog,
 *   sourceOperations: SourceOperation[]
 * }>} parsed projections
 */
async function readProjections() {
  const [bundleSource, catalogSource, sourceFiles] = await Promise.all([
    readFile('openapi/openapi.yaml', 'utf8'),
    readFile('openapi/http-catalog.json', 'utf8'),
    readdir('openapi/source'),
  ]);
  const catalog = /** @type {HttpCatalog} */ (JSON.parse(catalogSource));
  const sourceOperations = /** @type {SourceOperation[]} */ ([]);
  for (const filename of sourceFiles.filter(
    (name) =>
      name.endsWith('.yaml') &&
      !['components.yaml', 'root.yaml'].includes(name),
  )) {
    const fragment = /** @type {{paths: Record<string, JsonObject>}} */ (
      parseYaml(await readFile(path.join('openapi/source', filename), 'utf8'))
    );
    for (const [route, pathItem] of Object.entries(fragment.paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        sourceOperations.push({
          method: method.toUpperCase(),
          path: route,
          fragment: operation.tags[0],
        });
      }
    }
  }
  return {
    bundleSource,
    bundle: /** @type {JsonObject} */ (parseYaml(bundleSource)),
    catalog,
    sourceOperations,
  };
}

/**
 * Project operation identities from an OpenAPI path map.
 *
 * @param {Record<string, Record<string, unknown>>} paths OpenAPI paths
 * @returns {string[]} sorted method/path identities
 */
function bundleIdentities(paths) {
  return Object.entries(paths)
    .flatMap(([route, pathItem]) =>
      Object.keys(pathItem).map((method) => `${method.toUpperCase()} ${route}`),
    )
    .sort();
}

/**
 * Return one operation from the parsed bundle.
 *
 * @param {JsonObject} bundle parsed OpenAPI document
 * @param {string} method uppercase method
 * @param {string} route route template
 * @returns {JsonObject} operation
 */
function operationAt(bundle, method, route) {
  const operation = bundle.paths[route]?.[method.toLowerCase()];
  assert.ok(operation, `${method} ${route}`);
  return operation;
}

/**
 * Collect every reference without recursively following referenced targets.
 *
 * @param {unknown} value JSON-compatible value
 * @param {string[]} [references] collected references
 * @returns {string[]} references
 */
function collectReferences(value, references = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectReferences(item, references);
    return references;
  }
  if (value === null || typeof value !== 'object') return references;
  for (const [key, item] of Object.entries(value)) {
    if (key === '$ref' && typeof item === 'string') references.push(item);
    else collectReferences(item, references);
  }
  return references;
}

/**
 * Resolve an RFC 6901 pointer against a JSON-compatible document.
 *
 * @param {unknown} document target document
 * @param {string} pointer fragment including the leading hash
 * @returns {unknown} resolved value
 */
function resolvePointer(document, pointer) {
  if (pointer === '#') return document;
  assert.match(pointer, /^#\//u);
  return pointer
    .slice(2)
    .split('/')
    .map((token) => token.replaceAll('~1', '/').replaceAll('~0', '~'))
    .reduce((value, token) => {
      assert.ok(value !== null && typeof value === 'object');
      return /** @type {Record<string, unknown>} */ (value)[token];
    }, document);
}

/**
 * Resolve an inline value or one local component reference.
 *
 * @param {JsonObject} bundle parsed OpenAPI document
 * @param {JsonObject} value inline or referenced value
 * @param {string} section component section
 * @returns {JsonObject} resolved value
 */
function resolveLocalComponent(bundle, value, section) {
  const prefix = `#/components/${section}/`;
  if (value.$ref?.startsWith(prefix)) {
    return bundle.components[section][value.$ref.slice(prefix.length)];
  }
  return value;
}

/**
 * Read a reviewed literal from source `const` or its generator-safe bundle projection.
 *
 * @param {JsonObject} schema schema containing the literal
 * @returns {unknown} literal value
 */
function schemaConstant(schema) {
  return 'const' in schema ? schema.const : schema['x-gala-const'];
}

/**
 * Replace portable scalar references with permissive scalar shapes so an
 * isolated OpenAPI component can execute its own conditional rules.
 *
 * @param {unknown} value schema node
 * @returns {unknown} isolated executable schema node
 */
function materializePortableScalars(value) {
  if (Array.isArray(value)) return value.map(materializePortableScalars);
  if (value === null || typeof value !== 'object') return value;
  const schema = /** @type {JsonObject} */ (value);
  if (
    schema.$ref?.startsWith('../schemas/') ||
    schema.$ref?.startsWith('#/components/schemas/Portable')
  ) {
    return { type: 'string' };
  }
  return Object.fromEntries(
    Object.entries(schema).map(([key, item]) => [
      key,
      materializePortableScalars(item),
    ]),
  );
}

/**
 * Compile one isolated Draft 2020-12 schema for semantic negative tests.
 *
 * @param {JsonObject} schema schema to compile
 * @returns {import('ajv').ValidateFunction} compiled validator
 */
function compileIsolatedSchema(schema) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    validateFormats: false,
  });
  return ajv.compile(
    /** @type {import('ajv').AnySchema} */ (materializePortableScalars(schema)),
  );
}

/**
 * Inline local and portable-schema references into one executable test schema.
 *
 * @param {unknown} value schema node
 * @param {JsonObject} document current reference document
 * @param {JsonObject} bundle complete OpenAPI bundle
 * @param {Map<string, JsonObject>} externalDocuments external schema cache
 * @returns {Promise<unknown>} reference-free schema
 */
async function materializeReferences(
  value,
  document,
  bundle,
  externalDocuments,
) {
  if (Array.isArray(value)) {
    return Promise.all(
      value.map((item) =>
        materializeReferences(item, document, bundle, externalDocuments),
      ),
    );
  }
  if (value === null || typeof value !== 'object') return value;
  const schema = /** @type {JsonObject} */ (value);
  if (typeof schema.$ref === 'string') {
    const [filename = '', fragment = ''] = schema.$ref.split('#');
    if (filename === '') {
      const referenceDocument = schema.$ref.startsWith('#/components/')
        ? bundle
        : document;
      return materializeReferences(
        resolvePointer(referenceDocument, `#${fragment}`),
        referenceDocument,
        bundle,
        externalDocuments,
      );
    }
    let external = externalDocuments.get(filename);
    if (external === undefined) {
      const loaded = /** @type {JsonObject} */ (
        JSON.parse(await readFile(path.resolve('openapi', filename), 'utf8'))
      );
      external = loaded;
      externalDocuments.set(filename, loaded);
    }
    return materializeReferences(
      resolvePointer(/** @type {JsonObject} */ (external), `#${fragment}`),
      /** @type {JsonObject} */ (external),
      bundle,
      externalDocuments,
    );
  }
  const entries = await Promise.all(
    Object.entries(schema)
      .filter(([key]) => !['$id', '$schema'].includes(key))
      .map(async ([key, item]) => [
        key,
        await materializeReferences(item, document, bundle, externalDocuments),
      ]),
  );
  return Object.fromEntries(entries);
}

/**
 * `/v2/github/**` reads whose authority is the signed-in principal's own GitHub
 * user token rather than an organization capability key.
 */
const GITHUB_PRINCIPAL_AUTHORITY_PATHS = new Set([
  '/v2/github/app',
  '/v2/github/installations',
  '/v2/github/installations/{installationId}/repositories',
]);

/**
 * Compile one fully resolved OpenAPI schema.
 *
 * @param {JsonObject} bundle complete OpenAPI bundle
 * @param {JsonObject} schema root schema
 * @returns {Promise<import('ajv').ValidateFunction>} compiled validator
 */
async function compileResolvedSchema(bundle, schema) {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    validateFormats: false,
  });
  return ajv.compile(
    /** @type {import('ajv').AnySchema} */ (
      await materializeReferences(schema, bundle, bundle, new Map())
    ),
  );
}

/**
 * Drop the two members the bundler lifts out of a `format: date-time` node
 * (LOCAL-56), so a bundled instant can be compared with its root contract.
 *
 * @param {JsonObject} schema one instant schema
 * @returns {JsonObject} the comparable remainder
 */
function withoutBundleLiftedKeys(schema) {
  return Object.fromEntries(
    Object.entries(schema).filter(
      ([key]) => key !== 'pattern' && key !== 'description',
    ),
  );
}

test('source fragments, bundle and catalog contain exactly the 75-operation MVP plus health', async () => {
  const { bundle, catalog, sourceOperations } = await readProjections();
  const sourceIdentities = sourceOperations
    .map(({ method, path: route }) => `${method} ${route}`)
    .sort();
  const catalogIdentities = catalog.operations
    .map(({ method, path: route }) => `${method} ${route}`)
    .sort();
  assert.equal(EXPECTED_OPERATIONS.length, 76);
  assert.deepEqual(sourceIdentities, EXPECTED_OPERATIONS);
  assert.deepEqual(bundleIdentities(bundle.paths), EXPECTED_OPERATIONS);
  assert.deepEqual(catalogIdentities, EXPECTED_OPERATIONS);
  assert.equal(
    catalog.operations.filter(({ path: route }) => route === '/internal/health')
      .length,
    1,
  );
  assert.equal(
    catalog.operations.filter(({ path: route }) => route.startsWith('/v2/'))
      .length,
    75,
  );
});

test('every operation uses mechanical unique naming and complete executable metadata', async () => {
  const { bundle, catalog } = await readProjections();
  const operationIds = [];
  for (const row of catalog.operations) {
    const operation = operationAt(bundle, row.method, row.path);
    const expectedId = operationIdFor(row.method, row.path);
    operationIds.push(operation.operationId);
    assert.equal(operation.operationId, expectedId);
    assert.equal(row.operationId, expectedId);
    assert.equal(operation['x-gala-purpose'], row.purpose);
    assert.equal(operation['x-gala-capability-key'], row.capabilityKey);
    assert.deepEqual(
      [
        .../** @type {Array<{capabilityKey: string}>} */ (
          operation['x-gala-conditional-capabilities']
        ).map(({ capabilityKey }) => capabilityKey),
        .../** @type {Array<{capabilityKey: string}>} */ (
          operation['x-gala-conditional-capability-keys'] ?? []
        ).map(({ capabilityKey }) => capabilityKey),
      ],
      row.conditionalCapabilityKeys,
    );
    assert.equal(operation['x-gala-activation-gate'], row.activationGate);
    assert.ok(operation['x-gala-activation-guards'].length > 0);
    assert.ok(operation['x-gala-state-guards'].length > 0);
    assert.equal(typeof operation['x-gala-tenant-scope'], 'string');
    assert.equal(
      operation['x-gala-example-profile'],
      'NOMINAL_SUCCESS_AND_EACH_REACHABLE_PROBLEM',
    );
    assert.equal(typeof operation['x-gala-replay-identity'], 'string');
    assert.equal(typeof operation['x-gala-concurrency'], 'string');
    assert.ok(
      operation['x-gala-reachable-problems'].length > 0 ||
        row.path === '/internal/health',
    );
    assert.equal(
      operation['x-gala-nullability'],
      'required-and-nullable-are-explicit',
    );
    assert.deepEqual(operation.tags, [row.sourceFragment]);
  }
  assert.equal(new Set(operationIds).size, 76);
});

test('recovery-code regeneration declares both lifecycle families', async () => {
  const { bundle } = await readProjections();
  const operation = operationAt(bundle, 'post', '/v2/self/recovery-code-sets');
  assert.deepEqual(operation['x-gala-state-guards'], [
    'RecoveryCodeSet:ACTIVE -> SUPERSEDED',
    'RecoveryCode:AVAILABLE -> REVOKED',
  ]);
});

test('request and success components follow the frozen mechanical names', async () => {
  const { bundle, catalog } = await readProjections();
  for (const row of catalog.operations) {
    const operation = operationAt(bundle, row.method, row.path);
    const stem = `${row.operationId.charAt(0).toUpperCase()}${row.operationId.slice(1)}`;
    if (operation.requestBody !== undefined) {
      assert.equal(
        operation.requestBody.content['application/json'].schema.$ref,
        `#/components/schemas/${stem}Request`,
      );
      assert.ok(bundle.components.schemas[`${stem}Request`]);
    }
    const success = Object.entries(operation.responses).find(
      ([status]) => Number(status) < 400,
    );
    assert.ok(success);
    const [status, response] = success;
    if (!['204', '303'].includes(status)) {
      assert.equal(
        response.content['application/json'].schema.$ref,
        `#/components/schemas/${stem}Response`,
      );
      assert.ok(bundle.components.schemas[`${stem}Response`]);
    }
  }
});

test('the published bundle is self-contained and every reference resolves', async () => {
  const { bundle } = await readProjections();
  const references = collectReferences(bundle);
  assert.ok(references.length > 300);
  for (const reference of references) {
    const [filename = '', fragment = ''] = reference.split('#');
    assert.equal(filename, '', reference);
    assert.notEqual(
      resolvePointer(bundle, `#${fragment}`),
      undefined,
      reference,
    );
  }
});

test('Gala JSON request bodies are closed and the raw GitHub callback is the sole provider-owned exception', async () => {
  const { bundle, catalog } = await readProjections();
  for (const row of catalog.operations) {
    const operation = operationAt(bundle, row.method, row.path);
    if (operation.requestBody === undefined) continue;
    assert.deepEqual(Object.keys(operation.requestBody.content), [
      'application/json',
    ]);
    const reference =
      operation.requestBody.content['application/json'].schema.$ref;
    const schema = /** @type {JsonObject} */ (
      bundle.components.schemas[reference.split('/').at(-1)]
    );
    if (row.path === '/v2/callbacks/github/app') {
      assert.equal(schema.additionalProperties, true);
      const headerNames = /** @type {JsonObject[]} */ (operation.parameters)
        .filter((parameter) => parameter.in === 'header')
        .map((parameter) => parameter.name)
        .sort();
      assert.deepEqual(headerNames, ['X-GitHub-Delivery', 'X-GitHub-Event']);
      continue;
    }
    const branches = /** @type {JsonObject[]} */ (schema.oneOf ?? [schema]).map(
      (branch) => resolveLocalComponent(bundle, branch, 'schemas'),
    );
    assert.ok(
      branches.every((branch) => branch.additionalProperties === false),
      row.operationId,
    );
    assert.ok(
      operation['x-gala-reachable-problems'].includes('REQUEST_FIELD_UNKNOWN'),
      row.operationId,
    );
  }
});

test('every declared problem response uses RFC 9457 media and rate limits carry Retry-After', async () => {
  const { bundle, catalog } = await readProjections();
  const problem = resolveLocalComponent(
    bundle,
    bundle.components.schemas.Problem,
    'schemas',
  );
  assert.equal(problem.type, 'object');
  assert.equal(problem.additionalProperties, false);
  for (const row of catalog.operations) {
    const operation = operationAt(bundle, row.method, row.path);
    for (const [status, rawResponse] of Object.entries(operation.responses)) {
      if (Number(status) < 400) continue;
      const response = resolveLocalComponent(bundle, rawResponse, 'responses');
      assert.deepEqual(Object.keys(response.content), [
        'application/problem+json',
      ]);
      assert.equal(
        response.content['application/problem+json'].schema.$ref,
        '#/components/schemas/Problem',
      );
      if (status === '429') {
        assert.equal(
          response.headers['Retry-After'].$ref,
          '#/components/headers/RetryAfter',
        );
      }
    }
  }
});

test('every operation carries exact scope, lifecycle, activation and validated examples', async () => {
  const { bundle, catalog } = await readProjections();
  for (const row of catalog.operations) {
    const operation = operationAt(bundle, row.method, row.path);
    const stateGuarded = operation['x-gala-state-guards'][0] !== 'NONE';
    const activationGuarded =
      operation['x-gala-activation-guards'][0] !== 'NONE';
    assert.equal(
      operation['x-gala-reachable-problems'].includes('INVALID_SOURCE_STATE'),
      stateGuarded,
      row.operationId,
    );
    assert.equal(
      operation['x-gala-reachable-problems'].includes('CAPABILITY_UNAVAILABLE'),
      activationGuarded,
      row.operationId,
    );

    for (const rawParameter of operation.parameters) {
      const parameter = resolveLocalComponent(
        bundle,
        rawParameter,
        'parameters',
      );
      assert.notEqual(parameter.example, undefined, row.operationId);
      const ajv = new Ajv2020({ allErrors: true, strict: false });
      /** @type {import('ajv-formats').default} */ (
        /** @type {unknown} */ (formatsPlugin)
      )(ajv);
      const validateParameter = ajv.compile(parameter.schema);
      assert.equal(
        validateParameter(parameter.example),
        true,
        `${row.operationId}:${parameter.name}: ${JSON.stringify(validateParameter.errors)}`,
      );
    }
    const requestMedia = operation.requestBody?.content?.['application/json'];
    if (requestMedia !== undefined) {
      const validateRequest = await compileResolvedSchema(
        bundle,
        requestMedia.schema,
      );
      const requestExample = requestMedia.examples?.nominal?.value;
      assert.notEqual(requestExample, undefined, row.operationId);
      assert.equal(
        validateRequest(requestExample),
        true,
        `${row.operationId}: ${JSON.stringify(validateRequest.errors)}`,
      );
    }
    for (const [status, rawResponse] of Object.entries(operation.responses)) {
      const response = resolveLocalComponent(bundle, rawResponse, 'responses');
      const mediaType =
        Number(status) < 400 ? 'application/json' : 'application/problem+json';
      const media = response.content?.[mediaType];
      if (media === undefined) continue;
      const validateResponse = await compileResolvedSchema(
        bundle,
        media.schema,
      );
      const examples = Object.values(media.examples ?? {});
      assert.ok(examples.length > 0, `${row.operationId}:${status}`);
      for (const example of examples) {
        assert.equal(
          validateResponse(example.value),
          true,
          `${row.operationId}:${status}: ${JSON.stringify(validateResponse.errors)}`,
        );
        if (Number(status) >= 400) {
          const rule = HTTP_PROBLEM_EXAMPLE_RULES[example.value.code];
          assert.ok(rule, `${row.operationId}:${example.value.code}`);
          assert.ok(
            rule.statuses.includes(Number(status)),
            `${row.operationId}:${example.value.code}:${status}`,
          );
          assert.equal(
            example.value.retryable,
            rule.retryable,
            `${row.operationId}:${example.value.code}:retryable`,
          );
        }
      }
    }
  }
});

test('success categories enforce statuses and required response headers', async () => {
  const { bundle, catalog } = await readProjections();
  const expectedStatus = /** @type {Record<string, string>} */ ({
    query: '200',
    protocol: '200',
    create: '201',
    update: '200',
    delete: '204',
    async: '202',
    'receipt-exchange': '200',
    'oauth-callback': '303',
    'provider-callback': '202',
  });
  for (const row of catalog.operations) {
    const operation = operationAt(bundle, row.method, row.path);
    const category = String(operation['x-gala-success-category']);
    const status = expectedStatus[category];
    assert.ok(status, row.operationId);
    const response = operation.responses[status];
    assert.ok(response, row.operationId);
    assert.deepEqual(response.headers['X-Correlation-Id'], {
      $ref: '#/components/headers/XCorrelationId',
    });
    assert.deepEqual(response.headers['Cache-Control'], {
      $ref: '#/components/headers/CacheControlNoStore',
    });
    assert.equal(
      response.headers.Location !== undefined,
      ['create', 'oauth-callback'].includes(category),
    );
    assert.equal(response.headers.ETag !== undefined, category === 'update');
  }
});

test('pagination, path parameters, replay headers and preconditions are explicit', async () => {
  const { bundle, catalog } = await readProjections();
  for (const row of catalog.operations) {
    const operation = operationAt(bundle, row.method, row.path);
    const parameters = /** @type {JsonObject[]} */ (operation.parameters);
    for (const name of [...row.path.matchAll(/\{([^}]+)\}/gu)].map(
      (match) => match[1],
    )) {
      const parameter = parameters.find(
        (candidate) => candidate.in === 'path' && candidate.name === name,
      );
      assert.equal(parameter?.required, true, `${row.operationId}:${name}`);
    }
    assert.equal(
      parameters.some(
        (parameter) =>
          parameter.$ref === '#/components/parameters/IdempotencyKey',
      ),
      operation['x-gala-replay-identity'] === 'idempotency-key',
    );
    // An `If-Match` precondition belongs to exactly the operations whose
    // declared concurrency is a resource version the caller states: the
    // `if-match-*` classes, and `review-version`, which SCHEMA-2.8.0 gave the
    // header it had always implied by mapping STALE_AGGREGATE_VERSION.
    const statesAVersion =
      operation['x-gala-concurrency'].startsWith('if-match') ||
      (operation['x-gala-concurrency'] === 'review-version' &&
        operation['x-gala-success-category'] !== 'query');
    assert.equal(
      parameters.some(
        (parameter) => parameter.$ref === '#/components/parameters/IfMatch',
      ),
      statesAVersion,
      `${row.operationId}: If-Match presence`,
    );
  }
  assert.deepEqual(bundle.components.parameters.Limit.schema, {
    default: 25,
    maximum: 100,
    minimum: 1,
    type: 'integer',
  });
});

test('every collection rejects a cursor that contradicts hasMore', async () => {
  const { bundle } = await readProjections();
  const collections = Object.entries(bundle.components.schemas).filter(
    ([, schema]) =>
      schema.properties?.hasMore !== undefined &&
      schema.properties?.nextCursor !== undefined,
  );
  assert.equal(collections.length, 12);
  for (const [name, schema] of collections) {
    assert.deepEqual(
      [...schema.properties.nextCursor.type].sort(),
      ['null', 'string'],
      name,
    );
    const validate = compileIsolatedSchema({
      additionalProperties: false,
      allOf: schema.allOf,
      properties: {
        hasMore: { type: 'boolean' },
        items: { type: 'array' },
        nextCursor: schema.properties.nextCursor,
      },
      required: ['items', 'hasMore'],
      type: 'object',
    });
    assert.equal(validate({ hasMore: true, items: [] }), false, name);
    assert.equal(
      validate({ hasMore: true, items: [], nextCursor: 'next' }),
      true,
      name,
    );
    assert.equal(
      validate({ hasMore: false, items: [], nextCursor: 'next' }),
      false,
      name,
    );
    assert.equal(validate({ hasMore: false, items: [] }), true, name);
    // SCHEMA-2.6.0 (INFRA-E2E-2 follow-up): the API emits an explicit null on
    // the last page. Null and absent are both admitted there, and neither is
    // admitted while hasMore is true, so a strict validator and the running
    // API finally agree.
    assert.equal(
      validate({ hasMore: false, items: [], nextCursor: null }),
      true,
      name,
    );
    assert.equal(
      validate({ hasMore: true, items: [], nextCursor: null }),
      false,
      name,
    );
    // The length bounds constrain the string branch only.
    assert.equal(
      validate({ hasMore: true, items: [], nextCursor: '' }),
      false,
      name,
    );
  }
});

test('keyset list reads answer a bad cursor or limit with 400, never 422', async () => {
  const { bundle, catalog } = await readProjections();
  const keysetReads = catalog.operations.filter((row) => {
    const operation = operationAt(bundle, row.method, row.path);
    return /** @type {JsonObject[]} */ (operation.parameters)
      .map((parameter) =>
        resolveLocalComponent(bundle, parameter, 'parameters'),
      )
      .some(
        (parameter) => parameter.in === 'query' && parameter.name === 'cursor',
      );
  });
  assert.equal(keysetReads.length, 12);
  for (const row of keysetReads) {
    const operation = operationAt(bundle, row.method, row.path);
    const response = resolveLocalComponent(
      bundle,
      operation.responses['400'],
      'responses',
    );
    assert.deepEqual(
      response['x-gala-problem-codes'],
      ['VALIDATION_FAILED'],
      row.operationId,
    );
    assert.equal(
      operation.responses['422'],
      undefined,
      `${row.operationId} must not offer a second status for query validation`,
    );
  }
  // The two reads added in 2.5.0 and the publications list that predates them
  // are covered by exactly the same rule.
  for (const operationId of [
    'getGithubInstallations',
    'getGithubInstallationsByInstallationIdRepositories',
    'getOrganizationsByOrganizationIdPublications',
  ]) {
    assert.ok(
      keysetReads.some((row) => row.operationId === operationId),
      operationId,
    );
  }
});

test('component lifecycle states, PATCH bodies and required arrays are closed', async () => {
  const { bundle } = await readProjections();
  const duplicateRequired = /** @type {string[]} */ ([]);
  const broadStates = /** @type {string[]} */ ([]);
  /**
   * @param {unknown} value schema node
   * @param {string} pointer diagnostic pointer
   * @returns {void}
   */
  function inspect(value, pointer) {
    if (Array.isArray(value)) {
      value.forEach((item, index) => inspect(item, `${pointer}/${index}`));
      return;
    }
    if (value === null || typeof value !== 'object') return;
    const schema = /** @type {JsonObject} */ (value);
    if (
      Array.isArray(schema.required) &&
      new Set(schema.required).size !== schema.required.length
    ) {
      duplicateRequired.push(pointer);
    }
    const state = schema.properties?.state;
    if (
      state !== undefined &&
      state.$ref === undefined &&
      state.enum === undefined &&
      schemaConstant(state) === undefined
    ) {
      broadStates.push(`${pointer}/properties/state`);
    }
    for (const [key, item] of Object.entries(schema)) {
      inspect(item, `${pointer}/${key}`);
    }
  }
  inspect(bundle.components.schemas, '#/components/schemas');
  assert.deepEqual(duplicateRequired, []);
  assert.deepEqual(broadStates, []);

  for (const [name, schema] of Object.entries(bundle.components.schemas)) {
    if (
      !name.startsWith('Patch') ||
      !name.endsWith('Request') ||
      schema.required?.length !== 0
    ) {
      continue;
    }
    assert.equal(compileIsolatedSchema(schema)({}), false, name);
  }
});

test('path and query validation always maps to 400 VALIDATION_FAILED', async () => {
  const { bundle, catalog } = await readProjections();
  for (const row of catalog.operations) {
    const operation = operationAt(bundle, row.method, row.path);
    const parameters = /** @type {JsonObject[]} */ (operation.parameters).map(
      (parameter) => resolveLocalComponent(bundle, parameter, 'parameters'),
    );
    if (
      !parameters.some(
        (parameter) => parameter.in === 'path' || parameter.in === 'query',
      )
    ) {
      continue;
    }
    const response = resolveLocalComponent(
      bundle,
      operation.responses['400'],
      'responses',
    );
    assert.ok(
      response['x-gala-problem-codes'].includes('VALIDATION_FAILED'),
      row.operationId,
    );
  }
});

test('capability annotations are closed and only the six documented conjunctions exist', async () => {
  const { bundle, catalog } = await readProjections();
  const conditionalRows = catalog.operations.filter(
    ({ conditionalCapabilityKeys }) => conditionalCapabilityKeys.length > 0,
  );
  assert.deepEqual(
    conditionalRows.map(({ path: route, conditionalCapabilityKeys }) => ({
      path: route,
      conditionalCapabilityKeys,
    })),
    [
      {
        path: '/v2/organizations/{organizationId}',
        conditionalCapabilityKeys: ['organization.lifecycle.manage'],
      },
      {
        path: '/v2/organizations/{organizationId}/publications/{publicationId}/configuration-changes:plan',
        conditionalCapabilityKeys: [
          'publication.modules.manage',
          'publication.policy.manage',
        ],
      },
      {
        path: '/v2/organizations/{organizationId}/publications/{publicationId}/publishes',
        conditionalCapabilityKeys: ['publication.schedule'],
      },
      {
        path: '/v2/organizations/{organizationId}/publications/{publicationId}/repository-bindings/current',
        conditionalCapabilityKeys: ['publication.view'],
      },
      // SCHEMA-2.9.0: the reviews list and single read are admitted by
      // `publication.view` (LOCAL-45/50 pattern, API-CONSUME-2.8 carry-over).
      {
        path: '/v2/organizations/{organizationId}/publications/{publicationId}/reviews',
        conditionalCapabilityKeys: ['publication.view'],
      },
      {
        path: '/v2/organizations/{organizationId}/publications/{publicationId}/reviews/{reviewId}',
        conditionalCapabilityKeys: ['publication.view'],
      },
    ],
  );
  for (const row of catalog.operations) {
    const dedicatedAuthority =
      row.path.startsWith('/v2/self/') ||
      row.path.startsWith('/v2/session') ||
      row.path.startsWith('/v2/authentication/') ||
      row.path.startsWith('/v2/callbacks/') ||
      row.path.startsWith('/v2/workloads/') ||
      row.path.startsWith('/v2/membership-invitations/') ||
      // The GitHub reads are authorized by the signed-in principal's own
      // provider token, not by an organization capability, so each one is
      // named here individually. A prefix would silently admit a future
      // `/v2/github/...` operation that must carry a capability key.
      GITHUB_PRINCIPAL_AUTHORITY_PATHS.has(row.path) ||
      row.path === '/internal/health';
    assert.equal(
      row.capabilityKey === null,
      dedicatedAuthority,
      row.operationId,
    );
    const operation = operationAt(bundle, row.method, row.path);
    const dynamicCancellation =
      row.path ===
      '/v2/organizations/{organizationId}/operations/{operationId}:cancel';
    assert.equal(
      operation['x-gala-capability-resolution'],
      dynamicCancellation
        ? 'target-operation-current-capability-and-scope'
        : undefined,
      row.operationId,
    );
    if (row.capabilityKey !== null) {
      assert.equal(typeof operation['x-gala-capability-key'], 'string');
    }
  }
});

test('SCHEMA-2.7.1 conditional capability keys use the closed condition vocabulary and name real capability keys', async () => {
  const { bundle, catalog } = await readProjections();
  const primaryCapabilityKeys = new Set(
    catalog.operations
      .map(({ capabilityKey }) => capabilityKey)
      .filter((capabilityKey) => capabilityKey !== null),
  );
  // `organization.lifecycle.manage` (LOCAL-44) is the one reviewed forward
  // reference: this patch names it as a conditional admission for
  // `patchOrganizationsByOrganizationId` ahead of the companion `v2/api`
  // catalog change that grants it as a primary capability. Every other
  // conditional key here must already be a real, bound primary capability key
  // somewhere in this same catalog -- this set never grows without that
  // companion change landing first.
  const pendingForwardReferences = new Set(['organization.lifecycle.manage']);
  let sawEntry = false;
  for (const row of catalog.operations) {
    const operation = operationAt(bundle, row.method, row.path);
    const entries =
      /** @type {Array<{capabilityKey: string, condition: string}>} */ (
        operation['x-gala-conditional-capability-keys'] ?? []
      );
    for (const { capabilityKey, condition } of entries) {
      sawEntry = true;
      assert.ok(
        CONDITIONAL_CAPABILITY_KEY_CONDITIONS.includes(condition),
        `${row.operationId}: ${condition} is not in the closed condition vocabulary`,
      );
      assert.ok(
        CAPABILITY_KEY_PATTERN.test(capabilityKey),
        `${row.operationId}: ${capabilityKey} is not a mechanically valid capability key`,
      );
      assert.ok(
        primaryCapabilityKeys.has(capabilityKey) ||
          pendingForwardReferences.has(capabilityKey),
        `${row.operationId}: ${capabilityKey} is bound as neither a primary capability key nor a reviewed forward reference`,
      );
    }
  }
  assert.ok(
    sawEntry,
    'no operation declared x-gala-conditional-capability-keys',
  );
  assert.deepEqual(
    [...CONDITIONAL_CAPABILITY_KEY_CONDITIONS],
    ['field:desiredState', 'read-only'],
  );
});

test('DEC-097 receipt exchange is the closed synchronous union with exact new failures', async () => {
  const { bundle } = await readProjections();
  const operation = operationAt(
    bundle,
    'POST',
    '/v2/workloads/github/receipt-exchanges',
  );
  assert.ok(operation.responses['200']);
  assert.equal(operation.responses['200'].headers.Location, undefined);
  const requestReference =
    operation.requestBody.content['application/json'].schema.$ref;
  const request = /** @type {JsonObject} */ (
    bundle.components.schemas[requestReference.split('/').at(-1)]
  );
  assert.equal(request.oneOf.length, 2);
  const requestMembers = /** @type {JsonObject[]} */ (request.oneOf).map(
    (branch) => resolveLocalComponent(bundle, branch, 'schemas'),
  );
  const deploymentBranch = requestMembers.find(
    (branch) =>
      schemaConstant(branch.properties.purpose) === 'deployment-intent',
  );
  assert.ok(deploymentBranch);
  assert.equal(deploymentBranch.additionalProperties, false);
  // LOCAL-57: both members stay on the request but are optional, and each is
  // still confined to the adapter it belongs to.
  const validateDestinationFields = compileIsolatedSchema({
    allOf: deploymentBranch.allOf,
  });
  assert.ok(!deploymentBranch.required.includes('pagesBuildVersion'));
  assert.ok(!deploymentBranch.required.includes('spacesStagePrefix'));
  assert.equal(
    validateDestinationFields({ adapter: { adapterId: 'github-pages' } }),
    true,
  );
  assert.equal(
    validateDestinationFields({
      adapter: { adapterId: 'github-pages' },
      pagesBuildVersion: '0'.repeat(40),
    }),
    true,
  );
  assert.equal(
    validateDestinationFields({
      adapter: { adapterId: 'github-pages' },
      spacesStagePrefix: 'staging/',
    }),
    false,
  );
  assert.equal(
    validateDestinationFields({
      adapter: { adapterId: 'local-directory' },
      spacesStagePrefix: 'staging/',
    }),
    false,
  );
  const submissionArms = /** @type {JsonObject[]} */ (
    deploymentBranch.properties.verificationSubmission.oneOf
  ).map((branch) => resolveLocalComponent(bundle, branch, 'schemas'));
  assert.deepEqual(
    submissionArms.map((branch) => schemaConstant(branch.properties.state)),
    ['fit', 'unfit'],
  );
  assert.deepEqual(
    /** @type {JsonObject} */ (submissionArms[0]).properties.verificationEntries
      .maxItems,
    900,
  );
  const responseReference =
    operation.responses['200'].content['application/json'].schema.$ref;
  const response = /** @type {JsonObject} */ (
    bundle.components.schemas[responseReference.split('/').at(-1)]
  );
  assert.equal(response.oneOf.length, 3);
  const responseMembers = /** @type {JsonObject[]} */ (response.oneOf)
    .map((branch) => resolveLocalComponent(bundle, branch, 'schemas'))
    .flatMap((branch) =>
      branch.oneOf === undefined
        ? [branch]
        : /** @type {JsonObject[]} */ (branch.oneOf).map((nested) =>
            resolveLocalComponent(bundle, nested, 'schemas'),
          ),
    );
  assert.equal(responseMembers.length, 3);
  const capability = responseMembers.find(
    (branch) =>
      schemaConstant(branch.properties.state ?? {}) === 'capability-issued',
  );
  assert.ok(capability);
  assert.equal(capability.properties.capabilityGeneration.maximum, 20);
  assert.equal(capability.properties.reportingCapability.minLength, 43);
  assert.deepEqual(operation['x-gala-reachable-problems'], [
    'CAPABILITY_EXPIRED',
    'CAPABILITY_UNAVAILABLE',
    'DEPENDENCY_UNAVAILABLE',
    'DESTINATION_MUTATION_IN_PROGRESS',
    'INVALID_SOURCE_STATE',
    'RATE_LIMITED',
    'REQUEST_FIELD_UNKNOWN',
    'VALIDATION_FAILED',
    'VERIFICATION_EVIDENCE_LIMIT_EXCEEDED',
    'WORKLOAD_BINDING_INVALID',
    'WORKLOAD_REPLAYED',
  ]);
});

test('DEC-097 operation lookup exposes the three exact bounded representations', async () => {
  const { bundle } = await readProjections();
  const operation = operationAt(
    bundle,
    'GET',
    '/v2/organizations/{organizationId}/operations/{operationId}',
  );
  const response =
    bundle.components.schemas
      .GetOrganizationsByOrganizationIdOperationsByOperationIdResponse;
  assert.deepEqual(
    /** @type {JsonObject[]} */ (response.oneOf).map((branch) => branch.$ref),
    [
      '#/components/schemas/ManagedDeploymentOperationResponse',
      '#/components/schemas/ManagedReceiptEvidenceEntryResponse',
      '#/components/schemas/ActivationDetectionEvidenceResponse',
    ],
  );
  assert.deepEqual(
    /** @type {JsonObject[]} */ (operation.parameters)
      .filter((parameter) => parameter.in === 'query')
      .map((parameter) => parameter.name),
    [
      'managedSnapshotAfterSequence',
      'managedSnapshotLimit',
      'managedEvidenceReceiptId',
      'managedEvidenceEntryNumber',
      'activationDetectionAttemptNumber',
    ],
  );
  assert.deepEqual(operation['x-gala-query-constraints'], {
    coRequired: [['managedEvidenceReceiptId', 'managedEvidenceEntryNumber']],
    mutuallyExclusive: [
      ['managedEvidenceReceiptId', 'managedEvidenceEntryNumber'],
      ['managedSnapshotAfterSequence', 'managedSnapshotLimit'],
      ['activationDetectionAttemptNumber'],
    ],
  });
  assert.equal(
    bundle.components.schemas.ManagedDeploymentOperationResponse.properties
      .managedReceiptSnapshots.maxItems,
    100,
  );
  assert.equal(
    bundle.components.schemas.ManagedReceiptEvidenceEntryResponse.properties
      .managedReceiptEvidenceEntry.additionalProperties,
    false,
  );
  assert.deepEqual(
    bundle.components.schemas.ActivationDetectionEvidenceResponse.required,
    [
      'organizationId',
      'operationId',
      'activationDetectionPlanDigest',
      'activationDetectionObservation',
    ],
  );
});

test('DEC-097 transport fields reuse exact canonical scalar contracts', async () => {
  const { bundle } = await readProjections();
  const [receiptSchema, intentSchema] = await Promise.all([
    readFile('schemas/deployment-receipt.schema.json', 'utf8').then(JSON.parse),
    readFile('schemas/deployment-intent.schema.json', 'utf8').then(JSON.parse),
  ]);
  const receiptRequest =
    bundle.components.schemas.PostWorkloadsDeploymentReceiptsRequest;
  // LOCAL-56: the bundled instant is the root's contract with the `pattern`
  // lifted into the description, because a generated `OffsetDateTime` cannot
  // carry a `@Pattern` a validator can resolve. Everything else is identical,
  // and the root keeps the pattern.
  assert.ok(
    receiptSchema.$defs.rfc3339.pattern,
    'the root instant keeps its pattern',
  );
  const rootInstant = withoutBundleLiftedKeys(receiptSchema.$defs.rfc3339);
  for (const member of ['workflowStartedAt', 'workflowCompletedAt']) {
    const bundled = /** @type {JsonObject} */ (
      resolveLocalComponent(
        bundle,
        receiptRequest.properties[member],
        'schemas',
      )
    );
    assert.deepEqual(withoutBundleLiftedKeys(bundled), rootInstant, member);
    assert.match(
      String(bundled.description),
      /millisecond subset of RFC 3339/u,
      member,
    );
  }
  const exchange =
    bundle.components.schemas.PostWorkloadsGithubReceiptExchangesRequest;
  const exchangeBranches = /** @type {JsonObject[]} */ (exchange.oneOf).map(
    (branch) => resolveLocalComponent(bundle, branch, 'schemas'),
  );
  const deployment = exchangeBranches.find(
    (branch) =>
      schemaConstant(branch.properties.purpose) === 'deployment-intent',
  );
  assert.ok(deployment);
  assert.deepEqual(
    resolveLocalComponent(
      bundle,
      deployment.properties.frozenHandoffName,
      'schemas',
    ),
    intentSchema.$defs.plainLabel,
  );
  {
    const bundled = /** @type {JsonObject} */ (
      resolveLocalComponent(
        bundle,
        deployment.properties.effectiveArtifactExpiresAt,
        'schemas',
      )
    );
    assert.deepEqual(
      withoutBundleLiftedKeys(bundled),
      withoutBundleLiftedKeys(intentSchema.$defs.rfc3339),
    );
    assert.match(
      String(bundled.description),
      /millisecond subset of RFC 3339/u,
    );
  }
  const entry = bundle.components.schemas.VerificationPlanEntry;
  assert.deepEqual(
    resolveLocalComponent(bundle, entry.properties.path, 'schemas'),
    receiptSchema.$defs.repoRelativePath,
  );
  assert.deepEqual(
    resolveLocalComponent(bundle, entry.properties.publicRoute, 'schemas'),
    receiptSchema.$defs.canonicalRoute,
  );
  assert.equal(
    entry.properties.expectedContentType.pattern,
    '^[a-z0-9][a-z0-9!#$&^_.+-]{0,62}/[a-z0-9][a-z0-9!#$&^_.+-]{0,62}(?:; charset=utf-8)?$',
  );

  assert.doesNotThrow(() => validateRfc3339('2026-09-06T00:00:00.000Z'));
  assert.throws(() => validateRfc3339('2026-09-06T00:00:00Z'));
  assert.throws(() => validateRfc3339('2026-09-06T00:00:00.000+00:00'));
  assert.equal(
    validateGalaFormat('gala-repository-relative-path', '../secret'),
    false,
  );
  assert.equal(
    validateGalaFormat(
      'gala-repository-relative-path',
      'content/%2e%2e/secret',
    ),
    false,
  );
  assert.equal(validateGalaFormat('gala-canonical-route', '/a/../b'), false);
  assert.equal(validateGalaFormat('gala-canonical-route', '/a//b'), false);
  assert.equal(
    validateVerificationContentType('text/html; charset=utf-8'),
    'text/html; charset=utf-8',
  );
  assert.throws(
    () => validateVerificationContentType('Text/HTML'),
    /VERIFICATION_CONTENT_TYPE_INVALID/u,
  );
  assert.throws(
    () => validateVerificationContentType('text/html; charset=UTF-8'),
    /VERIFICATION_CONTENT_TYPE_INVALID/u,
  );
});

test('publication retirement is an acknowledged asynchronous consequence command', async () => {
  const { bundle } = await readProjections();
  const operation = operationAt(
    bundle,
    'DELETE',
    '/v2/organizations/{organizationId}/publications/{publicationId}',
  );
  assert.ok(operation.responses['202']);
  assert.equal(operation.responses['204'], undefined);
  assert.equal(operation['x-gala-success-category'], 'async');
  assert.equal(operation['x-gala-capability-key'], 'publication.retire');
  assert.equal(
    operation['x-gala-concurrency'],
    'if-match-and-consequence-digest',
  );
  assert.deepEqual(
    /** @type {JsonObject[]} */ (operation.parameters)
      .filter((parameter) => parameter.$ref)
      .map((parameter) => parameter.$ref),
    [
      '#/components/parameters/XCorrelationId',
      '#/components/parameters/IdempotencyKey',
      '#/components/parameters/IfMatch',
      '#/components/parameters/XCsrfToken',
    ],
  );
  const request =
    bundle.components.schemas
      .DeleteOrganizationsByOrganizationIdPublicationsByPublicationIdRequest;
  assert.deepEqual(request.required, [
    'consequencePreviewId',
    'consequenceDigest',
    'exportWindowAcknowledged',
    'irreversibleFenceAcknowledged',
  ]);
  assert.equal(
    schemaConstant(request.properties.exportWindowAcknowledged),
    true,
  );
  assert.equal(
    schemaConstant(request.properties.irreversibleFenceAcknowledged),
    true,
  );
});

test('kernel submission schemas reject server-owned fields and invalid evidence tuples', async () => {
  const { bundle } = await readProjections();
  const attemptSchema = bundle.components.schemas.KernelAttemptSubmission;
  const observationSchema =
    bundle.components.schemas.KernelObservationSubmission;
  assert.deepEqual(Object.keys(attemptSchema.properties).sort(), [
    'causationId',
    'completedAt',
    'destinationChanged',
    'evidenceDigest',
    'failureCode',
    'inputDigest',
    'kernelSequence',
    'outcome',
    'resultDigest',
    'retryable',
    'stage',
    'stageAttemptId',
    'startedAt',
  ]);
  assert.deepEqual(Object.keys(observationSchema.properties).sort(), [
    'destinationChanged',
    'evidenceDigest',
    'generationId',
    'kernelSequence',
    'observationClass',
    'observationId',
    'observedArtifactDigest',
    'observedAt',
    'outcome',
    'providerObjectIdDigest',
    'providerVersion',
    'stageAttemptId',
  ]);
  assert.deepEqual(
    Object.keys(bundle.components.schemas.KernelJournal.properties).sort(),
    ['attempts', 'observations'],
  );

  const attempt = {
    stageAttemptId: '018f0000-0000-7000-8000-000000000001',
    causationId: '018f0000-0000-7000-8000-000000000002',
    stage: 'staging',
    kernelSequence: 1,
    outcome: 'skipped',
    destinationChanged: 'no',
    inputDigest: `sha256:${'0'.repeat(64)}`,
    resultDigest: `sha256:${'1'.repeat(64)}`,
    retryable: false,
    evidenceDigest: `sha256:${'2'.repeat(64)}`,
  };
  const validateAttempt = compileIsolatedSchema(attemptSchema);
  assert.equal(
    validateAttempt(attempt),
    true,
    JSON.stringify(validateAttempt.errors),
  );
  assert.equal(
    validateAttempt({ ...attempt, attemptId: 'server-owned' }),
    false,
  );
  assert.equal(validateAttempt({ ...attempt, outcome: 'running' }), false);
  assert.equal(
    validateAttempt({ ...attempt, destinationChanged: 'yes' }),
    false,
  );

  const observation = {
    observationId: '018f0000-0000-7000-8000-000000000003',
    stageAttemptId: '018f0000-0000-7000-8000-000000000001',
    kernelSequence: 1,
    observationClass: 'request-not-started',
    outcome: 'rejected',
    destinationChanged: 'no',
    observedAt: '2026-09-14T00:00:00.000Z',
    evidenceDigest: `sha256:${'3'.repeat(64)}`,
  };
  const validateObservation = compileIsolatedSchema(observationSchema);
  assert.equal(
    validateObservation(observation),
    true,
    JSON.stringify(validateObservation.errors),
  );
  assert.equal(
    validateObservation({ ...observation, operationId: 'server-owned' }),
    false,
  );
  assert.equal(
    validateObservation({
      ...observation,
      providerVersion: 'not-allowed-for-this-class',
    }),
    false,
  );
});

test('preliminary route observations reject impossible status and digest combinations', async () => {
  const { bundle } = await readProjections();
  const validate = compileIsolatedSchema(
    bundle.components.schemas.ObservedRoute,
  );
  const base = { expectedDigest: '0'.repeat(64), route: '/index.html' };
  assert.equal(validate(base), true);
  assert.equal(validate({ ...base, observedStatus: 404 }), true);
  assert.equal(
    validate({
      ...base,
      observedDigest: '1'.repeat(64),
      observedStatus: 200,
    }),
    true,
  );
  assert.equal(
    validate({
      ...base,
      observedDigest: '1'.repeat(64),
      observedStatus: 404,
    }),
    false,
  );
});

test('DEC-097 deployment receipt is bounded and maps both new failures', async () => {
  const { bundle } = await readProjections();
  const operation = operationAt(
    bundle,
    'POST',
    '/v2/workloads/deployment-receipts',
  );
  assert.ok(operation.responses['202']);
  const requestReference =
    operation.requestBody.content['application/json'].schema.$ref;
  const request = /** @type {JsonObject} */ (
    bundle.components.schemas[requestReference.split('/').at(-1)]
  );
  assert.equal(request.additionalProperties, false);
  assert.equal(request.properties.runAttempt.maximum, 51);
  assert.equal(request.properties.observedRoutes.minItems, 0);
  assert.equal(request.properties.observedRoutes.maxItems, 16);
  assert.equal(
    request.properties.kernelJournal.$ref,
    '#/components/schemas/KernelJournal',
  );
  assert.deepEqual(
    bundle.components.schemas.PostWorkloadsDeploymentReceiptsResponse.allOf[1]
      .required,
    [
      'activationDetectionPlanDigest',
      'activationDetectionObservationCount',
      'managedReceiptSnapshotCount',
      'managedReceiptSnapshots',
    ],
  );
  assert.ok(
    operation.responses['401']['x-gala-problem-codes'].includes(
      'REPORTING_CAPABILITY_INVALID',
    ),
  );
  assert.ok(
    operation.responses['500']['x-gala-problem-codes'].includes(
      'RESPONSE_REPRESENTATION_LIMIT_EXCEEDED',
    ),
  );

  const base = {
    operationId: '018f0000-0000-7000-8000-000000000001',
    commandId: '018f0000-0000-7000-8000-000000000002',
    phase: 'accepted',
    resourceVersion: 0,
    statusUrl: '/v2/organizations/example/operations/example',
    attempts: [],
    blockers: [],
    recoveryActions: [],
    managedReceiptSnapshotCount: 0,
    managedReceiptSnapshots: [],
  };
  const validateStandard = await compileResolvedSchema(
    bundle,
    bundle.components.schemas.ManagedDeploymentOperationResponse,
  );
  assert.equal(
    validateStandard(base),
    true,
    JSON.stringify(validateStandard.errors),
  );
  assert.equal(
    validateStandard({
      ...base,
      nextManagedReceiptSnapshotSequence: 1,
    }),
    false,
  );
  assert.equal(
    validateStandard({
      ...base,
      managedReceiptSnapshotCount: 1,
    }),
    false,
  );

  const validateSubmission = await compileResolvedSchema(
    bundle,
    bundle.components.schemas.PostWorkloadsDeploymentReceiptsResponse,
  );
  const submission = {
    ...base,
    activationDetectionPlanDigest: `sha256:${'0'.repeat(64)}`,
    activationDetectionObservationCount: 0,
  };
  assert.equal(
    validateSubmission(submission),
    true,
    JSON.stringify(validateSubmission.errors),
  );
  const managedReceipt = JSON.parse(
    await readFile('examples/valid/deployment-receipt/canonical.json', 'utf8'),
  );
  assert.equal(validateSubmission({ ...submission, managedReceipt }), false);
});

test('bounded workload and webhook bodies declare 413 and 415 validation failures', async () => {
  const { bundle } = await readProjections();
  const operations = /** @type {Array<[string, string]>} */ ([
    ['POST', '/v2/workloads/github/receipt-exchanges'],
    ['POST', '/v2/workloads/deployment-receipts'],
    ['POST', '/v2/callbacks/github/app'],
  ]);
  for (const [method, route] of operations) {
    const operation = operationAt(bundle, method, route);
    for (const status of ['413', '415']) {
      const response = resolveLocalComponent(
        bundle,
        operation.responses[status],
        'responses',
      );
      assert.deepEqual(response['x-gala-problem-codes'], ['VALIDATION_FAILED']);
      assert.equal(
        response.content['application/problem+json'].schema.$ref,
        '#/components/schemas/Problem',
      );
    }
  }
});

test('GitHub OAuth callback exposes identity-provider reauthentication', async () => {
  const { bundle } = await readProjections();
  const operation = operationAt(bundle, 'GET', '/v2/callbacks/github/oauth');
  const response = resolveLocalComponent(
    bundle,
    operation.responses['401'],
    'responses',
  );

  assert.deepEqual(response['x-gala-problem-codes'], ['REAUTH_REQUIRED']);
  assert.ok(operation['x-gala-reachable-problems'].includes('REAUTH_REQUIRED'));
});

test('bundle and catalog digests bind exact deterministic bytes', async () => {
  const { bundleSource, catalog } = await readProjections();
  const generated = await createOpenApiArtifacts();
  assert.equal(generated.bundleSource, bundleSource);
  assert.equal(
    generated.catalogSource,
    await readFile('openapi/http-catalog.json', 'utf8'),
  );
  assert.equal(
    catalog.openApiDigest,
    `sha256:${createHash('sha256').update(bundleSource).digest('hex')}`,
  );
  const projection = /** @type {Record<string, unknown>} */ ({ ...catalog });
  delete projection.digest;
  assert.equal(
    catalog.digest,
    `sha256:${createHash('sha256')
      .update(canonicalizeJcsBytes(projection))
      .digest('hex')}`,
  );
});

test('reviewed OpenAPI Generator 7.25.0 option sets are serialized without CLI overrides', async () => {
  const [spring, typescript] = await Promise.all([
    readFile('openapi/generator/spring.json', 'utf8').then(JSON.parse),
    readFile('openapi/generator/typescript-fetch.json', 'utf8').then(
      JSON.parse,
    ),
  ]);
  assert.deepEqual(spring.additionalProperties, {
    library: 'spring-boot',
    interfaceOnly: true,
    useSpringBoot3: true,
    useTags: true,
    skipDefaultInterface: true,
    documentationProvider: 'none',
    useSwaggerUI: false,
    hideGenerationTimestamp: true,
    useBeanValidation: true,
    openApiNullable: true,
    dateLibrary: 'java8',
    disallowAdditionalPropertiesIfNotPresent: false,
    apiPackage: 'io.gala.api.generated',
    modelPackage: 'io.gala.api.generated.model',
    invokerPackage: 'io.gala.api.generated.invoker',
  });
  assert.deepEqual(typescript.additionalProperties, {
    supportsES6: true,
    useSingleRequestParameter: true,
    stringEnums: true,
    enumPropertyNaming: 'original',
    modelPropertyNaming: 'camelCase',
    paramNaming: 'camelCase',
    fileNaming: 'kebab-case',
    importFileExtension: '.js',
    withoutRuntimeChecks: false,
    validationAttributes: true,
    nullSafeAdditionalProps: true,
    disallowAdditionalPropertiesIfNotPresent: false,
  });
});

/**
 * Every response schema this release added an optional field to, paired with a
 * 2.4.2-era instance and that release's exact `required` list. The instances
 * are the bodies a 2.4.2 server produced: they were read from the 2.4.2 bundle
 * (the committed `nominal` examples) and completed to the 2.4.2 `required`
 * set for the two item schemas whose list examples were empty.
 */
const RELEASE_2_4_2_RESPONSES = Object.freeze([
  {
    schemaName: 'GetSessionResponse',
    required: [
      'principalId',
      'assurance',
      'authenticatedAt',
      'identityEpoch',
      'authorizationEpoch',
      'credentialEpoch',
      'organizations',
      'capabilities',
    ],
    instance: {
      assurance: 'SESSION',
      authenticatedAt: '2026-09-06T00:00:00.000Z',
      authorizationEpoch: 0,
      capabilities: [],
      credentialEpoch: 0,
      identityEpoch: 0,
      organizations: [],
      principalId: '018f0000-0000-7000-8000-000000000001',
    },
  },
  {
    schemaName: 'MembershipSummary',
    required: ['membershipId', 'version', 'state', 'principalId', 'roleId'],
    instance: {
      membershipId: '018f0000-0000-7000-8000-000000000001',
      principalId: '018f0000-0000-7000-8000-000000000002',
      roleId: '018f0000-0000-7000-8000-000000000003',
      state: 'ACTIVE',
      version: 0,
    },
  },
  {
    schemaName: 'GithubInstallationSummary',
    required: ['installationId', 'accountId', 'accountLogin'],
    instance: {
      accountId: '1',
      accountLogin: 'example',
      installationId: '1',
    },
  },
  {
    schemaName: 'GetOrganizationsByOrganizationIdResponse',
    required: ['organizationId', 'version', 'state', 'name', 'slug'],
    instance: {
      name: 'example',
      organizationId: '018f0000-0000-7000-8000-000000000001',
      slug: 'example',
      state: 'PROVISIONING',
      version: 0,
    },
  },
  {
    schemaName:
      'GetOrganizationsByOrganizationIdPublicationsByPublicationIdResponse',
    required: ['publicationId', 'version', 'state', 'name', 'slug'],
    instance: {
      name: 'example',
      publicationId: '018f0000-0000-7000-8000-000000000001',
      slug: 'example',
      state: 'PROVISIONING',
      version: 0,
    },
  },
  {
    schemaName:
      'GetOrganizationsByOrganizationIdPublicationsByPublicationIdRepositoryBindingsCurrentResponse',
    required: [
      'repositoryBindingId',
      'version',
      'state',
      'repositoryId',
      'installationId',
      'defaultBranch',
    ],
    instance: {
      defaultBranch: 'main',
      installationId: '1',
      repositoryBindingId: '018f0000-0000-7000-8000-000000000001',
      repositoryId: '1',
      state: 'PENDING',
      version: 0,
    },
  },
]);

test('a 2.5.0 validator still accepts a 2.4.2-era body for every read this release touched', async () => {
  const { bundle } = await readProjections();
  for (const { schemaName, required, instance } of RELEASE_2_4_2_RESPONSES) {
    const schema = bundle.components.schemas[schemaName];
    assert.ok(schema, schemaName);
    // Nothing added in 2.5.0 may become required, or a 2.4.2-era body stops
    // validating and the minor is a lie.
    assert.deepEqual(schema.required, required, schemaName);
    const validate = await compileResolvedSchema(bundle, schema);
    assert.equal(
      validate(instance),
      true,
      `${schemaName}: ${JSON.stringify(validate.errors)}`,
    );
  }
});

test('every field this release added to an existing response is optional and absent-tolerant', async () => {
  const { bundle } = await readProjections();
  const added = [
    { schemaName: 'GetSessionResponse', property: 'principal' },
    { schemaName: 'MembershipSummary', property: 'principal' },
    { schemaName: 'GithubInstallationSummary', property: 'observation' },
    {
      schemaName: 'GetOrganizationsByOrganizationIdResponse',
      property: 'callerCapabilities',
    },
    {
      schemaName:
        'GetOrganizationsByOrganizationIdPublicationsByPublicationIdResponse',
      property: 'callerCapabilities',
    },
    {
      schemaName:
        'GetOrganizationsByOrganizationIdPublicationsByPublicationIdRepositoryBindingsCurrentResponse',
      property: 'observedHead',
    },
    {
      schemaName:
        'GetOrganizationsByOrganizationIdPublicationsByPublicationIdRepositoryBindingsCurrentResponse',
      property: 'repositoryFullName',
    },
  ];
  for (const { schemaName, property } of added) {
    const schema = bundle.components.schemas[schemaName];
    assert.ok(schema, schemaName);
    assert.ok(schema.properties[property], `${schemaName}.${property}`);
    assert.ok(
      !schema.required.includes(property),
      `${schemaName}.${property} must stay optional`,
    );
  }
});

test('SCHEMA-2.6.0 declares the problems the API already answers', async () => {
  const { bundle } = await readProjections();
  const expected = [
    {
      method: 'get',
      path: '/v2/github/installations',
      status: '401',
      code: 'REAUTH_REQUIRED',
    },
    {
      method: 'get',
      path: '/v2/github/installations/{installationId}/repositories',
      status: '401',
      code: 'REAUTH_REQUIRED',
    },
    {
      method: 'get',
      path: '/v2/github/app',
      status: '503',
      code: 'CAPABILITY_UNAVAILABLE',
    },
  ];
  for (const { method, path: route, status, code } of expected) {
    const operation = operationAt(bundle, method, route);
    assert.ok(
      operation['x-gala-reachable-problems'].includes(code),
      `${method} ${route}: ${code} is not reachable`,
    );
    const response = resolveLocalComponent(
      bundle,
      operation.responses[status],
      'responses',
    );
    assert.ok(response, `${method} ${route}: ${status} is not declared`);
    assert.ok(
      response['x-gala-problem-codes'].includes(code),
      `${method} ${route}: ${status} does not carry ${code}`,
    );
    const example =
      response.content['application/problem+json'].examples[code].value;
    assert.equal(example.code, code);
    assert.equal(example.status, Number(status));
  }
});

test('PrincipalSummary admits an omitted and an explicitly null displayName', async () => {
  const { bundle } = await readProjections();
  const schema = bundle.components.schemas.PrincipalSummary;
  assert.deepEqual(schema.required, ['login']);
  assert.deepEqual([...schema.properties.displayName.type].sort(), [
    'null',
    'string',
  ]);
  const validate = await compileResolvedSchema(bundle, schema);
  // The generated Java serializer omits the member; the TypeScript client
  // writes an explicit null. Both are the same statement.
  assert.equal(validate({ login: 'octocat' }), true, 'omitted');
  assert.equal(
    validate({ login: 'octocat', displayName: null }),
    true,
    'explicit null',
  );
  assert.equal(
    validate({ login: 'octocat', displayName: 'The Octocat' }),
    true,
    'present',
  );
  assert.equal(validate({ displayName: null }), false, 'login stays required');
});

test('AuthenticatorSummary gains optional nullable createdAt and lastUsedAt', async () => {
  const { bundle } = await readProjections();
  const schema = bundle.components.schemas.AuthenticatorSummary;
  for (const property of ['createdAt', 'lastUsedAt']) {
    assert.ok(schema.properties[property], property);
    assert.equal(schema.properties[property].format, 'date-time');
    assert.deepEqual(
      [...schema.properties[property].type].sort(),
      ['null', 'string'],
      property,
    );
    assert.ok(!schema.required.includes(property), `${property} is optional`);
  }
  const validate = await compileResolvedSchema(bundle, schema);
  const base = {
    authenticatorId: '018f0000-0000-7000-8000-000000000001',
    version: 0,
    state: 'ACTIVE',
    kind: 'PASSKEY',
    label: 'Laptop',
  };
  assert.equal(validate(base), true, 'a 2.5.0-era body still validates');
  assert.equal(
    validate({ ...base, createdAt: null, lastUsedAt: null }),
    true,
    'null instants',
  );
  assert.equal(
    validate({
      ...base,
      createdAt: '2026-09-17T00:00:00.000Z',
      lastUsedAt: '2026-09-17T01:00:00.000Z',
    }),
    true,
    'present instants',
  );
  assert.equal(validate({ ...base, createdAt: 7 }), false, 'a non-string');
  // LOCAL-56: the bundle no longer carries the millisecond `pattern`, so what
  // is and is not an instant now rests entirely on `format: date-time` -- which
  // a validator with formats switched off (as here, and as OpenAPI Generator
  // emits by default) does not check at all. The canonical subset is still
  // enforced by this repository's own validators, which read the roots, and the
  // OpenAPI member states it in its description; the API must keep checking it.
  const root = JSON.parse(
    await readFile('schemas/problem.schema.json', 'utf8'),
  );
  assert.ok(root.$defs.rfc3339.pattern, 'the root still carries the pattern');
  const strict = new Ajv2020({ strict: false }).compile(root.$defs.rfc3339);
  assert.equal(strict('yesterday'), false);
  assert.equal(strict('2026-09-17T00:00:00Z'), false, 'second precision');
  assert.equal(strict('2026-09-17T00:00:00.000Z'), true);
});

test('the memberships read carries an optional publicationId filter', async () => {
  const { bundle } = await readProjections();
  const operation = operationAt(
    bundle,
    'get',
    '/v2/organizations/{organizationId}/memberships',
  );
  const parameters = /** @type {JsonObject[]} */ (operation.parameters).map(
    (parameter) => resolveLocalComponent(bundle, parameter, 'parameters'),
  );
  const filter = parameters.find(
    (parameter) =>
      parameter.in === 'query' && parameter.name === 'publicationId',
  );
  assert.ok(filter, 'publicationId filter is absent');
  assert.equal(filter.required, false);
  assert.equal(filter.schema.format, 'uuid');
  assert.match(operation.description, /publicationId/u);
  assert.match(operation.description, /AUTHORIZATION_DENIED/u);
  assert.ok(
    operation['x-gala-reachable-problems'].includes('AUTHORIZATION_DENIED'),
  );
  assert.equal(operation['x-gala-capability-key'], 'organization.members.view');
});

test('the membership-invitation list read is a keyset list defaulting to PENDING', async () => {
  const { bundle, catalog } = await readProjections();
  const route = '/v2/organizations/{organizationId}/membership-invitations';
  const operation = operationAt(bundle, 'get', route);
  assert.equal(
    operation.operationId,
    'getOrganizationsByOrganizationIdMembershipInvitations',
  );
  assert.equal(operation['x-gala-capability-key'], 'organization.members.view');
  assert.equal(operation['x-gala-success-category'], 'query');
  assert.equal(operation['x-gala-replay-identity'], 'safe-query');
  const parameters = /** @type {JsonObject[]} */ (operation.parameters).map(
    (parameter) => resolveLocalComponent(bundle, parameter, 'parameters'),
  );
  const names = parameters
    .filter((parameter) => parameter.in === 'query')
    .map((parameter) => parameter.name)
    .sort();
  assert.deepEqual(names, ['cursor', 'limit', 'state']);
  const state = parameters.find((parameter) => parameter.name === 'state');
  assert.ok(state, 'state filter is absent');
  assert.equal(state.required, false);
  assert.equal(state.schema.default, 'PENDING');
  assert.deepEqual(
    state.schema.enum,
    bundle.components.schemas.MembershipInvitationState.enum,
  );

  // The row carries exactly the single-invitation read's fields, so a list row
  // and a detail view can never disagree.
  const summary = bundle.components.schemas.MembershipInvitationSummary;
  const detail =
    bundle.components.schemas
      .GetOrganizationsByOrganizationIdMembershipInvitationsByInvitationIdResponse;
  assert.deepEqual(
    Object.keys(summary.properties).sort(),
    Object.keys(detail.properties).sort(),
  );
  assert.deepEqual([...summary.required].sort(), [...detail.required].sort());
  assert.ok(!('recipient' in summary.properties));

  const response =
    bundle.components.schemas
      .GetOrganizationsByOrganizationIdMembershipInvitationsResponse;
  assert.equal(
    response.properties.items.items.$ref,
    '#/components/schemas/MembershipInvitationSummary',
  );
  assert.deepEqual([...response.properties.nextCursor.type].sort(), [
    'null',
    'string',
  ]);
  assert.ok(
    catalog.operations.some(
      (row) =>
        row.operationId ===
        'getOrganizationsByOrganizationIdMembershipInvitations',
    ),
  );
});

test('every statusUrl says it is an API path a client maps to its own route', async () => {
  const { bundle } = await readProjections();
  const descriptions = /** @type {string[]} */ ([]);
  /**
   * @param {unknown} value schema node
   * @returns {void}
   */
  function inspect(value) {
    if (Array.isArray(value)) {
      for (const item of value) inspect(item);
      return;
    }
    if (value === null || typeof value !== 'object') return;
    const schema = /** @type {JsonObject} */ (value);
    const statusUrl = schema.properties?.statusUrl;
    if (statusUrl !== undefined && typeof statusUrl.description === 'string') {
      descriptions.push(statusUrl.description);
    }
    for (const item of Object.values(schema)) inspect(item);
  }
  inspect(bundle.components.schemas);
  assert.ok(descriptions.length >= 4, 'statusUrl descriptions are missing');
  for (const description of descriptions) {
    assert.match(description, /API path under `\/v2\/\.\.\.`/u);
    assert.match(description, /routing table/u);
    assert.match(
      description,
      /\/organizations\/\{organizationId\}\/operations\/\{operationId\}/u,
    );
  }
});

test('workload unions carry explicit discriminator mappings a generated model can bind', async () => {
  const { bundle } = await readProjections();
  const operation = operationAt(
    bundle,
    'POST',
    '/v2/workloads/github/receipt-exchanges',
  );
  const unions = [
    {
      label: 'request',
      discriminant: 'purpose',
      media: operation.requestBody.content['application/json'],
    },
    {
      label: 'response',
      discriminant: 'kind',
      media: operation.responses['200'].content['application/json'],
    },
  ];
  for (const { label, discriminant, media } of unions) {
    const union = /** @type {JsonObject} */ (
      resolveLocalComponent(bundle, media.schema, 'schemas')
    );
    assert.equal(
      union.discriminator?.propertyName,
      discriminant,
      `${label} union discriminates on ${discriminant}`,
    );
    const mapping = /** @type {Record<string, string>} */ (
      union.discriminator.mapping
    );
    assert.ok(mapping, `${label} union declares an explicit mapping`);
    // Every member must be a bare $ref: OpenAPI Generator 7.25 can only emit a
    // named subtype for a member that has a component name.
    for (const member of /** @type {JsonObject[]} */ (union.oneOf)) {
      assert.deepEqual(
        Object.keys(member),
        ['$ref'],
        `${label} union members are bare component references`,
      );
    }
    assert.deepEqual(
      Object.values(mapping).slice().sort(),
      /** @type {JsonObject[]} */ (union.oneOf)
        .map((member) => member.$ref)
        .sort(),
      `${label} mapping covers exactly the union members`,
    );
    // Every arm is flat. An intermediate schema with a nested discriminator is
    // what the generator cannot resolve past, so neither union has one.
    for (const [wireValue, reference] of Object.entries(mapping)) {
      const mapped = /** @type {JsonObject} */ (
        resolveLocalComponent(bundle, { $ref: reference }, 'schemas')
      );
      assert.ok(mapped, `${label} mapping target ${reference} exists`);
      assert.equal(
        mapped.oneOf,
        undefined,
        `${reference} is a flat arm, not a nested union`,
      );
      assert.equal(
        schemaConstant(mapped.properties[discriminant]),
        wireValue,
        `${reference} pins ${discriminant} to ${wireValue}`,
      );
    }
    // A conforming example binds, and the union as a whole selects exactly one
    // member. The response discriminant is optional for forward compatibility,
    // so the example is only bound through the mapping when it carries one.
    const example = media.examples.nominal.value;
    const reference =
      example[discriminant] === undefined
        ? undefined
        : mapping[example[discriminant]];
    if (reference !== undefined) {
      const validateMapped = await compileResolvedSchema(bundle, {
        $ref: reference,
      });
      assert.ok(
        validateMapped(example),
        `${label} example binds to its mapped model: ${JSON.stringify(validateMapped.errors)}`,
      );
    }
    const matches = await Promise.all(
      /** @type {JsonObject[]} */ (union.oneOf).map(async (member) =>
        (await compileResolvedSchema(bundle, member))(example),
      ),
    );
    assert.equal(
      matches.filter(Boolean).length,
      1,
      `${label} example matches exactly one union member`,
    );
  }
  const requestUnion = /** @type {JsonObject} */ (
    resolveLocalComponent(
      bundle,
      operation.requestBody.content['application/json'].schema,
      'schemas',
    )
  );
  const responseUnion = /** @type {JsonObject} */ (
    resolveLocalComponent(
      bundle,
      operation.responses['200'].content['application/json'].schema,
      'schemas',
    )
  );
  // A 2.7.x-era body carries no `kind` and must still bind to exactly one arm.
  const submissionRecorded = {
    operationId: '019c0000-0000-7000-8000-000000000001',
    purpose: 'deployment-receipt',
    state: 'submission-recorded',
    statusUrl:
      '/v2/organizations/019c0000-0000-7000-8000-000000000001/operations/019c0000-0000-7000-8000-000000000002',
  };
  const validateReceiptArm = await compileResolvedSchema(bundle, {
    $ref: /** @type {Record<string, string>} */ (
      responseUnion.discriminator.mapping
    )['deployment-receipt-submission-recorded'],
  });
  assert.ok(
    validateReceiptArm(submissionRecorded),
    `submission-recorded binds: ${JSON.stringify(validateReceiptArm.errors)}`,
  );
  const responseMatches = await Promise.all(
    /** @type {JsonObject[]} */ (responseUnion.oneOf).map(async (member) =>
      (await compileResolvedSchema(bundle, member))(submissionRecorded),
    ),
  );
  assert.equal(
    responseMatches.filter(Boolean).length,
    1,
    'a 2.7.x body without `kind` still selects exactly one arm',
  );
  assert.equal(
    /** @type {Record<string, string>} */ (requestUnion.discriminator.mapping)[
      'deployment-intent'
    ],
    '#/components/schemas/ReceiptExchangeDeploymentIntentRequest',
  );
  // The nested verification-submission union is named and discriminated too.
  const intentRequest = /** @type {JsonObject} */ (
    resolveLocalComponent(
      bundle,
      { $ref: '#/components/schemas/ReceiptExchangeDeploymentIntentRequest' },
      'schemas',
    )
  );
  const submission = intentRequest.properties.verificationSubmission;
  assert.equal(submission.discriminator?.propertyName, 'state');
  assert.deepEqual(submission.discriminator.mapping, {
    fit: '#/components/schemas/VerificationSubmissionFit',
    unfit: '#/components/schemas/VerificationSubmissionUnfit',
  });
  for (const member of /** @type {JsonObject[]} */ (submission.oneOf)) {
    assert.deepEqual(Object.keys(member), ['$ref']);
  }
});

test('PortableProblemDocument matches problem.schema.json on shape and bounds (SCH-M18)', async () => {
  // The whole-bundle regeneration byte-check (above) proves the committed
  // bundle matches today's generator; it does not prove the generator's
  // projection from schemas/problem.schema.json onto PortableProblemDocument
  // is itself faithful. This compares the promoted component directly
  // against its source root: same property set, same required set, and the
  // same bound values on every property whose constraint is expressed
  // directly on the property (not behind a further $ref this test does not
  // chase).
  const { bundle } = await readProjections();
  const root = /** @type {JsonObject} */ (
    JSON.parse(await readFile('schemas/problem.schema.json', 'utf8'))
  );
  const component = /** @type {JsonObject} */ (
    bundle.components.schemas.PortableProblemDocument
  );
  assert.equal(bundle.components.schemas.Problem.$ref, '#/components/schemas/PortableProblemDocument');

  assert.deepEqual(
    Object.keys(component.properties).sort(),
    Object.keys(root.properties).sort(),
  );
  assert.deepEqual([...component.required].sort(), [...root.required].sort());
  assert.equal(component.additionalProperties, root.additionalProperties);

  assert.equal(
    schemaConstant(component.properties.schemaId),
    root.properties.schemaId.const,
  );
  assert.equal(
    schemaConstant(component.properties.schemaVersion),
    root.properties.schemaVersion.const,
  );
  assert.equal(component.properties.status.type, root.properties.status.type);
  assert.equal(
    component.properties.status.minimum,
    root.properties.status.minimum,
  );
  assert.equal(
    component.properties.status.maximum,
    root.properties.status.maximum,
  );
  assert.equal(
    component.properties.retryable.type,
    root.properties.retryable.type,
  );
  assert.equal(component.properties.errors.type, root.properties.errors.type);
  assert.equal(
    component.properties.errors.minItems,
    root.properties.errors.minItems,
  );
  assert.equal(
    component.properties.errors.maxItems,
    root.properties.errors.maxItems,
  );
  for (const member of /** @type {const} */ (['title', 'detail'])) {
    assert.deepEqual(
      component.properties[member]['x-gala-graphemeLength'],
      root.properties[member]['x-gala-graphemeLength'],
    );
  }
});

test('README.md states the MVP operation count consistently (SCH-L1)', async () => {
  const readme = await readFile('README.md', 'utf8');
  assert.ok(
    readme.includes('75 MVP operations plus'),
    'README.md no longer says "75 MVP operations plus"',
  );
  assert.match(
    readme,
    /exact 75 MVP\s+operations plus health/u,
    'README.md no longer says "exact 75 MVP operations plus health"',
  );
  assert.ok(
    !/\b73 MVP\b/u.test(readme),
    'README.md still claims 73 MVP operations somewhere; it is 75',
  );
});
