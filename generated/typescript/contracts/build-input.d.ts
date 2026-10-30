// Generated from urn:gala:schema:build-input:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type BuildInputAiRights = Readonly<{
  readonly licenseUrl?: BuildInputUrlHttps;
  readonly search: 'allow' | 'block';
  readonly training: 'allow' | 'block';
}>;

export type BuildInputAnalyticsConfig = Readonly<{
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

export type BuildInputAppearanceNormalized = Readonly<{
  readonly attribution?: BuildInputAttribution;
  readonly brandMark?: BuildInputResolvedFile;
  readonly colorMode: BuildInputColorMode;
  readonly fontAssets: ReadonlyArray<BuildInputResolvedFile>;
  readonly footerComposition: 'profile' | 'compact' | 'minimal';
  readonly headerComposition: 'mark-and-name' | 'name-only' | 'mark-only';
  readonly source: BuildInputNormalizedSource;
  readonly theme: string & BuildInputPackageExact;
  readonly tokens: BuildInputSemanticTokens;
  readonly typeScale: 'compact' | 'standard' | 'spacious';
  readonly wordmark?: BuildInputResolvedFile;
}>;

export type BuildInputAttribution = Readonly<{
  readonly showMadeWith: boolean;
}>;

export type BuildInputAuthorNormalized = Readonly<{
  readonly avatar?: BuildInputResolvedFile;
  readonly biography: BuildInputPlainText;
  readonly displayName: BuildInputPlainText;
  readonly id: BuildInputStableId;
  readonly links: ReadonlyArray<BuildInputSocialLink>;
  readonly localized: ReadonlyArray<BuildInputLocalizedAuthor>;
  readonly pronouns?: BuildInputPlainText;
  readonly sourceDigest: BuildInputDigest;
  readonly sourcePath: BuildInputRepoRelativePath;
}>;

export type BuildInputAuthoredAdapterIdentity = Readonly<{
  readonly adapterDigest: BuildInputDigest;
  readonly adapterId: 'local-directory' | 'github-pages' | 'do-spaces';
  readonly adapterVersion: BuildInputSemver;
}>;

export type BuildInputBcp47 = string;

export type BuildInputBuildPackages = Readonly<{
  readonly dependencies: ReadonlyArray<BuildInputPackageIdentity>;
  readonly publisher: readonly [
    BuildInputPackageIdentity &
      Readonly<{
        readonly package?: '@rathnasgala2/publish-action';
      }>,
    BuildInputPackageIdentity &
      Readonly<{
        readonly package?: '@rathnasgala2/publish-kernel';
      }>,
    BuildInputPackageIdentity &
      Readonly<{
        readonly package?: '@rathnasgala2/adapter-protocol';
      }>,
    BuildInputPackageIdentity &
      Readonly<{
        readonly package?:
          | '@rathnasgala2/adapter-local-directory'
          | '@rathnasgala2/adapter-github-pages'
          | '@rathnasgala2/adapter-do-spaces';
      }>,
  ];
  readonly schemas: BuildInputPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/schemas';
    }>;
  readonly template: BuildInputPackageIdentity &
    Readonly<{
      readonly package?: '@rathnasgala2/template';
    }>;
  readonly theme: BuildInputPackageIdentity &
    Readonly<{
      readonly package?:
        | '@rathnasgala2/theme-default'
        | '@rathnasgala2/theme-amaze'
        | '@rathnasgala2/theme-flashy'
        | '@rathnasgala2/theme-minimal'
        | '@rathnasgala2/theme-zebra'
        | '@rathnasgala2/theme-editorial';
    }>;
}>;

export type BuildInputCanonicalRoute = string;

export type BuildInputColorMode = Readonly<{
  readonly allowed: ReadonlyArray<'light' | 'dark' | 'system'>;
  readonly default: 'light' | 'dark' | 'system';
}> &
  unknown;

export type BuildInputContactFormNormalized = Readonly<{
  readonly enabled: boolean;
  readonly fields: Readonly<{
    readonly phone: boolean;
    readonly website: boolean;
  }>;
  readonly intro?: BuildInputRenderableBody;
}>;

export type BuildInputContentBuildMediaFile = Readonly<{
  readonly byteLength: number;
  readonly mediaType:
    | 'image/png'
    | 'image/jpeg'
    | 'image/webp'
    | 'image/avif'
    | 'image/gif'
    | 'audio/mpeg'
    | 'audio/mp4'
    | 'audio/ogg'
    | 'audio/wav'
    | 'video/mp4'
    | 'video/webm';
  readonly path: BuildInputRepoRelativePath;
  readonly sourceDigest: BuildInputDigest;
}> &
  unknown;

