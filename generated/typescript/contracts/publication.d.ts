// Generated from urn:gala:schema:publication:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type PublicationAiRights = Readonly<{
  readonly licenseUrl?: PublicationUrlHttps;
  readonly search: 'allow' | 'block';
  readonly training: 'allow' | 'block';
}>;

export type PublicationBcp47 = string;

export type PublicationCanonicalRoute = string;

export type PublicationContactForm = Readonly<{
  readonly enabled: boolean;
  readonly fields: Readonly<{
    readonly phone: boolean;
    readonly website: boolean;
  }>;
}>;

export type PublicationCrawlers = Readonly<{
  readonly ai: 'allow' | 'block';
}>;

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

export type PublicationListen = Readonly<{
  readonly enabled: boolean;
}>;

export type PublicationListing = Readonly<{
  readonly pageSize?: number;
}>;

export type PublicationNewsletter =
  | Readonly<{
      readonly emailContent: 'card' | 'full';
      readonly mode: 'galascribe';
      readonly replyToOwner: boolean;
      readonly text: PublicationPlainText;
      readonly title: PublicationPlainLabel;
    }>
  | Readonly<{
      readonly mode?: 'link';
      readonly text: PublicationPlainText;
      readonly title: PublicationPlainLabel;
      readonly url: PublicationUrlHttps;
    }>;

export type PublicationPackageExact = string;

export type PublicationPackageRange = string;

export type PublicationPassiveVisualToken = never;

export type PublicationPerformance = Readonly<{
  readonly budgets?: Readonly<{
    readonly cssBytes?: number;
    readonly htmlBytes?: number;
    readonly jsBytes?: number;
  }>;
}>;

export type PublicationPlainLabel = string;

export type PublicationPlainText = string;

export type PublicationPolicyPage = Readonly<{
  readonly body: PublicationRepoRelativePath;
  readonly title: PublicationPlainText;
}>;

export type PublicationPublicationPolicies = Readonly<{
  readonly privacy: PublicationPolicyPage;
  readonly terms: PublicationPolicyPage;
}>;

export type PublicationPublicationProfile = Readonly<{
  readonly body: PublicationRepoRelativePath;
  readonly route: PublicationCanonicalRoute;
}>;

export type PublicationRepoRelativePath = string;

export type PublicationRfc3339 = string;

export type PublicationSemver = string;

export type PublicationSemverRange = string;

export type PublicationSharing = Readonly<{
  readonly targets: ReadonlyArray<
    | 'copy-link'
    | 'native'
    | 'x'
    | 'bluesky'
    | 'linkedin'
    | 'facebook'
    | 'hacker-news'
    | 'whatsapp'
    | 'telegram'
    | 'reddit'
    | 'email'
  >;
}>;

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
  readonly aiRights?: PublicationAiRights;
  readonly authors: ReadonlyArray<PublicationRepoRelativePath>;
  readonly canonicalBase: PublicationUrlHttps;
  readonly contactForm?: PublicationContactForm;
  readonly contactRef?: PublicationRepoRelativePath;
  readonly crawlers?: PublicationCrawlers;
  readonly defaultImageRef?: PublicationRepoRelativePath;
  readonly defaultLanguage: PublicationBcp47;
  readonly description: PublicationPlainText;
  readonly extensions: PublicationExtensionMap;
  readonly footerCard?: PublicationFooterCard;
  readonly id: PublicationStableId;
  readonly listen?: PublicationListen;
  readonly listing?: PublicationListing;
  readonly newsletter?: PublicationNewsletter;
  readonly performance?: PublicationPerformance;
  readonly policies?: PublicationPublicationPolicies;
  readonly profile?: PublicationPublicationProfile;
  readonly schemaId: 'urn:gala:schema:publication:2.0.0';
  readonly schemaVersion: '2.0.0';
  readonly sharing?: PublicationSharing;
  readonly slug: PublicationSlug;
  readonly socialLinks: ReadonlyArray<PublicationSocialLink>;
  readonly title: PublicationPlainText;
}>;
