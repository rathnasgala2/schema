/**
 * Create the three S0-T04 platform schemas.
 *
 * @param {object} language schema construction language
 * @param {Function} language.rootSchema root-schema constructor
 * @param {Function} language.ref local-definition reference constructor
 * @param {Function} language.arrayOf bounded-array constructor
 * @param {Function} language.closedObject closed-object constructor
 * @param {Function} language.graphemeBound grapheme-bound constructor
 * @returns {Record<string, Record<string, unknown>>} schemas by output filename
 */
export function createPlatformSchemas(language) {
  const { rootSchema, ref, arrayOf, closedObject, graphemeBound } = language;

  const int64 = {
    type: 'string',
    pattern: '^(?:0|-?[1-9][0-9]*)$',
    format: 'gala-int64',
    description:
      'Canonical signed 64-bit decimal string; range is checked by the semantic validator.',
  };

  const problemUrn = {
    type: 'string',
    format: 'uri',
    pattern: '^urn:gala:problem:[a-z0-9]+(?:-[a-z0-9]+)*$',
  };

  const problemHttpsType = {
    allOf: [ref('urlHttps')],
    type: 'string',
    pattern: '^https://[^#]+$',
  };

  const problemCode = {
    allOf: [ref('plainLabel')],
    type: 'string',
    pattern: '^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$',
  };

  const serviceOrigin = {
    allOf: [ref('urlHttps')],
    type: 'string',
    pattern: '^https://[^/?#]+$',
    description:
      'Absolute credential-free HTTPS origin with no path, query or fragment.',
  };

  const publicRecoveryBase = {
    allOf: [ref('urlHttps')],
    type: 'string',
    pattern: '^https://[^/?#]+/account/recover$',
  };

  const transactionalLinkBase = {
    allOf: [ref('urlHttps')],
    type: 'string',
    pattern: '^https://[^/?#]+/t$',
  };

  const runtimePayloadDigest = {
    type: 'string',
    pattern: '^sha256:[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$',
    description:
      'Tagged SHA-256 encoded as the canonical 43-character base64url representation without padding.',
  };

  const fieldError = closedObject(
    {
      pointer: { type: 'string', minLength: 1, maxLength: 1024 },
      code: ref('problemCode'),
    },
    ['pointer', 'code'],
  );

  const registeredEventPayload = closedObject(
    {
      transitionId: ref('stableId'),
      commandId: ref('stableId'),
      fromState: ref('plainLabel'),
      toState: ref('plainLabel'),
      transitionedAt: ref('rfc3339'),
      reasonCode: ref('plainLabel'),
      evidenceDigest: ref('digest'),
    },
    ['transitionId', 'commandId', 'fromState', 'toState', 'transitionedAt'],
    {
      $comment:
        'DEC-101 keeps aggregate identity, type and version exclusively in the envelope. S0-T08 binds this closed transition shape to each registered MVP action.',
    },
  );

  return {
    'problem.schema.json': rootSchema(
      'problem',
      {
        type: ref('problemType'),
        title: graphemeBound(ref('plainText'), 1, 120),
        status: { type: 'integer', minimum: 400, maximum: 599 },
        code: ref('problemCode'),
        detail: graphemeBound(ref('plainText'), 0, 500),
        instance: ref('canonicalRoute'),
        correlationId: ref('stableId'),
        operationId: ref('stableId'),
        retryable: { type: 'boolean' },
        errors: arrayOf(ref('fieldError'), 0, 100),
      },
      [
        'type',
        'title',
        'status',
        'code',
        'detail',
        'correlationId',
        'retryable',
        'errors',
      ],
      {
        problemType: {
          oneOf: [ref('problemHttpsType'), ref('problemUrn')],
        },
        problemHttpsType,
        problemUrn,
        problemCode,
        fieldError,
      },
    ),
    'event-envelope.schema.json': rootSchema(
      'event-envelope',
      {
        eventId: ref('stableId'),
        eventType: ref('plainLabel'),
        eventVersion: {
          type: 'integer',
          minimum: 1,
          maximum: 2_147_483_647,
        },
        occurredAt: ref('rfc3339'),
        producer: ref('plainLabel'),
        aggregateType: ref('plainLabel'),
        aggregateId: ref('stableId'),
        aggregateVersion: ref('int64'),
        organizationId: ref('stableId'),
        publicationId: ref('stableId'),
        correlationId: ref('stableId'),
        causationId: ref('stableId'),
        payloadSchemaId: ref('urn'),
        payloadVersion: {
          type: 'integer',
          minimum: 1,
          maximum: 2_147_483_647,
        },
        payload: ref('registeredEventPayload'),
      },
      [
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
      { int64, registeredEventPayload },
      {
        $comment:
          'S0-T08 enforces action registration, payload-schema identity, version and organization/publication scope requiredness.',
      },
    ),
    'public-runtime-origins.schema.json': rootSchema(
      'public-runtime-origins',
      {
        environment: ref('plainLabel'),
        generation: ref('stableId'),
        appOrigin: ref('serviceOrigin'),
        apiOrigin: ref('serviceOrigin'),
        schemaDocsOrigin: ref('serviceOrigin'),
        publicRecoveryBase: ref('publicRecoveryBase'),
        transactionalLinkBase: ref('transactionalLinkBase'),
        sourceCatalogGeneration: ref('stableId'),
        sourceCatalogDigest: ref('digest'),
        appArtifactDigest: ref('digest'),
        issuedAt: ref('rfc3339'),
        expiresAt: ref('rfc3339'),
        payloadDigest: ref('runtimePayloadDigest'),
      },
      [
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
      {
        serviceOrigin,
        publicRecoveryBase,
        transactionalLinkBase,
        runtimePayloadDigest,
      },
      {
        $comment:
          'The semantic validator enforces a positive validity window of at most 300 seconds, the self-excluding payload digest and exact App artifact/environment/generation binding on every use.',
      },
    ),
  };
}
