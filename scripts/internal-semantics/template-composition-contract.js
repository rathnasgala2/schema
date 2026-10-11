/**
 * The complete generation-4 template compositions. Each profile is a closed
 * product decision: fields from different profiles cannot be mixed.
 */

export const TEMPLATE_COMPOSITION_SCHEMA_ID =
  'urn:gala:schema:template-composition:2.0.0';
export const TEMPLATE_COMPOSITION_SCHEMA_VERSION = '2.0.0';

/**
 * @typedef {
 *   | 'profile'
 *   | 'homeLayout'
 *   | 'articleLayout'
 *   | 'authorLayout'
 *   | 'listingLayout'
 *   | 'headerLayout'
 *   | 'footerLayout'
 *   | 'mediaRatio'
 *   | 'density'
 * } TemplateCompositionField
 */

/** @type {readonly TemplateCompositionField[]} */
export const TEMPLATE_COMPOSITION_FIELDS = Object.freeze([
  'profile',
  'homeLayout',
  'articleLayout',
  'authorLayout',
  'listingLayout',
  'headerLayout',
  'footerLayout',
  'mediaRatio',
  'density',
]);

export const TEMPLATE_COMPOSITIONS = Object.freeze({
  editorial: Object.freeze({
    profile: 'editorial',
    homeLayout: 'magazine',
    articleLayout: 'editorial',
    authorLayout: 'portrait',
    listingLayout: 'rows',
    headerLayout: 'masthead',
    footerLayout: 'expanded',
    mediaRatio: 'landscape',
    density: 'comfortable',
  }),
  newsletter: Object.freeze({
    profile: 'newsletter',
    homeLayout: 'newspaper',
    articleLayout: 'issue',
    authorLayout: 'profile',
    listingLayout: 'issues',
    headerLayout: 'publication',
    footerLayout: 'expanded',
    mediaRatio: 'landscape',
    density: 'comfortable',
  }),
  visual: Object.freeze({
    profile: 'visual',
    homeLayout: 'gallery',
    articleLayout: 'full-bleed',
    authorLayout: 'portfolio',
    listingLayout: 'image-grid',
    headerLayout: 'minimal',
    footerLayout: 'compact',
    mediaRatio: 'mixed',
    density: 'comfortable',
  }),
  personal: Object.freeze({
    profile: 'personal',
    homeLayout: 'chronological',
    articleLayout: 'prose',
    authorLayout: 'biography',
    listingLayout: 'dated-rows',
    headerLayout: 'compact',
    footerLayout: 'compact',
    mediaRatio: 'landscape',
    density: 'spacious',
  }),
  developer: Object.freeze({
    profile: 'developer',
    homeLayout: 'topic-index',
    articleLayout: 'technical',
    authorLayout: 'biography',
    listingLayout: 'rows',
    headerLayout: 'utility',
    footerLayout: 'compact',
    mediaRatio: 'landscape',
    density: 'compact',
  }),
});

/** The one generation-4 profile each package identity owns. */
export const THEME_COMPOSITION_PROFILES = Object.freeze({
  default: 'newsletter',
  amaze: 'editorial',
  editorial: 'editorial',
  flashy: 'visual',
  minimal: 'personal',
  zebra: 'developer',
});