export type BuildInputContentBuildRecord = Readonly<{
  readonly body: string;
  readonly bodyDigest: BuildInputDigest;
  readonly bodyMediaType: 'text/html';
  readonly frontmatter: BuildInputContentFrontmatterNormalized;
  readonly media?: ReadonlyArray<BuildInputContentBuildMediaFile>;
  readonly renderPolicy: BuildInputManifestRenderPolicyIdentity;
  readonly resolvedAuthorIds: ReadonlyArray<BuildInputStableId>;
  readonly sourceDigest: BuildInputDigest;
  readonly sourcePath: BuildInputRepoRelativePath;
  readonly sourceRevision: BuildInputGitObjectId;
}>;

export type BuildInputContentEdition = Readonly<{
  readonly approvedAt: BuildInputRfc3339;
  readonly generation: Readonly<{
    readonly generationId: BuildInputStableId;
    readonly model: BuildInputPlainLabel;
    readonly provider: 'anthropic';
  }>;
  readonly kind: 'QUICK_READ' | 'STANDARD' | 'DEEP_DIVE';
  readonly of: BuildInputSlug;
  readonly sourceDigest: BuildInputDigest;
}>;

export type BuildInputContentFrontmatterNormalized = Readonly<{
  readonly authorIds: ReadonlyArray<BuildInputStableId>;
  readonly createdAt: BuildInputRfc3339;
  readonly deleteDate?: BuildInputDeleteDate;
  readonly description?: BuildInputPlainText;
  readonly edition?: BuildInputContentEdition;
  readonly hero?: BuildInputResolvedMedia;
  readonly id: BuildInputStableId;
  readonly kind: 'article' | 'page' | 'edition';
  readonly language: BuildInputBcp47;
  readonly listen?: BuildInputContentListenNormalized;
  readonly publishedAt: BuildInputRfc3339;
  readonly redirects: ReadonlyArray<BuildInputCanonicalRoute>;
  readonly route?: BuildInputCanonicalRoute;
  readonly seo?: BuildInputContentSeo;
  readonly series?: BuildInputPlainLabel;
  readonly seriesOrder?: number;
  readonly slug: BuildInputSlug;
  readonly socialImage?: BuildInputResolvedFile;
  readonly status: 'published' | 'unlisted';
  readonly tags: ReadonlyArray<BuildInputPlainLabel>;
  readonly title: BuildInputPlainText;
  readonly translationOf?: BuildInputSlug;
  readonly updatedAt?: BuildInputRfc3339;
}> &
  unknown;

export type BuildInputContentListenNormalized = Readonly<{
  readonly audio: BuildInputListenAudio;
  readonly durationSeconds: number;
  readonly format: 'conversation' | 'narration' | 'debate' | 'skit';
}>;

export type BuildInputContentSeo = Readonly<{
  readonly canonicalUrl?: BuildInputUrlHttps;
  readonly description?: BuildInputPlainText;
  readonly noindex?: boolean;
  readonly title?: BuildInputPlainText;
}>;

export type BuildInputDeleteDate = string;

export type BuildInputDestinationCapabilityProfile = Readonly<{
  readonly adapter: BuildInputAuthoredAdapterIdentity;
  readonly baseUrl: BuildInputUrlHttps;
  readonly capabilityDigest: BuildInputDigest;
}>;

export type BuildInputDigest = string;

export type BuildInputExtensionKey = string;

export type BuildInputGitObjectId = string;

export type BuildInputGithubPositiveDecimal = string;

export type BuildInputGlob = string;

export type BuildInputInteractionsConfig = Readonly<{
  readonly comments: Readonly<{
    readonly allowReplies: boolean;
    readonly enabled: boolean;
    readonly maxDepth: number;
  }>;
  readonly follows?: Readonly<{
    readonly enabled: boolean;
  }>;
  readonly publicCounts: Readonly<{
    readonly comments: boolean;
    readonly reactions: boolean;
  }>;
  readonly reactions: Readonly<{
    readonly definitions: ReadonlyArray<BuildInputReactionDefinition>;
    readonly enabled: boolean;
  }>;
  readonly schemaId: 'urn:gala:schema:interactions-config:2.0.0';
  readonly schemaVersion: '2.0.0';
}>;

export type BuildInputInteractionsServiceOrigin = string;

export type BuildInputIsoCountry = string;

export type BuildInputListen = Readonly<{
  readonly enabled: boolean;
}>;

export type BuildInputListenAudio = Readonly<{
  readonly bytes: number;
  readonly mediaType: 'audio/mpeg' | 'audio/mp4';
  readonly sha256: BuildInputDigest;
  readonly sourcePath: BuildInputRepoRelativePath;
}>;

