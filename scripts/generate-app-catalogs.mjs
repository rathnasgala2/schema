import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { format as prettierFormat } from 'prettier';
import { parse as parseYaml } from 'yaml';

import { canonicalizeJcsBytes } from '../src/internal/canonical-jcs.js';
import { runIfMain } from './run-if-main.mjs';

const VERSION = '2.0.0';
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

const COMPONENT_ID_PATTERN = /^[A-Z][A-Za-z]*$/u;
const CONTENT_KEY_PREFIX_PATTERN =
  /^component\.[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;
const PATH_TEMPLATE_PATTERN =
  /^\/(?:[a-z][a-z0-9-]*(?:\/(?:[a-z][a-z0-9-]*|\{[a-zA-Z]+\}))*)?$/u;
const ORIGIN_CLASSES = new Set(['APP', 'RECOVERY', 'TRANSACTIONAL_LINK']);
const AUTHENTICATION_CLASSES = new Set([
  'PUBLIC',
  'SESSION_REQUIRED',
  'ACCOUNTLESS_CAPABILITY',
]);
const CONSEQUENTIAL_CONFIRMATION_PATH_TOKENS = Object.freeze([
  ':cancel',
  ':deny',
  ':revoke',
  ':remove',
  ':detach',
  '/closure',
  '/transfers',
  '/owner-transfers',
]);
const SENSITIVITIES = new Set(['PUBLIC', 'AUTHENTICATED', 'SECRET_PROHIBITED']);

/**
 * The closed 16-member route-state vocabulary, in the fixed document 07
 * order, each bound to its closed default status message and an authored
 * default recovery message. The status strings are copied verbatim from the
 * design corpus. Every recovery string below is authored copy, not the
 * corpus's blanket "states without a safe action" fallback: that fallback
 * ("Contact support with the displayed correlation ID.") wrongly implied a
 * correlation ID is always on screen (the App shows one only when present)
 * and, applied uniformly, put a support instruction on ordinary in-progress
 * states (SCHEMA-STATE-COPY, reported as a sign-in SUBMITTING defect).
 * Transient states (`LOADING`, `VALIDATING`, `SUBMITTING`, `RECONCILING`,
 * `REFRESHING`) get calm progress copy ("This usually takes a moment.");
 * `TERMINAL_FAILURE` is the only state whose recovery may direct the reader
 * to support, and only conditionally ("If it keeps failing, contact
 * support."). Every other state gets a plain, state-specific, user-facing
 * sentence.
 *
 * @type {ReadonlyArray<{state: string, status: string, recovery: string, authoredRecovery: boolean}>}
 */
const ROUTE_STATES = Object.freeze([
  state('LOADING', 'Loading…', 'This usually takes a moment.', true),
  state('READY', 'Ready.', 'No further action is needed.', true),
  state('EMPTY', 'No results.', 'Try a different search or filter.', true),
  state('REFRESHING', 'Refreshing…', 'This usually takes a moment.', true),
  state(
    'OFFLINE',
    'Offline.',
    'Check your internet connection and try again.',
    true,
  ),
  state(
    'FORBIDDEN',
    'You do not have access to this resource.',
    'Contact your administrator if you believe this is a mistake.',
    true,
  ),
  state(
    'NOT_FOUND',
    'The resource was not found.',
    'Check the link, or return to the previous page.',
    true,
  ),
  state(
    'CAPABILITY_UNAVAILABLE',
    'This capability is not available.',
    "This isn't available yet. Check back later, or contact support if you need it now.",
    true,
  ),
  state(
    'RECONCILING',
    'This operation is still reconciling.',
    'Wait while this is verified; do not resubmit.',
    true,
  ),
  state(
    'TERMINAL_FAILURE',
    'The operation failed.',
    'Try again. If it keeps failing, contact support.',
    true,
  ),
  state(
    'DIRTY',
    'Changes have not been submitted.',
    'Save or submit your changes, or discard them.',
    true,
  ),
  state('VALIDATING', 'Validating…', 'This usually takes a moment.', true),
  state('SUBMITTING', 'Submitting…', 'This usually takes a moment.', true),
  state(
    'CONFLICTED',
    'The resource changed; review the current version.',
    'Refresh the page, review the current version, and reconfirm before resubmitting.',
    true,
  ),
  state(
    'RATE_LIMITED',
    'Too many requests; wait before retrying.',
    'Wait for the indicated time before retrying.',
    true,
  ),
  state('SUCCESS', 'Completed.', 'No further action is needed.', true),
]);
const ROUTE_STATE_ORDER = ROUTE_STATES.map(({ state: name }) => name);
const BASE_STATES = Object.freeze([
  'READY',
  'LOADING',
  'FORBIDDEN',
  'NOT_FOUND',
  'CAPABILITY_UNAVAILABLE',
  'RECONCILING',
  'TERMINAL_FAILURE',
]);
const MUTATION_STATES = Object.freeze([
  'DIRTY',
  'VALIDATING',
  'SUBMITTING',
  'CONFLICTED',
  'RATE_LIMITED',
  'SUCCESS',
]);
const COLLECTION_STATES = Object.freeze([
  'EMPTY',
  'REFRESHING',
  'OFFLINE',
  'SUCCESS',
]);

/**
 * @typedef {Record<string, any>} JsonObject
 * @typedef {{
 *   componentId: string,
 *   semantics: string,
 *   requiredStates: string[],
 *   keyboardContract: string,
 *   focusContract: string,
 *   announcementContract: string,
 *   contentKeyPrefix: string
 * }} ComponentSource
 * @typedef {{
 *   pathTemplate: string,
 *   originClass: 'APP' | 'RECOVERY' | 'TRANSACTIONAL_LINK',
 *   authenticationClass: 'PUBLIC' | 'SESSION_REQUIRED' | 'ACCOUNTLESS_CAPABILITY',
 *   mutation: boolean,
 *   collection: boolean,
 *   screenJob: string,
 *   apiOperationIds: string[]
 * }} RouteSource
 * @typedef {{
 *   contentKey: string,
 *   defaultMessage: string,
 *   description: string,
 *   placeholders: Record<string, unknown>,
 *   sensitivity: 'PUBLIC' | 'AUTHENTICATED' | 'SECRET_PROHIBITED'
 * }} ContentEntry
 * @typedef {{
 *   routeId: string,
 *   originClass: string,
 *   pathTemplate: string,
 *   screenId: string,
 *   authenticationClass: string,
 *   capabilityKeys: string[],
 *   apiOperationIds: string[],
 *   componentIds: string[],
 *   contentKeyIds: string[],
 *   tokenBearing: boolean,
 *   requiredStates: string[]
 * }} RouteCatalogEntry
 * @typedef {{
 *   schemaVersion: string,
 *   sourceDesignRevision: string,
 *   components: ComponentSource[],
 *   contentKeys: ContentEntry[],
 *   digest: string
 * }} AppComponentCatalog
 * @typedef {{
 *   schemaVersion: string,
 *   sourceDesignRevision: string,
 *   routes: RouteCatalogEntry[],
 *   digest: string
 * }} AppRouteCatalog
 */

/**
 * Build one closed route-state descriptor.
 *
 * @param {string} name state identity
 * @param {string} status closed default status message
 * @param {string} recovery default recovery message
 * @param {boolean} authored whether the recovery message is authored content
 * @returns {{state: string, status: string, recovery: string, authoredRecovery: boolean}} descriptor
 */
function state(name, status, recovery, authored) {
  return { state: name, status, recovery, authoredRecovery: authored };
}

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
 * @param {boolean} allowEmpty whether an empty array is admitted
 * @returns {asserts value is string[]}
 */
function assertSortedUniqueStrings(value, identity, allowEmpty) {
  if (
    !Array.isArray(value) ||
    (!allowEmpty && value.length === 0) ||
    value.some((item) => typeof item !== 'string') ||
    new Set(value).size !== value.length ||
    JSON.stringify(value) !== JSON.stringify([...value].sort())
  ) {
    throw new TypeError(`${identity}: must be a sorted unique string set`);
  }
}

/**
 * Assert a string array is non-empty and unique, without requiring sort
 * order. Used for `componentIds`, whose order is the meaningful, deterministic
 * document 07 assignment sequence rather than an alphabetical listing.
 *
 * @param {unknown} value candidate array
 * @param {string} identity diagnostic identity
 * @returns {asserts value is string[]}
 */
function assertUniqueOrderedStrings(value, identity) {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((item) => typeof item !== 'string') ||
    new Set(value).size !== value.length
  ) {
    throw new TypeError(`${identity}: must be a non-empty unique string list`);
  }
}

