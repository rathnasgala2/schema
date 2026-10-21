import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parse } from 'yaml';

import {
  findApiKeyScopeViolations,
  readKeyOperations,
} from '../scripts/check-api-key-scopes.mjs';
import { API_KEY_SCOPES } from '../scripts/generate-openapi.mjs';

const O = 'OrganizationsByOrganizationId';
const P = `${O}PublicationsByPublicationId`;

/**
 * The reviewed allowlist (SCHEMA-3.13.0): every operation an admin API key may
 * call, with the scope that admits it. Changing this list is a security review.
 */
const EXPECTED = Object.freeze({
  [`get${O}`]: 'read',
  [`get${O}OperationsByOperationId`]: 'publish',
  [`get${O}Publications`]: 'read',
  [`get${P}`]: 'read',
  [`get${P}AnalyticsSettings`]: 'read',
  [`get${P}Content`]: 'read',
  [`get${P}Deployments`]: 'publish',
  [`get${P}DeploymentsByGenerationId`]: 'publish',
  [`get${P}InteractionSettings`]: 'read',
  [`get${P}PolicySettings`]: 'read',
  [`get${P}RepositoryChanges`]: 'read',
  [`get${P}RepositoryChangesByChangeId`]: 'read',
  getOrganizations: 'read',
  getPlatformDemoSitesByPublicationId: 'demo:setup',
  getPlatformDemoSitesPreflight: 'demo:setup',
  [`post${P}ChangesPublish`]: 'publish',
  [`post${P}ContentChangesPlan`]: 'content:write',
  [`post${P}RepositoryChangesByChangeIdConfirm`]: 'content:write',
  postPlatformDemoSites: 'demo:setup',
  [`put${P}AnalyticsSettings`]: 'content:write',
  [`put${P}InteractionSettings`]: 'content:write',
  [`put${P}PolicySettings`]: 'content:write',
});

/**
 * @returns {Promise<ReturnType<typeof readKeyOperations>>} bundle operations
 */
async function bundleOperations() {
  return readKeyOperations(
    parse(await readFile('openapi/openapi.yaml', 'utf8')),
  );
}

/**
 * @param {Partial<ReturnType<typeof readKeyOperations>[number]>} overrides operation members
 * @returns {ReturnType<typeof readKeyOperations>[number]} a key-callable operation
 */
function keyOperation(overrides) {
  return {
    method: 'get',
    path: '/v2/organizations',
    operationId: 'getOrganizations',
    tags: ['organizations'],
    scope: 'read',
    assuranceClass: undefined,
    hasKeySecurity: true,
    ...overrides,
  };
}

test('the scope vocabulary is closed', () => {
  assert.deepEqual(
    [...API_KEY_SCOPES],
    ['read', 'demo:setup', 'content:write', 'publish'],
  );
});

test('the bundle carries x-gala-api-key-scope on exactly the reviewed operations', async () => {
  const operations = await bundleOperations();
  const actual = Object.fromEntries(
    operations
      .filter((operation) => operation.scope !== undefined)
      .map((operation) => [operation.operationId, operation.scope]),
  );
  assert.deepEqual(actual, EXPECTED);
  assert.deepEqual(findApiKeyScopeViolations(operations), []);
});

test('the HTTP catalog states the key scope per operation', async () => {
  const catalog = JSON.parse(
    await readFile('openapi/http-catalog.json', 'utf8'),
  );
  const actual = Object.fromEntries(
    catalog.operations
      .filter(
        (/** @type {{apiKeyScope: unknown}} */ row) => row.apiKeyScope !== null,
      )
      .map((/** @type {{operationId: string, apiKeyScope: string}} */ row) => [
        row.operationId,
        row.apiKeyScope,
      ]),
  );
  assert.deepEqual(actual, EXPECTED);
});

test('the checker rejects every human-only operation class', () => {
  const cases =
    /** @type {Array<[string, Partial<ReturnType<typeof keyOperation>>]>} */ ([
      ['phishing-resistant', { assuranceClass: 'PHISHING_RESISTANT' }],
      [
        'owner transfer',
        {
          path: '/v2/organizations/{organizationId}/owner-transfers',
          method: 'post',
        },
      ],
      [
        'membership',
        { path: '/v2/organizations/{organizationId}/memberships' },
      ],
      [
        'invitations',
        { path: '/v2/organizations/{organizationId}/membership-invitations' },
      ],
      ['self', { path: '/v2/self/passkeys', tags: ['self'] }],
      ['passkey', { path: '/v2/organizations/{organizationId}/passkeys' }],
      ['recovery', { path: '/v2/self/recovery-codes', tags: ['self'] }],
      ['identity', { path: '/v2/self/identity-links', tags: ['self'] }],
      ['export', { path: '/v2/self/exports', tags: ['self'] }],
      ['closure', { path: '/v2/self/closure', tags: ['self'] }],
      [
        'API key management',
        { path: '/v2/platform/api-keys', tags: ['platform'] },
      ],
      ['claims', { path: '/v2/claims/{token}', tags: ['claims'] }],
      [
        'claim callback',
        { path: '/v2/callbacks/google/claim', tags: ['callbacks'] },
      ],
      [
        'handover',
        {
          path: '/v2/organizations/{organizationId}/publications/{publicationId}/handover:cancel',
          method: 'post',
        },
      ],
      [
        'settings put',
        {
          path: '/v2/platform/settings/{key}',
          method: 'put',
          tags: ['platform'],
        },
      ],
      [
        'settings delete',
        {
          path: '/v2/platform/settings/overrides/{kind}/{id}/{key}',
          method: 'delete',
          tags: ['platform'],
        },
      ],
      [
        'platform plans',
        {
          path: '/v2/platform/plans/{planKey}',
          method: 'put',
          tags: ['platform'],
        },
      ],
      ['session', { path: '/v2/session', tags: ['session'] }],
      ['unknown scope', { scope: 'admin' }],
      ['scope without security', { hasKeySecurity: false }],
    ]);
  for (const [name, overrides] of cases) {
    assert.notEqual(
      findApiKeyScopeViolations([keyOperation(overrides)]).length,
      0,
      `${name} must be rejected`,
    );
  }
  assert.deepEqual(findApiKeyScopeViolations([keyOperation({})]), []);
});

test('an operation without the extension is never reported', () => {
  assert.deepEqual(
    findApiKeyScopeViolations([
      keyOperation({
        path: '/v2/self/closure',
        scope: undefined,
        hasKeySecurity: false,
        tags: ['self'],
      }),
    ]),
    [],
  );
});
