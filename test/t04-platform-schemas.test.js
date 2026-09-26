import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';

import { Ajv2020 } from 'ajv/dist/2020.js';
import formatsPlugin from 'ajv-formats';

import {
  digestPublicRuntimeOrigins,
  projectPublicRuntimeOrigins,
  validatePublicRuntimeOrigins,
} from '../scripts/internal-semantics/public-runtime-origins.js';

const STABLE_ID = '019c0000-0000-7000-8000-000000000001';
const OTHER_STABLE_ID = '019c0000-0000-7000-8000-000000000002';
const DIGEST = `sha256:${'01'.repeat(32)}`;
const OTHER_DIGEST = `sha256:${'02'.repeat(32)}`;
const RUNTIME_BINDING_FIELDS = [
  'environment',
  'generation',
  'appOrigin',
  'apiOrigin',
  'schemaDocsOrigin',
  'publicRecoveryBase',
  'transactionalLinkBase',
  'sourceCatalogGeneration',
  'sourceCatalogDigest',
  'appArtifactDigest',
];

const ROOT_LEDGERS = {
  problem: {
    required: [
      'type',
      'title',
      'status',
      'code',
      'detail',
      'correlationId',
      'retryable',
      'errors',
    ],
    optional: ['instance', 'operationId'],
  },
  'event-envelope': {
    required: [
      'eventId',
      'eventType',
      'eventVersion',
      'occurredAt',
      'producer',
      'aggregateType',
      'aggregateId',
      'aggregateVersion',
      'correlationId',
      'causationId',
      'payloadSchemaId',
      'payloadVersion',
      'payload',
    ],
    optional: ['organizationId', 'publicationId'],
  },
  'public-runtime-origins': {
    required: [
      'environment',
      'generation',
      'appOrigin',
      'apiOrigin',
      'schemaDocsOrigin',
      'publicRecoveryBase',
      'transactionalLinkBase',
      'sourceCatalogGeneration',
      'sourceCatalogDigest',
      'appArtifactDigest',
      'issuedAt',
      'expiresAt',
      'payloadDigest',
    ],
    optional: [],
  },
};

/**
 * Read one committed root schema.
 *
 * @param {string} contract schema file stem
 * @returns {Promise<any>} parsed schema
 */
async function readSchema(contract) {
  return JSON.parse(await readFile(`schemas/${contract}.schema.json`, 'utf8'));
}

/**
 * Create one runtime-origins record before its self-excluding digest is set.
 *
 * @returns {Record<string, unknown>} fixture record
 */
function runtimeOrigins() {
  const value = {
    schemaId: 'urn:gala:schema:public-runtime-origins:2.0.0',
    schemaVersion: '2.0.0',
    environment: 'production',
    generation: STABLE_ID,
    appOrigin: 'https://app.galascribe.example',
    apiOrigin: 'https://api.galascribe.example',
    schemaDocsOrigin: 'https://schemas.galascribe.example',
    publicRecoveryBase: 'https://recover.galascribe.example/account/recover',
    transactionalLinkBase: 'https://links.galascribe.example/t',
    sourceCatalogGeneration: OTHER_STABLE_ID,
    sourceCatalogDigest: DIGEST,
    appArtifactDigest: OTHER_DIGEST,
    issuedAt: '2026-09-13T12:00:00.000Z',
    expiresAt: '2026-09-13T12:05:00.000Z',
    payloadDigest: '',
  };
  value.payloadDigest = digestPublicRuntimeOrigins(value);
  return value;
}

test('the three platform roots have exact immutable identities and ledgers', async () => {
  for (const [contract, ledger] of Object.entries(ROOT_LEDGERS)) {
    const schema = await readSchema(contract);
    const rootProperties = Object.keys(schema.properties).sort();
    const expectedProperties = [
      'schemaId',
      'schemaVersion',
      ...ledger.required,
      ...ledger.optional,
    ].sort();
    assert.equal(
      schema.$schema,
      'https://json-schema.org/draft/2020-12/schema',
    );
    assert.equal(schema.$id, `urn:gala:schema:${contract}:2.0.0`);
    assert.equal(schema.additionalProperties, false);
    assert.deepEqual(rootProperties, expectedProperties);
    assert.deepEqual(
      [...schema.required].sort(),
      ['schemaId', 'schemaVersion', ...ledger.required].sort(),
    );
    assert.deepEqual(schema.properties.schemaId, { const: schema.$id });
    assert.deepEqual(schema.properties.schemaVersion, { const: '2.0.0' });
  }
});