/**
 * Derive the deterministic `routeId` from a route's origin class and path
 * template, following document 14's exact rule: strip the leading slash,
 * render `/` as `.`, keep literal kebab-case, and render `{xId}` as
 * `by-x-id`; `/` alone is `home`.
 *
 * @param {string} pathTemplate route path template
 * @returns {string} derived route identity
 */
function deriveRouteId(pathTemplate) {
  if (pathTemplate === '/') {
    return 'home';
  }
  const segments = pathTemplate.replace(/^\//u, '').split('/');
  const rendered = segments.map((segment) => {
    const match = /^\{([a-zA-Z]+)\}$/u.exec(segment);
    if (match === null) {
      return segment;
    }
    const base = /** @type {string} */ (match[1]).replace(/Id$/u, '');
    const kebab = base.replace(/([a-z0-9])([A-Z])/gu, '$1-$2').toLowerCase();
    return `by-${kebab}-id`;
  });
  return rendered.join('.');
}

/**
 * Validate the reviewed component source ledger without inventing entries.
 *
 * @param {unknown} value parsed source document
 * @returns {ComponentSource[]} validated components
 */
export function validateAppComponentSource(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('App component source must be an object');
  }
  const source = /** @type {JsonObject} */ (value);
  assertExactKeys(
    source,
    ['schemaVersion', 'components'],
    'app component source',
  );
  if (source.schemaVersion !== VERSION || !Array.isArray(source.components)) {
    throw new TypeError('App component source header is invalid');
  }
  const componentIds = new Set();
  for (const raw of source.components) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new TypeError('App component source entry must be an object');
    }
    const component = /** @type {JsonObject} */ (raw);
    assertExactKeys(
      component,
      [
        'componentId',
        'semantics',
        'requiredStates',
        'keyboardContract',
        'focusContract',
        'announcementContract',
        'contentKeyPrefix',
      ],
      'app component',
    );
    if (
      typeof component.componentId !== 'string' ||
      !COMPONENT_ID_PATTERN.test(component.componentId) ||
      componentIds.has(component.componentId) ||
      typeof component.semantics !== 'string' ||
      component.semantics.length === 0 ||
      typeof component.keyboardContract !== 'string' ||
      component.keyboardContract.length === 0 ||
      typeof component.focusContract !== 'string' ||
      component.focusContract.length === 0 ||
      typeof component.announcementContract !== 'string' ||
      component.announcementContract.length === 0 ||
      typeof component.contentKeyPrefix !== 'string' ||
      !CONTENT_KEY_PREFIX_PATTERN.test(component.contentKeyPrefix)
    ) {
      throw new TypeError(
        `${String(component.componentId)}: component is invalid`,
      );
    }
    if (
      !Array.isArray(component.requiredStates) ||
      component.requiredStates.length === 0 ||
      component.requiredStates.some((item) => typeof item !== 'string')
    ) {
      throw new TypeError(
        `${component.componentId}: component requiredStates is invalid`,
      );
    }
    componentIds.add(component.componentId);
  }
  return /** @type {ComponentSource[]} */ (source.components);
}

