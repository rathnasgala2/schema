// Generated from urn:gala:schema:template-composition:2.0.0; sourceDesignRevision=a53052955ceb6c1aa10c886289dc832eedfe6de0a00004df07d353ac19c4403a.
// Do not edit.

export type TemplateCompositionBcp47 = string;

export type TemplateCompositionCanonicalRoute = string;

export type TemplateCompositionDigest = string;

export type TemplateCompositionExtensionKey = string;

export type TemplateCompositionGitObjectId = string;

export type TemplateCompositionGlob = string;

export type TemplateCompositionIsoCountry = string;

export type TemplateCompositionPackageExact = string;

export type TemplateCompositionPackageRange = string;

export type TemplateCompositionPassiveVisualToken = never;

export type TemplateCompositionPlainLabel = string;

export type TemplateCompositionPlainText = string;

export type TemplateCompositionRepoRelativePath = string;

export type TemplateCompositionRfc3339 = string;

export type TemplateCompositionSemver = string;

export type TemplateCompositionSemverRange = string;

export type TemplateCompositionSlug = string;

export type TemplateCompositionStableId = string;

export type TemplateCompositionUrlHttps = string;

export type TemplateCompositionUrn = string;

export type TemplateCompositionDocument = (
  | Readonly<{
      readonly articleLayout: 'editorial';
      readonly authorLayout: 'portrait';
      readonly density: 'comfortable';
      readonly footerLayout: 'expanded';
      readonly headerLayout: 'masthead';
      readonly homeLayout: 'magazine';
      readonly listingLayout: 'rows';
      readonly mediaRatio: 'landscape';
      readonly profile: 'editorial';
    }>
  | Readonly<{
      readonly articleLayout: 'full-bleed';
      readonly authorLayout: 'portfolio';
      readonly density: 'comfortable';
      readonly footerLayout: 'compact';
      readonly headerLayout: 'minimal';
      readonly homeLayout: 'gallery';
      readonly listingLayout: 'image-grid';
      readonly mediaRatio: 'mixed';
      readonly profile: 'visual';
    }>
  | Readonly<{
      readonly articleLayout: 'issue';
      readonly authorLayout: 'profile';
      readonly density: 'comfortable';
      readonly footerLayout: 'expanded';
      readonly headerLayout: 'publication';
      readonly homeLayout: 'newspaper';
      readonly listingLayout: 'issues';
      readonly mediaRatio: 'landscape';
      readonly profile: 'newsletter';
    }>
  | Readonly<{
      readonly articleLayout: 'prose';
      readonly authorLayout: 'biography';
      readonly density: 'spacious';
      readonly footerLayout: 'compact';
      readonly headerLayout: 'compact';
      readonly homeLayout: 'chronological';
      readonly listingLayout: 'dated-rows';
      readonly mediaRatio: 'landscape';
      readonly profile: 'personal';
    }>
  | Readonly<{
      readonly articleLayout: 'technical';
      readonly authorLayout: 'biography';
      readonly density: 'compact';
      readonly footerLayout: 'compact';
      readonly headerLayout: 'utility';
      readonly homeLayout: 'topic-index';
      readonly listingLayout: 'rows';
      readonly mediaRatio: 'landscape';
      readonly profile: 'developer';
    }>
  | unknown
) &
  Readonly<{
    readonly articleLayout?:
      'editorial' | 'issue' | 'full-bleed' | 'prose' | 'technical';
    readonly authorLayout?: 'portrait' | 'profile' | 'portfolio' | 'biography';
    readonly density?: 'comfortable' | 'spacious' | 'compact';
    readonly footerLayout?: 'expanded' | 'compact';
    readonly headerLayout?:
      'masthead' | 'publication' | 'minimal' | 'compact' | 'utility';
    readonly homeLayout?:
      'magazine' | 'newspaper' | 'gallery' | 'chronological' | 'topic-index';
    readonly listingLayout?: 'rows' | 'issues' | 'image-grid' | 'dated-rows';
    readonly mediaRatio?: 'landscape' | 'mixed';
    readonly profile?:
      'editorial' | 'newsletter' | 'visual' | 'personal' | 'developer';
    readonly schemaId: 'urn:gala:schema:template-composition:2.0.0';
    readonly schemaVersion: '2.0.0';
  }>;
