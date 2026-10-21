// Generated from urn:gala:schema:analytics-config:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type AnalyticsConfigBcp47 = string;

export type AnalyticsConfigCanonicalRoute = string;

export type AnalyticsConfigDigest = string;

export type AnalyticsConfigExtensionKey = string;

export type AnalyticsConfigGitObjectId = string;

export type AnalyticsConfigGlob = string;

export type AnalyticsConfigIsoCountry = string;

export type AnalyticsConfigPackageExact = string;

export type AnalyticsConfigPackageRange = string;

export type AnalyticsConfigPassiveVisualToken = never;

export type AnalyticsConfigPlainLabel = string;

export type AnalyticsConfigPlainText = string;

export type AnalyticsConfigRepoRelativePath = string;

export type AnalyticsConfigRfc3339 = string;

export type AnalyticsConfigSemver = string;

export type AnalyticsConfigSemverRange = string;

export type AnalyticsConfigSlug = string;

export type AnalyticsConfigStableId = string;

export type AnalyticsConfigUrlHttps = string;

export type AnalyticsConfigUrn = string;

export type AnalyticsConfigDocument = Readonly<{
  readonly consent: Readonly<{
    readonly policy: 'opt-in';
  }>;
  readonly provider: Readonly<{
    readonly kind: 'google-analytics-4';
    readonly measurementId: string;
  }>;
  readonly schemaId: 'urn:gala:schema:analytics-config:2.0.0';
  readonly schemaVersion: '2.0.0';
}>;