/**
 * Validate the reviewed route source ledger without inventing entries.
 *
 * @param {unknown} value parsed source document
 * @returns {RouteSource[]} validated routes
 */
export function validateAppRouteSource(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('App route source must be an object');
  }
  const source = /** @type {JsonObject} */ (value);
  assertExactKeys(source, ['schemaVersion', 'routes'], 'app route source');
  if (source.schemaVersion !== VERSION || !Array.isArray(source.routes)) {
    throw new TypeError('App route source header is invalid');
  }
  const seenPairs = new Set();
  for (const raw of source.routes) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new TypeError('App route source entry must be an object');
    }
    const route = /** @type {JsonObject} */ (raw);
    assertExactKeys(
      route,
      [
        'pathTemplate',
        'originClass',
        'authenticationClass',
        'mutation',
        'collection',
        'screenJob',
        'apiOperationIds',
      ],
      'app route',
    );
    if (
      typeof route.pathTemplate !== 'string' ||
      !PATH_TEMPLATE_PATTERN.test(route.pathTemplate) ||
      !ORIGIN_CLASSES.has(route.originClass) ||
      !AUTHENTICATION_CLASSES.has(route.authenticationClass) ||
      typeof route.mutation !== 'boolean' ||
      typeof route.collection !== 'boolean' ||
      typeof route.screenJob !== 'string' ||
      route.screenJob.length === 0
    ) {
      throw new TypeError(
        `${String(route.pathTemplate)}: app route is invalid`,
      );
    }
    // The document 14 Beta-complete invariant holds again: `/` is the only
    // route without a backing operation, because it has no pre-authentication
    // API surface by design. The LOCAL-12 exception for
    // `/organizations/{organizationId}/roles` is retired -- LOCAL-36 G-16 adds
    // `getOrganizationsByOrganizationIdRoles` to the contract, so role
    // templates are read from the API rather than transcribed by the client.
    assertSortedUniqueStrings(
      route.apiOperationIds,
      `${route.pathTemplate}: apiOperationIds`,
      true,
    );
    if (route.apiOperationIds.length === 0 && route.pathTemplate !== '/') {
      throw new TypeError(
        `${route.pathTemplate}: only \`/\` may have empty apiOperationIds`,
      );
    }
    const pairKey = `${route.originClass}\u0000${route.pathTemplate}`;
    if (seenPairs.has(pairKey)) {
      throw new TypeError(
        `${route.pathTemplate}: (originClass, pathTemplate) is not unique`,
      );
    }
    seenPairs.add(pairKey);
  }
  return /** @type {RouteSource[]} */ (source.routes);
}

