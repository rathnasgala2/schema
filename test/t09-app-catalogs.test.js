import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { parse as parseYaml } from 'yaml';

import {
  createAppCatalogs,
  validateAppComponentSource,
  validateAppRouteSource,
} from '../scripts/generate-app-catalogs.mjs';

/**
 * @typedef {Record<string, any>} JsonObject
 * @typedef {{componentId: string}} ComponentEntry
 * @typedef {{
 *   contentKey: string,
 *   defaultMessage: string,
 *   description: string,
 *   placeholders: Record<string, unknown>,
 *   sensitivity: string
 * }} ContentEntry
 * @typedef {{
 *   components: ComponentEntry[],
 *   contentKeys: ContentEntry[]
 * }} AppComponentCatalog
 * @typedef {{
 *   routeId: string,
 *   originClass: string,
 *   pathTemplate: string,
 *   capabilityKeys: string[],
 *   componentIds: string[],
 *   contentKeyIds: string[],
 *   apiOperationIds: string[],
 *   tokenBearing: boolean
 * }} RouteEntry
 * @typedef {{routes: RouteEntry[]}} AppRouteCatalog
 */

const COMPONENTS_SOURCE_PATH = path.resolve(
  'catalog-sources/app-components.json',
);
const ROUTES_SOURCE_PATH = path.resolve('catalog-sources/app-routes.json');
const OPENAPI_BUNDLE_PATH = path.resolve('openapi/openapi.yaml');
const HTTP_CATALOG_PATH = path.resolve('openapi/http-catalog.json');
const DESIGN_MANIFEST_PATH = path.resolve('codegen/design-manifest.json');
const COMPONENTS_OUTPUT_PATH = path.resolve(
  'docs/catalogs/app-components.json',
);
const ROUTES_OUTPUT_PATH = path.resolve('docs/catalogs/app-routes.json');

/**
 * Load every fixture the generator and its tests share.
 *
 * @returns {Promise<{
 *   componentSourceValue: unknown,
 *   routeSourceValue: unknown,
 *   openApiOperationIds: Set<string>,
 *   httpCatalog: JsonObject,
 *   sourceDesignRevision: string
 * }>} loaded fixtures
 */
async function loadFixtures() {
  const [
    componentSourceValue,
    routeSourceValue,
    openApiText,
    httpCatalog,
    designManifest,
  ] = await Promise.all([
    readFile(COMPONENTS_SOURCE_PATH, 'utf8').then(JSON.parse),
    readFile(ROUTES_SOURCE_PATH, 'utf8').then(JSON.parse),
    readFile(OPENAPI_BUNDLE_PATH, 'utf8'),
    readFile(HTTP_CATALOG_PATH, 'utf8').then(JSON.parse),
    readFile(DESIGN_MANIFEST_PATH, 'utf8').then(JSON.parse),
  ]);
  const openApiDocument = parseYaml(openApiText);
  const openApiOperationIds = new Set();
  for (const pathItem of Object.values(openApiDocument.paths ?? {})) {
    for (const [method, operation] of Object.entries(
      /** @type {JsonObject} */ (pathItem),
    )) {
      if (
        ['get', 'put', 'post', 'delete', 'patch'].includes(method) &&
        operation !== null &&
        typeof operation === 'object'
      ) {
        openApiOperationIds.add(operation.operationId);
      }
    }
  }
  return {
    componentSourceValue,
    routeSourceValue,
    openApiOperationIds,
    httpCatalog,
    sourceDesignRevision: designManifest.digest,
  };
}

test('reviewed source ledgers validate without invented entries', async () => {
  const { componentSourceValue, routeSourceValue } = await loadFixtures();
  assert.equal(validateAppComponentSource(componentSourceValue).length, 15);
  assert.equal(validateAppRouteSource(routeSourceValue).length, 22);
});

