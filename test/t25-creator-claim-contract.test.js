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

const CLAIMS_PATH =
  '/v2/organizations/{organizationId}/publications/{publicationId}/handover-claims';
const REQUEST_NAME =
  'PostOrganizationsByOrganizationIdPublicationsByPublicationIdHandoverClaimsRequest';

test('handover claims: list, issue and revoke are owner-only browser-session operations', () => {
  const list = doc.paths[CLAIMS_PATH].get;
  const issue = doc.paths[CLAIMS_PATH].post;
  const revoke = doc.paths[`${CLAIMS_PATH}/{claimId}:revoke`].post;
  assert.equal(
    list.operationId,
    'getOrganizationsByOrganizationIdPublicationsByPublicationIdHandoverClaims',
  );
  assert.equal(
    issue.operationId,
    'postOrganizationsByOrganizationIdPublicationsByPublicationIdHandoverClaims',
  );
  assert.equal(
    revoke.operationId,
    'postOrganizationsByOrganizationIdPublicationsByPublicationIdHandoverClaimsByClaimIdRevoke',
  );
  for (const operation of [list, issue, revoke]) {
    assert.equal(
      operation['x-gala-capability-key'],
      'publication.handover.manage',
    );
    assert.equal(operation['x-gala-assurance-class'], 'RECENT_AUTHENTICATION');
    assert.equal(operation['x-gala-api-key-scope'], undefined);
    assert.deepEqual(operation.security, [{ browserSession: [] }]);
  }
  for (const operation of [issue, revoke]) {
    assert.equal(operation['x-gala-replay-identity'], 'idempotency-key');
    assert.ok(
      operation.parameters.some(
        (/** @type {{ $ref?: string }} */ p) =>
          p.$ref === '#/components/parameters/IdempotencyKey',
      ),
    );
  }
  assert.ok(issue.responses['201']);
  assert.ok(revoke.responses['200'].headers.ETag);
});

test('handover claims reuse existing problem codes only', () => {
  const issue = doc.paths[CLAIMS_PATH].post;
  assert.deepEqual(issue.responses['409']['x-gala-problem-codes'], [
    'COMMAND_REPLAY_CONFLICT',
    'HANDOVER_EXISTS',
    'INVALID_SOURCE_STATE',
  ]);
  const revoke = doc.paths[`${CLAIMS_PATH}/{claimId}:revoke`].post;
  assert.deepEqual(revoke.responses['409']['x-gala-problem-codes'], [
    'CLAIM_ALREADY_CLAIMED',
    'COMMAND_REPLAY_CONFLICT',
  ]);
  assert.deepEqual(revoke.responses['410']['x-gala-problem-codes'], [
    'CLAIM_EXPIRED',
  ]);
});

test('handover claim shows claimUrl only for OPEN and claimedBy only for CLAIMED', () => {
  const claim = S.HandoverClaim;
  assert.equal(
    claim.properties.state.$ref,
    '#/components/schemas/CreatorClaimState',
  );
  for (const k of ['claimUrl', 'claimedBy', 'claimedAt']) {
    assert.ok(claim.properties[k], k);
    assert.ok(!claim.required.includes(k), k);
  }
  assert.match(
    claim.properties.claimUrl.description,
    /only while `state` is `OPEN`/,
  );
  assert.match(claim.properties.claimedBy.description, /CLAIMED/);
  for (const k of ['claimId', 'state', 'createdAt', 'expiresAt', 'proof']) {
    assert.ok(claim.required.includes(k), k);
  }
  assert.deepEqual(S.CreatorClaimProofKind.enum, [
    'YOUTUBE_CHANNEL',
    'LINK_ONLY',
  ]);
  assert.deepEqual(S.CreatorClaimProof.required, ['kind']);
  const list =
    S.GetOrganizationsByOrganizationIdPublicationsByPublicationIdHandoverClaimsResponse;
  assert.equal(
    list.properties.items.items.$ref,
    '#/components/schemas/HandoverClaim',
  );
});

test('handover claim issue request has proof, expiry default 30 up to 365, and explicit replace', () => {
  const r = S[REQUEST_NAME];
  assert.deepEqual(r.required, ['proof']);
  assert.equal(r.additionalProperties, false);
  assert.equal(r.properties.expiresInDays.default, 30);
  assert.equal(r.properties.expiresInDays.maximum, 365);
  assert.equal(r.properties.expiresInDays.minimum, 1);
  assert.equal(r.properties.replace.default, false);
  assert.equal(
    r.properties.channelId.$ref,
    '#/components/schemas/YoutubeChannelId',
  );
  assert.deepEqual(
    doc.paths[CLAIMS_PATH].post.requestBody.content['application/json'].schema,
    { $ref: `#/components/schemas/${REQUEST_NAME}` },
  );
});

test('claim read carries proof; a LINK_ONLY claim has no channel and no methods', () => {
  const r = S.GetClaimsByTokenResponse;
  assert.equal(
    r.properties.proof.$ref,
    '#/components/schemas/CreatorClaimProof',
  );
  assert.ok(!r.required.includes('proof'));
  assert.ok(!r.required.includes('channel'));
  assert.equal(r.properties.methods.minItems, 0);
  assert.match(
    doc.paths['/v2/claims/{token}:accept'].post.description,
    /LINK_ONLY/,
  );
  for (const route of [
    '/v2/claims/{token}/google:start',
    '/v2/claims/{token}/description-code',
    '/v2/claims/{token}/description-code:check',
  ]) {
    assert.match(doc.paths[route].post.description, /LINK_ONLY/, route);
  }
});