/**
 * Compute one route's required-state set from its mutation/collection
 * classification, in the closed document 07 order.
 *
 * @param {boolean} mutation whether the route's operation set has an unsafe method
 * @param {boolean} collection whether the route's operation set has a paginated GET
 * @returns {string[]} ordered required states
 */
function computeRequiredStates(mutation, collection) {
  const included = new Set(BASE_STATES);
  if (mutation) {
    for (const item of MUTATION_STATES) {
      included.add(item);
    }
  }
  if (collection) {
    for (const item of COLLECTION_STATES) {
      included.add(item);
    }
  }
  return ROUTE_STATE_ORDER.filter((item) => included.has(item));
}

/**
 * Determine whether any of a route's matched operations is `DELETE` or
 * carries a document 14 destructive-consequence path token.
 *
 * @param {string[]} apiOperationIds route's matched operation IDs
 * @param {Map<string, {method: string, path: string}>} operationIndex http-catalog operation index
 * @returns {boolean} whether ConsequentialConfirmation is admitted
 */
function requiresConsequentialConfirmation(apiOperationIds, operationIndex) {
  return apiOperationIds.some((operationId) => {
    const operation = operationIndex.get(operationId);
    if (operation === undefined) {
      return false;
    }
    if (operation.method === 'DELETE') {
      return true;
    }
    return CONSEQUENTIAL_CONFIRMATION_PATH_TOKENS.some((token) =>
      operation.path.includes(token),
    );
  });
}

/**
 * Compute one route's ordered, deduplicated componentIds using document 07's
 * exact ordered rule and the S5 brief's RECOVERY/TRANSACTIONAL_LINK override.
 *
 * @param {RouteSource} route reviewed route source
 * @param {boolean} consequentialConfirmation whether CC is admitted
 * @returns {string[]} ordered componentIds
 */
function computeComponentIds(route, consequentialConfirmation) {
  const isRecoveryOrLink =
    route.originClass === 'RECOVERY' ||
    route.originClass === 'TRANSACTIONAL_LINK';
  const components = [];
  if (isRecoveryOrLink) {
    components.push('StatePanel');
    if (route.mutation) {
      components.push('FormField', 'ValidationSummary', 'AsyncCommand');
    }
    if (consequentialConfirmation) {
      components.push('ConsequentialConfirmation');
    }
    return components;
  }
  components.push('AppShell');
  if (route.pathTemplate !== '/' && route.pathTemplate !== '/sign-in') {
    components.push('Breadcrumbs', 'ContextHeader');
  }
  components.push('StatePanel');
  if (route.mutation) {
    components.push('FormField', 'ValidationSummary', 'AsyncCommand');
  }
  if (consequentialConfirmation) {
    components.push('ConsequentialConfirmation');
  }
  if (route.collection) {
    components.push('DataTable');
  }
  if (
    route.pathTemplate.endsWith('/source') ||
    route.pathTemplate.endsWith('/content') ||
    route.pathTemplate.endsWith('/reviews')
  ) {
    components.push('SemanticDiffReview');
  }
  if (
    route.pathTemplate.endsWith('/releases') ||
    route.pathTemplate.includes('/operations/')
  ) {
    components.push('OperationTimeline');
  }
  if (route.pathTemplate === '/account/security') {
    components.push('SecretOrTokenDisplay');
  }
  return [...new Set(components)];
}

