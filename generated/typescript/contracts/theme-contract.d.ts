// Generated from urn:gala:schema:theme-contract:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type ThemeContractBcp47 = string;

export type ThemeContractCanonicalRoute = string;

export type ThemeContractDigest = string;

export type ThemeContractExtensionKey = string;

export type ThemeContractGitObjectId = string;

export type ThemeContractGlob = string;

export type ThemeContractIsoCountry = string;

export type ThemeContractNonNegativeInt64 = string;

export type ThemeContractPackageExact = string;

export type ThemeContractPackageRange = string;

export type ThemeContractPassiveAsset = Readonly<{
  readonly byteLength: ThemeContractNonNegativeInt64;
  readonly license: ThemeContractSpdxExpression;
  readonly mediaType:
    | 'text/css'
    | 'font/woff2'
    | 'image/png'
    | 'image/jpeg'
    | 'image/webp'
    | 'image/avif'
    | 'image/svg+xml';
  readonly path: ThemeContractRepoRelativePath;
  readonly sha256: ThemeContractDigest;
}>;

export type ThemeContractPassiveVisualToken = never;

export type ThemeContractPlainLabel = string;

export type ThemeContractPlainText = string;

export type ThemeContractPositiveInt64 = string;

export type ThemeContractRepoRelativePath = string;

export type ThemeContractRfc3339 = string;

export type ThemeContractSemver = string;

export type ThemeContractSemverRange = string;

export type ThemeContractSlug = string;

export type ThemeContractSpdxExpression = string;

export type ThemeContractStableId = string;

export type ThemeContractThemeBudgets = Readonly<{
  readonly maximumFileBytes: ThemeContractPositiveInt64;
  readonly maximumFiles: number;
  readonly maximumTotalBytes: ThemeContractPositiveInt64;
}>;

export type ThemeContractThemeToken = Readonly<{
  readonly dark: string;
  readonly key:
    | 'border-width'
    | 'color-accent'
    | 'color-border'
    | 'color-canvas'
    | 'color-code-canvas'
    | 'color-code-text'
    | 'color-danger'
    | 'color-focus'
    | 'color-link'
    | 'color-link-visited'
    | 'color-on-accent'
    | 'color-selection'
    | 'color-success'
    | 'color-surface'
    | 'color-surface-raised'
    | 'color-text'
    | 'color-text-muted'
    | 'color-warning'
    | 'content-measure'
    | 'focus-width'
    | 'font-body'
    | 'font-heading'
    | 'font-mono'
    | 'radius-medium'
    | 'radius-small'
    | 'space-1'
    | 'space-2'
    | 'space-3'
    | 'space-4'
    | 'space-6'
    | 'space-8'
    | 'weight-heading'
    | 'weight-medium'
    | 'weight-normal'
    | 'weight-strong';
  readonly light: string;
  readonly type: 'color' | 'length' | 'font-family' | 'font-weight';
}> &
  unknown;

export type ThemeContractUrlHttps = string;

export type ThemeContractUrn = string;

export type ThemeContractDocument = (
  | Readonly<{
      readonly cssLayers?: ['gala-tokens', 'gala-components', 'gala-print'];
      readonly stylesheets?: ['tokens.css', 'components.css', 'print.css'];
    }>
  | Readonly<{
      readonly cssLayers?: [
        'gala-tokens',
        'gala-components',
        'gala-utilities',
        'gala-print',
      ];
      readonly stylesheets?: [
        'tokens.css',
        'components.css',
        'utilities.css',
        'print.css',
      ];
    }>
) &
  (
    | Readonly<{
        readonly package?: unknown;
        readonly themeId?: 'amaze';
      }>
    | Readonly<{
        readonly package?: unknown;
        readonly themeId?: 'default';
      }>
    | Readonly<{
        readonly package?: unknown;
        readonly themeId?: 'flashy';
      }>
    | Readonly<{
        readonly package?: unknown;
        readonly themeId?: 'minimal';
      }>
    | Readonly<{
        readonly package?: unknown;
        readonly themeId?: 'zebra';
      }>
  ) &
  Readonly<{
    readonly assets: ReadonlyArray<ThemeContractPassiveAsset>;
    readonly browserPolicyRef: 'gala-theme-css-v2-20211224';
    readonly budgets: ThemeContractThemeBudgets;
    readonly contractVersion: ThemeContractSemver;
    readonly cssLayers: ReadonlyArray<ThemeContractPlainLabel>;
    readonly evidenceDigest: ThemeContractDigest;
    readonly fixtureDigest: ThemeContractDigest;
    readonly fixtures: ReadonlyArray<ThemeContractPlainLabel>;
    readonly integrity: ThemeContractDigest;
    readonly modes: ['dark', 'light', 'system'];
    readonly package: ThemeContractPackageExact & unknown;
    readonly schemaId: 'urn:gala:schema:theme-contract:2.0.0';
    readonly schemaVersion: '2.0.0';
    readonly slotHooks: ReadonlyArray<ThemeContractPlainLabel>;
    readonly stylesheets: ReadonlyArray<ThemeContractRepoRelativePath>;
    readonly stylingContractDigest: ThemeContractDigest;
    readonly templateRange: ThemeContractSemverRange;
    readonly themeId: ThemeContractSlug;
    readonly tokens: readonly [
      Readonly<{
        readonly key?: 'border-width';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-accent';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-border';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-canvas';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-code-canvas';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-code-text';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-danger';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-focus';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-link';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-link-visited';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-on-accent';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-selection';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-success';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-surface';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-surface-raised';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-text';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-text-muted';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-warning';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'content-measure';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'focus-width';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'font-body';
        readonly type?: 'font-family';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'font-heading';
        readonly type?: 'font-family';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'font-mono';
        readonly type?: 'font-family';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'radius-medium';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'radius-small';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'space-1';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'space-2';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'space-3';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'space-4';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'space-6';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'space-8';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'weight-heading';
        readonly type?: 'font-weight';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'weight-medium';
        readonly type?: 'font-weight';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'weight-normal';
        readonly type?: 'font-weight';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'weight-strong';
        readonly type?: 'font-weight';
      }> &
        ThemeContractThemeToken,
    ];
  }>;
