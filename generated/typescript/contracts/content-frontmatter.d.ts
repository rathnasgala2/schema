// Generated from urn:gala:schema:content-frontmatter:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type ContentFrontmatterBcp47 = string;

export type ContentFrontmatterCanonicalRoute = string;

export type ContentFrontmatterContentAction =
  | ContentFrontmatterPostActionFollow
  | ContentFrontmatterPostActionLink
  | ContentFrontmatterPostActionNewsletter
  | ContentFrontmatterPostActionNone;

export type ContentFrontmatterContentEdition = Readonly<{
  readonly approvedAt: ContentFrontmatterRfc3339;
  readonly generation: Readonly<{
    readonly generationId: ContentFrontmatterStableId;
    readonly model: ContentFrontmatterPlainLabel;
    readonly provider: 'anthropic';
  }>;
  readonly kind: 'QUICK_READ' | 'STANDARD' | 'DEEP_DIVE';
  readonly of: ContentFrontmatterSlug;
  readonly sourceDigest: ContentFrontmatterDigest;
}>;

export type ContentFrontmatterContentFaq = ReadonlyArray<
  Readonly<{
    readonly answer: ContentFrontmatterPlainText;
    readonly question: ContentFrontmatterPlainText;
  }>
>;

export type ContentFrontmatterContentListen = Readonly<{
  readonly audio: ContentFrontmatterRepoRelativePath;
  readonly durationSeconds: number;
  readonly format: 'conversation' | 'narration' | 'debate' | 'skit';
}>;

export type ContentFrontmatterContentSeo = Readonly<{
  readonly canonicalUrl?: ContentFrontmatterUrlHttps;
  readonly description?: ContentFrontmatterPlainText;
  readonly noindex?: boolean;
  readonly title?: ContentFrontmatterPlainText;
}>;

export type ContentFrontmatterDeleteDate = string;

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

export type ContentFrontmatterPostAction =
  | ContentFrontmatterPostActionFollow
  | ContentFrontmatterPostActionLink
  | ContentFrontmatterPostActionNewsletter;

export type ContentFrontmatterPostActionFollow = Readonly<{
  readonly heading?: ContentFrontmatterPlainLabel;
  readonly kind: 'follow';
  readonly text?: ContentFrontmatterPlainText;
}>;

export type ContentFrontmatterPostActionLink = Readonly<{
  readonly heading?: ContentFrontmatterPlainLabel;
  readonly kind: 'link';
  readonly label: ContentFrontmatterPlainLabel;
  readonly text?: ContentFrontmatterPlainText;
  readonly url: ContentFrontmatterPostActionUrl;
}>;

export type ContentFrontmatterPostActionNewsletter = Readonly<{
  readonly heading?: ContentFrontmatterPlainLabel;
  readonly kind: 'newsletter';
  readonly text?: ContentFrontmatterPlainText;
}>;

export type ContentFrontmatterPostActionNone = Readonly<{
  readonly kind: 'none';
}>;

export type ContentFrontmatterPostActionUrl = string;

export type ContentFrontmatterPublishAfterDate = string;

export type ContentFrontmatterRepoRelativePath = string;

export type ContentFrontmatterRfc3339 = string;

export type ContentFrontmatterSemver = string;

export type ContentFrontmatterSemverRange = string;

export type ContentFrontmatterSlug = string;

export type ContentFrontmatterStableId = string;

export type ContentFrontmatterUrlHttps = string;

export type ContentFrontmatterUrn = string;

export type ContentFrontmatterDocument = Readonly<{
  readonly action?: ContentFrontmatterContentAction;
  readonly authors: ReadonlyArray<ContentFrontmatterStableId>;
  readonly createdAt: ContentFrontmatterRfc3339;
  readonly deleteDate?: ContentFrontmatterDeleteDate;
  readonly description?: ContentFrontmatterPlainText;
  readonly edition?: ContentFrontmatterContentEdition;
  readonly extensions: ContentFrontmatterExtensionMap;
  readonly faq?: ContentFrontmatterContentFaq;
  readonly hero?: ContentFrontmatterMediaRef;
  readonly id: ContentFrontmatterStableId;
  readonly kind: 'article' | 'page' | 'edition';
  readonly language: ContentFrontmatterBcp47;
  readonly listen?: ContentFrontmatterContentListen;
  readonly newsletter?: 'ineligible' | 'eligible';
  readonly newsletterSubjectB?: ContentFrontmatterPlainText;
  readonly newsletterTag?: string;
  readonly publishAfter?: ContentFrontmatterPublishAfterDate;
  readonly publishedAt?: ContentFrontmatterRfc3339;
  readonly redirects: ReadonlyArray<ContentFrontmatterCanonicalRoute>;
  readonly route?: ContentFrontmatterCanonicalRoute;
  readonly schemaId: 'urn:gala:schema:content-frontmatter:2.0.0';
  readonly schemaVersion: '2.0.0';
  readonly seo?: ContentFrontmatterContentSeo;
  readonly series?: ContentFrontmatterPlainLabel;
  readonly seriesOrder?: number;
  readonly slug: ContentFrontmatterSlug;
  readonly socialImageRef?: ContentFrontmatterRepoRelativePath;
  readonly status: 'draft' | 'published' | 'unlisted' | 'archived';
  readonly summary?: ContentFrontmatterPlainText;
  readonly tags: ReadonlyArray<ContentFrontmatterPlainLabel>;
  readonly title: ContentFrontmatterPlainText;
  readonly translationOf?: ContentFrontmatterSlug;
  readonly updatedAt?: ContentFrontmatterRfc3339;
}> &
  unknown;
