// Generated from urn:gala:schema:navigation:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type NavigationBcp47 = string;

export type NavigationCanonicalRoute = string;

export type NavigationDigest = string;

export type NavigationExtensionKey = string;

export type NavigationExtensionMap = Readonly<Record<string, unknown>>;

export type NavigationGitObjectId = string;

export type NavigationGlob = string;

export type NavigationIsoCountry = string;

export type NavigationNavigationItem = Readonly<{
  readonly children: ReadonlyArray<NavigationNavigationLeaf>;
  readonly label: NavigationPlainLabel;
  readonly route?: NavigationCanonicalRoute;
  readonly type: 'internal' | 'external';
  readonly url?: NavigationUrlHttps;
}> &
  unknown;

export type NavigationNavigationLeaf = Readonly<{
  readonly children: [];
  readonly label: NavigationPlainLabel;
  readonly route?: NavigationCanonicalRoute;
  readonly type: 'internal' | 'external';
  readonly url?: NavigationUrlHttps;
}> &
  unknown;

export type NavigationPackageExact = string;

export type NavigationPackageRange = string;

export type NavigationPassiveVisualToken = never;

export type NavigationPlainLabel = string;

export type NavigationPlainText = string;

export type NavigationRepoRelativePath = string;

export type NavigationRfc3339 = string;

export type NavigationSemver = string;

export type NavigationSemverRange = string;

export type NavigationSlug = string;

export type NavigationStableId = string;

export type NavigationUrlHttps = string;

export type NavigationUrn = string;

export type NavigationDocument = Readonly<{
  readonly extensions: NavigationExtensionMap;
  readonly footerItems: ReadonlyArray<NavigationNavigationItem>;
  readonly items: ReadonlyArray<NavigationNavigationItem>;
  readonly schemaId: 'urn:gala:schema:navigation:2.0.0';
  readonly schemaVersion: '2.0.0';
}>;