test('problem type is the exact DEC-100 disjoint HTTPS or Gala URN union', async () => {
  const schema = await readSchema('problem');
  assert.deepEqual(schema.properties.type, { $ref: '#/$defs/problemType' });
  assert.deepEqual(schema.$defs.problemType.oneOf, [
    { $ref: '#/$defs/problemHttpsType' },
    { $ref: '#/$defs/problemUrn' },
  ]);
  assert.deepEqual(schema.$defs.problemHttpsType.allOf, [
    { $ref: '#/$defs/urlHttps' },
  ]);
  assert.equal(schema.$defs.problemHttpsType.pattern, '^https://[^#]+$');
  assert.equal(
    schema.$defs.problemUrn.pattern,
    '^urn:gala:problem:[a-z0-9]+(?:-[a-z0-9]+)*$',
  );
  assert.equal(schema.$defs.problemUrn.format, 'uri');
  assert.equal(
    schema.$defs.problemCode.pattern,
    '^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$',
  );
  assert.deepEqual(schema.$defs.fieldError.required.sort(), [
    'code',
    'pointer',
  ]);
  assert.equal(schema.$defs.fieldError.additionalProperties, false);
});

test('DEC-100 problem-type fixtures execute both alternatives and every exclusion', async () => {
  const schema = await readSchema('problem');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  /** @type {import('ajv-formats').default} */ (
    /** @type {unknown} */ (formatsPlugin)
  )(ajv);
  const customFormats = new Set(
    Object.values(schema.$defs)
      .map((/** @type {any} */ definition) => definition?.format)
      .filter(
        (format) => typeof format === 'string' && format.startsWith('gala-'),
      ),
  );
  for (const format of customFormats) ajv.addFormat(format, true);
  const validate = ajv.compile(schema);
  for (const file of [
    'examples/valid/problem/type-https.json',
    'examples/valid/problem/type-gala-urn.json',
  ]) {
    const instance = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(
      validate(instance),
      true,
      `${file}: ${ajv.errorsText(validate.errors)}`,
    );
  }
  const rejected = JSON.parse(
    await readFile(
      'fixtures/invalid/problem/SCHEMA_UNION_INVALID/dec-100-cases.json',
      'utf8',
    ),
  );
  assert.deepEqual(
    rejected.map((/** @type {any} */ fixture) => fixture.caseId),
    [
      'problem-type-relative',
      'problem-type-other-scheme',
      'problem-type-other-gala-namespace',
      'problem-type-uppercase-urn-name',
      'problem-type-empty-urn-name',
      'problem-type-credentials',
      'problem-type-fragment',
      'problem-type-query-only',
    ],
  );
  for (const fixture of rejected) {
    assert.equal(validate(fixture.instance), false, fixture.caseId);
    assert.deepEqual(fixture.expectedCodes, ['SCHEMA_UNION_INVALID']);
  }
});

test('event transition payload keeps aggregate version only in the envelope', async () => {
  const schema = await readSchema('event-envelope');
  assert.deepEqual(schema.properties.aggregateVersion, {
    $ref: '#/$defs/int64',
  });
  assert.deepEqual(schema.properties.payload, {
    $ref: '#/$defs/registeredEventPayload',
  });
  assert.deepEqual(
    Object.keys(schema.$defs.registeredEventPayload.properties).sort(),
    [
      'commandId',
      'evidenceDigest',
      'fromState',
      'reasonCode',
      'toState',
      'transitionId',
      'transitionedAt',
    ],
  );
  assert.deepEqual(schema.$defs.registeredEventPayload.required.sort(), [
    'commandId',
    'fromState',
    'toState',
    'transitionId',
    'transitionedAt',
  ]);
  assert.equal(schema.$defs.registeredEventPayload.additionalProperties, false);
});