/**
 * Project both reviewed source ledgers into the complete deterministic
 * catalogs, cross-validated against the OpenAPI bundle and HTTP catalog.
 *
 * @param {ComponentSource[]} componentSource reviewed component source
 * @param {RouteSource[]} routeSource reviewed route source
 * @param {Set<string>} openApiOperationIds every operation ID in openapi/openapi.yaml
 * @param {JsonObject} httpCatalog generated openapi/http-catalog.json
 * @param {string} sourceDesignRevision DEC-091 design manifest digest
 * @returns {{
 *   components: Omit<AppComponentCatalog, 'digest'>,
 *   routes: Omit<AppRouteCatalog, 'digest'>,
 *   authoredMessageCount: number
 * }} projection
 */
export function projectAppCatalogs(
  componentSource,
  routeSource,
  openApiOperationIds,
  httpCatalog,
  sourceDesignRevision,
) {
  const componentIdSet = new Set(
    componentSource.map(({ componentId }) => componentId),
  );
  /** @type {{operationId: string, method: string, path: string, capabilityKey: string | null, conditionalCapabilityKeys: string[]}[]} */
  const httpOperations = httpCatalog.operations;
  /** @type {Map<string, {method: string, path: string, capabilityKey: string | null, conditionalCapabilityKeys: string[]}>} */
  const operationIndex = new Map(
    httpOperations.map((operation) => [operation.operationId, operation]),
  );

  const sortedComponents = [...componentSource].sort((left, right) =>
    left.componentId.localeCompare(right.componentId),
  );

  /** @type {ContentEntry[]} */
  const contentKeys = [];
  /** @type {RouteCatalogEntry[]} */
  const routes = [];
  let authoredMessageCount = 0;

  const sortedRoutes = [...routeSource].sort((left, right) =>
    left.pathTemplate.localeCompare(right.pathTemplate),
  );

  for (const route of sortedRoutes) {
    for (const operationId of route.apiOperationIds) {
      if (!openApiOperationIds.has(operationId)) {
        throw new TypeError(
          `${route.pathTemplate}: apiOperationId ${operationId} is not in openapi/openapi.yaml`,
        );
      }
      if (!operationIndex.has(operationId)) {
        throw new TypeError(
          `${route.pathTemplate}: apiOperationId ${operationId} is not in openapi/http-catalog.json`,
        );
      }
    }

    const routeId = deriveRouteId(route.pathTemplate);
    const screenId = `${routeId}.screen`;
    const requiredStates = computeRequiredStates(
      route.mutation,
      route.collection,
    );
    const consequentialConfirmation = requiresConsequentialConfirmation(
      route.apiOperationIds,
      operationIndex,
    );
    const componentIds = computeComponentIds(route, consequentialConfirmation);
    for (const componentId of componentIds) {
      if (!componentIdSet.has(componentId)) {
        throw new TypeError(
          `${route.pathTemplate}: componentId ${componentId} is not registered`,
        );
      }
    }

    // S5 brief section 4: "the sorted unique set of non-null `capabilityKey`
    // values on the route's operations". `conditionalCapabilityKeys` is a
    // distinct, narrower-condition annotation and is deliberately excluded.
    const capabilityKeys = [
      ...new Set(
        route.apiOperationIds
          .map((operationId) => {
            const operation = /** @type {{capabilityKey: string | null}} */ (
              operationIndex.get(operationId)
            );
            return operation.capabilityKey;
          })
          .filter((capabilityKey) => capabilityKey !== null),
      ),
    ].sort();

    const semicolonIndex = route.screenJob.indexOf(';');
    const title =
      semicolonIndex === -1
        ? route.screenJob
        : route.screenJob.slice(0, semicolonIndex).trim();
    const summary =
      semicolonIndex === -1
        ? route.screenJob
        : route.screenJob.slice(semicolonIndex + 1).trim();
    const sensitivity =
      route.authenticationClass === 'PUBLIC' ? 'PUBLIC' : 'AUTHENTICATED';

    contentKeys.push({
      contentKey: `${screenId}.ready.title`,
      defaultMessage: title,
      description: `Title for the ${routeId} screen, copied verbatim from document 14's Screen/job cell.`,
      placeholders: {},
      sensitivity,
    });
    contentKeys.push({
      contentKey: `${screenId}.ready.summary`,
      defaultMessage: summary,
      description: `Summary for the ${routeId} screen, copied verbatim from document 14's Screen/job cell.`,
      placeholders: {},
      sensitivity,
    });

    /** @type {string[]} */
    const contentKeyIds = [
      `${screenId}.ready.title`,
      `${screenId}.ready.summary`,
    ];
    for (const stateName of requiredStates) {
      const descriptor = /** @type {(typeof ROUTE_STATES)[number]} */ (
        ROUTE_STATES.find((item) => item.state === stateName)
      );
      const lowerState = stateName.toLowerCase();
      const statusKey = `${screenId}.${lowerState}.status`;
      const recoveryKey = `${screenId}.${lowerState}.recovery`;
      contentKeys.push({
        contentKey: statusKey,
        defaultMessage: descriptor.status,
        description: `Closed default status text for the ${routeId} screen in the ${stateName} state.`,
        placeholders: {},
        sensitivity,
      });
      contentKeys.push({
        contentKey: recoveryKey,
        defaultMessage: descriptor.recovery,
        description: `Default recovery guidance for the ${routeId} screen in the ${stateName} state.`,
        placeholders: {},
        sensitivity,
      });
      if (descriptor.authoredRecovery) {
        authoredMessageCount += 1;
      }
      contentKeyIds.push(statusKey, recoveryKey);
    }
    contentKeyIds.sort();

    routes.push({
      routeId,
      originClass: route.originClass,
      pathTemplate: route.pathTemplate,
      screenId,
      authenticationClass: route.authenticationClass,
      capabilityKeys,
      apiOperationIds: route.apiOperationIds,
      componentIds,
      contentKeyIds,
      tokenBearing: route.pathTemplate.includes('{token}'),
      requiredStates,
    });
  }

  const routeIds = routes.map(({ routeId }) => routeId);
  if (new Set(routeIds).size !== routeIds.length) {
    throw new TypeError('routeId is not unique across app-routes.json');
  }
  const contentKeyIdSet = new Set(
    contentKeys.map(({ contentKey }) => contentKey),
  );
  if (contentKeyIdSet.size !== contentKeys.length) {
    throw new TypeError('contentKey is not unique across app-components.json');
  }
  for (const route of routes) {
    for (const contentKeyId of route.contentKeyIds) {
      if (!contentKeyIdSet.has(contentKeyId)) {
        throw new TypeError(
          `${route.routeId}: contentKeyId ${contentKeyId} is not registered`,
        );
      }
    }
  }

  contentKeys.sort((left, right) =>
    left.contentKey.localeCompare(right.contentKey),
  );

  return {
    components: {
      schemaVersion: VERSION,
      sourceDesignRevision,
      components: sortedComponents,
      contentKeys,
    },
    routes: {
      schemaVersion: VERSION,
      sourceDesignRevision,
      routes,
    },
    authoredMessageCount,
  };
}

