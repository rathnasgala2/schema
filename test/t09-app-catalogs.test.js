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
  // 3.15.0: the catalogs describe only the current UI. One component survives
  // (ValidationSummary) and 44 routes, one for every address the App mounts.
  assert.equal(validateAppComponentSource(componentSourceValue).length, 1);
  assert.equal(validateAppRouteSource(routeSourceValue).length, 44);
  const paths = new Set(
    /** @type {JsonObject[]} */ (
      /** @type {JsonObject} */ (routeSourceValue).routes
    ).map((route) => route.pathTemplate),
  );
  for (const path of [
    '/',
    '/sign-in',
    '/reader/connect',
    '/start',
    '/start/import',
    '/start/import/{organizationId}/{importId}',
    '/start/{organizationId}/{publicationId}',
    '/sites/{organizationId}/{publicationId}',
    '/sites/{organizationId}/{publicationId}/posts',
    '/sites/{organizationId}/{publicationId}/posts/new',
    '/sites/{organizationId}/{publicationId}/posts/{path}',
    '/sites/{organizationId}/{publicationId}/reviews',
    '/sites/{organizationId}/{publicationId}/look',
    '/sites/{organizationId}/{publicationId}/history',
    '/sites/{organizationId}/{publicationId}/comments',
    '/sites/{organizationId}/{publicationId}/domain',
    '/sites/{organizationId}/{publicationId}/settings',
    '/sites/{organizationId}/{publicationId}/reconnect',
    '/sites/{organizationId}/{publicationId}/handover',
    '/sites/{organizationId}/{publicationId}/changes/{changeId}/preview',
    '/account',
    '/orgs',
    '/orgs/{organizationId}',
    '/orgs/{organizationId}/people',
    '/orgs/{organizationId}/roles',
    '/orgs/{organizationId}/activity',
    '/invitations/accept',
    '/claim',
    '/claim/{token}',
    '/platform',
    '/platform/users',
    '/platform/abuse',
    '/platform/abuse/{commentId}',
    '/platform/audit',
    '/platform/configuration',
    '/platform/configuration/{family}',
    '/platform/plans',
    '/platform/plans/{planKey}',
    '/platform/webhooks',
    '/platform/webhooks/{eventId}',
    '/platform/caches',
    '/platform/adapters',
    '/platform/api-keys',
    '/platform/settings',
  ]) {
    assert.ok(paths.has(path), path);
  }
  assert.equal(paths.size, 44);
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
  // 3.11.0 (reviewed 2026-10-13): five authored recovery messages for the
  // contact-email grant/withdraw and platform contact operations (566 to 571).
  // 3.13.0 (reviewed 2026-10-16): the API keys, settings, claim and handover
  // routes (571 to 629).
  // 3.15.0 (reviewed 2026-10-18): the catalog is the current UI's 44 routes
  // alone (629 to 580).
  assert.equal(authoredMessageCount, 580);
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

test('the catalog describes only the current UI: every route is an APP route and no retired address remains', async () => {
  const routesText = await readFile(ROUTES_OUTPUT_PATH, 'utf8');
  const routes = /** @type {AppRouteCatalog} */ (JSON.parse(routesText)).routes;
  for (const route of routes) {
    assert.equal(route.originClass, 'APP', route.routeId);
    assert.ok(!route.pathTemplate.startsWith('/v1/'), route.routeId);
    assert.ok(!route.pathTemplate.startsWith('/organizations'), route.routeId);
    assert.ok(!route.pathTemplate.startsWith('/t/'), route.routeId);
    assert.ok(!route.pathTemplate.startsWith('/account/'), route.routeId);
  }
  const routeIds = new Set(routes.map((route) => route.routeId));
  for (const retired of [
    'account.recover',
    'account.security',
    'account.connections',
    'account.export',
    'account.closure',
    'organizations',
    'platform.integrations',
    't.invitations.by-token-id',
  ]) {
    assert.ok(!routeIds.has(retired), retired);
  }
  // The only token-bearing route is the claim link.
  assert.deepEqual(
    routes.filter((route) => route.tokenBearing).map((route) => route.routeId),
    ['claim.by-token-id'],
  );
});

test('the one registered component, ValidationSummary, is named by exactly the routes that change something', async () => {
  const componentsText = await readFile(COMPONENTS_OUTPUT_PATH, 'utf8');
  const routesText = await readFile(ROUTES_OUTPUT_PATH, 'utf8');
  const components = /** @type {AppComponentCatalog} */ (
    JSON.parse(componentsText)
  );
  const routes = /** @type {AppRouteCatalog} */ (JSON.parse(routesText)).routes;
  assert.deepEqual(
    components.components.map((component) => component.componentId),
    ['ValidationSummary'],
  );
  const { httpCatalog } = await loadFixtures();
  /** @type {Map<string, string>} */
  const methodByOperationId = new Map(
    /** @type {{operationId: string, method: string}[]} */ (
      httpCatalog.operations
    ).map((operation) => [operation.operationId, operation.method]),
  );
  for (const route of routes) {
    const mutates = route.apiOperationIds.some(
      (operationId) => methodByOperationId.get(operationId) !== 'GET',
    );
    assert.deepEqual(
      route.componentIds,
      mutates ? ['ValidationSummary'] : [],
      route.routeId,
    );
  }
});

