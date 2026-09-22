// Generated from urn:gala:schema:content-frontmatter:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type ContentFrontmatterBcp47 = string;

export type ContentFrontmatterCanonicalRoute = string;

export type ContentFrontmatterDigest = string;

export type ContentFrontmatterExtensionKey = string;

export type ContentFrontmatterExtensionMap = Readonly<Record<string, unknown>>;

export type ContentFrontmatterGitObjectId = string;

export type ContentFrontmatterGlob = string;

export type ContentFrontmatterIsoCountry = string;

export type ContentFrontmatterMediaRef = Readonly<{
  readonly alt: string;
  readonly path: ContentFrontmatterRepoRelativePath;
  readonly role: 'informative' | 'decorative';
}> &
  unknown;

export type ContentFrontmatterPackageExact = string;

export type ContentFrontmatterPackageRange = string;

export type ContentFrontmatterPassiveVisualToken = never;

export type ContentFrontmatterPlainLabel = string;

export type ContentFrontmatterPlainText = string;

export type ContentFrontmatterRepoRelativePath = string;

export type ContentFrontmatterRfc3339 = string;

export type ContentFrontmatterSemver = string;

export type ContentFrontmatterSemverRange = string;

export type ContentFrontmatterSlug = string;

export type ContentFrontmatterStableId = string;

export type ContentFrontmatterUrlHttps = string;

export type ContentFrontmatterUrn = string;

export type ContentFrontmatterDocument = Readonly<{
  readonly authors: ReadonlyArray<ContentFrontmatterStableId>;
  readonly createdAt: ContentFrontmatterRfc3339;
  readonly description?: ContentFrontmatterPlainText;
  readonly extensions: ContentFrontmatterExtensionMap;
  readonly hero?: ContentFrontmatterMediaRef;
  readonly id: ContentFrontmatterStableId;
  readonly kind: 'article' | 'page';
  readonly language: ContentFrontmatterBcp47;
  readonly newsletter?: 'ineligible' | 'eligible';
  readonly publishedAt?: ContentFrontmatterRfc3339;
  readonly redirects: ReadonlyArray<ContentFrontmatterCanonicalRoute>;
  readonly route?: ContentFrontmatterCanonicalRoute;
  readonly schemaId: 'urn:gala:schema:content-frontmatter:2.0.0';
  readonly schemaVersion: '2.0.0';
  readonly series?: ContentFrontmatterPlainLabel;
  readonly seriesOrder?: number;
  readonly slug: ContentFrontmatterSlug;
  readonly socialImageRef?: ContentFrontmatterRepoRelativePath;
  readonly status: 'draft' | 'published' | 'unlisted' | 'archived';
  readonly tags: ReadonlyArray<ContentFrontmatterPlainLabel>;
  readonly title: ContentFrontmatterPlainText;
  readonly updatedAt?: ContentFrontmatterRfc3339;
}> &
  unknown;
