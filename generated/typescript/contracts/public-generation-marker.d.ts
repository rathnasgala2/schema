// Generated from urn:gala:schema:public-generation-marker:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type PublicGenerationMarkerBcp47 = string;

export type PublicGenerationMarkerCanonicalRoute = string;

export type PublicGenerationMarkerDigest = string;

export type PublicGenerationMarkerExtensionKey = string;

export type PublicGenerationMarkerGitObjectId = string;

export type PublicGenerationMarkerGlob = string;

export type PublicGenerationMarkerIsoCountry = string;

export type PublicGenerationMarkerPackageExact = string;

export type PublicGenerationMarkerPackageRange = string;

export type PublicGenerationMarkerPassiveVisualToken = never;

export type PublicGenerationMarkerPlainLabel = string;

export type PublicGenerationMarkerPlainText = string;

export type PublicGenerationMarkerRepoRelativePath = string;

export type PublicGenerationMarkerRfc3339 = string;

export type PublicGenerationMarkerSemver = string;

export type PublicGenerationMarkerSemverRange = string;

export type PublicGenerationMarkerSlug = string;

export type PublicGenerationMarkerStableId = string;

export type PublicGenerationMarkerUrlHttps = string;

export type PublicGenerationMarkerUrn = string;

export type PublicGenerationMarkerDocument = Readonly<{
  readonly artifactDigest: PublicGenerationMarkerDigest;
  readonly artifactId: PublicGenerationMarkerStableId;
  readonly generationId: PublicGenerationMarkerStableId;
  readonly schemaId: 'urn:gala:schema:public-generation-marker:2.0.0';
  readonly schemaVersion: '2.0.0';
}>;
