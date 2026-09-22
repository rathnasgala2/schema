// Generated from urn:gala:schema:appearance:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type AppearanceBcp47 = string;

export type AppearanceCanonicalRoute = string;

export type AppearanceColorMode = Readonly<{
  readonly allowed: ReadonlyArray<'light' | 'dark' | 'system'>;
  readonly default: 'light' | 'dark' | 'system';
}> &
  unknown;

export type AppearanceDigest = string;

export type AppearanceExtensionKey = string;

export type AppearanceExtensionMap = Readonly<Record<string, unknown>>;

export type AppearanceGitObjectId = string;

export type AppearanceGlob = string;

export type AppearanceIsoCountry = string;

export type AppearancePackageExact = string;

export type AppearancePackageRange = string;

export type AppearancePassiveVisualToken = never;

export type AppearancePlainLabel = string;

export type AppearancePlainText = string;

export type AppearanceRepoRelativePath = string;

export type AppearanceRfc3339 = string;

export type AppearanceSemanticTokens = Readonly<Record<string, never>>;

export type AppearanceSemver = string;

export type AppearanceSemverRange = string;

export type AppearanceSlug = string;

export type AppearanceStableId = string;

export type AppearanceUrlHttps = string;

export type AppearanceUrn = string;

export type AppearanceDocument = Readonly<{
  readonly brandMark?: AppearanceRepoRelativePath;
  readonly colorMode: AppearanceColorMode;
  readonly extensions: AppearanceExtensionMap;
  readonly fontAssetRefs: ReadonlyArray<AppearanceRepoRelativePath>;
  readonly footerComposition: 'profile' | 'compact' | 'minimal';
  readonly headerComposition: 'mark-and-name' | 'name-only' | 'mark-only';
  readonly schemaId: 'urn:gala:schema:appearance:2.0.0';
  readonly schemaVersion: '2.0.0';
  readonly theme: AppearancePackageRange;
  readonly tokens: AppearanceSemanticTokens;
  readonly typeScale: 'compact' | 'standard' | 'spacious';
  readonly wordmark?: AppearanceRepoRelativePath;
}>;