test('all twenty schemas embed the identical twenty-scalar library', async () => {
  const names = (await readdir('schemas')).filter((name) =>
    name.endsWith('.json'),
  );
  assert.equal(names.length, 20);
  const expected = await readSchema('repository');
  const scalarNames = Object.keys(expected.$defs).slice(0, 20);
  assert.equal(scalarNames.length, 20);
  for (const name of names) {
    const schema = await readSchema(name.replace(/\.schema\.json$/u, ''));
    assert.deepEqual(
      Object.fromEntries(
        scalarNames.map((scalarName) => [scalarName, schema.$defs[scalarName]]),
      ),
      Object.fromEntries(
        scalarNames.map((scalarName) => [
          scalarName,
          expected.$defs[scalarName],
        ]),
      ),
    );
  }
});

test('public runtime origins have a byte-exact self-excluding digest vector', () => {
  const value = runtimeOrigins();
  const projection = projectPublicRuntimeOrigins(value);
  assert.equal(Object.hasOwn(projection, 'payloadDigest'), false);
  const expectedJcs =
    '{"apiOrigin":"https://api.galascribe.example","appArtifactDigest":"sha256:0202020202020202020202020202020202020202020202020202020202020202","appOrigin":"https://app.galascribe.example","environment":"production","expiresAt":"2026-09-13T12:05:00.000Z","generation":"019c0000-0000-7000-8000-000000000001","issuedAt":"2026-09-13T12:00:00.000Z","publicRecoveryBase":"https://recover.galascribe.example/account/recover","schemaDocsOrigin":"https://schemas.galascribe.example","schemaId":"urn:gala:schema:public-runtime-origins:2.0.0","schemaVersion":"2.0.0","sourceCatalogDigest":"sha256:0101010101010101010101010101010101010101010101010101010101010101","sourceCatalogGeneration":"019c0000-0000-7000-8000-000000000002","transactionalLinkBase":"https://links.galascribe.example/t"}';
  const expectedDigest = `sha256:${createHash('sha256')
    .update('GALA-PUBLIC-RUNTIME-ORIGINS-V2\0', 'utf8')
    .update(expectedJcs, 'utf8')
    .digest('base64url')}`;
  assert.equal(
    JSON.stringify(projection, Object.keys(projection).sort()),
    expectedJcs,
  );
  assert.equal(value.payloadDigest, expectedDigest);
});

test('runtime origins enforce validity, freshness and exact App binding', () => {
  const value = runtimeOrigins();
  const binding = /** @type {Record<string, unknown>} */ ({
    ...Object.fromEntries(
      RUNTIME_BINDING_FIELDS.map((field) => [field, value[field]]),
    ),
    documentOrigin: value.appOrigin,
    observedAt: '2026-09-13T12:04:59.999Z',
  });
  assert.doesNotThrow(() => validatePublicRuntimeOrigins(value, binding));

  /** @type {Record<string, unknown>} */
  const tooLong = { ...value, expiresAt: '2026-09-13T12:05:00.001Z' };
  tooLong.payloadDigest = digestPublicRuntimeOrigins(tooLong);
  assert.throws(
    () => validatePublicRuntimeOrigins(tooLong, binding),
    /PUBLIC_RUNTIME_ORIGINS_TIME_INVALID/u,
  );

  /** @type {Record<string, unknown>} */
  const emptyWindow = { ...value, expiresAt: value.issuedAt };
  emptyWindow.payloadDigest = digestPublicRuntimeOrigins(emptyWindow);
  assert.throws(
    () => validatePublicRuntimeOrigins(emptyWindow, binding),
    /PUBLIC_RUNTIME_ORIGINS_TIME_INVALID/u,
  );
  assert.throws(
    () =>
      validatePublicRuntimeOrigins(value, {
        ...binding,
        observedAt: value.expiresAt,
      }),
    /PUBLIC_RUNTIME_ORIGINS_EXPIRED/u,
  );
  assert.throws(
    () =>
      validatePublicRuntimeOrigins(value, {
        ...binding,
        observedAt: '2026-09-13T11:59:59.999Z',
      }),
    /PUBLIC_RUNTIME_ORIGINS_TIME_INVALID/u,
  );
  for (const field of RUNTIME_BINDING_FIELDS) {
    assert.throws(
      () =>
        validatePublicRuntimeOrigins(value, {
          ...binding,
          [field]: `${String(binding[field])}-other`,
        }),
      /PUBLIC_RUNTIME_ORIGINS_BINDING_INVALID/u,
      field,
    );
  }
  assert.throws(
    () =>
      validatePublicRuntimeOrigins(value, {
        ...binding,
        documentOrigin: 'https://other-app.galascribe.example',
      }),
    /PUBLIC_RUNTIME_ORIGINS_APP_ORIGIN_INVALID/u,
  );
  assert.throws(
    () =>
      validatePublicRuntimeOrigins(value, {
        ...binding,
        unexpected: true,
      }),
    /PUBLIC_RUNTIME_ORIGINS_BINDING_INVALID/u,
  );
  const missingBinding = /** @type {Record<string, unknown>} */ ({
    ...binding,
  });
  delete missingBinding.sourceCatalogDigest;
  assert.throws(
    () => validatePublicRuntimeOrigins(value, missingBinding),
    /PUBLIC_RUNTIME_ORIGINS_BINDING_INVALID/u,
  );
  assert.throws(
    () =>
      validatePublicRuntimeOrigins(
        { ...value, payloadDigest: DIGEST },
        binding,
      ),
    /PUBLIC_RUNTIME_ORIGINS_DIGEST_INVALID/u,
  );
});

