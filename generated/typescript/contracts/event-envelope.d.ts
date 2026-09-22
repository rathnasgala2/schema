// Generated from urn:gala:schema:event-envelope:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type EventEnvelopeBcp47 = string;

export type EventEnvelopeCanonicalRoute = string;

export type EventEnvelopeDigest = string;

export type EventEnvelopeExtensionKey = string;

export type EventEnvelopeGitObjectId = string;

export type EventEnvelopeGlob = string;

export type EventEnvelopeInt64 = string;

export type EventEnvelopeIsoCountry = string;

export type EventEnvelopePackageExact = string;

export type EventEnvelopePackageRange = string;

export type EventEnvelopePassiveVisualToken = never;

export type EventEnvelopePlainLabel = string;

export type EventEnvelopePlainText = string;

export type EventEnvelopeRegisteredEventPayload = Readonly<{
  readonly commandId: EventEnvelopeStableId;
  readonly evidenceDigest?: EventEnvelopeDigest;
  readonly fromState: EventEnvelopePlainLabel;
  readonly reasonCode?: EventEnvelopePlainLabel;
  readonly toState: EventEnvelopePlainLabel;
  readonly transitionId: EventEnvelopeStableId;
  readonly transitionedAt: EventEnvelopeRfc3339;
}>;

export type EventEnvelopeRepoRelativePath = string;

export type EventEnvelopeRfc3339 = string;

export type EventEnvelopeSemver = string;

export type EventEnvelopeSemverRange = string;

export type EventEnvelopeSlug = string;

export type EventEnvelopeStableId = string;

export type EventEnvelopeUrlHttps = string;

export type EventEnvelopeUrn = string;

export type EventEnvelopeDocument = Readonly<{
  readonly aggregateId: EventEnvelopeStableId;
  readonly aggregateType: EventEnvelopePlainLabel;
  readonly aggregateVersion: EventEnvelopeInt64;
  readonly causationId: EventEnvelopeStableId;
  readonly correlationId: EventEnvelopeStableId;
  readonly eventId: EventEnvelopeStableId;
  readonly eventType: EventEnvelopePlainLabel;
  readonly eventVersion: number;
  readonly occurredAt: EventEnvelopeRfc3339;
  readonly organizationId?: EventEnvelopeStableId;
  readonly payload: EventEnvelopeRegisteredEventPayload;
  readonly payloadSchemaId: EventEnvelopeUrn;
  readonly payloadVersion: number;
  readonly producer: EventEnvelopePlainLabel;
  readonly publicationId?: EventEnvelopeStableId;
  readonly schemaId: 'urn:gala:schema:event-envelope:2.0.0';
  readonly schemaVersion: '2.0.0';
}>;