test('generated catalogs match the committed projection', async () => {
  const {
    componentSourceValue,
    routeSourceValue,
    openApiOperationIds,
    httpCatalog,
    sourceDesignRevision,
  } = await loadFixtures();
  const { components, routes, authoredMessageCount } = createAppCatalogs(
    componentSourceValue,
    routeSourceValue,
    openApiOperationIds,
    httpCatalog,
    sourceDesignRevision,
  );

  const [committedComponentsText, committedRoutesText] = await Promise.all([
    readFile(COMPONENTS_OUTPUT_PATH, 'utf8'),
    readFile(ROUTES_OUTPUT_PATH, 'utf8'),
  ]);
  assert.deepEqual(JSON.parse(committedComponentsText), components);
  assert.deepEqual(JSON.parse(committedRoutesText), routes);
  assert.equal(authoredMessageCount, 302);
});

test('every route references only registered componentIds and contentKeyIds', async () => {
  const componentsText = await readFile(COMPONENTS_OUTPUT_PATH, 'utf8');
  const routesText = await readFile(ROUTES_OUTPUT_PATH, 'utf8');
  const components = /** @type {AppComponentCatalog} */ (
    JSON.parse(componentsText)
  );
  const routes = /** @type {AppRouteCatalog} */ (JSON.parse(routesText));
  const componentIds = new Set(components.components.map((c) => c.componentId));
  const contentKeyIds = new Set(
    components.contentKeys.map((c) => c.contentKey),
  );
  for (const route of routes.routes) {
    for (const componentId of route.componentIds) {
      assert.ok(
        componentIds.has(componentId),
        `${route.routeId}: ${componentId}`,
      );
    }
    for (const contentKeyId of route.contentKeyIds) {
      assert.ok(
        contentKeyIds.has(contentKeyId),
        `${route.routeId}: ${contentKeyId}`,
      );
    }
  }
});

test('every apiOperationId exists in openapi/openapi.yaml', async () => {
  const { openApiOperationIds } = await loadFixtures();
  const routesText = await readFile(ROUTES_OUTPUT_PATH, 'utf8');
  const routes = /** @type {AppRouteCatalog} */ (JSON.parse(routesText));
  for (const route of routes.routes) {
    for (const operationId of route.apiOperationIds) {
      assert.ok(
        openApiOperationIds.has(operationId),
        `${route.routeId}: ${operationId} is not an OpenAPI operation`,
      );
    }
  }
});

test('routeId and (originClass, pathTemplate) are independently unique', async () => {
  const routesText = await readFile(ROUTES_OUTPUT_PATH, 'utf8');
  const routes = /** @type {AppRouteCatalog} */ (JSON.parse(routesText)).routes;
  const routeIds = routes.map((route) => route.routeId);
  const pairs = routes.map(
    (route) => `${route.originClass}\u0000${route.pathTemplate}`,
  );
  assert.equal(new Set(routeIds).size, routeIds.length);
  assert.equal(new Set(pairs).size, pairs.length);
});

test('componentId and contentKey are independently unique', async () => {
  const componentsText = await readFile(COMPONENTS_OUTPUT_PATH, 'utf8');
  const components = /** @type {AppComponentCatalog} */ (
    JSON.parse(componentsText)
  );
  const componentIds = components.components.map((c) => c.componentId);
  const contentKeyIds = components.contentKeys.map((c) => c.contentKey);
  assert.equal(new Set(componentIds).size, componentIds.length);
  assert.equal(new Set(contentKeyIds).size, contentKeyIds.length);
});

test('the MVP account.recover route stays RECOVERY-scoped to StatePanel and its mutation group', async () => {
  const routesText = await readFile(ROUTES_OUTPUT_PATH, 'utf8');
  const routes = /** @type {AppRouteCatalog} */ (JSON.parse(routesText)).routes;
  const recover = /** @type {RouteEntry} */ (
    routes.find((route) => route.routeId === 'account.recover')
  );
  assert.deepEqual(recover.componentIds, [
    'StatePanel',
    'FormField',
    'ValidationSummary',
    'AsyncCommand',
  ]);
  assert.equal(recover.originClass, 'RECOVERY');
  assert.equal(recover.tokenBearing, false);
});