/**
 * Compute the canonical JCS SHA-256 digest of a projection, excluding only
 * `digest`.
 *
 * @param {JsonObject} projection catalog projection without its digest
 * @returns {string} tagged digest
 */
function digestOf(projection) {
  return `sha256:${createHash('sha256')
    .update(canonicalizeJcsBytes(projection))
    .digest('hex')}`;
}

/**
 * Validate a complete app-components.json catalog against its reviewed
 * projection and the shared envelope.
 *
 * @param {unknown} value candidate catalog
 * @param {Omit<AppComponentCatalog, 'digest'>} expected reviewed projection
 * @returns {AppComponentCatalog} validated catalog
 */
export function validateAppComponentCatalog(value, expected) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('App component catalog must be an object');
  }
  const catalog = /** @type {JsonObject} */ (value);
  assertExactKeys(
    catalog,
    [
      'schemaVersion',
      'sourceDesignRevision',
      'components',
      'contentKeys',
      'digest',
    ],
    'app component catalog',
  );
  const expectedComponentRecord = /** @type {JsonObject} */ (expected);
  for (const key of [
    'schemaVersion',
    'sourceDesignRevision',
    'components',
    'contentKeys',
  ]) {
    if (
      JSON.stringify(catalog[key]) !==
      JSON.stringify(expectedComponentRecord[key])
    ) {
      throw new TypeError(`App component catalog ${key} drift`);
    }
  }
  for (const entry of catalog.contentKeys) {
    assertExactKeys(
      entry,
      [
        'contentKey',
        'defaultMessage',
        'description',
        'placeholders',
        'sensitivity',
      ],
      `content key ${String(entry.contentKey)}`,
    );
    if (
      typeof entry.contentKey !== 'string' ||
      typeof entry.defaultMessage !== 'string' ||
      entry.defaultMessage.length === 0 ||
      typeof entry.description !== 'string' ||
      entry.description.length === 0 ||
      entry.placeholders === null ||
      typeof entry.placeholders !== 'object' ||
      Array.isArray(entry.placeholders) ||
      !SENSITIVITIES.has(entry.sensitivity)
    ) {
      throw new TypeError(`${entry.contentKey}: content key is invalid`);
    }
  }
  const projection = { ...catalog };
  delete projection.digest;
  const digest = digestOf(projection);
  if (catalog.digest !== digest) {
    throw new TypeError('App component catalog digest mismatch');
  }
  return /** @type {AppComponentCatalog} */ (catalog);
}