export type BuildInputListing = Readonly<{
  readonly pageSize?: number;
}>;

export type BuildInputLocalizedAuthor = Readonly<{
  readonly biography: BuildInputPlainText;
  readonly displayName: BuildInputPlainText;
  readonly language: BuildInputBcp47;
}>;

export type BuildInputManifestRenderPolicyIdentity = Readonly<{
  readonly digest: BuildInputDigest;
  readonly name: 'gala-render-policy';
  readonly version: BuildInputSemver;
}>;

export type BuildInputModuleBuildSelection = Readonly<{
  readonly analytics?: Readonly<{
    readonly config: BuildInputAnalyticsConfig;
  }>;
  readonly interactions?: Readonly<{
    readonly apiOrigin: BuildInputInteractionsServiceOrigin;
    readonly appOrigin: BuildInputInteractionsServiceOrigin;
    readonly config: BuildInputInteractionsConfig;
  }>;
}>;

export type BuildInputNavigationItem = Readonly<{
  readonly children: ReadonlyArray<BuildInputNavigationLeaf>;
  readonly label: BuildInputPlainLabel;
  readonly route?: BuildInputCanonicalRoute;
  readonly type: 'internal' | 'external';
  readonly url?: BuildInputUrlHttps;
}> &
  unknown;

export type BuildInputNavigationLeaf = Readonly<{
  readonly children: [];
  readonly label: BuildInputPlainLabel;
  readonly route?: BuildInputCanonicalRoute;
  readonly type: 'internal' | 'external';
  readonly url?: BuildInputUrlHttps;
}> &
  unknown;

export type BuildInputNavigationNormalized = Readonly<{
  readonly footerItems: ReadonlyArray<BuildInputNavigationItem>;
  readonly items: ReadonlyArray<BuildInputNavigationItem>;
  readonly source: BuildInputNormalizedSource;
}>;

export type BuildInputNewsletter =
  | Readonly<{
      readonly emailContent: 'card' | 'full';
      readonly mode: 'galascribe';
      readonly replyToOwner: boolean;
      readonly text: BuildInputPlainText;
      readonly title: BuildInputPlainLabel;
    }>
  | Readonly<{
      readonly mode?: 'link';
      readonly text: BuildInputPlainText;
      readonly title: BuildInputPlainLabel;
      readonly url: BuildInputUrlHttps;
    }>;

export type BuildInputNormalizedSource =
  | Readonly<{
      readonly defaultDigest: BuildInputDigest;
      readonly defaultId: BuildInputUrn;
      readonly kind: 'built-in-default';
    }>
  | Readonly<{
      readonly kind: 'authored';
      readonly sourceDigest: BuildInputDigest;
      readonly sourcePath: BuildInputRepoRelativePath;
    }>;

export type BuildInputNpmPackageName = string;

export type BuildInputPackageExact = string;

export type BuildInputPackageIdentity = Readonly<{
  readonly integrity: BuildInputDigest;
  readonly package: BuildInputNpmPackageName;
  readonly registry: BuildInputUrlHttps;
  readonly version: BuildInputSemver;
}>;

export type BuildInputPackageRange = string;

export type BuildInputPassiveVisualToken = never;

export type BuildInputPerformance = Readonly<{
  readonly budgets?: Readonly<{
    readonly cssBytes?: number;
    readonly htmlBytes?: number;
    readonly jsBytes?: number;
  }>;
}>;

export type BuildInputPlainLabel = string;

export type BuildInputPlainText = string;

export type BuildInputPoliciesNormalized = Readonly<{
  readonly privacy: BuildInputPolicyPageNormalized;
  readonly terms: BuildInputPolicyPageNormalized;
}>;

export type BuildInputPolicyPageNormalized = Readonly<{
  readonly body: BuildInputRenderableBody;
  readonly title: BuildInputPlainText;
}>;