test('runtime origin schema closes URL shapes and digest representation', async () => {
  const schema = await readSchema('public-runtime-origins');
  assert.equal(schema.properties.appOrigin.$ref, '#/$defs/serviceOrigin');
  assert.equal(schema.properties.apiOrigin.$ref, '#/$defs/serviceOrigin');
  assert.equal(
    schema.properties.schemaDocsOrigin.$ref,
    '#/$defs/serviceOrigin',
  );
  assert.equal(schema.$defs.serviceOrigin.pattern, '^https://[^/?#]+$');
  assert.equal(
    schema.$defs.publicRecoveryBase.pattern,
    '^https://[^/?#]+/account/recover$',
  );
  assert.equal(
    schema.$defs.transactionalLinkBase.pattern,
    '^https://[^/?#]+/t$',
  );
  assert.equal(
    schema.$defs.runtimePayloadDigest.pattern,
    '^sha256:[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$',
  );
  assert.equal(
    schema.properties.payloadDigest.$ref,
    '#/$defs/runtimePayloadDigest',
  );
  assert.equal(
    /^sha256:[A-Za-z0-9_-]{43}$/u.test(String(runtimeOrigins().payloadDigest)),
    true,
  );

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  /** @type {import('ajv-formats').default} */ (
    /** @type {unknown} */ (formatsPlugin)
  )(ajv);
  for (const definition of Object.values(schema.$defs)) {
    if (
      typeof definition.format === 'string' &&
      definition.format.startsWith('gala-')
    ) {
      ajv.addFormat(definition.format, true);
    }
  }
  const validate = ajv.compile(schema);
  const valid = runtimeOrigins();
  assert.equal(validate(valid), true, ajv.errorsText(validate.errors));

  const invalidUrls = /** @type {Array<[string, string]>} */ ([
    ['appOrigin', 'https://user@example.com'],
    ['apiOrigin', 'https://api.galascribe.example/path'],
    ['schemaDocsOrigin', 'https://schemas.galascribe.example?query=1'],
    ['appOrigin', 'https://app.galascribe.example#fragment'],
    ['publicRecoveryBase', 'https://recover.galascribe.example/account/reset'],
    ['transactionalLinkBase', 'https://links.galascribe.example/other'],
  ]);
  for (const [field, value] of invalidUrls) {
    assert.equal(validate({ ...valid, [field]: value }), false, field);
  }
  assert.equal(
    validate({ ...valid, payloadDigest: `${valid.payloadDigest}=` }),
    false,
    'padded digest',
  );
  assert.equal(
    validate({
      ...valid,
      payloadDigest: `${String(valid.payloadDigest).slice(0, -1)}B`,
    }),
    false,
    'noncanonical base64url tail',
  );
});