/**
 * Validate a complete app-routes.json catalog against its reviewed
 * projection and the shared envelope.
 *
 * @param {unknown} value candidate catalog
 * @param {Omit<AppRouteCatalog, 'digest'>} expected reviewed projection
 * @returns {AppRouteCatalog} validated catalog
 */
export function validateAppRouteCatalog(value, expected) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('App route catalog must be an object');
  }
  const catalog = /** @type {JsonObject} */ (value);
  assertExactKeys(
    catalog,
    ['schemaVersion', 'sourceDesignRevision', 'routes', 'digest'],
    'app route catalog',
  );
  const expectedRouteRecord = /** @type {JsonObject} */ (expected);
  for (const key of ['schemaVersion', 'sourceDesignRevision', 'routes']) {
    if (
      JSON.stringify(catalog[key]) !== JSON.stringify(expectedRouteRecord[key])
    ) {
      throw new TypeError(`App route catalog ${key} drift`);
    }
  }
  for (const entry of catalog.routes) {
    assertExactKeys(
      entry,
      [
        'routeId',
        'originClass',
        'pathTemplate',
        'screenId',
        'authenticationClass',
        'capabilityKeys',
        'apiOperationIds',
        'componentIds',
        'contentKeyIds',
        'tokenBearing',
        'requiredStates',
      ],
      `route ${String(entry.routeId)}`,
    );
    assertSortedUniqueStrings(
      entry.capabilityKeys,
      `${entry.routeId}: capabilityKeys`,
      true,
    );
    assertSortedUniqueStrings(
      entry.apiOperationIds,
      `${entry.routeId}: apiOperationIds`,
      true,
    );
    assertUniqueOrderedStrings(
      entry.componentIds,
      `${entry.routeId}: componentIds`,
    );
    assertSortedUniqueStrings(
      entry.contentKeyIds,
      `${entry.routeId}: contentKeyIds`,
      false,
    );
    if (
      typeof entry.tokenBearing !== 'boolean' ||
      !Array.isArray(entry.requiredStates) ||
      entry.requiredStates.length === 0
    ) {
      throw new TypeError(`${entry.routeId}: route is invalid`);
    }
  }
  const projection = { ...catalog };
  delete projection.digest;
  const digest = digestOf(projection);
  if (catalog.digest !== digest) {
    throw new TypeError('App route catalog digest mismatch');
  }
  return /** @type {AppRouteCatalog} */ (catalog);
}