test('every route has at least one apiOperationId', async () => {
  const routesText = await readFile(ROUTES_OUTPUT_PATH, 'utf8');
  const routes = /** @type {AppRouteCatalog} */ (JSON.parse(routesText)).routes;
  const emptyRoutes = routes
    .filter((route) => route.apiOperationIds.length === 0)
    .map((route) => route.routeId);
  // 3.15.0: the current UI's `/` lists the person's sites and starts sign-in,
  // so the old exception for the public landing page is gone.
  assert.deepEqual(emptyRoutes, []);
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

test('every operation a screen of the current UI calls is bound to a route, and the single deployment read to History', async () => {
  const { httpCatalog } = await loadFixtures();
  const routesText = await readFile(ROUTES_OUTPUT_PATH, 'utf8');
  const routes = /** @type {AppRouteCatalog} */ (JSON.parse(routesText)).routes;
  const history = /** @type {RouteEntry} */ (
    routes.find(
      (route) =>
        route.routeId === 'sites.by-organization-id.by-publication-id.history',
    )
  );
  assert.ok(
    history.apiOperationIds.includes(
      'getOrganizationsByOrganizationIdPublicationsByPublicationIdDeploymentsByGenerationId',
    ),
    'the App mounts the single deployment read on History',
  );
  const bound = new Set(routes.flatMap((route) => route.apiOperationIds));
  /** @type {{operationId: string}[]} */
  const operations = httpCatalog.operations;
  const unbound = operations
    .map((operation) => operation.operationId)
    .filter((operationId) => !bound.has(operationId))
    .sort();
  // Only operations no screen of the current UI calls stay unbound: the health
  // probe, the GitHub App webhook, the three operator demo-site (CLI-only)
  // operations, the two workload (GitHub Actions) endpoints, the reader
  // operations a published blog's own script calls (`/v2/public/**` and the
  // reader token exchange and sign-out), and, since 3.15.0, the operations
  // only the retired UI called: the passkey sign-in ceremony and passkey
  // step-up, identity linking, the data-export read and archive, the OAuth
  // client management, the deployment, domain, repository-change, import and
  // publication-transfer reads it paged through, starting a publish by its own
  // operation, changing the deployment destination and planning a configuration
  // change.
  assert.deepEqual(unbound, [
    'deletePublicCommentsByCommentId',
    'deletePublicPublicationsByPublicationIdContentsByContentIdReactionsByReactionKey',
    'deleteReaderTokensCurrent',
    'getInternalHealth',
    'getOrganizationsByOrganizationIdMembershipInvitationsByInvitationId',
    'getOrganizationsByOrganizationIdPublicationImports',
    'getOrganizationsByOrganizationIdPublicationsByPublicationIdDeployments',
    'getOrganizationsByOrganizationIdPublicationsByPublicationIdDomainsByDomainId',
    'getOrganizationsByOrganizationIdPublicationsByPublicationIdRepositoryChanges',
    'getOrganizationsByOrganizationIdPublicationsByPublicationIdTransfersByTransferId',
    'getPlatformDemoSitesByPublicationId',
    'getPlatformDemoSitesPreflight',
    'getPlatformOauthClients',
    'getPublicPublicationsByPublicationIdContentsByContentIdComments',
    'getPublicPublicationsByPublicationIdContentsByContentIdInteractions',
    'getSelfExportsByExportId',
    'getSelfExportsByExportIdArchive',
    'postAuthenticationPasskeyAssertionOptions',
    'postAuthenticationPasskeyAssertions',
    'postCallbacksGithubApp',
    'postOrganizationsByOrganizationIdPublicationsByPublicationIdConfigurationChangesPlan',
    'postOrganizationsByOrganizationIdPublicationsByPublicationIdPublishes',
    'postOrganizationsByOrganizationIdPublicationsByPublicationIdRepositoryChangesByChangeIdBringUpToDate',
    'postOrganizationsByOrganizationIdPublicationsByPublicationIdRepositoryChangesPlan',
    'postPlatformDemoSites',
    'postPlatformOauthClients',
    'postPlatformOauthClientsByOauthClientIdRevoke',
    'postPublicCommentsByCommentIdAppeals',
    'postPublicCommentsByCommentIdReports',
    'postPublicCommentsByCommentIdRevisions',
    'postPublicPublicationsByPublicationIdContentsByContentIdComments',
    'postReaderTokens',
    'postSelfIdentityLinks',
    'postSessionReauthentication',
    'postWorkloadsDeploymentReceipts',
    'postWorkloadsGithubReceiptExchanges',
    'putOrganizationsByOrganizationIdPublicationsByPublicationIdDestination',
    'putPublicPublicationsByPublicationIdContentsByContentIdReactionsByReactionKey',
  ]);
});
