// Generated from urn:gala:schema:repository:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type RepositoryAssetRoot = Readonly<{
  readonly path: RepositoryRepoRelativePath;
}>;

export type RepositoryBcp47 = string;

export type RepositoryCanonicalRoute = string;

export type RepositoryContentRoot = Readonly<{
  readonly exclude: ReadonlyArray<RepositoryGlob>;
  readonly include: ReadonlyArray<RepositoryGlob>;
  readonly kind: 'article' | 'page';
  readonly path: RepositoryRepoRelativePath;
}>;

export type RepositoryDigest = string;

export type RepositoryExtensionKey = string;

export type RepositoryExtensionMap = Readonly<Record<string, unknown>>;

export type RepositoryGeneratedRoot = Readonly<{
  readonly kind: 'prism-edition';
  readonly owner: 'prism';
  readonly path: RepositoryRepoRelativePath;
}>;

export type RepositoryGitObjectId = string;

export type RepositoryGlob = string;

export type RepositoryIsoCountry = string;

export type RepositoryPackageExact = string;

export type RepositoryPackageRange = string;

export type RepositoryPassiveVisualToken = never;

export type RepositoryPlainLabel = string;

export type RepositoryPlainText = string;

export type RepositoryRepoRelativePath = string;

export type RepositoryRfc3339 = string;

export type RepositorySemver = string;

export type RepositorySemverRange = string;

export type RepositorySlug = string;

export type RepositoryStableId = string;

export type RepositoryUrlHttps = string;

export type RepositoryUrn = string;

export type RepositoryDocument = Readonly<{
  readonly appearance?: RepositoryRepoRelativePath;
  readonly assetRoots: ReadonlyArray<RepositoryAssetRoot>;
  readonly contentRoots: ReadonlyArray<RepositoryContentRoot>;
  readonly defaultLanguage: RepositoryBcp47;
  readonly extensions: RepositoryExtensionMap;
  readonly generatedSourceRoots: ReadonlyArray<RepositoryGeneratedRoot>;
  readonly minimumToolVersion: RepositorySemverRange;
  readonly modules: RepositoryRepoRelativePath;
  readonly navigation?: RepositoryRepoRelativePath;
  readonly publication: RepositoryRepoRelativePath;
  readonly publicationId: RepositoryStableId;
  readonly routeNormalizationProfile: 'directory-index' | 'explicit-file';
  readonly schemaId: 'urn:gala:schema:repository:2.0.0';
  readonly schemaVersion: '2.0.0';
}>;
