import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parse } from 'yaml';

import { API_KEY_SCOPES } from './generate-openapi.mjs';
import { runIfMain } from './run-if-main.mjs';

const BUNDLE_PATH = path.resolve('openapi/openapi.yaml');
const HTTP_METHODS = ['delete', 'get', 'patch', 'post', 'put'];
// Tags whose operations an admin API key may ever reach. Everything else
// (authentication, session, self, callbacks, claims, workloads, reader, public
// interactions, moderation, membership invitations, publication transfers,
// domains, github, internal, prism) is refused to a key, whatever else holds.
const KEY_REACHABLE_TAGS = Object.freeze([
  'interaction-settings',
  'organizations',
  'platform',
]);
// Path fragments that name a human-only act. Each is matched against the route.
const HUMAN_ONLY_PATH_RULES = /** @type {ReadonlyArray<[string, RegExp]>} */ ([
  ['owner transfer', /\/owner-transfers?(?:[/:]|$)/u],
  ['membership', /\/memberships?(?:[/:]|$)/u],
  ['invitations', /\/membership-invitations?(?:[/:]|$)/u],
  ['self service', /^\/v2\/self(?:[/:]|$)/u],
  ['session', /^\/v2\/session(?:[/:]|$)/u],
  ['passkey', /\/passkeys?(?:[/:]|$)|\/authenticators?(?:[/:]|$)/u],
  ['recovery', /\/recovery(?:[/:-]|$)/u],
  ['identity', /\/identity-links?(?:[/:]|$)/u],
  ['export', /\/exports?(?:[/:]|$)/u],
  ['closure', /\/closure(?:[/:]|$)/u],
  ['API key management', /^\/v2\/platform\/api-keys(?:[/:]|$)/u],
  ['claims', /^\/v2\/claims(?:[/:]|$)|^\/v2\/callbacks\/google\/claim$/u],
  ['handover', /\/handover(?:[/:]|$)/u],
]);

/**
 * @typedef {{
 *   method: string,
 *   path: string,
 *   operationId: string,
 *   tags: string[],
 *   scope: string | undefined,
 *   assuranceClass: string | undefined,
 *   hasKeySecurity: boolean
 * }} KeyOperation
 */

/**
 * Read every operation from a parsed OpenAPI bundle.
 *
 * @param {Record<string, any>} document parsed bundle
 * @returns {KeyOperation[]} operations with their key-relevant members
 */
export function readKeyOperations(document) {
  /** @type {KeyOperation[]} */
  const operations = [];
  for (const [route, item] of Object.entries(document.paths)) {
    for (const method of HTTP_METHODS) {
      const operation = item[method];
      if (operation === undefined) continue;
      operations.push({
        method,
        path: route,
        operationId: operation.operationId,
        tags: operation.tags ?? [],
        scope: operation['x-gala-api-key-scope'],
        assuranceClass: operation['x-gala-assurance-class'],
        hasKeySecurity: (operation.security ?? []).some(
          (/** @type {Record<string, unknown>} */ requirement) =>
            'adminApiKey' in requirement,
        ),
      });
    }
  }
  return operations;
}

/**
 * Report every operation that carries `x-gala-api-key-scope` although a key
 * must never reach it: a phishing-resistant step-up, owner transfer,
 * membership or invitations, self, passkey, recovery, identity, export or
 * closure, API-key management, claims or handover, settings changes, or any
 * operation outside the three tags a key may reach. Also reports a scope
 * outside the vocabulary and a scope declared apart from the `adminApiKey`
 * security requirement.
 *
 * @param {KeyOperation[]} operations operations of the bundle
 * @returns {string[]} one diagnostic per violation, empty when none
 */
export function findApiKeyScopeViolations(operations) {
  /** @type {string[]} */
  const violations = [];
  for (const operation of operations) {
    const identity = `${operation.method.toUpperCase()} ${operation.path}`;
    if ((operation.scope !== undefined) !== operation.hasKeySecurity) {
      violations.push(
        `${identity}: adminApiKey security and x-gala-api-key-scope are declared apart`,
      );
    }
    if (operation.scope === undefined) continue;
    if (!API_KEY_SCOPES.includes(operation.scope)) {
      violations.push(`${identity}: scope ${operation.scope} is unknown`);
    }
    if (operation.assuranceClass === 'PHISHING_RESISTANT') {
      violations.push(
        `${identity}: a phishing-resistant operation is key-callable`,
      );
    }
    if (
      operation.assuranceClass !== undefined &&
      !['SESSION', 'RECENT_AUTHENTICATION'].includes(operation.assuranceClass)
    ) {
      violations.push(
        `${identity}: assurance class ${operation.assuranceClass} is not key-callable`,
      );
    }
    for (const [name, pattern] of HUMAN_ONLY_PATH_RULES) {
      if (pattern.test(operation.path)) {
        violations.push(`${identity}: a ${name} operation is key-callable`);
      }
    }
    if (!operation.tags.every((tag) => KEY_REACHABLE_TAGS.includes(tag))) {
      violations.push(
        `${identity}: tag ${operation.tags.join(',')} is never key-callable`,
      );
    }
    if (
      operation.tags.includes('platform') &&
      !operation.path.startsWith('/v2/platform/demo-sites')
    ) {
      violations.push(`${identity}: platform configuration is key-callable`);
    }
    if (
      /^\/v2\/platform\/settings(?:[/:]|$)/u.test(operation.path) &&
      ['put', 'delete'].includes(operation.method)
    ) {
      violations.push(`${identity}: a settings change is key-callable`);
    }
  }
  return violations;
}

await runIfMain(import.meta.url, async () => {
  const document = parse(await readFile(BUNDLE_PATH, 'utf8'));
  const violations = findApiKeyScopeViolations(readKeyOperations(document));
  if (violations.length > 0) {
    throw new Error(`API key scope violations:\n${violations.join('\n')}`);
  }
  process.stdout.write(
    'API key scopes are limited to key-callable operations.\n',
  );
});
