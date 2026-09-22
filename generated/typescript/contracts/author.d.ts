// Generated from urn:gala:schema:author:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type AuthorBcp47 = string;

export type AuthorCanonicalRoute = string;

export type AuthorDigest = string;

export type AuthorExtensionKey = string;

export type AuthorExtensionMap = Readonly<Record<string, unknown>>;

export type AuthorGitObjectId = string;

export type AuthorGlob = string;

export type AuthorIsoCountry = string;

export type AuthorLocalizedAuthor = Readonly<{
  readonly biography: AuthorPlainText;
  readonly displayName: AuthorPlainText;
  readonly language: AuthorBcp47;
}>;

export type AuthorPackageExact = string;

export type AuthorPackageRange = string;

export type AuthorPassiveVisualToken = never;

export type AuthorPlainLabel = string;

export type AuthorPlainText = string;

export type AuthorRepoRelativePath = string;

export type AuthorRfc3339 = string;

export type AuthorSemver = string;

export type AuthorSemverRange = string;

export type AuthorSlug = string;

export type AuthorSocialLink = Readonly<{
  readonly label?: AuthorPlainLabel;
  readonly type:
    | 'website'
    | 'email'
    | 'github'
    | 'linkedin'
    | 'mastodon'
    | 'bluesky'
    | 'x'
    | 'youtube'
    | 'other';
  readonly uri: string;
}> &
  unknown;

export type AuthorStableId = string;

export type AuthorUrlHttps = string;

export type AuthorUrn = string;

export type AuthorDocument = Readonly<{
  readonly avatarRef?: AuthorRepoRelativePath;
  readonly biography: AuthorPlainText;
  readonly displayName: AuthorPlainText;
  readonly extensions: AuthorExtensionMap;
  readonly id: AuthorStableId;
  readonly links: ReadonlyArray<AuthorSocialLink>;
  readonly localized: ReadonlyArray<AuthorLocalizedAuthor>;
  readonly pronouns?: AuthorPlainText;
  readonly schemaId: 'urn:gala:schema:author:2.0.0';
  readonly schemaVersion: '2.0.0';
}>;
