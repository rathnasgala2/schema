// Generated from urn:gala:schema:publication:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type PublicationBcp47 = string;

export type PublicationCanonicalRoute = string;

export type PublicationDigest = string;

export type PublicationExtensionKey = string;

export type PublicationExtensionMap = Readonly<Record<string, unknown>>;

export type PublicationFooterCard = Readonly<{
  readonly authorIds: ReadonlyArray<PublicationStableId>;
  readonly body: PublicationRepoRelativePath;
  readonly enabled: boolean;
  readonly heading: PublicationPlainText;
}>;

export type PublicationGitObjectId = string;

export type PublicationGlob = string;

export type PublicationIsoCountry = string;

export type PublicationPackageExact = string;

export type PublicationPackageRange = string;

export type PublicationPassiveVisualToken = never;

export type PublicationPlainLabel = string;

export type PublicationPlainText = string;

export type PublicationPublicationProfile = Readonly<{
  readonly body: PublicationRepoRelativePath;
  readonly route: PublicationCanonicalRoute;
}>;

export type PublicationRepoRelativePath = string;

export type PublicationRfc3339 = string;

export type PublicationSemver = string;

export type PublicationSemverRange = string;

export type PublicationSlug = string;

export type PublicationSocialLink = Readonly<{
  readonly label?: PublicationPlainLabel;
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

export type PublicationStableId = string;

export type PublicationUrlHttps = string;

export type PublicationUrn = string;

export type PublicationDocument = Readonly<{
  readonly authors: ReadonlyArray<PublicationRepoRelativePath>;
  readonly canonicalBase: PublicationUrlHttps;
  readonly contactRef?: PublicationRepoRelativePath;
  readonly defaultImageRef?: PublicationRepoRelativePath;
  readonly defaultLanguage: PublicationBcp47;
  readonly description: PublicationPlainText;
  readonly extensions: PublicationExtensionMap;
  readonly footerCard?: PublicationFooterCard;
  readonly id: PublicationStableId;
  readonly profile?: PublicationPublicationProfile;
  readonly schemaId: 'urn:gala:schema:publication:2.0.0';
  readonly schemaVersion: '2.0.0';
  readonly slug: PublicationSlug;
  readonly socialLinks: ReadonlyArray<PublicationSocialLink>;
  readonly title: PublicationPlainText;
}>;
