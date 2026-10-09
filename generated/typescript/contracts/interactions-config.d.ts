// Generated from urn:gala:schema:interactions-config:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type InteractionsConfigBcp47 = string;

export type InteractionsConfigCanonicalRoute = string;

export type InteractionsConfigDigest = string;

export type InteractionsConfigExtensionKey = string;

export type InteractionsConfigGitObjectId = string;

export type InteractionsConfigGlob = string;

export type InteractionsConfigIsoCountry = string;

export type InteractionsConfigPackageExact = string;

export type InteractionsConfigPackageRange = string;

export type InteractionsConfigPassiveVisualToken = never;

export type InteractionsConfigPlainLabel = string;

export type InteractionsConfigPlainText = string;

export type InteractionsConfigReactionDefinition = Readonly<{
  readonly enabled: boolean;
  readonly key: InteractionsConfigReactionKey;
  readonly label: InteractionsConfigPlainLabel & string;
  readonly order: number;
  readonly visual: InteractionsConfigReactionVisual;
}>;

export type InteractionsConfigReactionKey = string;

export type InteractionsConfigReactionVisual = Readonly<{
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

export type InteractionsConfigRepoRelativePath = string;

export type InteractionsConfigRfc3339 = string;

export type InteractionsConfigSemver = string;

export type InteractionsConfigSemverRange = string;

export type InteractionsConfigSlug = string;

export type InteractionsConfigStableId = string;

export type InteractionsConfigUrlHttps = string;

export type InteractionsConfigUrn = string;

export type InteractionsConfigDocument = Readonly<{
  readonly comments: Readonly<{
    readonly allowReplies: boolean;
    readonly enabled: boolean;
    readonly maxDepth: number;
  }>;
  readonly publicCounts: Readonly<{
    readonly comments: boolean;
    readonly reactions: boolean;
  }>;
  readonly reactions: Readonly<{
    readonly definitions: ReadonlyArray<InteractionsConfigReactionDefinition>;
    readonly enabled: boolean;
  }>;
  readonly schemaId: 'urn:gala:schema:interactions-config:2.0.0';
  readonly schemaVersion: '2.0.0';
}>;
