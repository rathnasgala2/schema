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
    | 'border-button'
    | 'border-card'
    | 'border-chip'
    | 'border-code'
    | 'border-media-divider'
    | 'border-quote'
    | 'border-row-divider'
    | 'border-section-rule'
    | 'border-width'
    | 'card-inset'
    | 'card-pad'
    | 'card-title-size'
    | 'chip-pad'
    | 'color-accent'
    | 'color-accent-2'
    | 'color-border'
    | 'color-btn-panel'
    | 'color-btn-panel-text'
    | 'color-btn-text'
    | 'color-canvas'
    | 'color-chip-text'
    | 'color-code-canvas'
    | 'color-code-text'
    | 'color-danger'
    | 'color-focus'
    | 'color-footer'
    | 'color-header'
    | 'color-icon-accent'
    | 'color-input'
    | 'color-input-border'
    | 'color-link'
    | 'color-link-underline'
    | 'color-link-underline-hover'
    | 'color-link-visited'
    | 'color-on-accent'
    | 'color-overlay'
    | 'color-panel-muted'
    | 'color-panel-text'
    | 'color-selection'
    | 'color-success'
    | 'color-surface'
    | 'color-surface-raised'
    | 'color-syntax-comment'
    | 'color-syntax-function'
    | 'color-syntax-keyword'
    | 'color-syntax-number'
    | 'color-syntax-string'
    | 'color-text'
    | 'color-text-faint'
    | 'color-text-muted'
    | 'color-toc-active'
    | 'color-toc-active-text'
    | 'color-warning'
    | 'content-measure'
    | 'decor-size'
    | 'display-max'
    | 'display-style'
    | 'duration-base'
    | 'duration-fast'
    | 'duration-slow'
    | 'ease-spring'
    | 'ease-standard'
    | 'focus-width'
    | 'font-body'
    | 'font-display'
    | 'font-label'
    | 'font-mono'
    | 'font-ui'
    | 'label-transform'
    | 'lift-x'
    | 'lift-y'
    | 'link-offset'
    | 'link-offset-hover'
    | 'link-skip-ink'
    | 'link-thickness'
    | 'media-filter'
    | 'media-filter-hover'
    | 'media-zoom'
    | 'paint-button'
    | 'paint-chip'
    | 'paint-page-decor'
    | 'paint-panel'
    | 'prose-leading'
    | 'prose-size'
    | 'quote-align'
    | 'quote-mark'
    | 'quote-pad'
    | 'quote-style'
    | 'quote-transform'
    | 'radius-avatar'
    | 'radius-large'
    | 'radius-media'
    | 'radius-medium'
    | 'radius-pill'
    | 'radius-small'
    | 'row-pad'
    | 'shadow-avatar-ring'
    | 'shadow-button'
    | 'shadow-card'
    | 'shadow-card-hover'
    | 'shadow-dialog'
    | 'space-1'
    | 'space-2'
    | 'space-3'
    | 'space-4'
    | 'space-6'
    | 'space-8'
    | 'title-transform'
    | 'tracking-display'
    | 'tracking-label'
    | 'tracking-title'
    | 'weight-display'
    | 'weight-normal'
    | 'weight-strong'
    | 'weight-title'
    | 'weight-ui';
  readonly light: string;
  readonly type:
    | 'color'
    | 'length'
    | 'box'
    | 'number'
    | 'duration'
    | 'easing'
    | 'font-family'
    | 'font-weight'
    | 'border'
    | 'shadow'
    | 'paint'
    | 'keyword';
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
        readonly key?: 'border-button';
        readonly type?: 'border';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'border-card';
        readonly type?: 'border';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'border-chip';
        readonly type?: 'border';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'border-code';
        readonly type?: 'border';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'border-media-divider';
        readonly type?: 'border';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'border-quote';
        readonly type?: 'border';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'border-row-divider';
        readonly type?: 'border';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'border-section-rule';
        readonly type?: 'border';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'border-width';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'card-inset';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'card-pad';
        readonly type?: 'box';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'card-title-size';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'chip-pad';
        readonly type?: 'box';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-accent';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-accent-2';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-border';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-btn-panel';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-btn-panel-text';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-btn-text';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-canvas';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-chip-text';
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
        readonly key?: 'color-footer';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-header';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-icon-accent';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-input';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-input-border';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-link';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-link-underline';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-link-underline-hover';
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
        readonly key?: 'color-overlay';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-panel-muted';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-panel-text';
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
        readonly key?: 'color-syntax-comment';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-syntax-function';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-syntax-keyword';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-syntax-number';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-syntax-string';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-text';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-text-faint';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-text-muted';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-toc-active';
        readonly type?: 'color';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'color-toc-active-text';
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
        readonly dark?: 'auto' | '100% 46rem';
        readonly key?: 'decor-size';
        readonly light?: 'auto' | '100% 46rem';
        readonly type?: 'keyword';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'display-max';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly dark?: 'normal' | 'italic';
        readonly key?: 'display-style';
        readonly light?: 'normal' | 'italic';
        readonly type?: 'keyword';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'duration-base';
        readonly type?: 'duration';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'duration-fast';
        readonly type?: 'duration';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'duration-slow';
        readonly type?: 'duration';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'ease-spring';
        readonly type?: 'easing';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'ease-standard';
        readonly type?: 'easing';
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
        readonly key?: 'font-display';
        readonly type?: 'font-family';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'font-label';
        readonly type?: 'font-family';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'font-mono';
        readonly type?: 'font-family';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'font-ui';
        readonly type?: 'font-family';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly dark?: 'none' | 'uppercase';
        readonly key?: 'label-transform';
        readonly light?: 'none' | 'uppercase';
        readonly type?: 'keyword';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'lift-x';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'lift-y';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'link-offset';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'link-offset-hover';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly dark?: 'auto' | 'none';
        readonly key?: 'link-skip-ink';
        readonly light?: 'auto' | 'none';
        readonly type?: 'keyword';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'link-thickness';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly dark?: 'none' | 'grayscale(1)';
        readonly key?: 'media-filter';
        readonly light?: 'none' | 'grayscale(1)';
        readonly type?: 'keyword';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly dark?: 'none' | 'grayscale(1)';
        readonly key?: 'media-filter-hover';
        readonly light?: 'none' | 'grayscale(1)';
        readonly type?: 'keyword';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'media-zoom';
        readonly type?: 'number';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'paint-button';
        readonly type?: 'paint';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'paint-chip';
        readonly type?: 'paint';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'paint-page-decor';
        readonly type?: 'paint';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'paint-panel';
        readonly type?: 'paint';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'prose-leading';
        readonly type?: 'number';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'prose-size';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly dark?: 'start' | 'center';
        readonly key?: 'quote-align';
        readonly light?: 'start' | 'center';
        readonly type?: 'keyword';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly dark?: 'none' | 'open-quote';
        readonly key?: 'quote-mark';
        readonly light?: 'none' | 'open-quote';
        readonly type?: 'keyword';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'quote-pad';
        readonly type?: 'box';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly dark?: 'normal' | 'italic';
        readonly key?: 'quote-style';
        readonly light?: 'normal' | 'italic';
        readonly type?: 'keyword';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly dark?: 'none' | 'uppercase';
        readonly key?: 'quote-transform';
        readonly light?: 'none' | 'uppercase';
        readonly type?: 'keyword';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'radius-avatar';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'radius-large';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'radius-media';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'radius-medium';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'radius-pill';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'radius-small';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'row-pad';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'shadow-avatar-ring';
        readonly type?: 'shadow';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'shadow-button';
        readonly type?: 'shadow';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'shadow-card';
        readonly type?: 'shadow';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'shadow-card-hover';
        readonly type?: 'shadow';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'shadow-dialog';
        readonly type?: 'shadow';
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
        readonly dark?: 'none' | 'uppercase';
        readonly key?: 'title-transform';
        readonly light?: 'none' | 'uppercase';
        readonly type?: 'keyword';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'tracking-display';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'tracking-label';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'tracking-title';
        readonly type?: 'length';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'weight-display';
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
      Readonly<{
        readonly key?: 'weight-title';
        readonly type?: 'font-weight';
      }> &
        ThemeContractThemeToken,
      Readonly<{
        readonly key?: 'weight-ui';
        readonly type?: 'font-weight';
      }> &
        ThemeContractThemeToken,
    ];
  }>;
