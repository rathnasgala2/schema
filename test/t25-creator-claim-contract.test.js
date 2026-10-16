import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parse } from 'yaml';

const doc = parse(
  await readFile(new URL('../openapi/openapi.yaml', import.meta.url), 'utf8'),
);
const S = doc.components.schemas;
const UUID = S.GetClaimsByTokenResponse.properties.claimId;

test('claim read carries optional organizationId and publicationId', () => {
  const r = S.GetClaimsByTokenResponse;
  for (const k of ['organizationId', 'publicationId']) {
    assert.equal(r.properties[k].format, 'uuid');
    assert.equal(r.properties[k].pattern, UUID.pattern);
    assert.match(r.properties[k].description, /CLAIMED/);
    assert.ok(!r.required.includes(k));
  }
});

test('claim accept returns a required publicationId', () => {
  const r = S.PostClaimsByTokenAcceptResponse;
  assert.equal(r.properties.publicationId.pattern, UUID.pattern);
  assert.ok(r.required.includes('publicationId'));
});

test('handover read models NOT_STARTED', () => {
  assert.equal(S.HandoverState.enum[0], 'NOT_STARTED');
  const r =
    S.GetOrganizationsByOrganizationIdPublicationsByPublicationIdHandoverResponse;
  for (const k of ['target', 'appInstalledOnTarget', 'siteUrlAfter']) {
    assert.ok(!r.required.includes(k), k);
    assert.match(r.properties[k].description, /NOT_STARTED/);
  }
  for (const k of ['state', 'steps', 'version']) {
    assert.ok(r.required.includes(k), k);
  }
  const get =
    doc.paths[
      '/v2/organizations/{organizationId}/publications/{publicationId}/handover'
    ].get;
  assert.ok(
    get.responses['200'].content['application/json'].examples.notStarted,
  );
  assert.match(get.description, /NOT_STARTED/);
});

test('demo-site claimUrl is optional', () => {
  const r = S.PostPlatformDemoSitesResponse;
  assert.ok(!r.required.includes('claimUrl'));
  assert.ok(r.properties.claimUrl);
  assert.ok(r.required.includes('state'));
  assert.ok(r.required.includes('steps'));
  assert.deepEqual(
    r.properties.steps,
    S.GetPlatformDemoSitesByPublicationIdResponse.properties.steps,
  );
});

test('description-code 409 lists CLAIM_CODE_PENDING with an example', () => {
  const r =
    doc.paths['/v2/claims/{token}/description-code'].post.responses['409'];
  assert.deepEqual(r['x-gala-problem-codes'], [
    'CLAIM_ALREADY_CLAIMED',
    'CLAIM_CODE_PENDING',
  ]);
  const e = r.content['application/problem+json'].examples.CLAIM_CODE_PENDING;
  assert.equal(e.value.code, 'CLAIM_CODE_PENDING');
  assert.equal(e.value.status, 409);
});

test('platform override put lists RESOURCE_NOT_FOUND on 404', () => {
  const key = Object.keys(doc.paths).find((p) =>
    p.startsWith('/v2/platform/settings/overrides/'),
  );
  assert.ok(key);
  const r = doc.paths[key].put.responses['404'];
  assert.deepEqual(r['x-gala-problem-codes'], [
    'RESOURCE_NOT_FOUND',
    'SETTING_UNKNOWN',
  ]);
  const ex = r.content['application/problem+json'].examples;
  assert.equal(ex.RESOURCE_NOT_FOUND.value.status, 404);
  assert.ok(ex.SETTING_UNKNOWN);
});