/**
 * Create both complete, digest-bound catalogs from the reviewed source
 * ledgers.
 *
 * @param {unknown} componentSourceValue parsed catalog-sources/app-components.json
 * @param {unknown} routeSourceValue parsed catalog-sources/app-routes.json
 * @param {Set<string>} openApiOperationIds every operation ID in openapi/openapi.yaml
 * @param {JsonObject} httpCatalog generated openapi/http-catalog.json
 * @param {string} sourceDesignRevision DEC-091 design manifest digest
 * @returns {{components: AppComponentCatalog, routes: AppRouteCatalog, authoredMessageCount: number}} generated catalogs
 */
export function createAppCatalogs(
  componentSourceValue,
  routeSourceValue,
  openApiOperationIds,
  httpCatalog,
  sourceDesignRevision,
) {
  if (!/^[0-9a-f]{64}$/u.test(sourceDesignRevision)) {
    throw new TypeError('Source design revision must be lowercase SHA-256');
  }
  const componentSource = validateAppComponentSource(componentSourceValue);
  const routeSource = validateAppRouteSource(routeSourceValue);
  const { components, routes, authoredMessageCount } = projectAppCatalogs(
    componentSource,
    routeSource,
    openApiOperationIds,
    httpCatalog,
    sourceDesignRevision,
  );
  const componentCatalog = { ...components, digest: digestOf(components) };
  const routeCatalog = { ...routes, digest: digestOf(routes) };
  return {
    components: validateAppComponentCatalog(componentCatalog, components),
    routes: validateAppRouteCatalog(routeCatalog, routes),
    authoredMessageCount,
  };
}

/**
 * Collect every `operationId` declared in the bundled OpenAPI document.
 *
 * @param {JsonObject} openApiDocument parsed openapi/openapi.yaml
 * @returns {Set<string>} every declared operation ID
 */
function collectOpenApiOperationIds(openApiDocument) {
  const operationIds = new Set();
  for (const pathItem of Object.values(openApiDocument.paths ?? {})) {
    for (const [method, operation] of Object.entries(
      /** @type {JsonObject} */ (pathItem),
    )) {
      if (
        ['get', 'put', 'post', 'delete', 'patch'].includes(method) &&
        operation !== null &&
        typeof operation === 'object' &&
        typeof operation.operationId === 'string'
      ) {
        operationIds.add(operation.operationId);
      }
    }
  }
  return operationIds;
}

/**
 * Generate both catalogs or prove the committed projections are current.
 *
 * @param {boolean} check whether to compare without writing
 * @returns {Promise<void>}
 */
async function generate(check) {
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
  const openApiOperationIds = collectOpenApiOperationIds(openApiDocument);
  const { components, routes, authoredMessageCount } = createAppCatalogs(
    componentSourceValue,
    routeSourceValue,
    openApiOperationIds,
    httpCatalog,
    designManifest.digest,
  );

  const componentsOutput = await prettierFormat(JSON.stringify(components), {
    parser: 'json',
    proseWrap: 'always',
    singleQuote: true,
    trailingComma: 'all',
  });
  const routesOutput = await prettierFormat(JSON.stringify(routes), {
    parser: 'json',
    proseWrap: 'always',
    singleQuote: true,
    trailingComma: 'all',
  });

  if (check) {
    const [committedComponents, committedRoutes] = await Promise.all([
      readFile(COMPONENTS_OUTPUT_PATH, 'utf8'),
      readFile(ROUTES_OUTPUT_PATH, 'utf8'),
    ]);
    if (committedComponents !== componentsOutput) {
      throw new Error('docs/catalogs/app-components.json is stale');
    }
    if (committedRoutes !== routesOutput) {
      throw new Error('docs/catalogs/app-routes.json is stale');
    }
    process.stdout.write(
      `App catalogs are current (${components.components.length} components, ${components.contentKeys.length} content keys, ${routes.routes.length} routes, ${authoredMessageCount} authored recovery messages).\n`,
    );
    return;
  }
  await Promise.all([
    writeFile(COMPONENTS_OUTPUT_PATH, componentsOutput, 'utf8'),
    writeFile(ROUTES_OUTPUT_PATH, routesOutput, 'utf8'),
  ]);
  process.stdout.write(
    `Generated ${components.components.length} components, ${components.contentKeys.length} content keys and ${routes.routes.length} routes (${authoredMessageCount} authored recovery messages).\n`,
  );
}

await runIfMain(import.meta.url, async () => {
  await generate(process.argv.includes('--check'));
});