export type BuildInputPublicationNormalized = Readonly<{
  readonly aiRights?: BuildInputAiRights;
  readonly authorIds: ReadonlyArray<BuildInputStableId>;
  readonly canonicalBase: BuildInputUrlHttps;
  readonly contactAuthorId?: BuildInputStableId;
  readonly contactForm?: BuildInputContactFormNormalized;
  readonly crawlers?: Readonly<{
    readonly ai: 'allow' | 'block';
  }>;
  readonly defaultImage?: BuildInputResolvedFile;
  readonly defaultLanguage: BuildInputBcp47;
  readonly description: BuildInputPlainText;
  readonly footerCard?: Readonly<{
    readonly authorIds: ReadonlyArray<BuildInputStableId>;
    readonly body: BuildInputRenderableBody;
    readonly enabled: boolean;
    readonly heading: BuildInputPlainText;
  }>;
  readonly id: BuildInputStableId;
  readonly listen?: BuildInputListen;
  readonly listing?: BuildInputListing;
  readonly newsletter?: BuildInputNewsletter;
  readonly performance?: BuildInputPerformance;
  readonly profile?: Readonly<{
    readonly body: BuildInputRenderableBody;
    readonly route: BuildInputCanonicalRoute;
  }>;
  readonly sharing?: BuildInputSharing;
  readonly slug: BuildInputSlug;
  readonly socialLinks: ReadonlyArray<BuildInputSocialLink>;
  readonly sourceDigest: BuildInputDigest;
  readonly sourcePath: BuildInputRepoRelativePath;
  readonly title: BuildInputPlainText;
}>;

export type BuildInputReactionDefinition = Readonly<{
  readonly enabled: boolean;
  readonly key: BuildInputReactionKey;
  readonly label: BuildInputPlainLabel & string;
  readonly order: number;
  readonly visual: BuildInputReactionVisual;
}>;

export type BuildInputReactionKey = string;

export type BuildInputReactionVisual = Readonly<{
  readonly kind: 'emoji';
  readonly token:
    | '👍'
    | '❤️'
    | '💡'
    | '🎉'
    | '😂'
    | '🤯'
    | '🙏'
    | '🔥'
    | '👏'
    | '😮'
    | '😢'
    | '🤔'
    | '✨'
    | '🚀'
    | '💯'
    | '👀';
}>;

export type BuildInputRenderableBody = Readonly<{
  readonly body: string;
  readonly bodyDigest: BuildInputDigest;
  readonly bodyMediaType: 'text/html';
  readonly renderPolicy: BuildInputManifestRenderPolicyIdentity;
  readonly sourceDigest: BuildInputDigest;
  readonly sourcePath: BuildInputRepoRelativePath;
}>;

export type BuildInputRepoRelativePath = string;

export type BuildInputRepositorySnapshot = Readonly<{
  readonly repositoryId: BuildInputGithubPositiveDecimal;
  readonly repositoryOwnerId: BuildInputGithubPositiveDecimal;
  readonly rootDigest: BuildInputDigest;
  readonly sourceRevision: BuildInputGitObjectId;
}>;

export type BuildInputResolvedFile = Readonly<{
  readonly path: BuildInputRepoRelativePath;
  readonly sourceDigest: BuildInputDigest;
}>;

export type BuildInputResolvedMedia = Readonly<{
  readonly alt: string;
  readonly file: BuildInputResolvedFile;
  readonly role: 'informative' | 'decorative';
}> &
  unknown;

export type BuildInputRfc3339 = string;

export type BuildInputSemanticTokens = Readonly<{
  readonly accent?: Readonly<{
    readonly dark: string;
    readonly light: string;
  }>;
  readonly canvas?: Readonly<{
    readonly dark: string;
    readonly light: string;
  }>;
  readonly text?: Readonly<{
    readonly dark: string;
    readonly light: string;
  }>;
}>;

export type BuildInputSemver = string;

export type BuildInputSemverRange = string;

export type BuildInputSharing = Readonly<{
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

export type BuildInputSlug = string;

export type BuildInputSocialLink = Readonly<{
  readonly label?: BuildInputPlainLabel;
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

export type BuildInputStableId = string;

export type BuildInputUrlHttps = string;

export type BuildInputUrn = string;

export type BuildInputDocument = Readonly<{
  readonly appearance: BuildInputAppearanceNormalized;
  readonly authors: ReadonlyArray<BuildInputAuthorNormalized>;
  readonly basePath: BuildInputCanonicalRoute;
  readonly baseUrl: BuildInputUrlHttps;
  readonly buildEpoch: BuildInputRfc3339;
  readonly content: ReadonlyArray<BuildInputContentBuildRecord>;
  readonly contractVersion: '2.0.0';
  readonly destinationCapabilities: BuildInputDestinationCapabilityProfile;
  readonly inputDigest: BuildInputDigest;
  readonly modules: BuildInputModuleBuildSelection;
  readonly navigation: BuildInputNavigationNormalized;
  readonly packages: BuildInputBuildPackages;
  readonly placements: [];
  readonly policies?: BuildInputPoliciesNormalized;
  readonly publication: BuildInputPublicationNormalized;
  readonly repository: BuildInputRepositorySnapshot;
  readonly schemaId: 'urn:gala:schema:build-input:2.0.0';
  readonly schemaVersion: '2.0.0';
  readonly sourceRevision: BuildInputGitObjectId;
}>;
