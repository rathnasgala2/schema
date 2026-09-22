// Generated from urn:gala:schema:build-input:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type BuildInputAdapterIdentity = Readonly<{
  readonly adapterDigest: BuildInputDigest;
  readonly adapterId: 'local-directory' | 'github-pages' | 'do-spaces';
  readonly adapterVersion: BuildInputSemver;
}>;

export type BuildInputAppearanceNormalized = Readonly<{
  readonly brandMark?: BuildInputResolvedFile;
  readonly colorMode: BuildInputColorMode;
  readonly fontAssets: ReadonlyArray<BuildInputResolvedFile>;
  readonly footerComposition: 'profile' | 'compact' | 'minimal';
  readonly headerComposition: 'mark-and-name' | 'name-only' | 'mark-only';
  readonly source: BuildInputNormalizedSource;
  readonly theme: BuildInputPackageExact & unknown;
  readonly tokens: BuildInputSemanticTokens;
  readonly typeScale: 'compact' | 'standard' | 'spacious';
  readonly wordmark?: BuildInputResolvedFile;
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
        | '@rathnasgala2/theme-zebra';
    }>;
}>;

export type BuildInputCanonicalRoute = string;

export type BuildInputColorMode = Readonly<{
  readonly allowed: ReadonlyArray<'light' | 'dark' | 'system'>;
  readonly default: 'light' | 'dark' | 'system';
}> &
  unknown;

export type BuildInputContentBuildRecord = Readonly<{
  readonly body: string;
  readonly bodyDigest: BuildInputDigest;
  readonly bodyMediaType: 'text/html';
  readonly frontmatter: BuildInputContentFrontmatterNormalized;
  readonly renderPolicy: BuildInputRenderPolicyIdentity;
  readonly resolvedAuthorIds: ReadonlyArray<BuildInputStableId>;
  readonly sourceDigest: BuildInputDigest;
  readonly sourcePath: BuildInputRepoRelativePath;
  readonly sourceRevision: BuildInputGitObjectId;
}>;

export type BuildInputContentFrontmatterNormalized = Readonly<{
  readonly authorIds: ReadonlyArray<BuildInputStableId>;
  readonly createdAt: BuildInputRfc3339;
  readonly description?: BuildInputPlainText;
  readonly hero?: BuildInputResolvedMedia;
  readonly id: BuildInputStableId;
  readonly kind: 'article' | 'page';
  readonly language: BuildInputBcp47;
  readonly publishedAt: BuildInputRfc3339;
  readonly redirects: ReadonlyArray<BuildInputCanonicalRoute>;
  readonly route?: BuildInputCanonicalRoute;
  readonly series?: BuildInputPlainLabel;
  readonly seriesOrder?: number;
  readonly slug: BuildInputSlug;
  readonly socialImage?: BuildInputResolvedFile;
  readonly status: 'published' | 'unlisted';
  readonly tags: ReadonlyArray<BuildInputPlainLabel>;
  readonly title: BuildInputPlainText;
  readonly updatedAt?: BuildInputRfc3339;
}>;

export type BuildInputDestinationCapabilityProfile = Readonly<{
  readonly adapter: BuildInputAdapterIdentity;
  readonly baseUrl: BuildInputUrlHttps;
  readonly capabilityDigest: BuildInputDigest;
}>;

export type BuildInputDigest = string;

export type BuildInputExtensionKey = string;

export type BuildInputGitObjectId = string;

export type BuildInputGithubPositiveDecimal = string;

export type BuildInputGlob = string;

export type BuildInputIsoCountry = string;

export type BuildInputLocalizedAuthor = Readonly<{
  readonly biography: BuildInputPlainText;
  readonly displayName: BuildInputPlainText;
  readonly language: BuildInputBcp47;
}>;

export type BuildInputModuleBuildSelection = Readonly<Record<string, never>>;

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

export type BuildInputPlainLabel = string;

export type BuildInputPlainText = string;

export type BuildInputPublicationNormalized = Readonly<{
  readonly authorIds: ReadonlyArray<BuildInputStableId>;
  readonly canonicalBase: BuildInputUrlHttps;
  readonly contactAuthorId?: BuildInputStableId;
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
  readonly profile?: Readonly<{
    readonly body: BuildInputRenderableBody;
    readonly route: BuildInputCanonicalRoute;
  }>;
  readonly slug: BuildInputSlug;
  readonly socialLinks: ReadonlyArray<BuildInputSocialLink>;
  readonly sourceDigest: BuildInputDigest;
  readonly sourcePath: BuildInputRepoRelativePath;
  readonly title: BuildInputPlainText;
}>;

export type BuildInputRenderPolicyIdentity = Readonly<{
  readonly digest: BuildInputDigest;
  readonly name: 'gala-render-policy';
  readonly version: BuildInputSemver;
}>;

export type BuildInputRenderableBody = Readonly<{
  readonly body: string;
  readonly bodyDigest: BuildInputDigest;
  readonly bodyMediaType: 'text/html';
  readonly renderPolicy: BuildInputRenderPolicyIdentity;
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

export type BuildInputSemanticTokens = Readonly<Record<string, never>>;

export type BuildInputSemver = string;

export type BuildInputSemverRange = string;

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
  readonly publication: BuildInputPublicationNormalized;
  readonly repository: BuildInputRepositorySnapshot;
  readonly schemaId: 'urn:gala:schema:build-input:2.0.0';
  readonly schemaVersion: '2.0.0';
  readonly sourceRevision: BuildInputGitObjectId;
}>;