test('handover claim issue refuses non-single organisations and documents what blocks it', () => {
  const issue = doc.paths[CLAIMS_PATH].post;
  assert.match(issue.description, /not a single-person organisation/);
  assert.match(issue.description, /`CLAIMED` claim never blocks/);
  assert.ok(issue['x-gala-state-guards'].includes('Organization:SINGLE'));
  assert.ok(
    issue['x-gala-reachable-problems'].includes('INVALID_SOURCE_STATE'),
  );
  assert.match(
    doc.paths[CLAIMS_PATH].get.description,
    /issued before 3\.14\.0 may have no `claimUrl`/,
  );
});

test('claim accept answers INVALID_SOURCE_STATE for the issuer and exposes the site ids to them', () => {
  const accept = doc.paths['/v2/claims/{token}:accept'].post;
  assert.deepEqual(accept.responses['409']['x-gala-problem-codes'], [
    'CLAIM_ALREADY_CLAIMED',
    'CLAIM_NOT_VERIFIED',
    'INVALID_SOURCE_STATE',
  ]);
  assert.ok(
    accept.responses['409'].content['application/problem+json'].examples
      .INVALID_SOURCE_STATE,
  );
  assert.match(accept.description, /issued the claim or already owns the site/);
  assert.match(
    S.GetClaimsByTokenResponse.properties.publicationId.description,
    /already owns the site/,
  );
});

const HANDOVER_PATH =
  '/v2/organizations/{organizationId}/publications/{publicationId}/handover';

test('the handover progress read is a session-level view; every write stays recent-authentication', () => {
  const read = doc.paths[HANDOVER_PATH].get;
  assert.equal(read['x-gala-capability-key'], 'publication.handover.view');
  assert.equal(read['x-gala-assurance-class'], 'SESSION');
  assert.equal(read['x-gala-action-grant'], 'none');
  assert.deepEqual(read.security, [{ browserSession: [] }]);
  assert.ok(!read['x-gala-reachable-problems'].includes('REAUTH_REQUIRED'));
  assert.ok(
    read['x-gala-reachable-problems'].includes('AUTHENTICATION_REQUIRED'),
  );
  assert.ok(read['x-gala-reachable-problems'].includes('RESOURCE_NOT_FOUND'));
  assert.deepEqual(read.responses['401']['x-gala-problem-codes'], [
    'AUTHENTICATION_REQUIRED',
  ]);
  assert.doesNotMatch(read.description, /recent authentication/);
  const start = doc.paths[HANDOVER_PATH].post;
  const cancel = doc.paths[`${HANDOVER_PATH}:cancel`].post;
  for (const operation of [start, cancel]) {
    assert.equal(
      operation['x-gala-capability-key'],
      'publication.handover.manage',
    );
    assert.equal(operation['x-gala-assurance-class'], 'RECENT_AUTHENTICATION');
    assert.ok(
      operation['x-gala-reachable-problems'].includes('REAUTH_REQUIRED'),
    );
  }
});

test('the capability catalog lists the handover view as SESSION and the manage capability as RECENT_AUTHENTICATION', async () => {
  const catalog = JSON.parse(
    await readFile(
      new URL('../openapi/http-catalog.json', import.meta.url),
      'utf8',
    ),
  );
  /** @type {Map<string, Set<string>>} */
  const classes = new Map();
  for (const entry of catalog.operations) {
    if (!String(entry.capabilityKey).startsWith('publication.handover.')) {
      continue;
    }
    const set = classes.get(entry.capabilityKey) ?? new Set();
    set.add(entry.assuranceClass);
    classes.set(entry.capabilityKey, set);
  }
  assert.deepEqual(
    [...(classes.get('publication.handover.view') ?? [])],
    ['SESSION'],
  );
  assert.deepEqual(
    [...(classes.get('publication.handover.manage') ?? [])],
    ['RECENT_AUTHENTICATION'],
  );
  const views = catalog.operations.filter(
    (/** @type {{ capabilityKey: string }} */ e) =>
      e.capabilityKey === 'publication.handover.view',
  );
  assert.deepEqual(
    views.map((/** @type {{ operationId: string }} */ e) => e.operationId),
    ['getOrganizationsByOrganizationIdPublicationsByPublicationIdHandover'],
  );
});

test('the claim verify operations state the first-to-complete ownership rule', () => {
  const sentence =
    'The first person to complete acceptance owns the site. Until a claim is `CLAIMED`, anyone who proves the channel may verify it, and a later proof replaces an earlier one.';
  for (const path of [
    '/v2/claims/{token}/description-code',
    '/v2/claims/{token}/description-code:check',
    '/v2/claims/{token}/google:start',
    '/v2/claims/{token}:accept',
  ]) {
    assert.ok(doc.paths[path].post.description.includes(sentence), path);
  }
});
