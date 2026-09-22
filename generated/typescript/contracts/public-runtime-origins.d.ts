// Generated from urn:gala:schema:public-runtime-origins:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type PublicRuntimeOriginsBcp47 = string;

export type PublicRuntimeOriginsCanonicalRoute = string;

export type PublicRuntimeOriginsDigest = string;

export type PublicRuntimeOriginsExtensionKey = string;

export type PublicRuntimeOriginsGitObjectId = string;

export type PublicRuntimeOriginsGlob = string;

export type PublicRuntimeOriginsIsoCountry = string;

export type PublicRuntimeOriginsPackageExact = string;

export type PublicRuntimeOriginsPackageRange = string;

export type PublicRuntimeOriginsPassiveVisualToken = never;

export type PublicRuntimeOriginsPlainLabel = string;

export type PublicRuntimeOriginsPlainText = string;

export type PublicRuntimeOriginsPublicRecoveryBase =
  PublicRuntimeOriginsUrlHttps & string;

export type PublicRuntimeOriginsRepoRelativePath = string;

export type PublicRuntimeOriginsRfc3339 = string;

export type PublicRuntimeOriginsRuntimePayloadDigest = string;

export type PublicRuntimeOriginsSemver = string;

export type PublicRuntimeOriginsSemverRange = string;

export type PublicRuntimeOriginsServiceOrigin = PublicRuntimeOriginsUrlHttps &
  string;

export type PublicRuntimeOriginsSlug = string;

export type PublicRuntimeOriginsStableId = string;

export type PublicRuntimeOriginsTransactionalLinkBase =
  PublicRuntimeOriginsUrlHttps & string;

export type PublicRuntimeOriginsUrlHttps = string;

export type PublicRuntimeOriginsUrn = string;

export type PublicRuntimeOriginsDocument = Readonly<{
  readonly apiOrigin: PublicRuntimeOriginsServiceOrigin;
  readonly appArtifactDigest: PublicRuntimeOriginsDigest;
  readonly appOrigin: PublicRuntimeOriginsServiceOrigin;
  readonly environment: PublicRuntimeOriginsPlainLabel;
  readonly expiresAt: PublicRuntimeOriginsRfc3339;
  readonly generation: PublicRuntimeOriginsStableId;
  readonly issuedAt: PublicRuntimeOriginsRfc3339;
  readonly payloadDigest: PublicRuntimeOriginsRuntimePayloadDigest;
  readonly publicRecoveryBase: PublicRuntimeOriginsPublicRecoveryBase;
  readonly schemaDocsOrigin: PublicRuntimeOriginsServiceOrigin;
  readonly schemaId: 'urn:gala:schema:public-runtime-origins:2.0.0';
  readonly schemaVersion: '2.0.0';
  readonly sourceCatalogDigest: PublicRuntimeOriginsDigest;
  readonly sourceCatalogGeneration: PublicRuntimeOriginsStableId;
  readonly transactionalLinkBase: PublicRuntimeOriginsTransactionalLinkBase;
}>;