test('only the home route has empty apiOperationIds', async () => {
  const routesText = await readFile(ROUTES_OUTPUT_PATH, 'utf8');
  const routes = /** @type {AppRouteCatalog} */ (JSON.parse(routesText)).routes;
  const emptyRoutes = routes
    .filter((route) => route.apiOperationIds.length === 0)
    .map((route) => route.routeId);
  // `home` has no pre-authentication API surface by design (document 14).
  // The LOCAL-12 exception for `organizations.by-organization-id.roles` is
  // retired: LOCAL-36 G-16 adds `getOrganizationsByOrganizationIdRoles`, so the
  // roles screen reads its role templates from the contract.
  assert.deepEqual(emptyRoutes.sort(), ['home']);
});

test('capabilityKeys is exactly the sorted unique set of non-null capabilityKey values, excluding conditionalCapabilityKeys', async () => {
  const { httpCatalog } = await loadFixtures();
  /** @type {{operationId: string, capabilityKey: string | null}[]} */
  const httpOperations = httpCatalog.operations;
  /** @type {Map<string, string | null>} */
  const capabilityKeyByOperationId = new Map(
    httpOperations.map((operation) => [
      operation.operationId,
      operation.capabilityKey,
    ]),
  );
  const routesText = await readFile(ROUTES_OUTPUT_PATH, 'utf8');
  const routes = /** @type {AppRouteCatalog} */ (JSON.parse(routesText)).routes;
  for (const route of routes) {
    const expected = [
      ...new Set(
        route.apiOperationIds
          .map((operationId) => capabilityKeyByOperationId.get(operationId))
          .filter((capabilityKey) => capabilityKey !== null),
      ),
    ].sort();
    assert.deepEqual(
      route.capabilityKeys,
      expected,
      `${route.routeId}: capabilityKeys must equal the sorted unique non-null capabilityKey set`,
    );
  }
});

test('every content entry has a complete defaultMessage, description, typed placeholders and sensitivity', async () => {
  const componentsText = await readFile(COMPONENTS_OUTPUT_PATH, 'utf8');
  const components = /** @type {AppComponentCatalog} */ (
    JSON.parse(componentsText)
  );
  for (const entry of components.contentKeys) {
    assert.ok(entry.defaultMessage.length > 0);
    assert.ok(entry.description.length > 0);
    assert.equal(typeof entry.placeholders, 'object');
    assert.ok(
      ['PUBLIC', 'AUTHENTICATED', 'SECRET_PROHIBITED'].includes(
        entry.sensitivity,
      ),
    );
  }
});

test('SCHEMA-2.8.1: every App-facing operation is bound to a route, and the single deployment read to Releases', async () => {
  const { httpCatalog } = await loadFixtures();
  const routesText = await readFile(ROUTES_OUTPUT_PATH, 'utf8');
  const routes = /** @type {AppRouteCatalog} */ (JSON.parse(routesText)).routes;
  const releases = /** @type {RouteEntry} */ (
    routes.find(
      (route) =>
        route.routeId ===
        'organizations.by-organization-id.publications.by-publication-id.releases',
    )
  );
  assert.ok(
    releases.apiOperationIds.includes(
      'getOrganizationsByOrganizationIdPublicationsByPublicationIdDeploymentsByGenerationId',
    ),
    'the App mounts the single deployment read on Releases (?generation=)',
  );
  const bound = new Set(routes.flatMap((route) => route.apiOperationIds));
  /** @type {{operationId: string}[]} */
  const operations = httpCatalog.operations;
  const unbound = operations
    .map((operation) => operation.operationId)
    .filter((operationId) => !bound.has(operationId))
    .sort();
  // Only operations no App screen can call stay unbound: the health probe, the
  // GitHub App webhook, and the two workload (GitHub Actions) endpoints.
  assert.deepEqual(unbound, [
    'getInternalHealth',
    'postCallbacksGithubApp',
    'postWorkloadsDeploymentReceipts',
    'postWorkloadsGithubReceiptExchanges',
  ]);
});
